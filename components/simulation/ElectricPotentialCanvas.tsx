"use client";

import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from "react";
import { Simulasyon } from "@/lib/types";
import { calculatePotentialAtPoint, calculatePotentialEnergy } from "@/lib/physics/electricPotential";
import CompletionCheck from "./CompletionCheck";

interface ElectricPotentialCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function EPPnl({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Kontrol Paneli
      </h4>
      {children}
    </div>
  );
}

function EPObsPnl({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm h-full max-h-[500px] overflow-y-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Gözlem Paneli
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default function ElectricPotentialCanvas({ slug, simulation, onComplete }: ElectricPotentialCanvasProps) {
  const [mode, setMode] = useState<"equi" | "energy">("equi");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2">
        <button
          onClick={() => setMode("equi")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "equi" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Eşpotansiyel Eğriler
        </button>
        <button
          onClick={() => setMode("energy")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "energy" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Potansiyel Enerji ve Yük Hareketi
        </button>
      </div>

      {mode === "equi" ? <EquipotentialMode slug={slug} simulation={simulation} onComplete={onComplete} /> : <EnergyMode />}
    </div>
  );
}

// ------------------- MODE 1: Equipotential Lines -------------------

function EquipotentialMode({ slug, simulation, onComplete }: { slug: string; simulation: Simulasyon; onComplete: () => void }) {
  const [charges, setCharges] = useState<{ id: number, q: number, sign: number, x: number, y: number }[]>([
     { id: 1, q: 4, sign: 1, x: 300, y: 250 }
  ]);
  const [selectedCharge, setSelectedCharge] = useState<number | null>(null);
  
  const [markerPos, setMarkerPos] = useState<{ x: number, y: number } | null>(null);
  const [draggingCharge, setDraggingCharge] = useState<number | null>(null);

  const nextId = useRef(2);

  const PIXELS_PER_METER = 100;
  
  // Create grid for equipotential lines (marching squares simplified via svg overlapping or contour paths)
  // To avoid complex JS marching squares, we generate static threshold paths
  // Or simpler: generate highly dense rect heat map masked by potential thresholds to draw thick contour lines
  
  // For SVG performance, since we only need 10-15 levels, establishing a contour generator 
  const generateContours = () => {
    const W = 600;
    const H = 500;
    const step = 15; // Grid resolution
    const cols = Math.ceil(W / step);
    const rows = Math.ceil(H / step);
    
    const V = new Float32Array((cols + 1) * (rows + 1));
    const chgs = charges.map(c => ({ q: c.q * c.sign * 1e-6, x: c.x / PIXELS_PER_METER, y: c.y / PIXELS_PER_METER }));

    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const px = (i * step) / PIXELS_PER_METER;
        const py = (j * step) / PIXELS_PER_METER;
        V[j * (cols + 1) + i] = calculatePotentialAtPoint(chgs, px, py).V;
      }
    }

    const levels = [
       -50000, -30000, -18000, -9000, -4500, -1000, 
       1000, 4500, 9000, 18000, 30000, 50000
    ];

    const lines: { path: string, level: number }[] = [];
    
    // Quick marching squares implementation
    for (let l = 0; l < levels.length; l++) {
      const level = levels[l];
      let path = "";
      
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const idxTL = j * (cols + 1) + i;
          const idxTR = j * (cols + 1) + i + 1;
          const idxBR = (j + 1) * (cols + 1) + i + 1;
          const idxBL = (j + 1) * (cols + 1) + i;
          
          const vTL = V[idxTL]; const vTR = V[idxTR];
          const vBR = V[idxBR]; const vBL = V[idxBL];
          
          let state = 0;
          if (vTL >= level) state |= 8;
          if (vTR >= level) state |= 4;
          if (vBR >= level) state |= 2;
          if (vBL >= level) state |= 1;
          
          if (state === 0 || state === 15) continue;
          
          const xTL = i * step; const yTL = j * step;
          
          const getT = (v1: number, v2: number) => (level - v1) / (v2 - v1);
          
          const topX = xTL + step * getT(vTL, vTR); const topY = yTL;
          const botX = xTL + step * getT(vBL, vBR); const botY = yTL + step;
          const leftX = xTL; const leftY = yTL + step * getT(vTL, vBL);
          const rightX = xTL + step; const rightY = yTL + step * getT(vTR, vBR);
          
          let p = [];
          switch (state) {
            case 1: p = [[leftX, leftY, botX, botY]]; break;
            case 2: p = [[botX, botY, rightX, rightY]]; break;
            case 3: p = [[leftX, leftY, rightX, rightY]]; break;
            case 4: p = [[topX, topY, rightX, rightY]]; break;
            case 5: p = [[leftX, leftY, topX, topY], [botX, botY, rightX, rightY]]; break; // Saddle
            case 6: p = [[topX, topY, botX, botY]]; break;
            case 7: p = [[leftX, leftY, topX, topY]]; break;
            case 8: p = [[leftX, leftY, topX, topY]]; break;
            case 9: p = [[topX, topY, botX, botY]]; break;
            case 10: p = [[leftX, leftY, botX, botY], [topX, topY, rightX, rightY]]; break; // Saddle
            case 11: p = [[topX, topY, rightX, rightY]]; break;
            case 12: p = [[leftX, leftY, rightX, rightY]]; break;
            case 13: p = [[botX, botY, rightX, rightY]]; break;
            case 14: p = [[leftX, leftY, botX, botY]]; break;
          }
          
          for (let seg of p) {
             path += ` M ${seg[0]} ${seg[1]} L ${seg[2]} ${seg[3]}`;
          }
        }
      }
      if (path) lines.push({ path, level });
    }
    
    return lines;
  };

  const contours = generateContours();
  
  // Field lines logic slightly simplified 
  const mappedCharges = charges.map(c => ({ q: c.q * c.sign * 1e-6, x: c.x / PIXELS_PER_METER, y: c.y / PIXELS_PER_METER }));
  let markerV = 0;
  if (markerPos) {
      markerV = calculatePotentialAtPoint(mappedCharges, markerPos.x / PIXELS_PER_METER, markerPos.y / PIXELS_PER_METER).V;
  }
  
  const handlePointerDownCharge = (e: ReactMouseEvent, id: number) => {
    setSelectedCharge(id);
    setDraggingCharge(id);
    e.stopPropagation();
  };

  const handlePointerMove = (e: ReactMouseEvent) => {
    if (draggingCharge !== null) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCharges(charges.map(c => c.id === draggingCharge ? { ...c, x, y } : c));
    }
  };

  const handlePointerUp = () => setDraggingCharge(null);

  const handleCanvasClick = (e: ReactMouseEvent) => {
    if (draggingCharge !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMarkerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setSelectedCharge(null);
  };

  const getColorForLevel = (v: number) => {
    if (v > 0) {
       if (v > 20000) return '#7f1d1d';
       if (v > 10000) return '#b91c1c';
       if (v > 5000) return '#ef4444';
       if (v > 1000) return '#f87171';
       return '#fca5a5';
    } else if (v < 0) {
       if (v < -20000) return '#1e3a8a';
       if (v < -10000) return '#1d4ed8';
       if (v < -5000) return '#3b82f6';
       if (v < -1000) return '#60a5fa';
       return '#93c5fd';
    }
    return '#ccc';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div 
          className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[500px] cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerDown={handleCanvasClick}
        >
          <svg width="600" height="500" className="text-zinc-900 pointer-events-none">
             
             {/* Equipotential Lines */}
             <g strokeWidth="2" fill="none" opacity="0.8">
                {contours.map((c, i) => (
                   <path key={`ec-${i}`} d={c.path} stroke={getColorForLevel(c.level)} />
                ))}
             </g>

             {/* Marker Tooltip */}
             {markerPos && (
                 <g transform={`translate(${markerPos.x}, ${markerPos.y})`}>
                    <circle cx="0" cy="0" r="5" fill="#18181b" />
                    <rect x="10" y="-12" width="80" height="24" fill="#18181b" rx="4" />
                    <text x="50" y="4" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                       {markerV.toFixed(0)} V
                    </text>
                 </g>
             )}

             {/* Charges */}
             {charges.map(c => (
                 <g 
                   key={c.id} 
                   transform={`translate(${c.x}, ${c.y})`} 
                   className="pointer-events-auto cursor-grab touch-none"
                   onPointerDown={(e) => handlePointerDownCharge(e, c.id)}
                 >
                    <circle cx="0" cy="0" r="16" fill={c.sign > 0 ? "#dc2626" : "#2563eb"} stroke={selectedCharge === c.id ? "#000" : "none"} strokeWidth={selectedCharge === c.id ? 3 : 0} />
                    <text x="0" y="5" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">
                       {c.sign > 0 ? "+" : "−"}
                    </text>
                 </g>
             ))}
          </svg>
        </div>

        <EPPnl>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
             <div className="flex gap-2">
                 <button onClick={() => { if(charges.length < 3) setCharges([...charges, { id: nextId.current++, q: 2, sign: 1, x: window.innerWidth.valueOf() > 500 ? 100 * charges.length + 100 : 150, y: 150 }])}} className="bg-zinc-800 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50" disabled={charges.length >= 3}>Yük Ekle</button>
                 <button onClick={() => { setCharges(charges.filter(c => c.id !== selectedCharge)); setSelectedCharge(null); }} className="bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1.5 rounded text-sm disabled:opacity-50" disabled={!selectedCharge || charges.length === 1}>Sil</button>
                 <button onClick={() => setMarkerPos(null)} className="bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded text-sm disabled:opacity-50" disabled={!markerPos}>Temizle (Marker)</button>
             </div>
             
             {selectedCharge && (
                <div className="flex items-center gap-4 bg-gray-50 border px-4 py-2 rounded-lg flex-1">
                   <div className="font-semibold text-sm whitespace-nowrap">Seçili Yük:</div>
                   <button onClick={() => setCharges(charges.map(c => c.id === selectedCharge ? { ...c, sign: c.sign * -1 } : c))} className="bg-gray-200 px-2 py-1 rounded text-xs font-bold w-12">
                     {charges.find(c => c.id === selectedCharge)?.sign! > 0 ? "+" : "−"}
                   </button>
                   <div className="flex flex-col flex-1">
                      <input type="range" min="0.1" max="10" step="0.1" value={charges.find(c => c.id === selectedCharge)?.q} onChange={e => setCharges(charges.map(c => c.id === selectedCharge ? { ...c, q: Number(e.target.value) } : c))} className="w-full" />
                      <span className="text-xs text-center">{charges.find(c => c.id === selectedCharge)?.q} μC</span>
                   </div>
                </div>
             )}
          </div>
        </EPPnl>
      </div>

      <div className="flex flex-col gap-4">
        <EPObsPnl>
          {!markerPos && <div className="text-gray-500 text-sm italic text-center py-4">Değerleri görmek için ekranda bir noktaya tıklayın.</div>}
          
          {markerPos && (
             <>
                <div className="flex justify-between border-b pb-2 mb-2">
                   <span className="font-semibold text-gray-700">Marker x, y:</span>
                   <span className="font-mono text-sm">{(markerPos.x/PIXELS_PER_METER).toFixed(2)}, {(markerPos.y/PIXELS_PER_METER).toFixed(2)} m</span>
                </div>
                <div className="flex justify-between bg-zinc-100 p-2 rounded mb-2 border border-zinc-200">
                   <span className="font-bold text-zinc-800">Toplam V:</span>
                   <span className="font-mono text-sm font-bold text-blue-800">{markerV.toFixed(0)} V</span>
                </div>
                
                <div className="text-xs text-gray-500 uppercase font-bold mt-2">Bireysel Katkılar:</div>
                {charges.map(c => {
                   const r = Math.hypot(c.x - markerPos.x, c.y - markerPos.y) / PIXELS_PER_METER;
                   const v = calculatePotentialAtPoint([{ q: c.q * c.sign * 1e-6, x: c.x / PIXELS_PER_METER, y: c.y / PIXELS_PER_METER }], markerPos.x / PIXELS_PER_METER, markerPos.y / PIXELS_PER_METER).V;
                   return (
                      <div key={c.id} className="flex flex-col border-b border-dashed pb-1">
                         <div className="flex justify-between text-sm">
                            <span>Q: {c.sign > 0 ? "+" : "-"}{c.q.toFixed(1)} μC</span>
                            <span className="font-mono">{v.toFixed(0)} V</span>
                         </div>
                         <div className="text-xs text-gray-500">r = {r.toFixed(2)} m</div>
                      </div>
                   )
                })}
             </>
          )}
        </EPObsPnl>
        
        {markerPos && simulation.zorunlu_deney && (
           <CompletionCheck
              slug={slug}
              zorunluDeney={simulation.zorunlu_deney}
              observedValue={markerV}
              isFinished={true}
           />
        )}
      </div>
    </div>
  );
}

