"use client";

import { useState, useRef, useEffect } from "react";
import { Simulasyon } from "@/lib/types";
import { calculateKineticEnergy, calculatePotentialEnergy, calculateTotalEnergy, calculateVelocityFromHeight } from "@/lib/physics/energy";
import CompletionCheck from "./CompletionCheck";

interface EnergyCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function EnergyControlPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Kontrol Paneli
      </h4>
      {children}
    </div>
  );
}

function EnergyObservationPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm h-full max-h-[450px] overflow-y-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Gözlem Paneli
      </h4>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function SharedEnergyDisplay({ ek, ep, initE }: { ek: number; ep: number; initE: number }) {
  const currentE = ek + ep;
  const lostE = Math.max(0, initE - currentE);
  // Stacked bar max is initE
  const eScale = initE > 0 ? 200 / initE : 0;
  
  const hEk = ek * eScale;
  const hEp = ep * eScale;
  // total purple line at top of initE
  
  return (
    <div className="relative w-[80px] h-[220px] bg-gray-100 rounded-lg p-2 border flex flex-col items-center justify-end overflow-hidden pb-4">
       {/* Background total E line marker */}
       <div className="absolute top-[10px] w-[90%] left-[5%] border-b-2 border-purple-600 border-dashed z-10" />
       
       <div className="relative w-10 flex flex-col justify-end" style={{ height: "200px" }}>
          {lostE > 1 && (
            <div className="absolute -top-6 -left-6 bg-red-100 text-red-700 text-[10px] px-1 py-0.5 rounded font-bold border border-red-300 w-[100px] text-center shadow-sm z-20">
              Enerji Kaybı
            </div>
          )}
          {/* Ep bar */}
          <div style={{ height: hEp }} className="w-full bg-orange-600 transition-all duration-75 flex flex-col justify-end items-center text-white text-[10px] font-bold overflow-hidden">
             {hEp > 15 && `${ep.toFixed(0)} J`}
          </div>
          {/* Ek bar */}
          <div style={{ height: hEk }} className="w-full bg-green-600 transition-all duration-75 flex flex-col justify-start items-center text-white text-[10px] font-bold overflow-hidden">
             {hEk > 15 && `${ek.toFixed(0)} J`}
          </div>
       </div>
       <div className="text-[10px] font-bold text-gray-500 mt-2">ENERJİ</div>
    </div>
  );
}

