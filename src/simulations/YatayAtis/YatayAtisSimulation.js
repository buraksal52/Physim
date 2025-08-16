
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './YatayAtis.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const G = 10; // Yerçekimi sabiti

// --- FİZİK MOTORU ---
const Matter = {
  Engine: {
    create: () => ({
      world: { bodies: [], gravity: { x: 0, y: G } },
      timing: { timeScale: 1 },
      deltaTime: 1 / 60
    }),
    update: (engine, pixelsPerMeter) => {
      const dt = engine.deltaTime;

      engine.world.bodies.forEach(body => {
        if (!body.isStatic) {
          const gravityAcceleration = engine.world.gravity.y;
          const gravityVelocityChange = gravityAcceleration * dt;
          const gravityVelocityChangePixels = gravityVelocityChange * pixelsPerMeter;
          
          body.velocity.y += gravityVelocityChangePixels;
          
          body.position.x += body.velocity.x * dt;
          body.position.y += body.velocity.y * dt;
          
          const groundBody = engine.world.bodies.find(b => b.label === 'ground');
          if (groundBody) {
            const groundTop = groundBody.position.y - 10;
            const ballBottom = body.position.y + 10;
            
            if (ballBottom >= groundTop && body.velocity.y > 0) {
              body.position.y = groundTop - 10;
              body.velocity.y = 0;
              body.velocity.x = 0;
            }
          }
        }
      });
    }
  },
  Bodies: {
    circle: (x, y, radius, options = {}) => ({
      position: { x, y },
      velocity: { x: 0, y: 0 },
      radius,
      isStatic: false,
      label: options.label || 'body'
    }),
    rectangle: (x, y, width, height, options = {}) => ({
      position: { x, y },
      width,
      height,
      isStatic: options.isStatic || false,
      label: options.label || 'body'
    })
  },
  World: {
    add: (world, body) => {
      if (Array.isArray(body)) {
        world.bodies.push(...body);
      } else {
        world.bodies.push(body);
      }
    },
    clear: (world) => { world.bodies = []; }
  },
  Body: {
    setPosition: (body, position) => {
      body.position.x = position.x;
      body.position.y = position.y;
    },
    setVelocity: (body, velocity) => {
      body.velocity.x = velocity.x;
      body.velocity.y = velocity.y;
    }
  }
};

const initialChartData = {
  labels: [],
  datasets: [
    {
      label: 'Değer',
      data: [],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      pointRadius: 0,
      tension: 0.1,
    },
  ],
};

