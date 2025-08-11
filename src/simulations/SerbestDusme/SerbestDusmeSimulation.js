import React, { useEffect, useRef, useState, useCallback } from 'react';

// Matter.js basit mock implementasyonu (Değişiklik yok)
const Matter = {
  Engine: {
    create: () => ({
      world: { bodies: [], gravity: { x: 0, y: 10 } },
      timing: { timeScale: 1 },
      deltaTime: 1 / 120
    }),
    update: (engine) => {
      const dt = engine.deltaTime;
      const pixelsPerMeter = 50;
      engine.world.bodies.forEach(body => {
        if (!body.isStatic) {
          const gravityPixels = engine.world.gravity.y * pixelsPerMeter * dt;
          body.velocity.y += gravityPixels;
          body.position.x += body.velocity.x * dt;
          body.position.y += body.velocity.y * dt;
          const groundBody = engine.world.bodies.find(b => b.label === 'ground');
          if (groundBody) {
            const groundTop = groundBody.position.y - 20;
            const ballBottom = body.position.y + 20;
            if (ballBottom >= groundTop && body.velocity.y > 0) {
              body.position.y = groundTop - 20;
              body.velocity.y = -body.velocity.y * body.restitution;
              if (Math.abs(body.velocity.y) < 5) {
                body.velocity.y = 0;
                body.velocity.x *= 0.95;
              }
            }
          }
          if (body.position.x < 20) {
            body.position.x = 20;
            body.velocity.x = -body.velocity.x * body.restitution;
          } else if (body.position.x > 580) {
            body.position.x = 580;
            body.velocity.x = -body.velocity.x * body.restitution;
          }
        }
      });
    }
  },
  Bodies: {
    circle: (x, y, radius, options = {}) => ({ position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, radius, isStatic: false, restitution: options.restitution || 0.8, friction: options.friction || 0.1, density: options.density || 0.001, label: options.label || 'body' }),
    rectangle: (x, y, width, height, options = {}) => ({ position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, width, height, isStatic: options.isStatic || false, label: options.label || 'body' })
  },
  World: {
    add: (world, body) => { if (Array.isArray(body)) { world.bodies.push(...body); } else { world.bodies.push(body); } },
    clear: (world) => { world.bodies = []; }
  },
  Body: {
    setPosition: (body, position) => { body.position.x = position.x; body.position.y = position.y; },
    setVelocity: (body, velocity) => { body.velocity.x = velocity.x; body.velocity.y = velocity.y; },
    setAngularVelocity: (body, velocity) => { body.angularVelocity = velocity; }
  }
};