export default function EnergyCanvas({ slug, simulation, onComplete }: EnergyCanvasProps) {
  const [mode, setMode] = useState<"sarkic" | "rampa">("sarkic");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2">
        <button
          onClick={() => setMode("sarkic")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "sarkic" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Sarkıç
        </button>
        <button
          onClick={() => setMode("rampa")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "rampa" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Rampa
        </button>
      </div>

      {mode === "sarkic" && <PendulumMode slug={slug} simulation={simulation} onComplete={onComplete} />}
      {mode === "rampa" && <RampMode />}
    </div>
  );
}

// ==========================================
// MODE 1: Sarkıç
// ==========================================
function PendulumMode({ slug, simulation, onComplete }: { slug: string; simulation: Simulasyon; onComplete: () => void }) {
  const [length, setLength] = useState(5);
  const [angle0, setAngle0] = useState(60); // degrees
  const [mass, setMass] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  
  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning) return;
    const animate = (t: number) => {
      const dt = (t - prevTimeRef.current) / 1000;
      prevTimeRef.current = t;
      setElapsed((prev) => prev + dt);
      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(!isRunning);
    if (!isRunning) prevTimeRef.current = performance.now();
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
  };

  // Math stuff
  const rad0 = (angle0 * Math.PI) / 180;
  const omega = Math.sqrt(9.8 / length);
  const currentAngle = rad0 * Math.cos(omega * elapsed);
  
  const hMax = length - length * Math.cos(rad0);
  const currentHeight = length - length * Math.cos(currentAngle);
  
  // Calculate Ek correctly since the provided getPendulumPosition returns a physically un-sound 'v'
  const trueV = Math.sqrt(Math.max(0, 2 * 9.8 * (hMax - currentHeight)));
  
  const { ek } = calculateKineticEnergy(mass, trueV);
  const { ep } = calculatePotentialEnergy(mass, currentHeight, 9.8);
  const totalE = mass * 9.8 * hMax;

  // Flash max/min labels
  const isEdges = Math.abs(currentAngle) >= rad0 * 0.98;
  const isBottom = Math.abs(currentAngle) <= 0.05;

  const PIXELS_PER_M = 40;
  const pivotX = 250;
  const pivotY = 20;
  // pendulum coord (y downwards)
  const px = pivotX + (length * Math.sin(currentAngle)) * PIXELS_PER_M;
  const py = pivotY + (length * Math.cos(currentAngle)) * PIXELS_PER_M;
  
  // Arc path for the faint trace
  const arcLengthPx = length * PIXELS_PER_M;
  const arcLeftX = pivotX + arcLengthPx * Math.sin(-rad0);
  const arcLeftY = pivotY + arcLengthPx * Math.cos(-rad0);
  const arcRightX = pivotX + arcLengthPx * Math.sin(rad0);
  const arcRightY = pivotY + arcLengthPx * Math.cos(rad0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[450px]">
          <svg width="500" height="450" className="bg-white">
             {/* Trace arc */}
             <path 
                d={`M ${arcLeftX} ${arcLeftY} A ${arcLengthPx} ${arcLengthPx} 0 0 0 ${arcRightX} ${arcRightY}`} 
                fill="none" stroke="#d1d5db" strokeWidth="2" strokeDasharray="4"
             />
             
             {/* Pivot point */}
             <circle cx={pivotX} cy={pivotY} r="4" fill="#374151" />
             <line x1={pivotX - 20} y1={pivotY} x2={pivotX + 20} y2={pivotY} stroke="#374151" strokeWidth="4" strokeLinecap="round" />
             
             {/* String */}
             <line x1={pivotX} y1={pivotY} x2={px} y2={py} stroke="#6b7280" strokeWidth="2" />
             
             {/* Bob */}
             <circle cx={px} cy={py} r="14" fill="#2563eb" />
             
             {/* dynamic text flashes */}
             {isEdges && isRunning && (
                <text x="250" y="420" textAnchor="middle" fill="#ea580c" fontSize="14" fontWeight="bold">Ep max / Ek = 0</text>
             )}
             {isBottom && isRunning && (
                <text x="250" y="420" textAnchor="middle" fill="#16a34a" fontSize="14" fontWeight="bold">Ek max / Ep = 0</text>
             )}
          </svg>
          
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
             <SharedEnergyDisplay ek={ek} ep={ep} initE={totalE} />
          </div>
        </div>
        
        <EnergyControlPanel>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Uzunluk: {length} m</label>
              <input type="range" min="0.5" max="5" step="0.5" value={length} onChange={e => {setLength(Number(e.target.value)); handleReset();}} className="w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Açı: {angle0}°</label>
              <input type="range" min="5" max="90" value={angle0} onChange={e => {setAngle0(Number(e.target.value)); handleReset();}} className="w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Kütle: {mass} kg</label>
              <input type="range" min="1" max="10" value={mass} onChange={e => {setMass(Number(e.target.value)); handleReset();}} className="w-full" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleStart} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition">
              {isRunning ? "Durdur" : "Başlat"}
            </button>
            <button onClick={handleReset} className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition">
              Sıfırla
            </button>
          </div>
        </EnergyControlPanel>
      </div>

      <div className="flex flex-col gap-4">
        <EnergyObservationPanel>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">Açı (°):</span><span className="font-mono text-sm">{(currentAngle * 180 / Math.PI).toFixed(1)}°</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">h (m):</span><span className="font-mono text-sm">{currentHeight.toFixed(2)} m</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">v (m/s):</span><span className="font-mono text-sm">{trueV.toFixed(2)} m/s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm text-green-700">Ek (J):</span><span className="font-mono text-sm text-green-700">{ek.toFixed(1)} J</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm text-orange-600">Ep (J):</span><span className="font-mono text-sm text-orange-600">{ep.toFixed(1)} J</span>
          </div>
          <div className="flex justify-between font-bold pb-1 bg-purple-50 p-1 rounded mt-1">
             <span className="text-purple-800 text-sm">Toplam (J):</span><span className="font-mono text-sm text-purple-800">{totalE.toFixed(1)} J</span>
          </div>
        </EnergyObservationPanel>

        {simulation.zorunlu_deney && (
          <CompletionCheck
             slug={slug}
             zorunluDeney={simulation.zorunlu_deney}
             observedValue={Math.sqrt(2 * 9.8 * hMax)} // Max expected bottom speed based on exact length and angles
             isFinished={isRunning}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// MODE 2: Rampa (U shape)
// ==========================================
function RampMode() {
  const R = 20; // fixed curve radius mapping to 20m high
  const [h0, setH0] = useState(10);
  const [mass, setMass] = useState(5);
  const [mu, setMu] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const stateRef = useRef({ theta: 0, w: 0, workFric: 0 });
  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);
  
  const [renderCounter, setRenderCounter] = useState(0);

  // Initialize
  useEffect(() => {
     if (!isRunning) {
         stateRef.current = { theta: Math.acos(1 - h0 / R), w: 0, workFric: 0 };
         setRenderCounter(c => c+1);
     }
  }, [h0, isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    const animate = (t: number) => {
      let dt = (t - prevTimeRef.current) / 1000;
      prevTimeRef.current = t;
      if (dt > 0.05) dt = 0.05; // cap dt
      
      let { theta, w, workFric } = stateRef.current;
      const g = 9.8;
      
      // sub-steps for stability
      const steps = 5;
      const subDt = dt / steps;
      for(let i=0; i<steps; i++) {
          const dir = w > 0 ? -1 : (w < 0 ? 1 : 0);
          let aGrav = -(g / R) * Math.sin(theta);
          let aFric = 0;
          if (w !== 0 || Math.abs((g / R) * Math.sin(theta)) > Math.abs(mu * (g / R) * Math.cos(theta))) {
              aFric = dir * mu * (g / R) * Math.cos(theta);
          } else {
              aGrav = 0; // statically stuck
              w = 0;
          }
          const a = aGrav + aFric;
          w += a * subDt;
          
          const oldTheta = theta;
          theta += w * subDt;
          
          if(Math.abs(w) > 0.01) {
              const dDist = Math.abs(theta - oldTheta) * R;
              workFric += mu * mass * g * Math.cos(theta) * dDist;
          }
      }
      
      stateRef.current = { theta, w, workFric };
      setRenderCounter(c => c+1);
      
      // If stuck, stop loop
      if (Math.abs(w) < 0.01 && Math.abs((g / R) * Math.sin(theta)) <= mu * (g / R) * Math.cos(theta)) {
          setIsRunning(false);
      } else {
          reqRef.current = requestAnimationFrame(animate);
      }
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => {
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
    }
  }, [isRunning, mass, mu]);

  const handleStart = () => {
    setIsRunning(!isRunning);
    if (!isRunning) prevTimeRef.current = performance.now();
  };

  const handleReset = () => {
    setIsRunning(false);
    stateRef.current = { theta: Math.acos(1 - h0 / R), w: 0, workFric: 0 };
    setRenderCounter(c => c+1);
  };

  const { theta, w, workFric } = stateRef.current;
  const currentHeight = R * (1 - Math.cos(theta));
  const currentV = Math.abs(w * R);
  const totalE = mass * 9.8 * h0;
  const ep = mass * 9.8 * currentHeight;
  const ek = Math.max(0, totalE - ep - workFric); 
  
  // Projection logic
  const svgW = 600;
  const svgH = 380;
  // center of arc at x=300, y = 30 (offset from top)
  const cx = 300;
  const cy = -80; // arc starts lower
  // arc radius to visual fit
  const pixelR = 400; // so ball goes from (cx+pixelR*sin, cy+pixelR*cos)
  
  // We'll just map theta directly
  const bx = cx + pixelR * Math.sin(theta);
  const by = cy + pixelR * Math.cos(theta); // when theta=0, by=cy+400 = 320 (bottom)

  // the path for the full arc is from -pi/2 to pi/2 roughly, but we restrict it visual
  const arcD = `M ${cx - pixelR} ${cy} A ${pixelR} ${pixelR} 0 0 0 ${cx + pixelR} ${cy}`;
  
  const bottomY = cy + pixelR;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[380px]">
          <svg width="600" height="380" className="bg-white">
             {/* Background curved ramp */}
             <path d={arcD} fill="none" stroke="#9ca3af" strokeWidth="8" strokeLinecap="round" />
             
             {/* If NO friction, dotted line showing target height is identical on both sides */}
             {mu === 0 && (
                <line x1="50" y1={cy + pixelR * Math.cos(Math.acos(1-h0/R))} x2="550" y2={cy + pixelR * Math.cos(Math.acos(1-h0/R))} stroke="#9ca3af" strokeDasharray="5" strokeWidth="1" />
             )}
             
             {/* Ball */}
             <circle cx={bx} cy={by - 10} r="12" fill="#2563eb" />
             
             {/* Start Marker */}
             <text x={cx + pixelR * Math.sin(Math.acos(1-h0/R)) + 20} y={cy + pixelR * Math.cos(Math.acos(1-h0/R))} fill="#6b7280" fontSize="12" fontWeight="bold">h₀</text>
             
             {/* Current Height label proxy */}
             <line x1={bx - 30} y1={by} x2={bx - 80} y2={by} stroke="#d1d5db" strokeDasharray="3" />
             <text x={bx - 90} y={by+4} fill="#2563eb" fontSize="12" textAnchor="end">h: {currentHeight.toFixed(1)}m</text>
          </svg>
          
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
             <SharedEnergyDisplay ek={ek} ep={ep} initE={totalE} />
          </div>
        </div>

        <EnergyControlPanel>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Yükseklik: {h0} m</label>
              <input type="range" min="1" max="20" step="1" value={h0} onChange={e => {setH0(Number(e.target.value)); handleReset();}} className="w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Kütle: {mass} kg</label>
              <input type="range" min="1" max="20" step="1" value={mass} onChange={e => {setMass(Number(e.target.value)); handleReset();}} className="w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Sürtünme (μ): {mu.toFixed(2)}</label>
              <input type="range" min="0" max="0.4" step="0.05" value={mu} onChange={e => {setMu(Number(e.target.value)); handleReset();}} className="w-full" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleStart} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition">
              {isRunning ? "Durdur" : "Başlat"}
            </button>
            <button onClick={handleReset} className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition">
              Sıfırla
            </button>
          </div>
        </EnergyControlPanel>
      </div>

      <div className="flex flex-col gap-4">
        <EnergyObservationPanel>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">h (m):</span><span className="font-mono text-sm">{currentHeight.toFixed(2)} m</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">v (m/s):</span><span className="font-mono text-sm">{currentV.toFixed(2)} m/s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-gray-600 text-sm text-green-700">Ek (J):</span><span className="font-mono text-sm text-green-700">{ek.toFixed(1)} J</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm text-orange-600">Ep (J):</span><span className="font-mono text-sm text-orange-600">{ep.toFixed(1)} J</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm text-red-600">Kayıp W_f (J):</span><span className="font-mono text-sm text-red-600">{workFric.toFixed(1)} J</span>
          </div>
          <div className="flex justify-between font-bold pb-1 bg-purple-50 p-1 rounded mt-1">
             <span className="text-purple-800 text-sm">Toplam (J):</span><span className="font-mono text-sm text-purple-800">{totalE.toFixed(1)} J</span>
          </div>
        </EnergyObservationPanel>
      </div>
    </div>
  );
}