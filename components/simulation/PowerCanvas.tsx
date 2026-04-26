"use client";

import { useState, useRef, useEffect } from "react";
import { Simulasyon } from "@/lib/types";
import { calculateLiftPower, calculateEfficiency } from "@/lib/physics/power";
import CompletionCheck from "./CompletionCheck";

interface PowerCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function PowerControlPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Kontrol Paneli
      </h4>
      {children}
    </div>
  );
}

function PowerObservationPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm h-full max-h-[420px] overflow-y-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Gözlem Paneli
      </h4>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

export default function PowerCanvas({ slug, simulation, onComplete }: PowerCanvasProps) {
  const [mass, setMass] = useState(500);
  const [targetHeight, setTargetHeight] = useState(10);
  const [duration, setDuration] = useState(5);
  const [efficiency, setEfficiency] = useState(100);

  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);

  const { work: totalUsefulWork, power: targetUsefulPower } = calculateLiftPower(mass, targetHeight, duration, 9.8);
  const inputPower = targetUsefulPower / (efficiency / 100);
  const lostPower = inputPower - targetUsefulPower;

  // Real time scaling (animation scaling)
  // E.g., if duration is 30s, animating 30s is too long. We cap animation max duration visually using a scaled factor 
  // Let's just use real time up to ~10s, if > 10 it speeds up.
  const timeScale = duration > 10 ? duration / 10 : 1;

  useEffect(() => {
    if (!isRunning) return;
    const animate = (t: number) => {
      const wallDt = (t - prevTimeRef.current) / 1000;
      prevTimeRef.current = t;
      
      const simDt = wallDt * timeScale;
      setElapsed((prev) => {
        const next = prev + simDt;
        if (next >= duration) {
          setIsRunning(false);
          return duration;
        }
        return next;
      });
      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [isRunning, duration, timeScale]);

  const handleStart = () => {
    if (isRunning || elapsed >= duration) {
      setElapsed(0);
    }
    setIsRunning(true);
    prevTimeRef.current = performance.now();
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
  };

  const isFinished = elapsed >= duration && duration > 0;
  
  // Real time values
  const currentHeight = (elapsed / duration) * targetHeight;
  const currentWork = (elapsed / duration) * totalUsefulWork;
  const currentInstPower = isRunning ? targetUsefulPower : 0; // useful power during lift
  const currentInputPower = isRunning ? inputPower : 0;

  // Visual layout
  const MAX_RENDER_H = 340;
  const BOTTOM_Y = 380;
  const hRatio = currentHeight / targetHeight || 0;
  // platform Y
  const platY = BOTTOM_Y - (hRatio * MAX_RENDER_H);

  // Power gauge (max input power slider 2000kg * 50m / 1s * ~10 / 0.50 => ~2M W limit. We'll use log10 to map).
  // log10(1,000 W) = 3 -> log10(2,000,000) = 6.3.
  const logMax = 6.5; 
  const currentLog = currentInputPower > 0 ? Math.log10(currentInputPower) : 0;
  const powerGaugeHeight = Math.min(200, Math.max(0, (currentLog / logMax) * 200));

  let gaugeColor = "#16a34a"; // Green
  if (currentLog > 4) gaugeColor = "#eab308"; // >10kW yellow
  if (currentLog > 5) gaugeColor = "#dc2626"; // >100kW red

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Canvas Area */}
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[420px]">
          <svg width="600" height="420" className="bg-white">
            <defs>
              <pattern id="grid-power" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-power)" />

            {/* Shaft & Motor Unit */}
            <rect x="250" y="20" width="100" height="20" rx="4" fill="#2563eb" />
            <text x="300" y="34" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">MOTOR</text>
            
            {/* Cable */}
            <line x1="300" y1="40" x2="300" y2={platY} stroke="#4b5563" strokeWidth="3" />
            
            {/* Ground */}
            <line x1="150" y1={BOTTOM_Y + 10} x2="450" y2={BOTTOM_Y + 10} stroke="#9ca3af" strokeWidth="5" />

            {/* Platform & Load */}
            {/* Platform */}
            <rect x="260" y={platY} width="80" height="10" rx="2" fill="#4b5563" />
            {/* Load (Orange) */}
            <rect x="270" y={platY - 40} width="60" height="40" rx="4" fill="#ea580c" />
            <text x="300" y={platY - 15} fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">{mass} kg</text>

            {/* Scale on left */}
            <line x1="220" y1="40" x2="220" y2={BOTTOM_Y} stroke="#d1d5db" strokeWidth="2" strokeDasharray="4" />
            <text x="210" y="45" fill="#6b7280" fontSize="12" textAnchor="end">{targetHeight} m</text>
            <text x="210" y={BOTTOM_Y} fill="#6b7280" fontSize="12" textAnchor="end">0 m</text>
            
            {/* Realtime Power Bar (Right side) */}
            <rect x="520" y="100" width="20" height="200" fill="#f3f4f6" stroke="#d1d5db" />
            <rect 
               x="520" 
               y={100 + (200 - powerGaugeHeight)} 
               width="20" 
               height={powerGaugeHeight} 
               fill={gaugeColor} 
            />
            <text x="530" y="85" fill="#374151" fontSize="10" fontWeight="bold" textAnchor="middle">GÜÇ (W)</text>
            <text x="530" y={320} fill={gaugeColor} fontSize="12" fontWeight="bold" textAnchor="middle">
              {currentInputPower > 1000 ? (currentInputPower/1000).toFixed(1) + "k" : currentInputPower.toFixed(0)}
            </text>

            {/* Motor gear animation spin */}
            {isRunning && (
               <circle cx="300" cy="30" r="15" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4" className="animate-spin" style={{ transformOrigin: "300px 30px" }} />
            )}
          </svg>
        </div>

        {/* Control Panel */}
        <PowerControlPanel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Kütle: {mass} kg</label>
              <input type="range" min="100" max="2000" step="50" value={mass} onChange={(e) => { setMass(Number(e.target.value)); handleReset(); }} className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Yükseklik: {targetHeight} m</label>
              <input type="range" min="5" max="50" value={targetHeight} onChange={(e) => { setTargetHeight(Number(e.target.value)); handleReset(); }} className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Süre: {duration} s</label>
              <input type="range" min="1" max="30" value={duration} onChange={(e) => { setDuration(Number(e.target.value)); handleReset(); }} className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Verim: %{efficiency}</label>
              <input type="range" min="50" max="100" value={efficiency} onChange={(e) => { setEfficiency(Number(e.target.value)); handleReset(); }} className="w-full" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleStart} disabled={isRunning && !isFinished} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-medium transition">
              {isFinished ? "Tekrar Kaldır" : "Kaldır"}
            </button>
            <button onClick={handleReset} className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition">
              Sıfırla
            </button>
          </div>
        </PowerControlPanel>
      </div>

      {/* Observation Panel */}
      <div className="flex flex-col gap-4">
        <PowerObservationPanel>
          <div className="flex justify-between border-b border-dashed pb-1">
            <span className="text-gray-600 text-sm">Geçen Süre (t):</span>
            <span className="font-mono font-medium text-sm">{elapsed.toFixed(1)} s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
            <span className="text-gray-600 text-sm">Yükseklik (h):</span>
            <span className="font-mono font-medium text-sm">{currentHeight.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
            <span className="text-gray-600 text-sm">Yapılan İş (W):</span>
            <span className="font-mono font-medium text-sm">{currentWork.toFixed(0)} J</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
            <span className="text-gray-600 text-sm">Anlık Faydalı Güç:</span>
            <span className="font-mono font-medium text-blue-600 text-sm">{currentInstPower.toFixed(0)} W</span>
          </div>
          <div className="flex justify-between pb-1">
            <span className="text-gray-600 text-sm">Harcanan Güç:</span>
            <span className="font-mono font-medium text-red-600 text-sm">{currentInputPower.toFixed(0)} W</span>
          </div>

          {/* Efficiency Bar visual inside observation panel */}
          <div className="mt-3">
             <div className="text-xs text-gray-500 mb-1 font-semibold border-b pb-1">Güç Kaybı / Verim Göstergesi</div>
             <div className="flex w-full h-4 bg-gray-200 rounded overflow-hidden mt-2">
                <div style={{ width: `${efficiency}%` }} className="bg-green-500 h-full flex items-center pl-1">
                   <span className="text-[10px] text-white font-bold">% {efficiency}</span>
                </div>
                {efficiency < 100 && (
                   <div style={{ width: `${100 - efficiency}%` }} className="bg-red-400 h-full flex items-center justify-end pr-1">
                      <span className="text-[10px] text-white font-bold">% {100 - efficiency}</span>
                   </div>
                )}
             </div>
             <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>Faydalı</span>
                <span>Kayıp</span>
             </div>
          </div>

          {/* Summary Card */}
          {isFinished && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
               <h5 className="text-xs font-bold text-blue-800 mb-2">Hareket Özeti</h5>
               <div className="flex justify-between text-xs text-gray-700 mb-1">
                  <span>Toplam İş:</span>
                  <span className="font-mono">{totalUsefulWork.toFixed(0)} J</span>
               </div>
               <div className="flex justify-between text-xs text-gray-700 mb-1">
                  <span>Ort. Faydalı Güç:</span>
                  <span className="font-mono font-bold">{targetUsefulPower.toFixed(0)} W</span>
               </div>
               <div className="flex justify-between text-xs text-gray-700 mb-1">
                  <span>Aktarılan Güç:</span>
                  <span className="font-mono">{inputPower.toFixed(0)} W</span>
               </div>
               <div className="flex justify-between text-xs text-gray-700">
                  <span>Kayıp Güç:</span>
                  <span className="font-mono text-red-600">{lostPower.toFixed(0)} W</span>
               </div>
            </div>
          )}
        </PowerObservationPanel>

        {simulation.zorunlu_deney && (
          <CompletionCheck
            slug={slug}
            zorunluDeney={simulation.zorunlu_deney}
            observedValue={targetUsefulPower}
            isFinished={isFinished}
          />
        )}
      </div>
    </div>
  );
}