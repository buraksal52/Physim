"use client";

import { useState, useRef, useEffect } from "react";
import CompletionCheck from "./CompletionCheck";
import { Simulasyon } from "@/lib/types";

interface Vector {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  label: string;
  showComponents: boolean;
  showUnit: boolean;
}

interface Resultant {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  mag: number;
  label: string;
}

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ea580c", "#9333ea"];
const GRID_SIZE = 40;
const ORIGIN_X = 300;
const ORIGIN_Y = 250;

export default function VectorCanvas({ slug, simulasyon }: { slug: string, simulasyon: Simulasyon }) {
  const [vectors, setVectors] = useState<Vector[]>([]);
  const [history, setHistory] = useState<Vector[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [inputMag, setInputMag] = useState<number>(5);
  const [inputAng, setInputAng] = useState<number>(0);
  const [scalarInput, setScalarInput] = useState<string>("1");
  
  const [dragInfo, setDragInfo] = useState<{ id: string, type: 'body'|'head'|'tail', startX: number, startY: number, initialV: Vector } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const pushHistory = (newVecs: Vector[]) => {
      setVectors(newVecs);
      setHistory(prev => [...prev, newVecs]);
  };

  const handleAdd = () => {
    const angleRad = (inputAng * Math.PI) / 180;
    const dx = inputMag * Math.cos(angleRad);
    const dy = inputMag * Math.sin(angleRad);
    
    const usedLabels = vectors.map(v => v.label);
    const newLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const label = newLabels.find(l => !usedLabels.includes(l)) || "V";
    const color = COLORS[vectors.length % COLORS.length];

    const newV: Vector = {
      id: Math.random().toString(36).substr(2, 9),
      x: 0,
      y: 0,
      dx, dy,
      color,
      label,
      showComponents: false,
      showUnit: false
    };
    pushHistory([...vectors, newV]);
  };

  const handleUndo = () => {
      if (history.length <= 1) {
          setVectors([]);
          setHistory([]);
          return;
      }
      const newHistory = history.slice(0, -1);
      setVectors(newHistory[newHistory.length - 1]);
      setHistory(newHistory);
      setSelectedId(null);
  };

  const handleClear = () => {
      pushHistory([]);
      setSelectedId(null);
  };

  const onPointerDown = (e: React.PointerEvent, id: string, type: 'body'|'head'|'tail') => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelectedId(id);
      const v = vectors.find(v => v.id === id);
      if (!v) return;
      setDragInfo({ id, type, startX: e.clientX, startY: e.clientY, initialV: v });
  };

  const onPointerMove = (e: React.PointerEvent) => {
      if (!dragInfo) return;
      
      const dxScreen = e.clientX - dragInfo.startX;
      const dyScreen = e.clientY - dragInfo.startY;
      const dxUnit = dxScreen / GRID_SIZE;
      const dyUnit = -dyScreen / GRID_SIZE;

      setVectors(prev => prev.map(v => {
          if (v.id === dragInfo.id) {
              if (dragInfo.type === 'body') {
                  return { ...v, x: dragInfo.initialV.x + dxUnit, y: dragInfo.initialV.y + dyUnit };
              } else if (dragInfo.type === 'head') {
                  return { ...v, dx: dragInfo.initialV.dx + dxUnit, dy: dragInfo.initialV.dy + dyUnit };
              } else if (dragInfo.type === 'tail') {
                  const newX = dragInfo.initialV.x + dxUnit;
                  const newY = dragInfo.initialV.y + dyUnit;
                  // To keep head in same place, dx/dy must shrink
                  const newDx = dragInfo.initialV.dx - dxUnit;
                  const newDy = dragInfo.initialV.dy - dyUnit;
                  return { ...v, x: newX, y: newY, dx: newDx, dy: newDy };
              }
          }
          return v;
      }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
      if (!dragInfo) return;
      
      setVectors(prev => {
          const finalVecs = [...prev];
          const v = finalVecs.find(v => v.id === dragInfo.id);
          if (!v) return prev;
          
          let snappedX = v.x;
          let snappedY = v.y;
          let snappedDx = v.dx;
          let snappedDy = v.dy;
          
          let snappedToOther = false;
          
          // Snap logic: Check distance to other vectors' heads/tails
          const TOL = 0.5;
          const myTailX = v.x, myTailY = v.y;
          const myHeadX = v.x + v.dx, myHeadY = v.y + v.dy;

          for (let other of finalVecs) {
              if (other.id === v.id) continue;
              
              const oTailX = other.x, oTailY = other.y;
              const oHeadX = other.x + other.dx, oHeadY = other.y + other.dy;

              if (dragInfo.type === 'body' || dragInfo.type === 'tail') {
                  // Snap my tail to other's head
                  if (Math.hypot(myTailX - oHeadX, myTailY - oHeadY) < TOL) {
                      snappedX = oHeadX;
                      snappedY = oHeadY;
                      snappedToOther = true;
                      break;
                  }
                  // Snap my tail to other's tail (subtraction)
                  if (Math.hypot(myTailX - oTailX, myTailY - oTailY) < TOL) {
                      snappedX = oTailX;
                      snappedY = oTailY;
                      snappedToOther = true;
                      break;
                  }
              }
              if (dragInfo.type === 'body' || dragInfo.type === 'head') {
                  // Snap my head to other's tail
                  if (Math.hypot(myHeadX - oTailX, myHeadY - oTailY) < TOL) {
                      snappedDx = oTailX - v.x;
                      snappedDy = oTailY - v.y;
                      if (dragInfo.type === 'body') {
                          snappedX = oTailX - v.dx;
                          snappedY = oTailY - v.dy;
                      }
                      snappedToOther = true;
                      break;
                  }
              }
          }

          if (!snappedToOther && e.shiftKey) {
             // angle locking
             const angle = Math.atan2(snappedDy, snappedDx);
             const deg = angle * 180 / Math.PI;
             const steps = [0, 30, 45, 60, 90, 120, 135, 150, 180, -30, -45, -60, -90, -120, -135, -150, -180];
             let closest = steps[0];
             for(let s of steps) {
                 if (Math.abs(deg - s) < Math.abs(deg - closest)) closest = s;
             }
             const mag = Math.hypot(snappedDx, snappedDy);
             snappedDx = mag * Math.cos(closest * Math.PI / 180);
             snappedDy = mag * Math.sin(closest * Math.PI / 180);
          }

          if (!snappedToOther && (dragInfo.type === 'body' || dragInfo.type === 'tail')) {
             snappedX = Math.round(snappedX);
             snappedY = Math.round(snappedY);
          }
          if (!snappedToOther && dragInfo.type === 'head') {
             snappedDx = Math.round(snappedDx);
             snappedDy = Math.round(snappedDy);
          }
          
          v.x = snappedX;
          v.y = snappedY;
          v.dx = snappedDx;
          v.dy = snappedDy;
          
          return finalVecs;
      });
      
      setDragInfo(null);
  };
  
  // Automatically record history AFTER drag completes, safely in an effect
  // But we need to distinguish state updates. Easier to hook to a ref or just watch vectors.
  // We will do it simple: dragInfo transition from object to null means drag ended.
  useEffect(() => {
      if (dragInfo === null && vectors.length > 0) {
          // If vectors changed from last history, push
          const currentJson = JSON.stringify(vectors);
          const historyJson = history.length > 0 ? JSON.stringify(history[history.length - 1]) : "";
          if (currentJson !== historyJson) {
              setHistory(prev => [...prev, vectors]);
          }
      }
  }, [dragInfo, vectors, history]);

  // Compute Resultants
  const resultants: Resultant[] = [];

  useEffect(() => {
      const handleGlobalPointerDown = () => setSelectedId(null);
      window.addEventListener("pointerdown", handleGlobalPointerDown);
      return () => window.removeEventListener("pointerdown", handleGlobalPointerDown);
  }, []);

  const usedInChain = new Set<string>();

  vectors.forEach(v => {
      if (usedInChain.has(v.id)) return;
      let current = v;
      let chain = [current];
      while(true) {
          const next = vectors.find(n => !usedInChain.has(n.id) && !chain.includes(n) && Math.abs(n.x - (current.x + current.dx)) < 0.1 && Math.abs(n.y - (current.y + current.dy)) < 0.1);
          if (next) {
              chain.push(next);
              current = next;
          } else {
              break;
          }
      }
      
      current = chain[0];
      while(true) {
          const prev = vectors.find(p => !usedInChain.has(p.id) && !chain.includes(p) && Math.abs(current.x - (p.x + p.dx)) < 0.1 && Math.abs(current.y - (p.y + p.dy)) < 0.1);
          if (prev) {
              chain.unshift(prev);
              current = prev;
          } else {
              break;
          }
      }

      if (chain.length > 1) {
          chain.forEach(c => usedInChain.add(c.id));
          const first = chain[0];
          const last = chain[chain.length-1];
          const Rdx = last.x + last.dx - first.x;
          const Rdy = last.y + last.dy - first.y;
          resultants.push({
              id: 'R_'+first.id,
              x: first.x,
              y: first.y,
              dx: Rdx,
              dy: Rdy,
              mag: Math.hypot(Rdx, Rdy),
              label: "R"
          });
      }
  });

  vectors.forEach(vA => {
     if (usedInChain.has(vA.id)) return;
     let foundSubtraction = false;
     vectors.forEach(vB => {
         if (foundSubtraction) return;
         if (vA.id < vB.id && !usedInChain.has(vA.id) && !usedInChain.has(vB.id)) {
             if (Math.abs(vA.x - vB.x) < 0.1 && Math.abs(vA.y - vB.y) < 0.1) {
                 resultants.push({
                     id: 'R_sub_'+vA.id+'_'+vB.id,
                     x: vB.x + vB.dx, // tail of R at B's head
                     y: vB.y + vB.dy,
                     dx: vA.dx - vB.dx,
                     dy: vA.dy - vB.dy,
                     mag: Math.hypot(vA.dx - vB.dx, vA.dy - vB.dy),
                     label: `R = ${vA.label} - ${vB.label}`
                 });
                 usedInChain.add(vA.id);
                 usedInChain.add(vB.id);
                 foundSubtraction = true;
             }
         }
     });
  });

  const getScreenCoords = (x: number, y: number) => ({
      sx: ORIGIN_X + x * GRID_SIZE,
      sy: ORIGIN_Y - y * GRID_SIZE
  });
  
  const handleScalarMultiply = () => {
      const k = parseFloat(scalarInput);
      if(isNaN(k)) return;
      setVectors(prev => prev.map(v => {
          if (v.id === selectedId) {
              return { ...v, dx: v.dx * k, dy: v.dy * k };
          }
          return v;
      }));
  };

  const handleToggleUnit = (id: string) => {
      setVectors(prev => prev.map(v => v.id === id ? { ...v, showUnit: !v.showUnit } : v));
  };
  const handleToggleComponents = (id: string) => {
      setVectors(prev => prev.map(v => v.id === id ? { ...v, showComponents: !v.showComponents } : v));
  };

  const maxTotalMag = resultants.length > 0 ? Math.max(...resultants.map(r => r.mag)) : -99;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-zinc-200">
          <div className="flex gap-4 items-center">
              <input type="number" min="1" max="20" value={inputMag} onChange={e=>setInputMag(Number(e.target.value))} className="w-20 border rounded px-2 py-1 text-sm" title="Büyüklük" />
              <div className="text-sm font-bold text-gray-500">Büyüklük</div>
              <input type="number" min="0" max="360" value={inputAng} onChange={e=>setInputAng(Number(e.target.value))} className="w-20 border rounded px-2 py-1 text-sm" title="Açı (°)" />
              <div className="text-sm font-bold text-gray-500">Açı (°)</div>
              <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm transition hover:bg-blue-700 font-medium">Vektör Ekle</button>
          </div>
          <div className="flex gap-2">
              <button onClick={handleUndo} className="border px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition font-medium">Geri Al</button>
              <button onClick={handleClear} className="border px-4 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 hover:border-red-200 transition font-medium">Temizle</button>
          </div>
      </div>
      
      <div className="relative mx-auto bg-white border border-gray-200 shadow-sm" style={{ width: 600, height: 500 }} 
           onPointerDown={() => setSelectedId(null)}
           onPointerUp={onPointerUp} onPointerMove={onPointerMove} onPointerLeave={onPointerUp}>
           
          <svg width="600" height="500" className="absolute top-0 left-0 cursor-crosshair">
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
                </marker>
                <marker id="arrow-dark" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#1e293b" />
                </marker>
                {COLORS.map((c, i) => (
                    <marker key={i} id={`arrow-${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
                    </marker>
                ))}
            </defs>

            {/* Grid */}
            {Array.from({length: 16}).map((_, i) => (
                <line key={`v-${i}`} x1={i*GRID_SIZE} y1={0} x2={i*GRID_SIZE} y2={500} stroke="#e5e7eb" strokeWidth="1" />
            ))}
            {Array.from({length: 13}).map((_, i) => (
                <line key={`h-${i}`} x1={0} y1={i*GRID_SIZE} x2={600} y2={i*GRID_SIZE} stroke="#e5e7eb" strokeWidth="1" />
            ))}
            
            {/* Axes */}
            <line x1={0} y1={ORIGIN_Y} x2={600} y2={ORIGIN_Y} stroke="#6b7280" strokeWidth="2" />
            <line x1={ORIGIN_X} y1={0} x2={ORIGIN_X} y2={500} stroke="#6b7280" strokeWidth="2" />
            <text x={585} y={ORIGIN_Y - 10} fill="#18181b" fontSize={12} className="font-bold">x</text>
            <text x={ORIGIN_X + 10} y={15} fill="#18181b" fontSize={12} className="font-bold">y</text>
            
            {/* Components and Unit Vectors */}
            {vectors.map((v) => {
                const { sx, sy } = getScreenCoords(v.x, v.y);
                const { sx: ex, sy: ey } = getScreenCoords(v.x + v.dx, v.y + v.dy);
                const cIdx = COLORS.indexOf(v.color);
                
                return (
                    <g key={'decor_'+v.id}>
                        {v.showComponents && (
                            <>
                                <line x1={sx} y1={sy} x2={ex} y2={sy} stroke={v.color} strokeWidth="2" strokeDasharray="4 4" opacity={0.5} />
                                <line x1={ex} y1={sy} x2={ex} y2={ey} stroke={v.color} strokeWidth="2" strokeDasharray="4 4" opacity={0.5} />
                                <text x={(sx+ex)/2} y={sy + 15} fill={v.color} fontSize={12} textAnchor="middle">Ax={v.dx.toFixed(1)}</text>
                                <text x={ex + 5} y={(sy+ey)/2} fill={v.color} fontSize={12} alignmentBaseline="middle">Ay={v.dy.toFixed(1)}</text>
                            </>
                        )}
                        {v.showUnit && v.dx === 0 && v.dy === 0 ? null : v.showUnit && (
                            <>
                                <line 
                                   x1={sx} y1={sy} 
                                   x2={getScreenCoords(v.x + (v.dx/Math.hypot(v.dx,v.dy)), v.y + (v.dy/Math.hypot(v.dx,v.dy))).sx} 
                                   y2={getScreenCoords(v.x + (v.dx/Math.hypot(v.dx,v.dy)), v.y + (v.dy/Math.hypot(v.dx,v.dy))).sy}
                                   stroke={v.color} strokeWidth="2" strokeDasharray="2 2" opacity={0.8} markerEnd={`url(#arrow-${cIdx})`}
                                />
                            </>
                        )}
                    </g>
                );
            })}

            {/* Vectors */}
            {vectors.map((v, i) => {
                const { sx, sy } = getScreenCoords(v.x, v.y);
                const { sx: ex, sy: ey } = getScreenCoords(v.x + v.dx, v.y + v.dy);
                const isSelected = selectedId === v.id;
                const cIdx = COLORS.indexOf(v.color);
                
                return (
                    <g key={v.id} onPointerDown={(e) => onPointerDown(e, v.id, 'body')} className="cursor-move">
                        {isSelected && (
                            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#fef08a" strokeWidth="12" strokeLinecap="round" />
                        )}
                        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={v.color} strokeWidth="4" markerEnd={`url(#arrow-${cIdx})`} />
                        <text x={(sx+ex)/2 - 10} y={(sy+ey)/2 - 10} fill={v.color} fontSize={14} fontWeight="bold" className="pointer-events-none">
                            {v.label}
                        </text>
                        {/* Handles limit interaction scope */}
                        <circle cx={sx} cy={sy} r="8" fill="transparent" className="cursor-pointer" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, v.id, 'tail'); }} />
                        <circle cx={ex} cy={ey} r="8" fill="transparent" className="cursor-pointer" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, v.id, 'head'); }} />
                        
                        <title>{v.label}: |{Math.hypot(v.dx, v.dy).toFixed(2)}| ∠{(Math.atan2(v.dy, v.dx)*180/Math.PI).toFixed(1)}°</title>
                    </g>
                );
            })}
            
            {/* Resultants */}
            {resultants.map(r => {
                const { sx, sy } = getScreenCoords(r.x, r.y);
                const { sx: ex, sy: ey } = getScreenCoords(r.x + r.dx, r.y + r.dy);
                return (
                    <g key={r.id}>
                        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#1e293b" strokeWidth="4" strokeDasharray="6 6" markerEnd="url(#arrow-dark)" className="pointer-events-none" />
                        <text x={(sx+ex)/2 + 10} y={(sy+ey)/2 + 10} fill="#1e293b" fontSize={14} fontWeight="bold" className="pointer-events-none bg-white">
                            {r.label}
                        </text>
                    </g>
                )
            })}
          </svg>
          
          {/* Floating Panel for Selection */}
          {selectedId && !dragInfo && (() => {
              const v = vectors.find(x => x.id === selectedId);
              if (!v) return null;
              const { sx, sy } = getScreenCoords(v.x + v.dx, v.y + v.dy);
              return (
                  <div className="absolute bg-white border border-gray-300 shadow-xl rounded p-3 z-10 w-48 text-sm" style={{ left: sx + 15, top: sy + 15 }} onPointerDown={(e) => e.stopPropagation()}>
                      <p className="font-bold text-gray-800 mb-2">{v.label} Vektörü Seçili</p>
                      
                      <div className="flex gap-2 items-center mb-2">
                          <input type="number" step="0.1" value={scalarInput} onChange={e=>setScalarInput(e.target.value)} className="border rounded w-16 px-1" />
                          <button onClick={handleScalarMultiply} className="bg-gray-100 border text-xs px-2 py-1 rounded hover:bg-gray-200">Skaler Çarp</button>
                      </div>
                      
                      <label className="flex items-center gap-2 mb-1 cursor-pointer">
                          <input type="checkbox" checked={v.showComponents} onChange={() => handleToggleComponents(v.id)} />
                          Bileşenleri Göster
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={v.showUnit} onChange={() => handleToggleUnit(v.id)} />
                          Birim Vektör Göster
                      </label>
                  </div>
              );
          })()}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">Gözlem Paneli</h4>
            <table className="w-full text-sm text-left table-fixed">
                <thead className="bg-zinc-50 border-b">
                    <tr>
                        <th className="px-4 py-2">Etiket</th>
                        <th className="px-4 py-2">Büyüklük</th>
                        <th className="px-4 py-2">Açı (°)</th>
                        <th className="px-4 py-2">X Bileşeni</th>
                        <th className="px-4 py-2">Y Bileşeni</th>
                    </tr>
                </thead>
                <tbody>
                    {vectors.map(v => (
                        <tr key={v.id} className="border-b last:border-b-0 hover:bg-zinc-50">
                            <td className="px-4 py-2 font-bold" style={{color: v.color}}>{v.label}</td>
                            <td className="px-4 py-2">{Math.hypot(v.dx, v.dy).toFixed(2)}</td>
                            <td className="px-4 py-2">{(Math.atan2(v.dy, v.dx)*180/Math.PI).toFixed(1)}°</td>
                            <td className="px-4 py-2">{v.dx.toFixed(2)}</td>
                            <td className="px-4 py-2">{v.dy.toFixed(2)}</td>
                        </tr>
                    ))}
                    {resultants.map(r => (
                        <tr key={r.id} className="bg-blue-50 border-b last:border-b-0 font-medium">
                            <td className="px-4 py-2 text-[#1e293b]">{r.label}</td>
                            <td className="px-4 py-2 text-blue-700">{r.mag.toFixed(2)}</td>
                            <td className="px-4 py-2">{(Math.atan2(r.dy, r.dx)*180/Math.PI).toFixed(1)}°</td>
                            <td className="px-4 py-2">{r.dx.toFixed(2)}</td>
                            <td className="px-4 py-2">{r.dy.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {vectors.length === 0 && <p className="text-zinc-500 text-sm py-4 italic text-center">Henüz vektör eklenmedi.</p>}
      </div>

      <CompletionCheck
        slug={slug}
        zorunluDeney={simulasyon.zorunlu_deney}
        observedValue={maxTotalMag >= 0 ? maxTotalMag : -99}
        isFinished={resultants.length > 0}
      />
    </div>
  );
}
