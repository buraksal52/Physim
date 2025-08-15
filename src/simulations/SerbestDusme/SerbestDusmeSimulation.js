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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Matter = {
  Engine: {
    create: () => ({
      world: { bodies: [], gravity: { x: 0, y: 10 } },
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
            const groundTop = groundBody.position.y - 20;
            const ballBottom = body.position.y + 20;
            
            if (ballBottom >= groundTop && body.velocity.y > 0) {
              body.position.y = groundTop - 20;
              body.velocity.y = -body.velocity.y * body.restitution;
              
              if (Math.abs(body.velocity.y) < 0.5 * pixelsPerMeter) {
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
    circle: (x, y, radius, options = {}) => ({
      position: { x, y },
      velocity: { x: 0, y: 0 },
      angle: 0,
      radius,
      isStatic: false,
      restitution: options.restitution || 0.75,
      friction: options.friction || 0.1,
      density: options.density || 0.001,
      label: options.label || 'body'
    }),
    rectangle: (x, y, width, height, options = {}) => ({
      position: { x, y },
      velocity: { x: 0, y: 0 },
      angle: 0,
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
    },
    setAngularVelocity: (body, velocity) => { body.angularVelocity = velocity; }
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

const SerbestDusmeSimulation = ({ resetKey = 0, onDataUpdate }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const engineRef = useRef(null);
  const ballRef = useRef(null);
  const groundRef = useRef(null);
  
  const simulationTimeRef = useRef(0);
  const lastChartUpdateTimeRef = useRef(0);

  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [initialHeight, setInitialHeight] = useState(10);
  const [info, setInfo] = useState({ height: 0, velocity: 0 });
  const [maxInfo, setMaxInfo] = useState({ maxHeight: 0, maxVelocity: 0 });

  const [heightChartData, setHeightChartData] = useState(initialChartData);
  const [velocityChartData, setVelocityChartData] = useState(initialChartData);

  const canvasWidth = 600;
  const canvasHeight = 500;
  const maxSimHeight = 200;
  const groundHeight = 40;
  const ballRadius = 20;
  const pixelsPerMeter = (canvasHeight - groundHeight - ballRadius * 2) / maxSimHeight;

  const calculateYFromHeight = useCallback((height) => {
    const groundTop = canvasHeight - groundHeight;
    const heightInPixels = height * pixelsPerMeter;
    return groundTop - ballRadius - heightInPixels;
  }, [canvasHeight, groundHeight, ballRadius, pixelsPerMeter]);

  const calculateHeightFromY = useCallback((y) => {
      const groundTop = canvasHeight - groundHeight;
      const heightInPixels = groundTop - ballRadius - y;
      return heightInPixels / pixelsPerMeter;
  }, [canvasHeight, groundHeight, ballRadius, pixelsPerMeter]);


  const stopSimulation = useCallback(() => setIsSimulationRunning(false), []);

  const handleHeightChange = (e) => {
    let newHeight = parseFloat(e.target.value);
    if (isNaN(newHeight)) newHeight = 1;
    if (newHeight < 1) newHeight = 1;
    if (newHeight > 200) newHeight = 200;
    setInitialHeight(newHeight);
  };

  useEffect(() => {
    if (!ballRef.current || isSimulationRunning || isDragging) return;
    const newY = calculateYFromHeight(initialHeight);
    Matter.Body.setPosition(ballRef.current, { x: ballRef.current.position.x, y: newY });
    Matter.Body.setVelocity(ballRef.current, { x: 0, y: 0 });
  }, [initialHeight, isSimulationRunning, isDragging, calculateYFromHeight]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    engineRef.current = Matter.Engine.create();
    const initialY = calculateYFromHeight(10);
    
    ballRef.current = Matter.Bodies.circle(300, initialY, ballRadius, {
      restitution: 0.75,
      friction: 0,
      density: 0.01,
      label: 'ball'
    });
    groundRef.current = Matter.Bodies.rectangle(canvasWidth / 2, canvasHeight - groundHeight / 2, canvasWidth, groundHeight, {
      isStatic: true,
      label: 'ground'
    });
    Matter.World.add(engineRef.current.world, [ballRef.current, groundRef.current]);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [resetKey, canvasHeight, canvasWidth, calculateYFromHeight, ballRadius, groundHeight]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (isSimulationRunning && engineRef.current) {
      Matter.Engine.update(engineRef.current, pixelsPerMeter);
      simulationTimeRef.current += engineRef.current.deltaTime;
    }

    if (groundRef.current) {
      ctx.fillStyle = '#666666';
      ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);
    }

    if (ballRef.current) {
      const ball = ballRef.current;
      
      const currentHeight = calculateHeightFromY(ball.position.y);
      const currentVelocity = Math.abs(ball.velocity.y) / pixelsPerMeter;

      setMaxInfo(prev => ({
        maxHeight: Math.max(prev.maxHeight, currentHeight),
        maxVelocity: Math.max(prev.maxVelocity, currentVelocity)
      }));

      setInfo({ height: currentHeight, velocity: currentVelocity });
      if (onDataUpdate) onDataUpdate({ height: currentHeight, velocity: currentVelocity });

      if (isSimulationRunning) {
        if (simulationTimeRef.current - lastChartUpdateTimeRef.current > 0.016) {
          const currentTime = simulationTimeRef.current.toFixed(2);
          const chartedHeight = currentHeight < 0.01 ? 0 : currentHeight;
          
          setHeightChartData(prevData => ({
            ...prevData,
            labels: [...prevData.labels, currentTime].slice(-150),
            datasets: [{
              ...prevData.datasets[0],
              data: [...prevData.datasets[0].data, chartedHeight].slice(-150)
            }]
          }));
          setVelocityChartData(prevData => ({
            ...prevData,
            labels: [...prevData.labels, currentTime].slice(-150),
            datasets: [{
              ...prevData.datasets[0],
              data: [...prevData.datasets[0].data, currentVelocity].slice(-150),
              borderColor: '#f44336'
            }]
          }));
          lastChartUpdateTimeRef.current = simulationTimeRef.current;
        }
        
        const isGrounded = currentHeight < 0.01;
        const hasStoppedBouncing = Math.abs(ball.velocity.y) < 0.5 * pixelsPerMeter;
        if (isGrounded && hasStoppedBouncing) {
          stopSimulation();
        }
      }
      
      ctx.fillStyle = isDragging ? '#0078ff' : '#ff4444';
      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, ballRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [
    isSimulationRunning,
    isDragging,
    onDataUpdate,
    stopSimulation,
    canvasWidth,
    canvasHeight,
    pixelsPerMeter,
    calculateHeightFromY,
    ballRadius,
    groundHeight
  ]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [animate]);

  const handleMouseDown = useCallback((e) => {
    if (!ballRef.current || isSimulationRunning) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const ball = ballRef.current;
    const distance = Math.sqrt((mouseX - ball.position.x) ** 2 + (mouseY - ball.position.y) ** 2);
    if (distance < ballRadius + 10) { // Add a small buffer
      setIsDragging(true);
      setMaxInfo({ maxHeight: 0, maxVelocity: 0 });
    }
  }, [isSimulationRunning, ballRadius]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !ballRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newX = Math.max(ballRadius, Math.min(mouseX, canvasWidth - ballRadius));
    const newY = Math.max(ballRadius, Math.min(mouseY, canvasHeight - groundHeight - ballRadius));
    
    Matter.Body.setPosition(ballRef.current, { x: newX, y: newY });
    Matter.Body.setVelocity(ballRef.current, { x: 0, y: 0 });

    const newHeight = calculateHeightFromY(newY);
    setInitialHeight(newHeight);

  }, [isDragging, canvasWidth, canvasHeight, ballRadius, groundHeight, calculateHeightFromY]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  const startSimulation = useCallback(() => {
    if (ballRef.current) {
        const newY = calculateYFromHeight(initialHeight);
        Matter.Body.setPosition(ballRef.current, { x: 300, y: newY });
        Matter.Body.setVelocity(ballRef.current, { x: 0, y: 0 });
    }
    setMaxInfo({ maxHeight: 0, maxVelocity: 0 });
    simulationTimeRef.current = 0;
    lastChartUpdateTimeRef.current = 0;
    setHeightChartData({
      ...initialChartData,
      labels: [],
      datasets: [{ ...initialChartData.datasets[0], data: [] }]
    });
    setVelocityChartData({
      ...initialChartData,
      labels: [],
      datasets: [{ ...initialChartData.datasets[0], data: [], borderColor: '#f44336' }]
    });
    setIsSimulationRunning(true);
  }, [initialHeight, calculateYFromHeight]);

  const resetSimulation = useCallback(() => {
    setIsSimulationRunning(false);
    setIsDragging(false);
    setInfo({ height: 0, velocity: 0 });
    setMaxInfo({ maxHeight: 0, maxVelocity: 0 });

    if (ballRef.current) {
        const newY = calculateYFromHeight(initialHeight);
        Matter.Body.setPosition(ballRef.current, { x: 300, y: newY });
        Matter.Body.setVelocity(ballRef.current, { x: 0, y: 0 });
    }

    simulationTimeRef.current = 0;
    lastChartUpdateTimeRef.current = 0;
    setHeightChartData({
      ...initialChartData,
      labels: [],
      datasets: [{ ...initialChartData.datasets[0], data: [] }]
    });
    setVelocityChartData({
      ...initialChartData,
      labels: [],
      datasets: [{ ...initialChartData.datasets[0], data: [], borderColor: '#f44336' }]
    });
  }, [initialHeight, calculateYFromHeight]);
  
  useEffect(() => { resetSimulation(); }, [resetKey, resetSimulation]);

  const chartOptions = (title, yAxisLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: title, font: { size: 16 } },
    },
    scales: {
      x: { title: { display: true, text: 'Zaman (s)' } },
      y: { title: { display: true, text: yAxisLabel }, beginAtZero: true },
    },
    animation: false,
  });
  
  const theoreticalMaxVelocity = initialHeight > 0 ? Math.sqrt(2 * 10 * initialHeight) : 0;
  
  return (
    <div className="simulation-container">
      <div className="simulation-header">
        <h3>Serbest Düşme Simülasyonu</h3>
        <div className="simulation-controls">
            {!isSimulationRunning ? (
                <button className="start-button" onClick={startSimulation} disabled={isDragging} style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isDragging ? 'not-allowed' : 'pointer',
                  opacity: isDragging ? 0.6 : 1
                }}>
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
            <button className="reset-button" onClick={resetSimulation} style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '8px'
            }}>
                Sıfırla
            </button>
        </div>
      </div>

      <div style={{ width: '600px', margin: '16px auto', padding: '10px', background: '#f0f0f0', borderRadius: '8px' }}>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Yükseklik (1-200m):</label>
          <input 
              type="number" 
              value={initialHeight.toFixed(0)} 
              onChange={handleHeightChange}
              min="1"
              max="200"
              disabled={isSimulationRunning}
              style={{ width: '80px', marginRight: '10px' }}
          />
          <input 
              type="range" 
              value={initialHeight} 
              onChange={handleHeightChange}
              min="1"
              max="200"
              step="1"
              disabled={isSimulationRunning}
              style={{ width: '400px', cursor: isSimulationRunning ? 'not-allowed' : 'pointer' }}
          />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <canvas
          ref={canvasRef}
          style={{
            border: '2px solid #333',
            borderRadius: '8px',
            cursor: isDragging ? 'grabbing' : (isSimulationRunning ? 'not-allowed' : 'grab')
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      
      <div style={{
        width: '600px',
        margin: '0 auto 12px auto',
        padding: '12px',
        background: '#f5f5f5',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '16px',
        fontFamily: 'monospace',
        border: '1px solid #ddd'
      }}>
        <span><b>Yükseklik:</b> {info.height.toFixed(2)} m</span>
        <span style={{ marginLeft: '32px' }}><b>Hız:</b> {info.velocity.toFixed(2)} m/s</span>
      </div>
      
      <div style={{
        width: '600px',
        margin: '0 auto',
        padding: '12px',
        background: '#e3f2fd',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '15px',
        fontFamily: 'monospace',
        border: '1px solid #bbdefb'
      }}>
        <span><b>Maksimum Yükseklik:</b> {maxInfo.maxHeight.toFixed(2)} m</span>
        <span style={{ marginLeft: '32px' }}><b>Maksimum Hız:</b> {maxInfo.maxVelocity.toFixed(2)} m/s</span>
      </div>
      
      <div style={{
        width: '600px',
        margin: '16px auto 0 auto',
        padding: '16px',
        background: '#fff3e0',
        borderRadius: '8px',
        fontSize: '14px',
        border: '2px solid #ff9800',
        lineHeight: '1.6'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#e65100' }}>📐 Serbest Düşme Formülleri</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ margin: '4px 0', fontFamily: 'monospace' }}><b>Hız:</b> v = √(2gh)</p>
            <p style={{ margin: '4px 0', fontFamily: 'monospace' }}><b>Zaman:</b> t = √(2h/g)</p>
            <p style={{ margin: '4px 0', fontFamily: 'monospace' }}><b>Yükseklik:</b> h = ½gt²</p>
          </div>
          <div>
            <p style={{ margin: '4px 0' }}><b>Başlangıç Yüksekliği:</b> {initialHeight.toFixed(2)} m</p>
            <p style={{ margin: '4px 0' }}><b>Teorik Max Hız:</b> {theoreticalMaxVelocity.toFixed(2)} m/s</p>
            <p style={{ margin: '4px 0' }}><b>Yerçekimi:</b> g = 10 m/s²</p>
          </div>
        </div>
      </div>

      <div className="charts-container" style={{
        width: '600px',
        margin: '24px auto 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div className="chart" style={{
          height: '250px',
          padding: '10px',
          background: '#fafafa',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <Line options={chartOptions('Yükseklik - Zaman Grafiği', 'Yükseklik (m)')} data={heightChartData} />
        </div>
        <div className="chart" style={{
          height: '250px',
          padding: '10px',
          background: '#fafafa',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <Line options={chartOptions('Hız - Zaman Grafiği', 'Hız (m/s)')} data={velocityChartData} />
        </div>
      </div>
    </div>
  );
};

export default SerbestDusmeSimulation;