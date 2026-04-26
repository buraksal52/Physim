"use client";

import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from "react";
import { Simulasyon } from "@/lib/types";
import { calculateFieldAtPoint, calculateParallelPlateField } from "@/lib/physics/electricField";
import CompletionCheck from "./CompletionCheck";

interface ElectricFieldCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function ElectricFieldControlPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Kontrol Paneli
      </h4>
      {children}
    </div>
  );
}

function ElectricFieldObservationPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm h-full max-h-[500px] overflow-y-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Gözlem Paneli
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default function ElectricFieldCanvas({ slug, simulation, onComplete }: ElectricFieldCanvasProps) {
  const [mode, setMode] = useState<"nokta" | "dipol" | "paralel">("nokta");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2">
        <button
          onClick={() => setMode("nokta")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "nokta" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Nokta Yük
        </button>
        <button
          onClick={() => setMode("dipol")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "dipol" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Dipol
        </button>
        <button
          onClick={() => setMode("paralel")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "paralel" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Paralel Plakalar
        </button>
      </div>

      {mode === "nokta" && <PointChargeMode slug={slug} simulation={simulation} onComplete={onComplete} mode="nokta" />}
      {mode === "dipol" && <PointChargeMode slug={slug} simulation={simulation} onComplete={onComplete} mode="dipol" />}
      {mode === "paralel" && <ParallelPlatesMode />}
    </div>
  );
}

// ----------------------------------------------------------------------------------
// SHARED POINT CHARGE & DIPOLE MODE
// ----------------------------------------------------------------------------------
function PointChargeMode({ slug, simulation, onComplete, mode }: { slug: string; simulation: Simulasyon; onComplete: () => void; mode: "nokta" | "dipol" }) {
  const [qMag, setQMag] = useState(2); // in microCoulombs (μC)
  const [qSign, setQSign] = useState(1); // +1 or -1 for nokte mode

  const [charges, setCharges] = useState<{ id: number, q: number, x: number, y: number }[]>([]);
  const [markerPos, setMarkerPos] = useState<{ x: number, y: number } | null>(null);
  
  const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null);

  const [draggingCharge, setDraggingCharge] = useState<number | null>(null);

  // 100 pixels = 1 meter
  const PIXELS_PER_METER = 100;

  // Initialize charges based on mode
  useEffect(() => {
    if (mode === "nokta") {
      setCharges([{ id: 1, q: qSign * qMag * 1e-6, x: 300, y: 250 }]);
      setMarkerPos(null);
    } else {
      setCharges([
        { id: 1, q: qMag * 1e-6, x: 200, y: 250 },
        { id: 2, q: -qMag * 1e-6, x: 400, y: 250 }
      ]);
      setMarkerPos(null);
    }
  }, [mode, qSign, qMag]);

  const handlePointerDown = (e: ReactMouseEvent, id?: number) => {
    if (id !== undefined) {
      setDraggingCharge(id);
      e.stopPropagation();
    }
  };

  const handlePointerMove = (e: ReactMouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverPos({ x, y });

    if (draggingCharge !== null) {
      setCharges(charges.map(c => c.id === draggingCharge ? { ...c, x, y } : c));
    }
  };

  const handlePointerUp = () => {
    setDraggingCharge(null);
  };

  const handlePointerLeave = () => {
    setDraggingCharge(null);
    setHoverPos(null);
  };

  const handleCanvasClick = (e: ReactMouseEvent) => {
    if (draggingCharge !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMarkerPos({ x, y });
  };

  // Physics mapping: physics functions need distance in meters, q in Coulombs
  // but to make things easy, we can calculate physics using meters for coordinates
  // charge.x and charge.y are in pixels.
  // When we pass to physics calculateFieldAtPoint, we pass positions in meters.
  
  const mappedCharges = charges.map(c => ({ q: c.q, x: c.x / PIXELS_PER_METER, y: c.y / PIXELS_PER_METER }));
  
  const markerField = markerPos ? calculateFieldAtPoint(mappedCharges, markerPos.x / PIXELS_PER_METER, markerPos.y / PIXELS_PER_METER) : { Ex: 0, Ey: 0, magnitude: 0 };
  const hoverField = hoverPos ? calculateFieldAtPoint(mappedCharges, hoverPos.x / PIXELS_PER_METER, hoverPos.y / PIXELS_PER_METER) : { Ex: 0, Ey: 0, magnitude: 0 };

  // Calculate field lines (visual only)
  const lines: string[] = [];
  const numLines = 16;
  const stepPx = 2; // pixel step
  const maxSteps = 300;

  // We trace from positive charges outwards. For isolated negative, from negative outwards but reverse arrow logic visually (or just draw regular with inverted logic).
  const isOnlyNegative = charges.every(c => c.q < 0);
  
  charges.forEach(chr => {
     if (chr.q > 0 || isOnlyNegative) {
        for (let i = 0; i < numLines; i++) {
           const angle = (i * 2 * Math.PI) / numLines;
           let x = chr.x + Math.cos(angle) * 12;
           let y = chr.y + Math.sin(angle) * 12;
           let path = `M ${x} ${y}`;
           let steps = 0;
           
           for (; steps < maxSteps; steps++) {
               const field = calculateFieldAtPoint(mappedCharges, x / PIXELS_PER_METER, y / PIXELS_PER_METER);
               if (field.magnitude < 1e-10) break;
               
               // unit vector
               const ux = field.Ex / field.magnitude;
               const uy = field.Ey / field.magnitude;
               
               // If only negative, we follow the field backwards (-ux, -uy) outward from the charge
               const dx = isOnlyNegative ? -ux * stepPx : ux * stepPx;
               const dy = isOnlyNegative ? -uy * stepPx : uy * stepPx;
               
               x += dx;
               y += dy;
               path += ` L ${x} ${y}`;
               
               // Stop if hits any other charge
               let hit = false;
               for (const other of charges) {
                  if (other.id !== chr.id && Math.hypot(x - other.x, y - other.y) < 12) {
                     hit = true; break;
                  }
               }
               if (hit) break;
               if (x < 0 || x > 600 || y < 0 || y > 500) break;
           }
           lines.push(path);
        }
     }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div 
          className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[500px] cursor-crosshair touch-none"
          onPointerDown={handleCanvasClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        >
          <svg width="600" height="500" className="text-zinc-900 pointer-events-none">
             {/* Grid */}
             <g stroke="#e5e7eb" strokeWidth="1">
               {[...Array(12)].map((_, i) => (
                  <line key={`x-${i}`} x1={i*50} y1="0" x2={i*50} y2="500" />
               ))}
               {[...Array(10)].map((_, i) => (
                  <line key={`y-${i}`} x1="0" y1={i*50} x2="600" y2={i*50} />
               ))}
             </g>

             {/* Dipole Axis Faint Line */}
             {mode === "dipol" && charges.length === 2 && (
                 <line x1={charges[0].x} y1={charges[0].y} x2={charges[1].x} y2={charges[1].y} stroke="#d1d5db" strokeDasharray="4" strokeWidth="2" />
             )}

             {/* Field Lines */}
             <g stroke="#94a3b8" strokeWidth="1" fill="none">
                {lines.map((d, i) => (
                   <path key={`fl-${i}`} d={d} />
                ))}
             </g>
             
             {/* Hover Arrow Tooltip */}
             {hoverPos && (
                 <g transform={`translate(${hoverPos.x}, ${hoverPos.y})`}>
                    <line x1="0" y1="0" x2={(hoverField.Ex/hoverField.magnitude)*30 || 0} y2={(hoverField.Ey/hoverField.magnitude)*30 || 0} stroke="#ea580c" strokeWidth="2" markerEnd="url(#arrow-e)" />
                 </g>
             )}

             {/* Marker Pinned Tooltip */}
             {markerPos && (
                 <g transform={`translate(${markerPos.x}, ${markerPos.y})`}>
                    <circle cx="0" cy="0" r="4" fill="#18181b" />
                    <line x1="0" y1="0" x2={(markerField.Ex/markerField.magnitude)*40 || 0} y2={(markerField.Ey/markerField.magnitude)*40 || 0} stroke="#ea580c" strokeWidth="3" markerEnd="url(#arrow-e)" />
                 </g>
             )}

             {/* Charges */}
             {charges.map(c => (
                 <g 
                   key={c.id} 
                   transform={`translate(${c.x}, ${c.y})`} 
                   className="pointer-events-auto cursor-grab"
                   onPointerDown={(e) => handlePointerDown(e, c.id)}
                 >
                    <circle cx="0" cy="0" r="14" fill={c.q > 0 ? "#dc2626" : "#2563eb"} />
                    <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                       {c.q > 0 ? "+" : "−"}
                    </text>
                 </g>
             ))}

             <defs>
              <marker id="arrow-e" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
              </marker>
            </defs>
          </svg>
        </div>

        <ElectricFieldControlPanel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
             {mode === "nokta" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700">Yük İşareti</label>
                  <button onClick={() => setQSign(s => -s)} className="bg-gray-200 hover:bg-gray-300 py-1.5 rounded font-bold">
                     {qSign > 0 ? "Pozitif (+)" : "Negatif (−)"}
                  </button>
                </div>
             )}
             <div className="flex flex-col gap-2 lg:col-span-2">
              <label className="text-xs font-semibold text-gray-700">Yük Büyüklüğü: {qMag} μC</label>
              <input type="range" min="0.1" max="10" step="0.1" value={qMag} onChange={e => setQMag(Number(e.target.value))} className="w-full" />
            </div>
            {markerPos && (
                <div className="flex flex-col gap-2">
                   <button onClick={() => setMarkerPos(null)} className="w-full bg-red-100 hover:bg-red-200 text-red-800 text-sm px-3 py-1.5 rounded-lg font-medium transition">
                     İşareti Kaldır
                   </button>
                </div>
            )}
          </div>
        </ElectricFieldControlPanel>
      </div>

      <div className="flex flex-col gap-4">
        <ElectricFieldObservationPanel>
          {mode === "nokta" && charges.length > 0 && markerPos && (
              <>
                 <div className="flex justify-between border-b border-dashed pb-1">
                   <span className="text-gray-600 text-sm">Q (C):</span>
                   <span className="font-mono text-sm">{charges[0].q.toExponential(1)} C</span>
                 </div>
                 <div className="flex justify-between border-b border-dashed pb-1">
                   <span className="text-gray-600 text-sm">r (Uzaklık):</span>
                   <span className="font-mono text-sm">{(Math.hypot(charges[0].x - markerPos.x, charges[0].y - markerPos.y) / PIXELS_PER_METER).toFixed(2)} m</span>
                 </div>
                 <div className="flex justify-between border-b border-dashed pb-1">
                   <span className="text-ea580c text-sm font-semibold">E Şiddeti:</span>
                   <span className="font-mono text-sm font-bold text-orange-600">{markerField.magnitude.toFixed(0)} N/C</span>
                 </div>
              </>
          )}

          {mode === "dipol" && charges.length === 2 && (
              <>
                 <div className="flex justify-between border-b border-dashed pb-1">
                   <span className="text-gray-600 text-sm">Aralık (d):</span>
                   <span className="font-mono text-sm">{(Math.hypot(charges[0].x - charges[1].x, charges[0].y - charges[1].y) / PIXELS_PER_METER).toFixed(2)} m</span>
                 </div>

                 {markerPos && (
                    <div className="flex justify-between border-b border-dashed pb-1 mt-2">
                       <span className="text-ea580c text-sm font-semibold">Tıklanan (E):</span>
                       <span className="font-mono text-sm font-bold text-orange-600">{markerField.magnitude.toFixed(0)} N/C</span>
                    </div>
                 )}
                 
                 {!markerPos && (
                     <div className="flex justify-between border-b border-dashed pb-1 mt-2">
                       <span className="text-ea580c text-sm font-semibold">Orta Nokta (E):</span>
                       <span className="font-mono text-sm font-bold text-orange-600">
                          {calculateFieldAtPoint(mappedCharges, (mappedCharges[0].x + mappedCharges[1].x)/2, (mappedCharges[0].y + mappedCharges[1].y)/2).magnitude.toFixed(0)} N/C
                       </span>
                    </div>
                 )}
              </>
          )}

           {(!markerPos && mode === "nokta") && (
               <div className="text-sm text-gray-500 italic text-center mt-4">
                  Okuma almak için ekranda bir noktaya tıklayın.
               </div>
           )}
        </ElectricFieldObservationPanel>

        {mode === "nokta" && simulation.zorunlu_deney && markerPos && (
          <CompletionCheck
             slug={slug}
             zorunluDeney={simulation.zorunlu_deney}
             observedValue={markerField.magnitude}
             isFinished={true}
          />
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// MODE 3: PARALLEL PLATES
// ----------------------------------------------------------------------------------
function ParallelPlatesMode() {
  const [volts, setVolts] = useState(100);
  const [d, setD] = useState(0.05); // meters
  
  const [qTest, setQTest] = useState(2); // muC
  const [qTestSign, setQTestSign] = useState(1);
  
  const [state, setState] = useState<"ready" | "running" | "done">("ready");
  
  // y pos of test charge in pixels (starts near center)
  const [cy, setCy] = useState(200);   
  const [vy, setVy] = useState(0);     
  
  const canvasW = 600;
  const canvasH = 400;
  
  // Let mapping be 1000px = 1 meter for tight zoom in parallel plates mode
  const PX_PER_M = 1000;
  const dPx = d * PX_PER_M; // Ex: 0.05m -> 50px
  
  const pTopY = canvasH/2 - dPx/2;
  const pBotY = canvasH/2 + dPx/2;

  const { E } = calculateParallelPlateField(volts, d);
  const qReal = qTest * 1e-6 * qTestSign;
  const Force = qReal * E; // E is downwards from top(+) to bot(-). So F > 0 means downwards. F < 0 implies upwards
  
  const testMass = 1e-6; // 1 mg test mass
  const acc = Force / testMass; 
  
  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);
  
  useEffect(() => {
    if (state !== "running") return;
    
    const animate = (t: number) => {
       let dt = (t - prevTimeRef.current) / 1000;
       prevTimeRef.current = t;
       if (dt > 0.05) dt = 0.05;
       
       setVy(prevVy => {
          setCy(prevCy => {
             const nextVy = prevVy + (acc * dt);
             let nextCy = prevCy + (nextVy * PX_PER_M * dt);
             
             // Check bounds
             if (nextCy <= pTopY + 10) {
                nextCy = pTopY + 10;
                setState("done");
             } else if (nextCy >= pBotY - 10) {
                nextCy = pBotY - 10;
                setState("done");
             }
             
             return nextCy;
          });
          return prevVy + (acc * dt);
       });
       
       reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [state, acc, pTopY, pBotY]);

  const handleStart = () => {
    setState("running");
    setVy(0);
    prevTimeRef.current = performance.now();
  };

  const handleReset = () => {
    setState("ready");
    setVy(0);
    setCy(canvasH/2);
  };
  
  // Setup click
  const handleCanvasClick = (e: ReactMouseEvent) => {
     if (state !== "ready") return;
     const rect = e.currentTarget.getBoundingClientRect();
     const y = e.clientY - rect.top;
     if (y > pTopY + 10 && y < pBotY - 10) {
        setCy(y);
     }
  };
  
  // Re-bound if user changes slider while charge is out of bounds
  useEffect(() => {
     if (state === "ready") {
        if (cy <= pTopY + 10) setCy(pTopY + 12);
        if (cy >= pBotY - 10) setCy(pBotY - 12);
     }
  }, [dPx, cy, state, pTopY, pBotY]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[400px] cursor-crosshair touch-none" onPointerDown={handleCanvasClick}>
          <svg width="600" height="400" className="text-zinc-900 pointer-events-none">
             {/* Grid */}
             <g stroke="#e5e7eb" strokeWidth="1">
               {[...Array(12)].map((_, i) => (
                  <line key={`x-${i}`} x1={i*50} y1="0" x2={i*50} y2="400" />
               ))}
               {[...Array(8)].map((_, i) => (
                  <line key={`y-${i}`} x1="0" y1={i*50} x2="600" y2={i*50} />
               ))}
             </g>

             {/* Plates */}
             <rect x="50" y={pTopY - 20} width="500" height="20" fill="#dc2626" rx="4" />
             <text x="300" y={pTopY - 5} textAnchor="middle" fill="#fff" fontWeight="bold">+</text>
             
             <rect x="50" y={pBotY} width="500" height="20" fill="#2563eb" rx="4" />
             <text x="300" y={pBotY + 15} textAnchor="middle" fill="#fff" fontWeight="bold">−</text>
             
             {/* Uniform Field Lines inside */}
             <g stroke="#9ca3af" strokeWidth="1" opacity="0.6">
               {[...Array(10)].map((_, i) => {
                  const xx = 100 + i*45;
                  return (
                     <g key={`uf-${i}`}>
                        <line x1={xx} y1={pTopY} x2={xx} y2={pBotY} markerEnd="url(#arrow-gray)" />
                     </g>
                  );
               })}
             </g>
             
             {/* Test Charge */}
             <g transform={`translate(300, ${cy})`}>
                <circle cx="0" cy="0" r="10" fill={qTestSign > 0 ? "#dc2626" : "#2563eb"} />
                <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                   {qTestSign > 0 ? "+" : "−"}
                </text>
                
                {/* Force Arrow */}
                {state === "ready" && (
                    <g>
                      <line x1="20" y1="0" x2="20" y2={qTestSign > 0 ? 30 : -30} stroke="#ea580c" strokeWidth="3" markerEnd="url(#arrow-e)" />
                      <text x="30" y={qTestSign > 0 ? 20 : -20} fill="#ea580c" fontSize="12" fontWeight="bold">F</text>
                    </g>
                )}
             </g>
             
             <defs>
              <marker id="arrow-e" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
              </marker>
              <marker id="arrow-gray" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
              </marker>
            </defs>
          </svg>
        </div>

        <ElectricFieldControlPanel>
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
             <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Gerilim: {volts} V</label>
              <input type="range" min="10" max="1000" step="10" value={volts} onChange={e => {setVolts(Number(e.target.value)); handleReset();}} className="w-full" disabled={state!=="ready"} />
            </div>
             <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Mesafe: {d.toFixed(2)} m</label>
              <input type="range" min="0.01" max="0.2" step="0.01" value={d} onChange={e => {setD(Number(e.target.value)); handleReset();}} className="w-full" disabled={state!=="ready"} />
            </div>
            
             <div className="flex flex-col gap-2">
               <label className="text-xs font-semibold text-gray-700">Yük İşareti</label>
               <button onClick={() => {setQTestSign(s => -s); handleReset();}} className="bg-gray-200 hover:bg-gray-300 py-1.5 text-sm rounded font-bold" disabled={state!=="ready"}>
                  {qTestSign > 0 ? "Pozitif (+)" : "Negatif (−)"}
               </button>
             </div>
             <div className="flex flex-col gap-2">
               <label className="text-xs font-semibold text-gray-700">Test Yükü: {qTest} μC</label>
               <input type="range" min="0.1" max="5" step="0.1" value={qTest} onChange={e => {setQTest(Number(e.target.value)); handleReset();}} className="w-full" disabled={state!=="ready"} />
             </div>
           </div>
           
           <div className="flex gap-2 mt-4">
              <button 
                onClick={state === "ready" ? handleStart : handleReset} 
                className={`flex-1 ${state === "ready" ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"} text-white py-2 rounded-lg font-medium transition`}
              >
                {state === "ready" ? "Serbest Bırak" : "Sıfırla"}
              </button>
          </div>
        </ElectricFieldControlPanel>
      </div>
      
      <div className="flex flex-col gap-4">
        <ElectricFieldObservationPanel>
           <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">V (Gerilim):</span><span className="font-mono text-sm">{volts} V</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">d (Mesafe):</span><span className="font-mono text-sm">{d.toFixed(2)} m</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-ea580c text-sm font-semibold">E Şiddeti:</span><span className="font-mono text-sm text-orange-600 font-bold">{E.toFixed(0)} N/C</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-gray-600 text-sm font-semibold">Test F:</span><span className="font-mono text-sm">{Math.abs(Force).toExponential(2)} N</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm font-semibold">İvme (a):</span><span className="font-mono text-sm">{Math.abs(acc).toExponential(2)} m/s²</span>
          </div>
        </ElectricFieldObservationPanel>
      </div>

    </div>
  )
}