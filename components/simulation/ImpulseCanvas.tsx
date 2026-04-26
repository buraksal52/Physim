"use client";

import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from "react";
import { Simulasyon } from "@/lib/types";
import { calculateImpulseFromGraph, calculateImpulseFromMomentum } from "@/lib/physics/impulse";
import CompletionCheck from "./CompletionCheck";

interface ImpulseCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function ImpulseControlPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Kontrol Paneli
      </h4>
      {children}
    </div>
  );
}

function ImpulseObservationPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm h-full max-h-[450px] overflow-y-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Gözlem Paneli
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default function ImpulseCanvas({ slug, simulation, onComplete }: ImpulseCanvasProps) {
  const [mode, setMode] = useState<"grafik" | "duvar">("grafik");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2">
        <button
          onClick={() => setMode("grafik")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "grafik" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Kuvvet-Zaman Grafiği
        </button>
        <button
          onClick={() => setMode("duvar")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "duvar" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Top-Duvar Çarpışması
        </button>
      </div>

      {mode === "grafik" && <GraphMode slug={slug} simulation={simulation} onComplete={onComplete} />}
      {mode === "duvar" && <WallCollisionMode slug={slug} simulation={simulation} onComplete={onComplete} />}
    </div>
  );
}

// ==========================================
// MODE 1: Grafik
// ==========================================
function GraphMode({ slug, simulation, onComplete }: { slug: string; simulation: Simulasyon; onComplete: () => void }) {
  const [points, setPoints] = useState<{t: number, f: number}[]>([{t:0, f:100}, {t:2, f:100}]);
  const [mass, setMass] = useState(5);
  const [cursorT, setCursorT] = useState(2);
  
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const svgW = 600;
  const svgH = 380;
  const marginT = 20;
  const marginB = 40;
  const marginL = 60;
  const marginR = 20;

  const w = svgW - marginL - marginR;
  const h = svgH - marginT - marginB;

  const tMax = 2;
  const fMax = 200;

  const xToT = (x: number) => Math.max(0, Math.min(tMax, ((x - marginL) / w) * tMax));
  const yToF = (y: number) => Math.max(0, Math.min(fMax, ((svgH - marginB - y) / h) * fMax));
  
  const tToX = (t: number) => marginL + (t / tMax) * w;
  const fToY = (f: number) => svgH - marginB - (f / fMax) * h;

  const handlePointerDown = (e: ReactMouseEvent, idx?: number) => {
    if (idx !== undefined) {
      setDraggingIdx(idx);
    } else {
      if (points.length >= 6) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const t = xToT(x);
      const f = yToF(y);
      const newPoints = [...points, {t, f}].sort((a,b) => a.t - b.t);
      setPoints(newPoints);
      setDraggingIdx(newPoints.findIndex(p => p.t === t && p.f === f));
    }
  };

  const handlePointerMove = (e: ReactMouseEvent) => {
    if (draggingIdx === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let t = xToT(x);
    let f = yToF(y);
    
    // Bounds check to keep points ordered
    if (draggingIdx > 0 && t <= points[draggingIdx - 1].t) t = points[draggingIdx - 1].t + 0.01;
    if (draggingIdx < points.length - 1 && t >= points[draggingIdx + 1].t) t = points[draggingIdx + 1].t - 0.01;
    
    // First/Last point constraints
    if (draggingIdx === 0) t = 0;
    if (draggingIdx === points.length - 1) t = tMax;

    const newPoints = [...points];
    newPoints[draggingIdx] = {t, f};
    setPoints(newPoints);
  };

  const handlePointerUp = () => {
    setDraggingIdx(null);
  };

  const sortedPoints = [...points].sort((a,b) => a.t - b.t);
  
  // Calculate impulse up to cursorT
  const partialPoints = [];
  for (let i=0; i<sortedPoints.length; i++) {
    if (sortedPoints[i].t <= cursorT) {
      partialPoints.push(sortedPoints[i]);
    } else {
      // interpolate
      const p1 = sortedPoints[i-1];
      const p2 = sortedPoints[i];
      if (p1) {
        const f = p1.f + (p2.f - p1.f) * ((cursorT - p1.t) / (p2.t - p1.t));
        partialPoints.push({t: cursorT, f});
      }
      break;
    }
  }

  const impulse = calculateImpulseFromGraph(sortedPoints);
  const partialImpulse = calculateImpulseFromGraph(partialPoints);
  const dV = impulse / mass;

  const maxF = Math.max(...sortedPoints.map(p => p.f));
  const avgF = sortedPoints.length > 1 ? impulse / tMax : maxF;

  // Path building for shade and line
  let pathD = `M ${tToX(sortedPoints[0].t)} ${fToY(sortedPoints[0].f)} `;
  for(let i=1; i<sortedPoints.length; i++) {
    pathD += `L ${tToX(sortedPoints[i].t)} ${fToY(sortedPoints[i].f)} `;
  }

  let shadeD = `M ${tToX(partialPoints[0]?.t || 0)} ${fToY(0)} `;
  for(let i=0; i<partialPoints.length; i++) {
    shadeD += `L ${tToX(partialPoints[i].t)} ${fToY(partialPoints[i].f)} `;
  }
  if (partialPoints.length > 0) {
    shadeD += `L ${tToX(partialPoints[partialPoints.length-1].t)} ${fToY(0)} Z`;
  } else {
    shadeD = "";
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div 
          className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[380px] touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <svg width={svgW} height={svgH} className="bg-white text-zinc-900">
            {/* Grid */}
            <g stroke="#e5e7eb" strokeWidth="1">
              {[0, 40, 80, 120, 160, 200].map(y => (
                <line key={`g-y-${y}`} x1={marginL} y1={fToY(y)} x2={svgW-marginR} y2={fToY(y)} />
              ))}
              {[0, 0.4, 0.8, 1.2, 1.6, 2.0].map(x => (
                <line key={`g-x-${x}`} x1={tToX(x)} y1={marginT} x2={tToX(x)} y2={svgH-marginB} />
              ))}
            </g>

            {/* Axes */}
            <g stroke="#18181b" strokeWidth="2">
              <line x1={marginL} y1={marginT} x2={marginL} y2={svgH-marginB} />
              <line x1={marginL} y1={svgH-marginB} x2={svgW-marginR} y2={svgH-marginB} />
            </g>

            {/* Labels */}
            <text x={marginL - 10} y={marginT + 10} textAnchor="end" fontSize="12" fill="#18181b">Kuvvet (N)</text>
            <text x={svgW - marginR} y={svgH - marginB + 30} textAnchor="end" fontSize="12" fill="#18181b">Zaman (s)</text>
            
            {[0, 40, 80, 120, 160, 200].map(y => (
              <text key={`l-y-${y}`} x={marginL - 10} y={fToY(y) + 4} textAnchor="end" fontSize="10" fill="#6b7280">{y}</text>
            ))}
            {[0, 0.4, 0.8, 1.2, 1.6, 2.0].map(x => (
              <text key={`l-x-${x}`} x={tToX(x)} y={svgH - marginB + 15} textAnchor="middle" fontSize="10" fill="#6b7280">{x.toFixed(1)}</text>
            ))}

            {/* Shade Area */}
            {shadeD && <path d={shadeD} fill="#16a34a" fillOpacity="0.25" />}

            {/* Main Graph Line */}
            <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3" />

            {/* Area hit target for adding points */}
            <rect x={marginL} y={marginT} width={w} height={h} fill="transparent" cursor="crosshair" onPointerDown={e => handlePointerDown(e)} />

            {/* Control Points */}
            {sortedPoints.map((p, i) => (
              <circle 
                key={`p-${i}`}
                cx={tToX(p.t)} 
                cy={fToY(p.f)} 
                r={draggingIdx === i ? 8 : 6} 
                fill="#ea580c" 
                cursor="pointer"
                onPointerDown={e => handlePointerDown(e, i)}
              />
            ))}

            {/* Time Cursor */}
            <line x1={tToX(cursorT)} y1={marginT} x2={tToX(cursorT)} y2={svgH-marginB} stroke="#dc2626" strokeWidth="2" strokeDasharray="4" />
            <circle cx={tToX(cursorT)} cy={svgH-marginB} r={4} fill="#dc2626" />
          </svg>
        </div>

        <ImpulseControlPanel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Kütle: {mass} kg</label>
              <input type="range" min="1" max="20" step="1" value={mass} onChange={e => setMass(Number(e.target.value))} className="w-full" />
            </div>
            <div className="flex flex-col gap-2 lg:col-span-2">
              <label className="text-xs font-semibold text-gray-700">Zaman İmleci (t): {cursorT.toFixed(2)} s</label>
              <input type="range" min="0" max="2" step="0.05" value={cursorT} onChange={e => setCursorT(Number(e.target.value))} className="w-full" />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={() => setPoints([{t:0, f:100}, {t:2, f:100}])} className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm px-3 py-1.5 rounded-lg font-medium transition">
              Sabit Kuvvet
            </button>
            <button onClick={() => setPoints([{t:0, f:0}, {t:0.9, f:0}, {t:1, f:200}, {t:1.1, f:0}, {t:2, f:0}])} className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm px-3 py-1.5 rounded-lg font-medium transition">
              Ani Darbe
            </button>
            <button onClick={() => setPoints([{t:0, f:0}, {t:2, f:200}])} className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm px-3 py-1.5 rounded-lg font-medium transition">
              Kademeli Artış
            </button>
            <button onClick={() => setPoints([{t:0, f:0}, {t:2, f:0}])} className="bg-red-100 hover:bg-red-200 text-red-800 text-sm px-3 py-1.5 rounded-lg font-medium transition">
              Temizle
            </button>
          </div>
        </ImpulseControlPanel>
      </div>

      <div className="flex flex-col gap-4">
        <ImpulseObservationPanel>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">Zaman İmleci:</span><span className="font-mono text-sm">{cursorT.toFixed(2)} s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-green-700 text-sm font-semibold">Taranan İmpuls:</span><span className="font-mono text-sm text-green-700">{partialImpulse.toFixed(1)} N·s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-purple-800 text-sm font-bold">Toplam İmpuls (J):</span><span className="font-mono text-sm font-bold text-purple-800">{impulse.toFixed(1)} N·s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">Hız Değişimi (Δv):</span><span className="font-mono text-sm">{dV.toFixed(2)} m/s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-gray-600 text-sm">Ortalama Kuvvet:</span><span className="font-mono text-sm">{avgF.toFixed(1)} N</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">Maksimum Kuvvet:</span><span className="font-mono text-sm">{maxF.toFixed(1)} N</span>
          </div>
        </ImpulseObservationPanel>
      </div>
    </div>
  );
}

// ==========================================
// MODE 2: Duvar
// ==========================================
function WallCollisionMode({ slug, simulation, onComplete }: { slug: string; simulation: Simulasyon; onComplete: () => void }) {
  const [mass, setMass] = useState(2);
  const [vIn, setVIn] = useState(10);
  const [restitution, setRestitution] = useState(0.8);
  const [dtMs, setDtMs] = useState(200);
  
  const [state, setState] = useState<"ready" | "moving" | "colliding" | "bouncing" | "done">("ready");
  
  const v1 = vIn;
  const v2 = -vIn * restitution;
  const { impulse, deltaV } = calculateImpulseFromMomentum(mass, v1, v2);
  // Using absolute value of impulse for the wall arrow
  const magnitudeJ = Math.abs(impulse);
  const avgForce = magnitudeJ / (dtMs / 1000);

  const [bx, setBx] = useState(100);
  const [squash, setSquash] = useState(1);
  
  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);
  const collisionTimerRef = useRef<number>(0);

  const canvasW = 600;
  const wallX = 500;
  const pR = 20;

  useEffect(() => {
    if (state === "ready" || state === "done") return;
    
    const animate = (t: number) => {
      let deltaTime = (t - prevTimeRef.current) / 1000;
      prevTimeRef.current = t;
      if (deltaTime > 0.05) deltaTime = 0.05;
      
      if (state === "moving") {
         setBx(prev => {
            const nextX = prev + v1 * 50 * deltaTime; // 50 pixels per meter roughly
            if (nextX + pR >= wallX) {
               setState("colliding");
               collisionTimerRef.current = 0;
               return wallX - pR;
            }
            return nextX;
         });
         reqRef.current = requestAnimationFrame(animate);
      } 
      else if (state === "colliding") {
         collisionTimerRef.current += deltaTime * 1000; // ms
         // squash logic: go from 1 -> 0.5 -> 1
         const prog = collisionTimerRef.current / dtMs;
         if (prog >= 1) {
             setState("bouncing");
             setSquash(1);
         } else {
             const s = 1 - Math.sin(prog * Math.PI) * 0.4; // squashes down to 0.6
             setSquash(s);
         }
         reqRef.current = requestAnimationFrame(animate);
      }
      else if (state === "bouncing") {
         setBx(prev => {
            const nextX = prev + v2 * 50 * deltaTime; 
            if (nextX < 50) {
               setState("done");
               return 50;
            }
            return nextX;
         });
         reqRef.current = requestAnimationFrame(animate);
      }
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => { if (reqRef.current) cancelAnimationFrame(reqRef.current); };
  }, [state, v1, v2, dtMs]);

  const handleStart = () => {
    setState("moving");
    prevTimeRef.current = performance.now();
  };

  const handleReset = () => {
    setState("ready");
    setBx(100);
    setSquash(1);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[280px]">
          <svg width={canvasW} height="280" className="bg-white">
             {/* Floor */}
             <line x1="0" y1="200" x2={canvasW} y2="200" stroke="#9ca3af" strokeWidth="4" />
             
             {/* Wall */}
             <rect x={wallX} y="80" width="40" height="120" fill="#dc2626" />
             <line x1={wallX} y1="80" x2={wallX} y2="200" stroke="#991b1b" strokeWidth="2" />
             
             {/* Ball */}
             <ellipse cx={bx - (1-squash)*pR} cy="180" rx={pR * squash} ry={pR * (2-squash)} fill="#2563eb" />
             
             {/* Force Arrow during collision */}
             {state === "colliding" && (
                <g>
                  <path d="M 490 180 L 440 180 L 450 170 M 440 180 L 450 190" fill="none" stroke="#ea580c" strokeWidth="4" strokeLinecap="round" />
                  <text x="440" y="160" fill="#ea580c" fontWeight="bold">F</text>
                </g>
             )}

             {/* Finished Overlay */}
             {state === "done" && (
                <g>
                   <rect x="150" y="20" width="300" height="100" fill="white" fillOpacity="0.9" stroke="#d1d5db" rx="8" />
                   <text x="300" y="45" textAnchor="middle" fontSize="14" fill="#18181b" fontWeight="bold">Çarpışma Özeti</text>
                   <text x="170" y="65" fontSize="12" fill="#374151">Hız Değişimi: {Math.abs(deltaV).toFixed(1)} m/s</text>
                   <text x="170" y="85" fontSize="12" fill="#16a34a" fontWeight="bold">İtme (J): {magnitudeJ.toFixed(1)} N·s</text>
                   <text x="170" y="105" fontSize="12" fill="#ea580c" fontWeight="bold">Ortalama Kuvvet: {avgForce.toFixed(0)} N</text>
                </g>
             )}
          </svg>
        </div>

        <ImpulseControlPanel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Kütle: {mass} kg</label>
              <input type="range" min="0.1" max="5" step="0.1" value={mass} onChange={e => {setMass(Number(e.target.value)); handleReset();}} className="w-full" disabled={state !== "ready"} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Hız (v₁): {vIn} m/s</label>
              <input type="range" min="1" max="30" step="1" value={vIn} onChange={e => {setVIn(Number(e.target.value)); handleReset();}} className="w-full" disabled={state !== "ready"} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Sekme (e): {restitution.toFixed(2)}</label>
              <input type="range" min="0" max="1" step="0.1" value={restitution} onChange={e => {setRestitution(Number(e.target.value)); handleReset();}} className="w-full" disabled={state !== "ready"} />
            </div>
             <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Etki Süresi: {dtMs} ms</label>
              <input type="range" min="10" max="500" step="10" value={dtMs} onChange={e => {setDtMs(Number(e.target.value)); handleReset();}} className="w-full" disabled={state !== "ready"} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {state === "ready" || state === "done" ? (
                <button onClick={state === "ready" ? handleStart : handleReset} className={`flex-1 ${state === "ready" ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"} text-white py-2 rounded-lg font-medium transition`}>
                    {state === "ready" ? "Fırlat" : "Tekrar"}
                </button>
            ) : (
                <button disabled className="flex-1 bg-gray-300 text-gray-500 py-2 rounded-lg font-medium">Animasyon Sürüyor...</button>
            )}
          </div>
        </ImpulseControlPanel>
      </div>

      <div className="flex flex-col gap-4">
        <ImpulseObservationPanel>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">İlk Hız (v₁):</span><span className="font-mono text-sm">{v1.toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">Son Hız (v₂):</span><span className="font-mono text-sm">{v2.toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-gray-600 text-sm">Δv:</span><span className="font-mono text-sm">{Math.abs(deltaV).toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-green-700 text-sm font-semibold">İtme Büyüklüğü:</span><span className="font-mono text-sm text-green-700">{magnitudeJ.toFixed(1)} N·s</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-ea580c text-sm font-semibold">F_ort:</span><span className="font-mono text-sm" style={{color: "#ea580c"}}>{avgForce.toFixed(0)} N</span>
          </div>
        </ImpulseObservationPanel>

        {simulation.zorunlu_deney && (
          <CompletionCheck
             slug={slug}
             zorunluDeney={simulation.zorunlu_deney}
             observedValue={magnitudeJ}
             isFinished={state === "done"}
          />
        )}
      </div>
    </div>
  );
}
