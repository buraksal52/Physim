"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { Simulasyon } from "@/lib/types";
import { calculateWork, calculateWorkFromGraph } from "@/lib/physics/work";
import CompletionCheck from "./CompletionCheck";

interface WorkCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function WorkControlPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
        Kontrol Paneli
      </h4>
      {children}
    </div>
  );
}

function WorkObservationPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm h-full max-h-[400px] overflow-y-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
        Gözlem Paneli
      </h4>
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

type WorkMode = "kuvvet-yol" | "grafik-analizi";

export default function WorkCanvas({ slug, simulation, onComplete }: WorkCanvasProps) {
  const [mode, setMode] = useState<WorkMode>("kuvvet-yol");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2">
        <button
          onClick={() => setMode("kuvvet-yol")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "kuvvet-yol"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Kuvvet-Yol
        </button>
        <button
          onClick={() => setMode("grafik-analizi")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "grafik-analizi"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Grafik Analizi
        </button>
      </div>

      {mode === "kuvvet-yol" && (
        <ForceDistanceMode slug={slug} simulation={simulation} onComplete={onComplete} />
      )}
      {mode === "grafik-analizi" && <GraphAnalysisMode />}
    </div>
  );
}

function ForceDistanceMode({ slug, simulation, onComplete }: { slug: string; simulation: Simulasyon; onComplete: () => void }) {
  const [force, setForce] = useState(50);
  const [distance, setDistance] = useState(6);
  const [angle, setAngle] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [currentDist, setCurrentDist] = useState(0);
  
  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);

  // Math stuff
  const { work } = calculateWork(force, distance, angle);
  const isZeroWork = angle === 90;

  useEffect(() => {
    if (!isRunning || isZeroWork) return;
    const animate = (t: number) => {
      const dt = (t - prevTimeRef.current) / 1000;
      prevTimeRef.current = t;
      setCurrentDist(prev => {
        const nextDist = prev + 5 * dt; // Arbitrary speed
        if (nextDist >= distance) {
          setIsRunning(false);
          return distance;
        }
        return nextDist;
      });
      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [isRunning, distance, isZeroWork]);

  const start = () => {
    if (isZeroWork) return;
    setCurrentDist(0);
    setIsRunning(true);
    prevTimeRef.current = performance.now();
  };

  const resetBtn = () => {
    setIsRunning(false);
    setCurrentDist(0);
  };

  // Convert distance 0-20 to canvas 0-480 to leave room
  const startX = 60;
  const scaleX = 24; 
  const blockX = startX + currentDist * scaleX;
  
  // Arrow configuration
  const arrowLength = 60;
  const rad = (angle * Math.PI) / 180;
  // Canvas coordinate system points Y down, so negative sin for "up" angle
  const arrowTipX = blockX + 25 + arrowLength * Math.cos(rad);
  const arrowTipY = 200 - 15 - arrowLength * Math.sin(rad);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[300px]">
          <svg width="600" height="300" className="bg-white">
            <defs>
              <pattern id="grid-kw" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              </pattern>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-kw)" />
            
            {/* Trail */}
            {currentDist > 0 && (
              <rect x={startX + 25} y={196} width={currentDist * scaleX} height="4" fill="#16a34a" />
            )}

            {/* Surface */}
            <line x1="0" y1="200" x2="600" y2="200" stroke="#9ca3af" strokeWidth="4" />
            
            {/* Block */}
            <rect x={blockX} y={170} width="50" height="30" rx="4" fill="#2563eb" />
            
            {/* Angle Indicator arc */}
            <path
              d={`M ${blockX + 25 + 30} ${185} A 30 30 0 0 0 ${blockX + 25 + 30 * Math.cos(rad)} ${185 - 30 * Math.sin(rad)}`}
              fill="none" stroke="#ea580c" strokeWidth="2"
            />
            {angle > 0 && (
              <text x={blockX + 60} y={175} fill="#ea580c" fontSize="12" fontWeight="bold">{angle}°</text>
            )}

            {/* Force Arrow */}
            <line
              x1={blockX + 25}
              y1={185}
              x2={arrowTipX}
              y2={arrowTipY}
              stroke="#2563eb"
              strokeWidth="3"
              markerEnd="url(#arrow)"
            />
            
            {/* Label for force */}
            <text x={arrowTipX + 10} y={arrowTipY} fill="#2563eb" fontSize="14" fontWeight="bold">F</text>

            {isZeroWork && (
              <text x={300} y={80} textAnchor="middle" className="fill-red-600 font-bold text-xl">
                İş = 0 (Dik Kuvvet)
              </text>
            )}
          </svg>
        </div>

        <WorkControlPanel>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Kuvvet: {force} N</label>
              <input type="range" min="1" max="200" value={force} onChange={(e) => { setForce(Number(e.target.value)); resetBtn(); }} className="w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Yol: {distance} m</label>
              <input type="range" min="1" max="20" value={distance} onChange={(e) => { setDistance(Number(e.target.value)); resetBtn(); }} className="w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Açı: {angle}°</label>
              <input type="range" min="0" max="90" value={angle} onChange={(e) => { setAngle(Number(e.target.value)); resetBtn(); }} className="w-full" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={start} disabled={isRunning} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-medium transition">
              Başlat
            </button>
            <button onClick={resetBtn} className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition">
              Sıfırla
            </button>
          </div>
        </WorkControlPanel>
      </div>

      <div className="flex flex-col gap-4">
        <WorkObservationPanel>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Kuvvet (F):</span>
            <span className="font-mono font-medium text-blue-600">{force} N</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Yol (d):</span>
            <span className="font-mono font-medium">{distance} m</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Açı (θ):</span>
            <span className="font-mono font-medium text-orange-600">{angle}°</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">cos(θ):</span>
            <span className="font-mono font-medium">{Math.cos((angle * Math.PI) / 180).toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Yapılan İş (W):</span>
            <span className="font-mono font-medium text-green-600">{work.toFixed(1)} J</span>
          </div>
        </WorkObservationPanel>
        
        {simulation.zorunlu_deney && (
          <CompletionCheck
            slug={slug}
            zorunluDeney={simulation.zorunlu_deney}
            observedValue={work}
            isFinished={!isRunning && currentDist >= distance && currentDist !== 0}
          />
        )}
      </div>
    </div>
  );
}

function GraphAnalysisMode() {
  const [points, setPoints] = useState<{x: number, f: number}[]>([
    {x: 0, f: 0},
    {x: 10, f: 100},
    {x: 20, f: 100}
  ]);
  const [cursorX, setCursorX] = useState(10);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const maxPoints = 6;
  
  const SVG_W = 600;
  const SVG_H = 380;
  const margin = 40;
  
  const mapX = (x: number) => margin + (x / 20) * (SVG_W - 2 * margin);
  const mapY = (f: number) => SVG_H - margin - (f / 200) * (SVG_H - 2 * margin);
  
  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    if (draggingIdx !== null || points.length >= maxPoints) return;
    
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    let x = ((clickX - margin) / (SVG_W - 2 * margin)) * 20;
    let f = 200 - ((clickY - margin) / (SVG_H - 2 * margin)) * 200;
    
    x = Math.max(0, Math.min(20, x));
    f = Math.max(0, Math.min(200, f));
    
    const newPoints = [...points, {x, f}].sort((a,b) => a.x - b.x);
    setPoints(newPoints);
  };

  const handlePointerDown = (idx: number, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingIdx(idx);
    const elem = e.target as Element;
    elem.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if(draggingIdx === null) return;
    const svg = (e.target as Element).closest('svg');
    if(!svg) return;
    const rect = svg.getBoundingClientRect();
    
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;
    
    let x = ((clickX - margin) / (SVG_W - 2 * margin)) * 20;
    let f = 200 - ((clickY - margin) / (SVG_H - 2 * margin)) * 200;
    
    x = Math.max(0, Math.min(20, x));
    f = Math.max(0, Math.min(200, f));
    
    setPoints(prev => {
        const next = [...prev];
        next[draggingIdx] = {x, f};
        return next.sort((a,b) => a.x - b.x);
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if(draggingIdx !== null) {
      const elem = e.target as Element;
      elem.releasePointerCapture(e.pointerId);
      setDraggingIdx(null);
    }
  };

  const clear = () => setPoints([]);
  const setSabit = () => setPoints([{x:0, f:100}, {x:20, f:100}]);
  const setArtan = () => setPoints([{x:0, f:0}, {x:20, f:200}]);
  const setYay = () => setPoints([{x:0, f:20}, {x:10, f:150}, {x:20, f:20}]);

  const sortedPoints = [...points].sort((a,b) => a.x - b.x);
  
  const pathD = sortedPoints.map((p,i) => `${i===0?'M':'L'} ${mapX(p.x)} ${mapY(p.f)}`).join(" ");
  
  let areaD = "";
  if(sortedPoints.length > 0) {
      areaD = pathD;
      areaD += ` L ${mapX(sortedPoints[sortedPoints.length-1].x)} ${mapY(0)}`;
      areaD += ` L ${mapX(sortedPoints[0].x)} ${mapY(0)} Z`;
  }

  const cursorPoints = sortedPoints.filter(p => p.x <= cursorX);
  const nextPoint = sortedPoints.find(p => p.x > cursorX);
  
  let interpolatedPoints = [...cursorPoints];
  if(nextPoint && cursorPoints.length > 0) {
      const last = cursorPoints[cursorPoints.length-1];
      const ratio = (cursorX - last.x) / (nextPoint.x - last.x);
      const f = last.f + ratio * (nextPoint.f - last.f);
      interpolatedPoints.push({x: cursorX, f});
  } else if (sortedPoints.length > 0 && cursorX > sortedPoints[sortedPoints.length-1].x) {
      interpolatedPoints = sortedPoints;
  }

  const totalWork = calculateWorkFromGraph(sortedPoints);
  const cursorWork = calculateWorkFromGraph(interpolatedPoints);
  
  // Summing up segment contributions for the observation panel
  const segments = [];
  for(let i=1; i<sortedPoints.length; i++) {
      const w = calculateWorkFromGraph([sortedPoints[i-1], sortedPoints[i]]);
      segments.push(w);
  }
  const avgForce = totalWork / 20;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner">
          <svg 
            width="100%" 
            height={SVG_H} 
            onClick={handleSvgClick} 
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="touch-none"
          >
            <defs>
              <pattern id="grid-graph" width="26" height="30" patternUnits="userSpaceOnUse">
                <path d="M 26 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-graph)" />
            
            {/* Area */}
            {points.length > 1 && (
                <path d={areaD} fill="#16a34a" fillOpacity="0.25" />
            )}

            {/* Axes */}
            <line x1={mapX(0)} y1={margin/2} x2={mapX(0)} y2={mapY(0)} stroke="#9ca3af" strokeWidth="2" />
            <line x1={mapX(0)} y1={mapY(0)} x2={SVG_W - margin/2} y2={mapY(0)} stroke="#9ca3af" strokeWidth="2" />
            
            <text x={mapX(0)-30} y={margin/2+10} fontSize="12" fill="#4b5563">F (N)</text>
            <text x={SVG_W - margin/2 - 30} y={mapY(0)+20} fontSize="12" fill="#4b5563">x (m)</text>
            
            {/* Draw Path */}
            {points.length > 1 && (
              <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3" />
            )}
            
            {/* Points */}
            {sortedPoints.map((p,i) => (
                <circle
                  key={i}
                  cx={mapX(p.x)}
                  cy={mapY(p.f)}
                  r="8"
                  fill="#ea580c"
                  className="cursor-pointer hover:fill-red-500"
                  onPointerDown={(e) => handlePointerDown(i, e)}
                />
            ))}
            
            {/* Cursor Line */}
            <line x1={mapX(cursorX)} y1={margin} x2={mapX(cursorX)} y2={mapY(0)} stroke="#dc2626" strokeDasharray="4" />
          </svg>
        </div>
        
        <WorkControlPanel>
          <div className="flex gap-2 mb-4 overflow-x-auto">
             <button onClick={clear} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium">Temizle</button>
             <button onClick={setSabit} className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm font-medium">Sabit Kuvvet</button>
             <button onClick={setArtan} className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm font-medium">Artan Kuvvet</button>
             <button onClick={setYay} className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm font-medium">Yay Kuvveti</button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-gray-700">İmleç: {cursorX.toFixed(1)} m</label>
              <span className="text-sm font-medium text-green-600">Alana kadar iş: {cursorWork.toFixed(0)} J</span>
            </div>
            <input type="range" min="0" max="20" step="0.1" value={cursorX} onChange={e => setCursorX(Number(e.target.value))} className="w-full" />
          </div>
        </WorkControlPanel>
      </div>

      <div>
        <WorkObservationPanel>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Toplam İş:</span>
            <span className="font-mono font-bold text-green-600">{totalWork.toFixed(0)} J</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Ortalama Kuvvet:</span>
            <span className="font-mono font-medium">{avgForce.toFixed(1)} N</span>
          </div>
          <div className="mt-2 text-sm text-gray-500 font-medium border-b pb-1">Segment Katkıları:</div>
          {segments.map((w, i) => (
             <div key={i} className="flex justify-between py-1 text-sm border-b last:border-0 border-dashed">
                <span className="text-gray-500">Aralık {i+1}</span>
                <span className="font-mono">{w.toFixed(0)} J</span>
             </div>
          ))}
          {points.length < 2 && (
             <div className="text-xs text-red-500 mt-2">En az 2 nokta ekleyin.</div>
          )}
        </WorkObservationPanel>
      </div>
    </div>
  );
}