// ------------------- MODE 2: Energy & Motion -------------------

function EnergyMode() {
  const [QSign, setQSign] = useState(1);
  const [QVal, setQVal] = useState(10); // source μC
  
  const [qSignTest, setQSignTest] = useState(1);
  const [qValTest, setQValTest] = useState(1); // test μC
  
  const [r0, setR0] = useState(1.5); // starting distance (m)
  
  const [state, setState] = useState<"ready" | "running" | "done">("ready");
  
  // physics states
  const [r, setR] = useState(r0);
  const [v, setV] = useState(0); 
  
  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);
  
  // Constants
  const PIXELS_PER_METER = 80; // 600px width / 80 ≈ 7.5m observable range
  const massTest = 1e-6; // 1 milligram for visual speeds
  const k = 9e9;
  
  const sourcePX = 100;
  const sourcePY = 250;
  
  useEffect(() => {
    if (state === "ready") {
       setR(r0);
       setV(0);
    }
  }, [state, r0]);

  // Actual physics calculation
  const qSourceR = QSign * QVal * 1e-6;
  const qTestR = qSignTest * qValTest * 1e-6;
  
  const currentV = k * qSourceR / r;
  const currentU = currentV * qTestR;
  const currentEk = 0.5 * massTest * v * v;
  const forceDir = currentU > 0 ? 1 : -1; // repulse = 1, attract = -1
  const Fmag = Math.abs(k * qSourceR * qTestR / (r * r));

  useEffect(() => {
    if (state !== "running") return;
    
    const animate = (t: number) => {
       let dt = (t - prevTimeRef.current) / 1000;
       prevTimeRef.current = t;
       if (dt > 0.05) dt = 0.05; // cap dt
       
       setV(prevV => {
          setR(prevR => {
             // F = kQq/r^2
             // a = F/m
             const currentF = k * qSourceR * qTestR / (prevR * prevR);
             const a = currentF / massTest;
             
             // if attractive (currentF < 0), it accelerates towards r=0
             // if repulsive (currentF > 0), accelerates away
             
             const nextV = prevV + (a * dt);
             let nextR = prevR + (nextV * dt);
             
             // bounds
             if (nextR <= 0.4) {
                 nextR = 0.4;
                 setState("done");
                 return nextR; // collision
             }
             if (nextR >= 6) {
                 nextR = 6;
                 setState("done");
                 return nextR; // flew away
             }
             
             return nextR;
          });
          
          const currentF_forAV = k * qSourceR * qTestR / (r * r); // approximated for speed
          const a_v = currentF_forAV / massTest;
          return prevV + (a_v * dt);
       });
       
       reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [state, qSourceR, qTestR, massTest, r]);

  const handleStart = () => {
    if (state === "running") { setState("ready"); return; }
    setState("running");
    setV(0);
    setR(r0);
    prevTimeRef.current = performance.now();
  };
  
  // Test position X
  const testPX = sourcePX + r * PIXELS_PER_METER;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="relative bg-white border rounded-xl overflow-hidden flex justify-center items-center h-[500px]">
          <svg width="600" height="500" className="text-zinc-900 pointer-events-none">
             {/* Grid */}
             <g stroke="#e5e7eb" strokeWidth="1">
               {[...Array(12)].map((_, i) => ( <line key={`x-${i}`} x1={i*50} y1="0" x2={i*50} y2="500" /> ))}
               {[...Array(10)].map((_, i) => ( <line key={`y-${i}`} x1="0" y1={i*50} x2="600" y2={i*50} /> ))}
             </g>
             
             <line x1={sourcePX} y1={sourcePY} x2={600} y2={sourcePY} stroke="#d1d5db" strokeDasharray="4" strokeWidth="2" />
             
             {/* Source */}
             <g transform={`translate(${sourcePX}, ${sourcePY})`}>
                <circle cx="0" cy="0" r="24" fill={QSign > 0 ? "#dc2626" : "#2563eb"} />
                <text x="0" y="6" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">
                   {QSign > 0 ? "+" : "−"} {QVal}μ
                </text>
             </g>

             {/* Test */}
             <g transform={`translate(${testPX}, ${sourcePY})`}>
                <circle cx="0" cy="0" r="12" fill={qSignTest > 0 ? "#f87171" : "#60a5fa"} />
                <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                   {qSignTest > 0 ? "+" : "−"}
                </text>
                
                {/* Force Arrow */}
                {state === "ready" && (
                    <g>
                      <line x1={forceDir > 0 ? 15 : -15} y1="0" x2={forceDir > 0 ? 45 : -45} y2="0" stroke="#ea580c" strokeWidth="3" markerEnd="url(#arrow-e)" />
                      <text x={forceDir > 0 ? 50 : -60} y="4" fill="#ea580c" fontSize="14" fontWeight="bold">F</text>
                    </g>
                )}
             </g>
             
             <defs>
              <marker id="arrow-e" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
              </marker>
            </defs>
          </svg>
          
          {/* Energy Diagram Inline Right */}
          <div className="absolute right-4 top-4 bottom-4 w-12 bg-gray-50 border rounded flex flex-col justify-end items-center pb-8 p-1">
              <div className="text-xs text-gray-500 font-bold mb-2 pt-2 text-center writing-vertical-rl transform rotate-180">Enerji (J)</div>
              <div className="relative w-full flex-1 flex flex-col justify-end items-center bg-white border-y">
                 {/* Zero line */}
                 <div className="absolute w-full h-[1px] bg-black top-1/2"></div>
                 
                 {/* we map energy to percentage, max absolute U0 to 50% height */}
                 {(() => {
                    const maxE = Math.abs(k * qSourceR * qTestR / Math.min(r0, 0.4)) * 1.5;
                    const maxH = 200; // half height px
                    const uH = Math.min((Math.abs(currentU) / maxE) * 100, 100);
                    const kH = Math.min((Math.abs(currentEk) / maxE) * 100, 100);
                    
                    return (
                       <div className="absolute w-full flex h-full justify-center">
                          {currentU > 0 ? (
                              <div className="absolute bottom-1/2 w-6 bg-orange-400 opacity-80 rounded-t" style={{height: `${uH / 2}%`}}></div>
                          ) : (
                              <div className="absolute top-1/2 w-6 bg-orange-400 opacity-80 rounded-b" style={{height: `${uH / 2}%`}}></div>
                          )}
                          <div className="absolute bottom-1/2 w-6 bg-green-500 opacity-80" style={{height: `${kH / 2}%`, marginBottom: currentU > 0 ? `${uH / 2}%` : '0%'}}></div>
                       </div>
                    );
                 })()}
              </div>
          </div>
        </div>

        <EPPnl>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="flex flex-col gap-2 bg-gray-50 p-2 rounded">
                <label className="text-xs font-bold text-gray-700">Kaynak Yük ({QSign > 0 ? "+" : "-"}{QVal} μC)</label>
                <div className="flex gap-2">
                   <button onClick={() => {setQSign(s=>-s); setState("ready");}} className="px-2 py-1 bg-gray-200 rounded font-bold">+/-</button>
                   <input type="range" min="1" max="20" value={QVal} onChange={(e) => {setQVal(Number(e.target.value)); setState("ready");}} className="w-full" disabled={state!=="ready"} />
                </div>
             </div>
             
             <div className="flex flex-col gap-2 bg-gray-50 p-2 rounded">
                <label className="text-xs font-bold text-gray-700">Test Yükü ({qSignTest > 0 ? "+" : "-"}{qValTest} μC)</label>
                <div className="flex gap-2">
                   <button onClick={() => {setQSignTest(s=>-s); setState("ready");}} className="px-2 py-1 bg-gray-200 rounded font-bold">+/-</button>
                   <input type="range" min="0.1" max="5" step="0.1" value={qValTest} onChange={(e) => {setQValTest(Number(e.target.value)); setState("ready");}} className="w-full" disabled={state!=="ready"} />
                </div>
             </div>
             
             <div className="flex flex-col gap-2 bg-gray-50 p-2 rounded">
                <label className="text-xs font-bold text-gray-700">Başlangıç Mesafesi ({r0.toFixed(2)} m)</label>
                <input type="range" min="0.5" max="5" step="0.1" value={r0} onChange={(e) => {setR0(Number(e.target.value)); setState("ready");}} className="w-full" disabled={state!=="ready"} />
             </div>
          </div>

          <div className="flex gap-2 mt-4 max-w-sm mx-auto">
              <button 
                onClick={handleStart} 
                className={`flex-1 ${state === "ready" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-800"} py-2 rounded-lg font-medium transition`}
              >
                {state === "ready" ? "Hareketi Başlat" : "Sıfırla"}
              </button>
          </div>
        </EPPnl>
      </div>

      <div className="flex flex-col gap-4">
        <EPObsPnl>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">Uzaklık (r):</span><span className="font-mono text-sm">{r.toFixed(3)} m</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-ea580c text-sm font-semibold">Potansiyel (V):</span><span className="font-mono text-sm font-bold text-orange-600">{currentV.toExponential(2)} V</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-gray-600 text-sm">Potansiyel Enerji (U):</span><span className="font-mono text-sm">{currentU.toExponential(2)} J</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm text-green-700 font-bold">Kinetik Enerji (Ek):</span><span className="font-mono text-sm">{currentEk.toExponential(2)} J</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 bg-zinc-100 p-1">
             <span className="text-gray-800 text-sm font-bold">Toplam Enerji:</span><span className="font-mono text-sm font-bold">{(currentU + currentEk).toExponential(2)} J</span>
          </div>
          
          <div className="flex justify-between border-b border-dashed pb-1 mt-4">
             <span className="text-gray-600 text-sm">Kuvvet (F):</span><span className="font-mono text-sm">{Fmag.toExponential(2)} N</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">Hız (v):</span><span className="font-mono text-sm">{Math.abs(v).toFixed(2)} m/s</span>
          </div>
        </EPObsPnl>
      </div>
    </div>
  )
}