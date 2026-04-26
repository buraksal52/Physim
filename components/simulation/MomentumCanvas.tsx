"use client";

import { useState, useRef, useEffect } from "react";
import { Simulasyon } from "@/lib/types";
import { calculateElasticCollision, calculateInelasticCollision, calculate2DCollision } from "@/lib/physics/momentum";
import CompletionCheck from "./CompletionCheck";

interface MomentumCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function MomentumControlPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Kontrol Paneli
      </h4>
      {children}
    </div>
  );
}

function MomentumObservationPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm h-full max-h-[500px] overflow-y-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Gözlem Paneli
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default function MomentumCanvas({ slug, simulation, onComplete }: MomentumCanvasProps) {
  const [mode, setMode] = useState<"1d" | "2d">("1d");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2">
        <button
          onClick={() => setMode("1d")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "1d" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          1D Çarpışma
        </button>
        <button
          onClick={() => setMode("2d")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "2d" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          2D Çarpışma
        </button>
      </div>

      {mode === "1d" && <OneDMode slug={slug} simulation={simulation} onComplete={onComplete} />}
      {mode === "2d" && <TwoDMode />}
    </div>
  );
}

// ==========================================
// MODE 1: 1D Collision
// ==========================================
function OneDMode({ slug, simulation, onComplete }: { slug: string; simulation: Simulasyon; onComplete: () => void }) {
  const [subMode, setSubMode] = useState<"esnek" | "inelastik" | "kismi">("inelastik");
  
  const [m1, setM1] = useState(4);
  const [v1, setV1] = useState(6);
  const [m2, setM2] = useState(2);
  const [v2, setV2] = useState(0);
  const [restitution, setRestitution] = useState(0.8);
  
  const [state, setState] = useState<"ready" | "running" | "done">("ready");
  
  const [x1, setX1] = useState(100);
  const [x2, setX2] = useState(500);
  const [currentV1, setCurrentV1] = useState(v1);
  const [currentV2, setCurrentV2] = useState(v2);

  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);

  const p1i = m1 * v1;
  const p2i = m2 * v2;
  const totalPi = p1i + p2i;
  const ek1i = 0.5 * m1 * v1 * v1;
  const ek2i = 0.5 * m2 * v2 * v2;
  const totalEki = ek1i + ek2i;

  const w1 = 30 + m1 * 2;
  const w2 = 30 + m2 * 2;

  const elasticRes = calculateElasticCollision(m1, v1, m2, v2);
  const inelasticRes = calculateInelasticCollision(m1, v1, m2, v2);

  let vf1 = 0; let vf2 = 0;
  let totalPf = 0; let totalEkf = 0;
  
  if (subMode === "esnek") {
      vf1 = elasticRes.v1f; vf2 = elasticRes.v2f;
      totalPf = elasticRes.totalPf; totalEkf = elasticRes.totalEkf;
  } else if (subMode === "kismi") {
      vf1 = ((m1 - restitution*m2)*v1 + m2*(1+restitution)*v2) / (m1+m2);
      vf2 = ((m2 - restitution*m1)*v2 + m1*(1+restitution)*v1) / (m1+m2);
      totalPf = m1*vf1 + m2*vf2;
      totalEkf = 0.5*m1*vf1*vf1 + 0.5*m2*vf2*vf2;
  } else {
      vf1 = inelasticRes.vf; vf2 = inelasticRes.vf;
      totalPf = inelasticRes.totalPf; totalEkf = inelasticRes.totalEkf;
  }

  const lostE = totalEki - totalEkf;

  useEffect(() => {
    if (state !== "running") return;
    
    const animate = (t: number) => {
      let dt = (t - prevTimeRef.current) / 1000;
      prevTimeRef.current = t;
      if (dt > 0.05) dt = 0.05;
      
      setX1(prev1 => {
         setX2(prev2 => {
            let nextX1 = prev1 + currentV1 * dt * 30; // 30 px per m
            let nextX2 = prev2 + currentV2 * dt * 30;
            
            // Check collision
            if (nextX2 - nextX1 <= (w1 + w2) / 2) {
               // Collision happened
               nextX1 = prev1;
               nextX2 = prev2;
               setCurrentV1(vf1);
               setCurrentV2(vf2);
               setState("done");
            }
            return nextX2;
         });
         return prev1 + currentV1 * dt * 30;
      });
      
      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => { if (reqRef.current) cancelAnimationFrame(reqRef.current); };
  }, [state, currentV1, currentV2, vf1, vf2, w1, w2]);

  const handleStart = () => {
    setState("running");
    setCurrentV1(v1);
    setCurrentV2(v2);
    prevTimeRef.current = performance.now();
  };

  const handleReset = () => {
    setState("ready");
    setX1(100);
    setX2(500);
    setCurrentV1(v1);
    setCurrentV2(v2);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        
        <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2 text-sm">
            <button onClick={() => {setSubMode("esnek"); handleReset()}} className={`px-3 py-1 rounded transition ${subMode === "esnek" ? "bg-white shadow text-blue-600 font-bold" : "text-gray-600"}`}>Tam Esnek</button>
            <button onClick={() => {setSubMode("inelastik"); handleReset()}} className={`px-3 py-1 rounded transition ${subMode === "inelastik" ? "bg-white shadow text-blue-600 font-bold" : "text-gray-600"}`}>Tam Esnek Olmayan</button>
            <button onClick={() => {setSubMode("kismi"); handleReset()}} className={`px-3 py-1 rounded transition ${subMode === "kismi" ? "bg-white shadow text-blue-600 font-bold" : "text-gray-600"}`}>Kısmi Esnek</button>
        </div>

        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[280px]">
          <svg width="700" height="280">
            {/* Grid */}
            <g stroke="#e5e7eb" strokeWidth="1">
               {[...Array(15)].map((_, i) => (
                  <line key={`x-${i}`} x1={i*50} y1="0" x2={i*50} y2="280" />
               ))}
               {[...Array(6)].map((_, i) => (
                  <line key={`y-${i}`} x1="0" y1={i*50} x2="700" y2={i*50} />
               ))}
            </g>

            {/* Track */}
            <line x1="0" y1="180" x2="700" y2="180" stroke="#9ca3af" strokeWidth="4" />
            
            {/* Block 1 */}
            {!(state === "done" && subMode === "inelastik") && (
                <g transform={`translate(${x1}, 180)`}>
                    <rect x={-w1/2} y={-w1} width={w1} height={w1} fill="#2563eb" />
                    <text x="0" y={-w1/2 + 5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">m₁</text>
                    {/* Velocity Arrow */}
                    {currentV1 !== 0 && (
                        <g transform={`translate(0, ${-w1 - 10})`}>
                            <line x1="0" y1="0" x2={currentV1 * 5} y2="0" stroke="#18181b" strokeWidth="2" markerEnd="url(#arrow-v)" />
                            <text x={currentV1 * 2.5} y="-5" textAnchor="middle" fontSize="10">{Math.abs(currentV1).toFixed(1)} v</text>
                        </g>
                    )}
                    {/* Momentum Arrow */}
                    {currentV1 !== 0 && (
                        <g transform={`translate(0, 20)`}>
                            <line x1="0" y1="0" x2={currentV1 * m1} y2="0" stroke="#9333ea" strokeWidth="2" markerEnd="url(#arrow-p)" />
                            <text x={currentV1 * m1 / 2} y="15" fill="#9333ea" textAnchor="middle" fontSize="10">p₁</text>
                        </g>
                    )}
                </g>
            )}

            {/* Block 2 */}
            {!(state === "done" && subMode === "inelastik") && (
                <g transform={`translate(${x2}, 180)`}>
                    <rect x={-w2/2} y={-w2} width={w2} height={w2} fill="#ea580c" />
                    <text x="0" y={-w2/2 + 5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">m₂</text>
                    {currentV2 !== 0 && (
                        <g transform={`translate(0, ${-w2 - 10})`}>
                            <line x1="0" y1="0" x2={currentV2 * 5} y2="0" stroke="#18181b" strokeWidth="2" markerEnd="url(#arrow-v)" />
                            <text x={currentV2 * 2.5} y="-5" textAnchor="middle" fontSize="10">{Math.abs(currentV2).toFixed(1)} v</text>
                        </g>
                    )}
                    {currentV2 !== 0 && (
                        <g transform={`translate(0, 20)`}>
                            <line x1="0" y1="0" x2={currentV2 * m2} y2="0" stroke="#9333ea" strokeWidth="2" markerEnd="url(#arrow-p)" />
                            <text x={currentV2 * m2 / 2} y="15" fill="#9333ea" textAnchor="middle" fontSize="10">p₂</text>
                        </g>
                    )}
                </g>
            )}

            {/* Inelastic Merged Block */}
            {(state === "done" && subMode === "inelastik") && (
                <g transform={`translate(${x1 + w1/2}, 180)`}>
                    <rect x={-(w1+w2)/2} y={-(w1+w2)/2} width={w1+w2} height={(w1+w2)/2} fill="#16a34a" />
                    <text x="0" y={-(w1+w2)/4 + 5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">m₁ + m₂</text>
                    {currentV1 !== 0 && (
                        <g transform={`translate(0, ${-(w1+w2)/2 - 10})`}>
                            <line x1="0" y1="0" x2={currentV1 * 5} y2="0" stroke="#18181b" strokeWidth="2" markerEnd="url(#arrow-v)" />
                        </g>
                    )}
                    {currentV1 !== 0 && (
                        <g transform={`translate(0, 20)`}>
                            <line x1="0" y1="0" x2={currentV1 * (m1+m2)} y2="0" stroke="#9333ea" strokeWidth="3" markerEnd="url(#arrow-p)" />
                            <text x={currentV1 * (m1+m2) / 2} y="15" fill="#9333ea" textAnchor="middle" fontSize="10">p_toplam</text>
                        </g>
                    )}
                </g>
            )}

            <defs>
              <marker id="arrow-v" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#18181b" />
              </marker>
              <marker id="arrow-p" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9333ea" />
              </marker>
            </defs>

            {/* Overlay */}
            {state === "done" && (
                <g>
                   <rect x="200" y="20" width="300" height="90" fill="white" fillOpacity="0.9" stroke="#d1d5db" rx="8" />
                   <text x="350" y="40" textAnchor="middle" fontSize="14" fill="#18181b" fontWeight="bold">Çarpışma Özeti</text>
                   <text x="220" y="60" fontSize="12" fill="#374151">p_önce: {totalPi.toFixed(1)} , p_sonra: {totalPf.toFixed(1)}</text>
                   <text x="220" y="75" fontSize="12" fill="#374151">Ek_önce: {totalEki.toFixed(1)} J , Ek_sonra: {totalEkf.toFixed(1)} J</text>
                   <text x="220" y="90" fontSize="12" fill="#ef4444" fontWeight="bold">Kayıp Enerji: {lostE.toFixed(1)} J</text>
                </g>
            )}
          </svg>
        </div>

        <MomentumControlPanel>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
             <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">m₁: {m1} kg</label>
              <input type="range" min="1" max="20" step="1" value={m1} onChange={e => {setM1(Number(e.target.value)); handleReset();}} className="w-full" disabled={state!=="ready"} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">v₁: {v1} m/s</label>
              <input type="range" min="-20" max="20" step="1" value={v1} onChange={e => {setV1(Number(e.target.value)); handleReset();}} className="w-full" disabled={state!=="ready"} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">m₂: {m2} kg</label>
              <input type="range" min="1" max="20" step="1" value={m2} onChange={e => {setM2(Number(e.target.value)); handleReset();}} className="w-full" disabled={state!=="ready"} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">v₂: {v2} m/s</label>
              <input type="range" min="-20" max="20" step="1" value={v2} onChange={e => {setV2(Number(e.target.value)); handleReset();}} className="w-full" disabled={state!=="ready"} />
            </div>
            {subMode === "kismi" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700">e: {restitution.toFixed(2)}</label>
                  <input type="range" min="0" max="1" step="0.1" value={restitution} onChange={e => {setRestitution(Number(e.target.value)); handleReset();}} className="w-full" disabled={state!=="ready"} />
                </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
              <button onClick={state === "ready" ? handleStart : handleReset} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition">
                {state === "ready" ? "Başlat" : "Tekrar"}
              </button>
          </div>
        </MomentumControlPanel>
      </div>

      <div className="flex flex-col gap-4">
        <MomentumObservationPanel>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-gray-600 text-sm">İlk v_1, v_2:</span><span className="font-mono text-sm">{v1.toFixed(1)} , {v2.toFixed(1)}</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-purple-800 text-sm font-semibold">p_top_önce:</span><span className="font-mono text-sm text-purple-800">{totalPi.toFixed(1)}</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-gray-600 text-sm">Son v_1', v_2':</span><span className="font-mono text-sm">{vf1.toFixed(1)} , {vf2.toFixed(1)}</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-purple-800 text-sm font-semibold">p_top_sonra:</span><span className="font-mono text-sm text-purple-800">{totalPf.toFixed(1)}</span>
          </div>
          
          <div className="flex justify-between border-b border-dashed pb-1 mt-2">
             <span className="text-gray-600 text-sm">Ek Kaybı:</span><span className="font-mono text-sm text-red-600">{lostE.toFixed(1)} J</span>
          </div>
        </MomentumObservationPanel>

        {simulation.zorunlu_deney && subMode === "inelastik" && (
          <CompletionCheck
             slug={slug}
             zorunluDeney={simulation.zorunlu_deney}
             observedValue={vf1} // ortak hiz
             isFinished={state === "done"}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// MODE 2: 2D Collision
// ==========================================
function TwoDMode() {
  const [subMode, setSubMode] = useState<"inelastik" | "esnek">("inelastik");
  const [m1, setM1] = useState(2);
  const [v1, setV1] = useState(10);
  const [m2, setM2] = useState(2);
  const [v2, setV2] = useState(0);
  const [angle2Deg, setAngle2Deg] = useState(0);

  const [state, setState] = useState<"ready" | "running" | "done">("ready");
  
  // Starting pos
  const startX1 = 100; const startY1 = 250;
  const startX2 = 300; const startY2 = 250; // Keep y same for direct hit line
  // Let object 2 offset be fixed visual impact point 
  const pRealX2 = 300; const pRealY2 = 250 - 20;

  const [x1, setX1] = useState(startX1); const [y1, setY1] = useState(startY1);
  const [x2, setX2] = useState(pRealX2); const [y2, setY2] = useState(pRealY2);
  
  const r1 = 15 + m1*2;
  const r2 = 15 + m2*2;
  
  // Pre-calculate collision geometry
  const dX = pRealX2 - startX1;
  const dY = pRealY2 - startY1;
  const dist = Math.sqrt(dX*dX + dY*dY);
  // Time to impact for object 1 assuming object 2 moves simultaneously
  // For simplicity visually: they move towards the impact coordinate (300, 250)
  
  const a1 = 0; // Object 1 always moves right
  const a2 = (angle2Deg * Math.PI) / 180;
  
  const vx1 = v1; const vy1 = 0;
  const vx2 = v2 * Math.cos(a2); const vy2 = v2 * Math.sin(a2);

  const p1x = m1 * vx1; const p1y = m1 * vy1;
  const p2x = m2 * vx2; const p2y = m2 * vy2;
  const tPx = p1x + p2x; const tPy = p1y + p2y;
  
  // Post collision logic
  const vfxIn = tPx / (m1+m2); const vfyIn = tPy / (m1+m2);
  
  // Simplified 2D Elastic assumption: 1D elastic along the line of centers.
  // Normal vector at impact: (x2 - x1, y2 - y1)
  const impactNormalX = pRealX2 - 300; // x1 is at 300 at impact
  const impactNormalY = pRealY2 - 250;
  const nMag = Math.sqrt(impactNormalX*impactNormalX + impactNormalY*impactNormalY) || 1;
  const nx = impactNormalX / nMag; const ny = impactNormalY / nMag;
  
  const p1 = vx1 * nx + vy1 * ny;
  const p2 = vx2 * nx + vy2 * ny;
  const p1f = ((m1 - m2)*p1 + 2*m2*p2) / (m1+m2);
  const p2f = ((m2 - m1)*p2 + 2*m1*p1) / (m1+m2);
  const v1f_x_el = vx1 + (p1f - p1)*nx; const v1f_y_el = vy1 + (p1f - p1)*ny;
  const v2f_x_el = vx2 + (p2f - p2)*nx; const v2f_y_el = vy2 + (p2f - p2)*ny;

  const reqRef = useRef<number | null>(null);
  useEffect(() => {
     if(state !== "running") return;
     let lastT = performance.now();
     
     const animate = (t: number) => {
         let dt = (t - lastT) / 1000;
         if(dt > 0.05) dt = 0.05;
         lastT = t;
         
         setX1(px => {
            setY1(py => {
               setX2(px2 => {
                  setY2(py2 => {
                     // check dist
                     const dx = px2 - px; const dy = py2 - py;
                     const d = Math.sqrt(dx*dx + dy*dy);
                     if (d <= r1+r2) {
                        setState("done");
                        return px2;
                     }
                     // move
                     px2 += vx2 * dt * 20; py2 += vy2 * dt * 20;
                     return px2;
                  })
                  return px2;
               });
               py += vy1 * dt * 20; return py;
            });
            px += vx1 * dt * 20; return px;
         });
         reqRef.current = requestAnimationFrame(animate);
     };
     reqRef.current = requestAnimationFrame(animate);
     return () => cancelAnimationFrame(reqRef.current!);
  }, [state, r1, r2, vx1, vy1, vx2, vy2]);
  
  // Actually, to make the UI simpler and less buggy with generic 2D physics engines in a UI component, 
  // we trace the mathematical paths directly instead of frame-by-frame collision detection which is error prone.
  
  const renderCollision = () => {
      // Just a placeholder illustration for 2D mode
      return (
         <g>
            <text x="300" y="250" textAnchor="middle" fill="#9ca3af">Çarpışma Simülasyonu 2D Vektörel Gösterimi</text>
         </g>
      )
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2 text-sm">
            <button onClick={() => {setSubMode("inelastik"); setState("ready");}} className={`px-3 py-1 rounded transition ${subMode === "inelastik" ? "bg-white shadow text-blue-600 font-bold" : "text-gray-600"}`}>Tam Esnek Olmayan</button>
            <button onClick={() => {setSubMode("esnek"); setState("ready");}} className={`px-3 py-1 rounded transition ${subMode === "esnek" ? "bg-white shadow text-blue-600 font-bold" : "text-gray-600"}`}>Esnek</button>
        </div>

        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[500px]">
          <svg width="600" height="500">
             {/* Grid */}
             <g stroke="#e5e7eb" strokeWidth="1">
               {[...Array(12)].map((_, i) => (
                  <line key={`x-${i}`} x1={i*50} y1="0" x2={i*50} y2="500" />
               ))}
               {[...Array(10)].map((_, i) => (
                  <line key={`y-${i}`} x1="0" y1={i*50} x2="600" y2={i*50} />
               ))}
             </g>

             {/* Puck 1 pre */}
             <circle cx={x1} cy={y1} r={r1} fill="#2563eb" fillOpacity={state==="done" ? 0.2 : 1} />
             <line x1={x1} y1={y1} x2={x1 + vx1*5} y2={y1} stroke="#9333ea" strokeWidth="3" markerEnd="url(#arrow-p)" />

             {/* Puck 2 pre */}
             <circle cx={x2} cy={y2} r={r2} fill="#ea580c" fillOpacity={state==="done" ? 0.2 : 1} />
             <line x1={x2} y1={y2} x2={x2 + vx2*5} y2={y2 + vy2*5} stroke="#9333ea" strokeWidth="3" markerEnd="url(#arrow-p)" />
             
             {state === "done" && subMode === "inelastik" && (
                 <g>
                    <circle cx={(x1+x2)/2} cy={(y1+y2)/2} r={Math.sqrt(r1*r1 + r2*r2)} fill="#16a34a" />
                    <line x1={(x1+x2)/2} y1={(y1+y2)/2} x2={(x1+x2)/2 + vfxIn*15} y2={(y1+y2)/2 + vfyIn*15} stroke="#9333ea" strokeWidth="4" markerEnd="url(#arrow-p)" />
                 </g>
             )}
             
             {state === "done" && subMode === "esnek" && (
                 <g>
                    <circle cx={x1+2} cy={y1+2} r={r1} fill="#2563eb" />
                    <line x1={x1} y1={y1} x2={x1 + v1f_x_el*5} y2={y1 + v1f_y_el*5} stroke="#9333ea" strokeWidth="2" markerEnd="url(#arrow-p)" />
                    
                    <circle cx={x2-2} cy={y2-2} r={r2} fill="#ea580c" />
                    <line x1={x2} y1={y2} x2={x2 + v2f_x_el*5} y2={y2 + v2f_y_el*5} stroke="#9333ea" strokeWidth="2" markerEnd="url(#arrow-p)" />
                 </g>
             )}

             <defs>
              <marker id="arrow-p" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9333ea" />
              </marker>
            </defs>
          </svg>
        </div>

        <MomentumControlPanel>
           <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
             <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">m₁: {m1} kg</label>
              <input type="range" min="1" max="10" step="1" value={m1} onChange={e => {setM1(Number(e.target.value)); setState("ready"); setX1(startX1); setY1(startY1); setX2(pRealX2); setY2(pRealY2);}} className="w-full" disabled={state!=="ready"} />
            </div>
             <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">v₁: {v1} m/s</label>
              <input type="range" min="1" max="20" step="1" value={v1} onChange={e => {setV1(Number(e.target.value)); setState("ready"); setX1(startX1); setY1(startY1); setX2(pRealX2); setY2(pRealY2);}} className="w-full" disabled={state!=="ready"} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">m₂: {m2} kg</label>
              <input type="range" min="1" max="10" step="1" value={m2} onChange={e => {setM2(Number(e.target.value)); setState("ready"); setX1(startX1); setY1(startY1); setX2(pRealX2); setY2(pRealY2);}} className="w-full" disabled={state!=="ready"} />
            </div>
             <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">v₂: {v2} m/s</label>
              <input type="range" min="0" max="20" step="1" value={v2} onChange={e => {setV2(Number(e.target.value)); setState("ready"); setX1(startX1); setY1(startY1); setX2(pRealX2); setY2(pRealY2);}} className="w-full" disabled={state!=="ready"} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Açı 2: {angle2Deg}°</label>
              <input type="range" min="0" max="360" step="15" value={angle2Deg} onChange={e => {setAngle2Deg(Number(e.target.value)); setState("ready"); setX1(startX1); setY1(startY1); setX2(pRealX2); setY2(pRealY2);}} className="w-full" disabled={state!=="ready"} />
            </div>
           </div>
           <div className="flex gap-2 mt-4">
              <button 
                onClick={() => {
                   if (state === "ready") { setState("running"); }
                   else { setState("ready"); setX1(startX1); setY1(startY1); setX2(pRealX2); setY2(pRealY2); }
                }} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
              >
                {state === "ready" ? "Başlat" : "Tekrar"}
              </button>
          </div>
        </MomentumControlPanel>
      </div>
      
      <div className="flex flex-col gap-4">
        <MomentumObservationPanel>
           <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-purple-800 text-sm font-semibold">p_x (toplam):</span><span className="font-mono text-sm text-purple-800">{tPx.toFixed(1)}</span>
          </div>
          <div className="flex justify-between border-b border-dashed pb-1">
             <span className="text-purple-800 text-sm font-semibold">p_y (toplam):</span><span className="font-mono text-sm text-purple-800">{tPy.toFixed(1)}</span>
          </div>
        </MomentumObservationPanel>
      </div>

    </div>
  )
}