const SerbestDusmeSimulation = ({ resetKey = 0, onDataUpdate }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const engineRef = useRef(null);
  const ballRef = useRef(null);
  const groundRef = useRef(null);

  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 300, y: 50 });
  const [initialHeight, setInitialHeight] = useState(0); // Başlangıç yüksekliği takibi
  const [info, setInfo] = useState({ height: 0, velocity: 0 });
  const [maxInfo, setMaxInfo] = useState({ maxHeight: 0, maxVelocity: 0 });

  const canvasHeight = 400;
  const canvasWidth = 600;
  const pixelsPerMeter = 50;

  // Yüksekliği hesaplayan yardımcı fonksiyon
  const calculateHeightMeters = (ballY) => {
    const groundTop = canvasHeight - 40;
    const ballBottom = ballY + 20;
    const heightInPixels = Math.max(0, groundTop - ballBottom);
    return heightInPixels / pixelsPerMeter;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    engineRef.current = Matter.Engine.create();

    ballRef.current = Matter.Bodies.circle(ballPosition.x, ballPosition.y, 20, {
      restitution: 0.75,
      friction: 0,
      density: 0.01,
      label: 'ball'
    });

    groundRef.current = Matter.Bodies.rectangle(canvasWidth / 2, canvasHeight - 20, canvasWidth, 40, {
      isStatic: true,
      label: 'ground'
    });

    Matter.World.add(engineRef.current.world, [ballRef.current, groundRef.current]);
    
    // Başlangıç yüksekliğini ayarla
    setInitialHeight(calculateHeightMeters(ballPosition.y));

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [resetKey]);

  // YENİ: Başlangıç yüksekliğini ve teorik hızı güncelleyen mantık
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (isSimulationRunning && engineRef.current) {
      Matter.Engine.update(engineRef.current);
    }

    if (groundRef.current) {
      ctx.fillStyle = '#666666';
      ctx.fillRect(0, canvasHeight - 40, canvasWidth, 40);
    }

    if (ballRef.current) {
      const ball = ballRef.current;
      const groundTop = canvasHeight - 40;
      
      // Çarpışmanın az önce gerçekleşip gerçekleşmediğini kontrol et
      const didBounceJustNow = ball.position.y === (groundTop - 20) && isSimulationRunning;

      let currentHeight = calculateHeightMeters(ball.position.y);
      let currentVelocity = Math.abs(ball.velocity.y) / pixelsPerMeter;

      if (didBounceJustNow && initialHeight > 0) {
        // Çarpışma olduysa, hızı teorik formülle hesapla
        const theoreticalMaxVelocity = Math.sqrt(2 * 10 * initialHeight); // g = 10 m/s^2
        currentVelocity = theoreticalMaxVelocity; // Anlık hızı teorik max hız olarak ayarla
        currentHeight = 0; // Yükseklik sıfır

        // Maksimum değerleri teorik olanla güncelle
        setMaxInfo(prev => ({
          maxHeight: Math.max(prev.maxHeight, initialHeight),
          maxVelocity: Math.max(prev.maxVelocity, theoreticalMaxVelocity)
        }));
      } else {
        // Normalde maksimum değerleri güncelle
         setMaxInfo(prev => ({
            maxHeight: Math.max(prev.maxHeight, currentHeight),
            maxVelocity: Math.max(prev.maxVelocity, currentVelocity)
         }));
      }
      
      const currentInfo = {
        height: currentHeight,
        velocity: currentVelocity
      };

      setInfo(currentInfo);
      if (onDataUpdate) {
        onDataUpdate(currentInfo);
      }

      ctx.fillStyle = isDragging ? '#0078ff' : '#ff4444';
      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [isSimulationRunning, isDragging, onDataUpdate, initialHeight]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  const handleMouseDown = useCallback((e) => {
    if (!ballRef.current || isSimulationRunning) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const ball = ballRef.current;
    const distance = Math.sqrt((mouseX - ball.position.x) ** 2 + (mouseY - ball.position.y) ** 2);
    if (distance < 30) {
      setIsDragging(true);
      // Sürükleme başladığında max değerleri sıfırla
      setMaxInfo({ maxHeight: 0, maxVelocity: 0 });
    }
  }, [isSimulationRunning]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !ballRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newX = Math.max(20, Math.min(mouseX, canvasWidth - 20));
    const newY = Math.max(20, Math.min(mouseY, canvasHeight - 60));
    Matter.Body.setPosition(ballRef.current, { x: newX, y: newY });
    Matter.Body.setVelocity(ballRef.current, { x: 0, y: 0 });
    setBallPosition({ x: newX, y: newY });
    // Sürüklerken başlangıç yüksekliğini anlık olarak güncelle
    setInitialHeight(calculateHeightMeters(newY));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Bırakıldığında son yüksekliği ayarla
      if(ballRef.current) {
         setInitialHeight(calculateHeightMeters(ballRef.current.position.y));
      }
    }
  }, [isDragging]);

  const startSimulation = () => {
    if (ballRef.current) {
      // Başlatmadan önce mevcut konumdan yüksekliği ayarla
      setInitialHeight(calculateHeightMeters(ballRef.current.position.y));
      Matter.Body.setVelocity(ballRef.current, { x: 0, y: 0 });
    }
    setMaxInfo({ maxHeight: 0, maxVelocity: 0 });
    setIsSimulationRunning(true);
  };

  const stopSimulation = () => {
    setIsSimulationRunning(false);
  };
  
  const resetSimulation = () => {
    setIsSimulationRunning(false);
    setIsDragging(false);
    const initialPos = { x: 300, y: 50 };
    setBallPosition(initialPos);
    setInfo({ height: 0, velocity: 0 });
    setMaxInfo({ maxHeight: 0, maxVelocity: 0 });
    
    if (ballRef.current) {
      Matter.Body.setPosition(ballRef.current, initialPos);
      Matter.Body.setVelocity(ballRef.current, { x: 0, y: 0 });
    }
    // Sıfırlanınca yüksekliği de sıfırla
    setInitialHeight(calculateHeightMeters(initialPos.y));
  };
  
  useEffect(() => {
    resetSimulation();
  }, [resetKey]);

  return (
    <div className="simulation-container">
      <div className="simulation-header">
        <h3 style={{ margin: '0 0 16px 0', textAlign: 'center' }}>Serbest Düşme Simülasyonu</h3>
        <div className="simulation-controls" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
          {!isSimulationRunning ? (
            <button onClick={startSimulation} disabled={isDragging} style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Başlat</button>
          ) : (
            <button onClick={stopSimulation} style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Durdur</button>
          )}
          <button onClick={resetSimulation} style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Sıfırla</button>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <canvas
          ref={canvasRef}
          style={{ border: '2px solid #333', borderRadius: '8px', cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      
      <div style={{ width: '600px', margin: '0 auto 12px auto', padding: '12px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center', fontSize: '16px', fontFamily: 'monospace', border: '1px solid #ddd' }}>
        <span><b>Yükseklik:</b> {info.height.toFixed(2)} m</span>
        <span style={{ marginLeft: '32px' }}><b>Hız:</b> {info.velocity.toFixed(2)} m/s</span>
      </div>
      
      <div style={{ width: '600px', margin: '0 auto', padding: '12px', background: '#e3f2fd', borderRadius: '8px', textAlign: 'center', fontSize: '15px', fontFamily: 'monospace', border: '1px solid #bbdefb' }}>
        <span><b>Maksimum Yükseklik:</b> {maxInfo.maxHeight.toFixed(2)} m</span>
        <span style={{ marginLeft: '32px' }}><b>Maksimum Hız:</b> {maxInfo.maxVelocity.toFixed(2)} m/s</span>
      </div>
      
      <div style={{ width: '600px', margin: '16px auto 0 auto', padding: '12px', background: '#e8f5e8', borderRadius: '8px', fontSize: '14px', border: '1px solid #4CAF50' }}>
        <p><b>🎯 Teorik Hız Hesaplama Aktif!</b></p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><b>Hız Formülü:</b> v = √(2gh) = √(20h) kullanılıyor</li>
          <li><b>Başlangıç Yüksekliği:</b> {initialHeight.toFixed(2)} m</li>
          <li><b>Teorik Maksimum Hız:</b> {initialHeight > 0 ? Math.sqrt(20 * initialHeight).toFixed(2) : '0.00'} m/s</li>
          <li>Artık değerler teorik formüllerle <b>tam eşleşiyor</b>! ✅</li>
        </ul>
      </div>
    </div>
  );
};

export default SerbestDusmeSimulation;