const YatayAtisSimulation = ({ resetKey = 0 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const engineRef = useRef(null);
  const ballRef = useRef(null);
  
  const simulationTimeRef = useRef(0);

  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isBallHovered, setIsBallHovered] = useState(false);
  const [height, setHeight] = useState(10);
  const [initialVelocityX, setInitialVelocityX] = useState(20);
  
  const [info, setInfo] = useState({ height: 0, velocityX: 0, velocityY: 0, distance: 0 });
  const [maxInfo, setMaxInfo] = useState({ maxHeight: 0, maxDistance: 0 });

  const [heightChartData, setHeightChartData] = useState(initialChartData);
  const [velocityChartData, setVelocityChartData] = useState(initialChartData);

  const [cameraOffsetX, setCameraOffsetX] = useState(0);

  const canvasHeight = 400;
  const canvasWidth = 752;

  const theoreticalMaxDistance = initialVelocityX * Math.sqrt(2 * height / G);
  const requiredWidth = Math.max(initialVelocityX * 2, theoreticalMaxDistance * 1.1);
  const requiredHeight = height * 1.2;

  const scaleX = canvasWidth / requiredWidth;
  const scaleY = canvasHeight / requiredHeight;
  const pixelsPerMeter = Math.min(scaleX, scaleY);

  const stopSimulation = useCallback(() => setIsSimulationRunning(false), []);

  const resetSimulation = useCallback((isHardReset = true) => {
    setIsSimulationRunning(false);
    setCameraOffsetX(0);

    if (isHardReset) {
        engineRef.current = Matter.Engine.create();
    }
    
    const groundWidth = Math.max(canvasWidth * 2, theoreticalMaxDistance * pixelsPerMeter * 2);
    const ground = Matter.Bodies.rectangle(groundWidth / 2, canvasHeight - 10, groundWidth, 20, { isStatic: true, label: 'ground' });
    
    const ballInitialY = canvasHeight - 20 - (height * pixelsPerMeter);
    const ballInitialX = 20;
    
    if (!ballRef.current) {
        ballRef.current = Matter.Bodies.circle(ballInitialX, ballInitialY, 10, { label: 'ball' });
    } else {
        Matter.Body.setPosition(ballRef.current, {x: ballInitialX, y: ballInitialY});
        Matter.Body.setVelocity(ballRef.current, {x: 0, y: 0});
    }
    
    Matter.World.clear(engineRef.current.world);
    Matter.World.add(engineRef.current.world, [ballRef.current, ground]);
    
    setInfo({ height: height, velocityX: 0, velocityY: 0, distance: 0 });
    setMaxInfo({ maxHeight: height, maxDistance: 0 });
    simulationTimeRef.current = 0;

    setHeightChartData({ ...initialChartData, labels: [], datasets: [{...initialChartData.datasets[0], data:[]}] });
    setVelocityChartData({ ...initialChartData, labels: [], datasets: [{...initialChartData.datasets[0], data:[], label: 'Dikey Hız', borderColor: '#f44336'}] });

  }, [height, pixelsPerMeter, canvasWidth, canvasHeight, theoreticalMaxDistance]);

  useEffect(() => {
    resetSimulation();
  }, [resetKey, height, initialVelocityX, resetSimulation]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.translate(-cameraOffsetX, 0);

    ctx.fillStyle = '#f0f8ff';
    const groundWidth = Math.max(canvasWidth * 2, theoreticalMaxDistance * pixelsPerMeter * 2);
    ctx.fillRect(0, 0, groundWidth + cameraOffsetX, canvasHeight);

    if (isSimulationRunning && engineRef.current) {
      Matter.Engine.update(engineRef.current, pixelsPerMeter);
      simulationTimeRef.current += engineRef.current.deltaTime;
    }

    if (engineRef.current) {
        const ground = engineRef.current.world.bodies.find(b => b.label === 'ground');
        if (ground) {
            ctx.fillStyle = '#666666';
            ctx.fillRect(ground.position.x - ground.width / 2, ground.position.y - ground.height / 2, ground.width, ground.height);
        }
    }

    if (ballRef.current) {
      const ball = ballRef.current;
      
      const groundY = canvasHeight - 20;
      const currentHeight = Math.max(0, (groundY - (ball.position.y + 10)) / pixelsPerMeter);
      const currentVelocityX = ball.velocity.x / pixelsPerMeter;
      const currentVelocityY = ball.velocity.y / pixelsPerMeter;
      const currentDistance = (ball.position.x - 20) / pixelsPerMeter;

      if (isSimulationRunning) {
        const followThreshold = canvasWidth * 0.6;
        if (ball.position.x > followThreshold) {
            setCameraOffsetX(ball.position.x - followThreshold);
        }
        setInfo({ height: currentHeight, velocityX: currentVelocityX, velocityY: currentVelocityY, distance: currentDistance });
        setMaxInfo(prev => ({
          maxHeight: Math.max(prev.maxHeight, currentHeight),
          maxDistance: Math.max(prev.maxDistance, currentDistance)
        }));

        const currentTime = simulationTimeRef.current.toFixed(2);
        if (simulationTimeRef.current % 0.1 < 0.017) {
            setHeightChartData(prev => ({
              ...prev,
              labels: [...prev.labels, currentTime].slice(-100),
              datasets: [{ ...prev.datasets[0], data: [...prev.datasets[0].data, currentHeight].slice(-100) }]
            }));
            setVelocityChartData(prev => ({
                ...prev,
                labels: [...prev.labels, currentTime].slice(-100),
                datasets: [
                    { ...prev.datasets[0], label: 'Dikey Hız', data: [...prev.datasets[0].data, currentVelocityY].slice(-100), borderColor: '#f44336' },
                ]
            }));
        }

        if (currentHeight <= 0 && ball.velocity.y === 0) {
          stopSimulation();
        }
      }
      
      ctx.fillStyle = isDragging ? '#0078ff' : '#ff4444';
      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    animationRef.current = requestAnimationFrame(animate);
  }, [isSimulationRunning, stopSimulation, pixelsPerMeter, cameraOffsetX, canvasWidth, canvasHeight, theoreticalMaxDistance, isDragging]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [animate]);

  const startSimulation = useCallback(() => {
    resetSimulation(false); // Tam resetlemeden sadece pozisyonları ayarla
    setIsSimulationRunning(true);
    if (ballRef.current) {
      Matter.Body.setVelocity(ballRef.current, { 
        x: initialVelocityX * pixelsPerMeter, 
        y: 0 
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVelocityX, pixelsPerMeter, resetSimulation]);

  const handleMouseDown = useCallback((e) => {
    if (isSimulationRunning) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const ball = ballRef.current;
    const distance = Math.sqrt((mouseX - ball.position.x) ** 2 + (mouseY - ball.position.y) ** 2);
    if (distance < 20) {
      setIsDragging(true);
    }
  }, [isSimulationRunning]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !ballRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const ball = ballRef.current;
    const distance = Math.sqrt((mouseX - ball.position.x) ** 2 + (mouseY - ball.position.y) ** 2);
    
    setIsBallHovered(distance < 20 && !isDragging);

    if (!isDragging) return;
    
    const newY = Math.max(10, Math.min(mouseY, canvasHeight - 30));
    const groundY = canvasHeight - 20;
    const newHeight = (groundY - (newY + 10)) / pixelsPerMeter;

    Matter.Body.setPosition(ball, { x: 20, y: newY });
    setHeight(Math.max(0, newHeight));

  }, [isDragging, canvasHeight, pixelsPerMeter]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
        setIsDragging(false);
        resetSimulation(false); // Soft reset
    }
  }, [isDragging, resetSimulation]);

  const handleMouseLeave = useCallback(() => {
    setIsBallHovered(false);
  }, []);

  const chartOptions = (title, yAxisLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true }, title: { display: true, text: title, font: { size: 16 } } },
    scales: { x: { title: { display: true, text: 'Zaman (s)' } }, y: { title: { display: true, text: yAxisLabel }, beginAtZero: true } },
    animation: false,
  });

  return (
    <div className="simulation-container">
      <div className="simulation-header">
        <h3>Yatay Atış Simülasyonu</h3>
        <div className="simulation-controls" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', gap: '20px'}}>
                <div className="input-group" style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'white'}}>
                    <label htmlFor="height_input">Yükseklik (h):</label>
                    <input 
                        id="height_input"
                        type="number" 
                        value={height.toFixed(1)} 
                        onChange={(e) => setHeight(Number(e.target.value) || 0)}
                        disabled={isSimulationRunning || isDragging}
                        style={{width: '60px', padding: '5px'}}
                    />
                    <span>m</span>
                </div>
                <div className="input-group" style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'white'}}>
                    <label htmlFor="velocity_input">Atış Hızı (v₀):</label>
                    <input 
                        id="velocity_input"
                        type="number" 
                        value={initialVelocityX}
                        onChange={(e) => setInitialVelocityX(Number(e.target.value) || 0)}
                        disabled={isSimulationRunning || isDragging}
                        style={{width: '60px', padding: '5px'}}
                    />
                    <span>m/s</span>
                </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {!isSimulationRunning ? (
                    <button className="start-button" onClick={startSimulation} style={{
                      padding: '8px 16px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isDragging ? 'not-allowed' : 'pointer',
                      opacity: isDragging ? 0.6 : 1
                    }} disabled={isDragging}>
                        Başlat
                    </button>
                ) : (
                    <button className="stop-button" onClick={stopSimulation} style={{
                      padding: '8px 16px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}>
                        Durdur
                    </button>
                )}
                <button className="reset-button" onClick={() => resetSimulation(true)} style={{
                  padding: '8px 16px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                    Sıfırla
                </button>
            </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <canvas 
            ref={canvasRef} 
            style={{ 
                border: '2px solid #333', 
                borderRadius: '8px', 
                width: '100%', 
                cursor: isDragging ? 'grabbing' : (isBallHovered ? 'grab' : 'default') 
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        />
      </div>
      
      <div style={{
        width: '100%', margin: '0 auto 12px auto', padding: '12px',
        background: '#f5f5f5', borderRadius: '8px', textAlign: 'center',
        fontSize: '14px', fontFamily: 'monospace', border: '1px solid #ddd',
        display: 'flex', justifyContent: 'space-around'
      }}>
        <span><b>Yükseklik:</b> {info.height.toFixed(2)} m</span>
        <span><b>Yatay Hız (Vx):</b> {info.velocityX.toFixed(2)} m/s</span>
        <span><b>Dikey Hız (Vy):</b> {info.velocityY.toFixed(2)} m/s</span>
        <span><b>Mesafe (x):</b> {info.distance.toFixed(2)} m</span>
      </div>
      
      <div style={{
        width: '100%', margin: '0 auto', padding: '12px',
        background: '#e3f2fd', borderRadius: '8px', textAlign: 'center',
        fontSize: '15px', fontFamily: 'monospace', border: '1px solid #bbdefb',
        display: 'flex', justifyContent: 'space-around'
      }}>
        <span><b>Maks. Yükseklik:</b> {maxInfo.maxHeight.toFixed(2)} m</span>
        <span><b>Maks. Mesafe (Menzil):</b> {maxInfo.maxDistance.toFixed(2)} m</span>
      </div>
      
      <div style={{
        width: '100%', margin: '16px auto 0 auto', padding: '16px',
        background: '#fff3e0', borderRadius: '8px', fontSize: '14px',
        border: '2px solid #ff9800', lineHeight: '1.6'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#e65100', textAlign: 'center', width: '100%' }}>📐 Yatay Atış Formülleri</h4>
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', fontFamily: 'monospace' }}>
            <div>
                <p>x = v₀ * t</p>
                <p>h = ½ * g * t²</p>
                <p>vₓ = v₀</p>
            </div>
            <div>
                <p>vᵧ = g * t</p>
                <p>vᵧ² = 2 * g * h</p>
                <p>v² = vᵧ² + v₀²</p>
            </div>
        </div>
      </div>

      <div className="charts-container" style={{
        width: '100%', margin: '24px auto 0', display: 'flex',
        flexDirection: 'column', gap: '24px'
      }}>
        <div className="chart" style={{ height: '250px', padding: '10px', background: '#fafafa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <Line options={chartOptions('Yükseklik - Zaman Grafiği', 'Yükseklik (m)')} data={heightChartData} />
        </div>
        <div className="chart" style={{ height: '250px', padding: '10px', background: '#fafafa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <Line options={chartOptions('Hız - Zaman Grafiği', 'Hız (m/s)')} data={velocityChartData} />
        </div>
      </div>
    </div>
  );
};

export default YatayAtisSimulation;
