"use client";

import { useState, useRef, useEffect } from "react";
import { Simulasyon } from "@/lib/types";
import {
  calculateParallelPlateCapacitance,
  calculateElectricField,
  calculateStoredEnergy,
  calculateCharge,
  calculateSeriesCapacitance,
  calculateParallelCapacitance,
  getChargingCurve,
  getDischargeCurve
} from "@/lib/physics/capacitor";
import CompletionCheck from "./CompletionCheck";

interface CapacitorCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function CPnl({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Kontrol Paneli
      </h4>
      {children}
    </div>
  );
}

function CObsPnl({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm h-full max-h-[500px] overflow-y-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Gözlem Paneli
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default function CapacitorCanvas({ slug, simulation, onComplete }: CapacitorCanvasProps) {
  const [mode, setMode] = useState<"plates" | "rc" | "circuits">("plates");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2 flex-wrap">
        <button
          onClick={() => setMode("plates")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "plates" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Paralel Levhalar
        </button>
        <button
          onClick={() => setMode("rc")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "rc" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Yük Depolama ve Boşalma
        </button>
        <button
          onClick={() => setMode("circuits")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "circuits" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Seri ve Paralel Bağlı
        </button>
      </div>

      {mode === "plates" && <PlatesMode />}
      {mode === "rc" && <RCMode slug={slug} simulation={simulation} onComplete={onComplete} />}
      {mode === "circuits" && <CircuitsMode />}
    </div>
  );
}

// ------------------- MODE 1: Plates -------------------
function PlatesMode() {
   const [V, setV] = useState(100);
   const [d, setD] = useState(0.05); // m
   const [A, setA] = useState(5000); // cm^2
   const [dielectric, setDielectric] = useState(1);
   
   const areaM2 = A / 10000;
   
   const { C } = calculateParallelPlateCapacitance(areaM2, d, dielectric);
   const { E } = calculateElectricField(V, d);
   const { Q } = calculateCharge(C, V);
   const { U } = calculateStoredEnergy(C, V);
   
   const getMaterialName = (k: number) => {
       if (k === 1) return "Vakum";
       if (k === 2.1) return "Teflon";
       if (k === 4.5) return "Cam";
       if (k === 7) return "Mika";
       if (k === 10) return "Su";
       return `k=${k}`;
   };
   
   // visual mappings
   // canvas 600 x 420
   // plate width maps A roughly: min 100cm2 = 100px, max 10000cm2 = 500px
   const plateWidth = 100 + (A / 10000) * 400;
   // gap maps d: min 0.01 = 20px, max 0.2 = 200px
   const gapPx = 20 + (d / 0.2) * 180;
   
   const topY = 210 - gapPx / 2.0;
   const botY = 210 + gapPx / 2.0;
   
   const qCount = Math.min(Math.max(Math.floor((Q / 5e-9) * 20), 4), 60);

   return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
         <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="relative bg-white border rounded-xl overflow-hidden flex justify-center items-center h-[420px] bg-gray-50/50">
               {dielectric > 1 && (
                   <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold border border-blue-200">
                     Dielektrik malzeme sığayı {dielectric} katına çıkardı.
                   </div>
               )}
               <svg width="600" height="420" className="text-zinc-900 pointer-events-none">
                  {/* Grid */}
                  <g stroke="#e5e7eb" strokeWidth="1">
                    {[...Array(12)].map((_, i) => ( <line key={`x-${i}`} x1={i*50} y1="0" x2={i*50} y2="420" /> ))}
                    {[...Array(9)].map((_, i) => ( <line key={`y-${i}`} x1="0" y1={i*50} x2="600" y2={i*50} /> ))}
                  </g>
                  
                  {/* Dielectric */}
                  {dielectric > 1 && (
                     <rect x={300 - plateWidth/2} y={topY} width={plateWidth} height={gapPx} fill="#60a5fa" opacity="0.3" />
                  )}

                  {/* E Field Lines */}
                  {Array.from({length: Math.floor(plateWidth/30)}).map((_, i, arr) => {
                      const spacing = plateWidth / arr.length;
                      const lx = (300 - plateWidth/2) + spacing/2 + i * spacing;
                      return (
                         <line key={`ef-${i}`} x1={lx} y1={topY} x2={lx} y2={botY} stroke="#ea580c" strokeWidth={1 + (V/1000)} strokeDasharray="4 4" markerEnd="url(#arrow-orange)" opacity={0.6} />
                      )
                  })}
                  
                  {/* Red Plate */}
                  <rect x={300 - plateWidth/2} y={topY - 10} width={plateWidth} height={10} fill="#dc2626" rx="2" />
                  {/* Positive Charges */}
                  {Array.from({length: qCount}).map((_, i) => (
                      <text key={`p-${i}`} x={(300 - plateWidth/2) + (i+0.5)*(plateWidth/qCount)} y={topY - 2} fontSize="10" fontWeight="bold" fill="#fff" textAnchor="middle">+</text>
                  ))}
                  
                  {/* Blue Plate */}
                  <rect x={300 - plateWidth/2} y={botY} width={plateWidth} height={10} fill="#2563eb" rx="2" />
                  {/* Negative Charges */}
                  {Array.from({length: qCount}).map((_, i) => (
                      <text key={`n-${i}`} x={(300 - plateWidth/2) + (i+0.5)*(plateWidth/qCount)} y={botY + 8} fontSize="10" fontWeight="bold" fill="#fff" textAnchor="middle">-</text>
                  ))}
                  
                  <defs>
                     <marker id="arrow-orange" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                       <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
                     </marker>
                  </defs>
               </svg>
            </div>
            
            <CPnl>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                     <label className="text-xs font-bold text-gray-700">Gerilim: {V} V</label>
                     <input type="range" min="10" max="1000" step="10" value={V} onChange={e=>setV(Number(e.target.value))} />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-xs font-bold text-gray-700">Mesafe (d): {d.toFixed(2)} m</label>
                     <input type="range" min="0.01" max="0.2" step="0.01" value={d} onChange={e=>setD(Number(e.target.value))} />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-xs font-bold text-gray-700">Alan (A): {A} cm²</label>
                     <input type="range" min="100" max="10000" step="100" value={A} onChange={e=>setA(Number(e.target.value))} />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-xs font-bold text-gray-700">Dielektrik: {getMaterialName(dielectric)} (ε<sub>r</sub>={dielectric})</label>
                     <input type="range" min="1" max="10" step="0.5" value={dielectric} onChange={e=>setDielectric(Number(e.target.value))} />
                  </div>
               </div>
            </CPnl>
         </div>
         
         <div className="flex flex-col gap-4">
            <CObsPnl>
               <div className="flex justify-between border-b border-gray-200 pb-1 mt-1">
                 <span className="text-gray-600 text-sm">V (Gerilim):</span> <span className="font-mono text-sm">{V} V</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-1 mt-1">
                 <span className="text-gray-600 text-sm">d (Mesafe):</span> <span className="font-mono text-sm">{d.toFixed(2)} m</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-1 mt-1">
                 <span className="text-gray-600 text-sm">A (Alan):</span> <span className="font-mono text-sm">{areaM2.toFixed(3)} m²</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-1 mt-1">
                 <span className="text-gray-600 text-sm">ε<sub>r</sub>:</span> <span className="font-mono text-sm">{dielectric}</span>
               </div>
               
               <div className="flex justify-between border-b border-gray-300 pb-1 mt-3 bg-blue-50 p-1 rounded">
                 <span className="font-bold text-zinc-800 text-sm">C (Sığa):</span> <span className="font-mono text-sm text-blue-800 font-bold">{(C * 1e12).toFixed(2)} pF</span>
               </div>
               <div className="flex justify-between border-b border-gray-300 pb-1 mt-1 bg-red-50 p-1 rounded">
                 <span className="font-bold text-zinc-800 text-sm">Q (Yük):</span> <span className="font-mono text-sm text-red-800 font-bold">{(Q * 1e9).toFixed(2)} nC</span>
               </div>
               <div className="flex justify-between border-b border-gray-300 pb-1 mt-1 bg-orange-50 p-1 rounded">
                 <span className="font-bold text-zinc-800 text-sm">E (Alan):</span> <span className="font-mono text-sm text-orange-800 font-bold">{E.toFixed(0)} V/m</span>
               </div>
               <div className="flex justify-between border-b border-gray-300 pb-1 mt-1 bg-green-50 p-1 rounded">
                 <span className="font-bold text-zinc-800 text-sm">U (Enerji):</span> <span className="font-mono text-sm text-green-800 font-bold">{(U * 1e6).toFixed(2)} nJ</span>
               </div>
            </CObsPnl>
         </div>
      </div>
   );
}


// ------------------- MODE 2: Yük Depolama ve Boşalma (RC) -------------------
function RCMode({ slug, simulation, onComplete }: { slug: string; simulation: Simulasyon; onComplete: () => void }) {
   const [C_uF, setC] = useState(5);
   const [R_kOhm, setR] = useState(10);
   const [V_val, setV] = useState(100);
   const [activeGraph, setActiveGraph] = useState<"Q" | "V">("Q");
   
   const [state, setState] = useState<"idle" | "charging" | "discharging">("idle");
   const [t, setT] = useState(0); 
   
   const C = C_uF * 1e-6;
   const R = R_kOhm * 1e3;
   const tau = R * C;
   const maxT = tau * 5;
   
   // logic tracking
   const reqRef = useRef<number | null>(null);
   const prevTimeRef = useRef<number>(0);
   
   useEffect(() => {
     if (state === "idle") return;
     const animate = (time: number) => {
        let dt = (time - prevTimeRef.current) / 1000;
        prevTimeRef.current = time;
        if(dt > 0.1) dt = 0.1;
        
        setT(prev => {
           const next = prev + dt;
           if (next >= maxT) {
              setState("idle");
              return maxT;
           }
           return next;
        });
        reqRef.current = requestAnimationFrame(animate);
     };
     reqRef.current = requestAnimationFrame(animate);
     return () => cancelAnimationFrame(reqRef.current!);
   }, [state, maxT]);
   
   const handleCharge = () => { if(t >= maxT && state === "charging") return; setState("charging"); prevTimeRef.current = performance.now(); if(state!=="charging") setT(0); };
   const handleDischarge = () => { if(t >= maxT && state === "discharging") return; setState("discharging"); prevTimeRef.current = performance.now(); if(state!=="discharging") setT(0); };
   const handleReset = () => { setState("idle"); setT(0); };
   
   // Current values
   let currentQ = 0, currentVC = 0, currentI = 0;
   const maxQ = C * V_val;
   if (state === "charging" || (state === "idle" && t > 0)) {
       currentQ = maxQ * (1 - Math.exp(-t/tau));
       currentVC = V_val * (1 - Math.exp(-t/tau));
       currentI = (V_val/R) * Math.exp(-t/tau);
   } 
   // if discharging, we assume we discharged from maxQ IF we had charged
   if (state === "discharging" || (state === "idle" && t > 0 && state === "discharging")) {
       currentQ = maxQ * Math.exp(-t/tau);
       currentVC = V_val * Math.exp(-t/tau);
       currentI = -(V_val/R) * Math.exp(-t/tau);
   }
   if (state === "idle" && t === 0) {
       currentQ = 0; currentVC = 0; currentI = 0;
   }
   
   const currentU = 0.5 * C * currentVC * currentVC;
   
   // Curves for graph purely mathematical
   const steps = 50;
   const points = Array.from({length: steps+1}, (_, i) => {
      const stepT = (i/steps)*maxT;
      if (state === "charging" || state === "idle") { // default to charge curve if idle
         const q = maxQ * (1 - Math.exp(-stepT/tau));
         const v = V_val * (1 - Math.exp(-stepT/tau));
         return {t: stepT, q, v};
      } else {
         const q = maxQ * Math.exp(-stepT/tau);
         const v = V_val * Math.exp(-stepT/tau);
         return {t: stepT, q, v};
      }
   });

   return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
         <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="relative bg-white border rounded-xl overflow-hidden flex h-[450px] bg-gray-50/50">
               {/* Left Circuit */}
               <div className="w-[360px] border-r border-gray-200 relative">
                  <div className="absolute top-2 left-2 text-xs font-bold text-gray-500">Devre Gösterimi</div>
                  <svg width="360" height="450">
                     {/* Wires */}
                     <path d="M 60 225 L 60 100 L 300 100 L 300 215" stroke="#1f2937" strokeWidth="2" fill="none" />
                     <path d="M 300 235 L 300 350 L 60 350 L 60 225" stroke="#1f2937" strokeWidth="2" fill="none" />
                     
                     {/* Source -> Battery */}
                     <g transform="translate(60, 225) rotate(90)">
                        <rect x="-15" y="-15" width="30" height="30" fill="#fff" />
                        <line x1="-15" y1="0" x2="15" y2="0" stroke="#000" strokeWidth="4" />
                        <text x="-25" y="4" fontSize="12" fontWeight="bold">-</text>
                        <line x1="-8" y1="-8" x2="8" y2="-8" stroke="#000" strokeWidth="2" />
                        <text x="25" y="4" fontSize="12" fontWeight="bold">+</text>
                     </g>
                     <text x="35" y="230" fontSize="12" fontWeight="bold">{V_val}V</text>
                     
                     {/* Resistor */}
                     <g transform="translate(180, 100)">
                        <rect x="-20" y="-10" width="40" height="20" fill="#fff" stroke="#1f2937" strokeWidth="2" />
                        <path d="M -15 0 L -10 -5 L 0 5 L 10 -5 L 15 0" stroke="#1f2937" strokeWidth="1.5" fill="none" />
                        <text x="0" y="-15" textAnchor="middle" fontSize="12" fontWeight="bold">{R_kOhm} kΩ</text>
                     </g>
                     
                     {/* Capacitor */}
                     <g transform="translate(300, 225)">
                        <rect x="-15" y="-12" width="30" height="24" fill="#fff" />
                        <line x1="-15" y1="-10" x2="15" y2="-10" stroke="#dc2626" strokeWidth="4" />
                        <line x1="-15" y1="10" x2="15" y2="10" stroke="#2563eb" strokeWidth="4" />
                        <text x="35" y="4" fontSize="12" fontWeight="bold">{C_uF} μF</text>
                        
                        {/* Dynamic Charge Filling effect on plates visually */}
                        {currentQ > 0 && Array.from({length: Math.floor(1 + (currentQ/maxQ)*6)}).map((_, i) => (
                           <g key={`cfill-${i}`}>
                              <text x={-12 + i*4} y="-2" fontSize="10" fill="#fff" fontWeight="bold">+</text>
                              <text x={-12 + i*4} y="8" fontSize="10" fill="#fff" fontWeight="bold">-</text>
                           </g>
                        ))}
                     </g>
                     
                     {/* Moving Dots for Current */}
                     {state !== "idle" && (
                         <circle cx="0" cy="0" r="4" fill="#16a34a">
                            <animateMotion path={state === "charging" ? "M 60 215 L 60 100 L 300 100 L 300 215" : "M 300 100 L 60 100 L 60 215"} dur={0.4 + (1-Math.abs(currentI)*1000)} repeatCount="indefinite" />
                         </circle>
                     )}
                     {state !== "idle" && (
                         <circle cx="0" cy="0" r="4" fill="#16a34a">
                            <animateMotion path={state === "charging" ? "M 300 235 L 300 350 L 60 350 L 60 235" : "M 60 350 L 300 350 L 300 235"} dur={0.4 + (1-Math.abs(currentI)*1000)} repeatCount="indefinite" />
                         </circle>
                     )}
                  </svg>
               </div>
               
               {/* Right Graph */}
               <div className="flex-1 p-2 relative">
                  <div className="flex justify-between items-center mb-2">
                     <div className="text-xs font-bold text-gray-500">Zaman Grafiği</div>
                     <div className="flex bg-gray-200 rounded text-[10px] p-0.5">
                        <button className={`px-2 py-0.5 rounded ${activeGraph==="Q" ? "bg-white font-bold" : ""}`} onClick={()=>setActiveGraph("Q")}>Q-t</button>
                        <button className={`px-2 py-0.5 rounded ${activeGraph==="V" ? "bg-white font-bold" : ""}`} onClick={()=>setActiveGraph("V")}>V-t</button>
                     </div>
                  </div>
                  
                  <div className="relative w-full h-[380px] bg-white border border-gray-100 mt-2">
                     <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Grid */}
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="0.5" />
                        <line x1="0" y1="100" x2="100" y2="100" stroke="#d1d5db" strokeWidth="1" />
                        <line x1="0" y1="0" x2="0" y2="100" stroke="#d1d5db" strokeWidth="1" />
                        
                        {/* Tau Line */}
                        <line x1={(tau/maxT)*100} y1="0" x2={(tau/maxT)*100} y2="100" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2 2" />
                        
                        {/* Curve Polyline */}
                        {(() => {
                           const pointsStr = points.map(p => {
                               const x = (p.t / maxT) * 100;
                               const y = activeGraph === "Q" ? 100 - (p.q / maxQ)*100 : 100 - (p.v / V_val)*100;
                               return `${x},${Math.max(0, Math.min(y, 100))}`;
                           }).join(" ");
                           
                           return (
                               <polyline points={pointsStr} fill="none" stroke={state==="discharging" ? "#dc2626" : "#16a34a"} strokeWidth="1.5" />
                           );
                        })()}
                        
                        {/* Playhead */}
                        {t > 0 && (
                            <circle cx={(t/maxT)*100} cy={activeGraph === "Q" ? 100 - (currentQ/maxQ)*100 : 100 - (currentVC/V_val)*100} r="2" fill="#ea580c" />
                        )}
                     </svg>
                     <div className="absolute font-mono text-[9px] text-gray-500" style={{bottom: '-16px', left:`${(tau/maxT)*100}%`, transform: 'translateX(-50%)'}}>τ={tau.toFixed(2)}s</div>
                  </div>
               </div>
            </div>
            
            <CPnl>
               <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 flex flex-col gap-1">
                     <label className="text-xs font-bold text-gray-700">Sığa (C): {C_uF} μF</label>
                     <input type="range" min="1" max="1000" step="1" value={C_uF} onChange={e=>{setC(Number(e.target.value)); handleReset()}} disabled={state!=="idle"} />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                     <label className="text-xs font-bold text-gray-700">Direnç (R): {R_kOhm} kΩ</label>
                     <input type="range" min="1" max="100" step="1" value={R_kOhm} onChange={e=>{setR(Number(e.target.value)); handleReset()}} disabled={state!=="idle"} />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                     <label className="text-xs font-bold text-gray-700">Gerilim (V): {V_val} V</label>
                     <input type="range" min="10" max="200" step="10" value={V_val} onChange={e=>{setV(Number(e.target.value)); handleReset()}} disabled={state!=="idle"} />
                  </div>
               </div>
               
               <div className="flex gap-2 mt-4 justify-center">
                  <button onClick={handleCharge} className="bg-green-600 outline-none hover:bg-green-700 text-white px-6 py-2 flex-1 font-bold rounded shadow-sm">Şarj</button>
                  <button onClick={handleDischarge} className="bg-red-600 outline-none hover:bg-red-700 text-white px-6 py-2 flex-1 font-bold rounded shadow-sm">Boşalma</button>
                  <button onClick={handleReset} className="bg-gray-400 outline-none hover:bg-gray-500 text-white px-6 py-2 flex-1 font-bold rounded shadow-sm">Sıfırla</button>
               </div>
            </CPnl>
         </div>
         
         <div className="flex flex-col gap-4">
            <CObsPnl>
               <div className="flex justify-between border-b pb-1 mt-1 bg-zinc-100 p-1 rounded font-bold">
                 <span className="text-zinc-600 text-sm">Zaman (t):</span> <span className="font-mono text-sm">{t.toFixed(2)} s</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-1 mt-1">
                 <span className="text-gray-600 text-sm">τ (Tau):</span> <span className="font-mono text-sm">{tau.toFixed(2)} s</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-1 mt-1">
                 <span className="text-red-700 text-sm font-bold">Yük (Q):</span> <span className="font-mono text-sm">{(currentQ*1e6).toFixed(2)} μC</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-1 mt-1">
                 <span className="text-blue-700 text-sm font-bold">Gerilim (V):</span> <span className="font-mono text-sm">{currentVC.toFixed(2)} V</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-1 mt-1">
                 <span className="text-purple-700 text-sm font-bold">Akım (I):</span> <span className="font-mono text-sm">{(currentI*1000).toFixed(2)} mA</span>
               </div>
               
               <div className="flex flex-col border border-green-200 bg-green-50 rounded p-2 mt-4">
                  <div className="text-xs uppercase font-bold text-green-800 text-center mb-1">Depolanan Enerji (U)</div>
                  <div className="text-2xl text-center font-mono font-black text-green-700">{(currentU).toFixed(3)} J</div>
               </div>
               
            </CObsPnl>
            
            {(state === "charging" && t >= Math.min(2, maxT)) || (state === "idle" && t > 0) ? (
                 <CompletionCheck
                    slug={slug}
                    zorunluDeney={simulation.zorunlu_deney}
                    observedValue={currentU}
                    isFinished={true}
                 />
            ) : null}
         </div>
      </div>
   )
}


// ------------------- MODE 3: Circuits -------------------
function CircuitsMode() {
   const [type, setType] = useState<"seri" | "paralel">("seri");
   const [tV, setTV] = useState(100);
   
   const [caps, setCaps] = useState<{id: number, c: number}[]>([
      {id: 1, c: 10},
      {id: 2, c: 20}
   ]);
   const nextId = useRef(3);
   
   const cArr = caps.map(k => k.c * 1e-6);
   const eqC = type === "seri" ? calculateSeriesCapacitance(cArr).Ceq : calculateParallelCapacitance(cArr).Ceq;
   const qTot = calculateCharge(eqC, tV).Q;
   const uTot = calculateStoredEnergy(eqC, tV).U;
   
   // Individual
   const indivData = caps.map(k => {
      const c = k.c * 1e-6;
      if (type === "seri") {
          // Q is same = qTot
          const q = qTot;
          const v = q / c;
          const u = calculateStoredEnergy(c, v).U;
          return { ...k, c, q, v, u };
      } else {
          // V is same = tV
          const v = tV;
          const q = c * v;
          const u = calculateStoredEnergy(c, v).U;
          return { ...k, c, q, v, u };
      }
   });

   return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
         <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex bg-gray-100 p-1 rounded gap-1 w-full max-w-sm mx-auto shadow-sm">
               <button onClick={()=>setType("seri")} className={`flex-1 py-1.5 font-bold rounded ${type==="seri"?"bg-white text-blue-800 shadow":"text-gray-500"}`}>Seri Bağlı</button>
               <button onClick={()=>setType("paralel")} className={`flex-1 py-1.5 font-bold rounded ${type==="paralel"?"bg-white text-blue-800 shadow":"text-gray-500"}`}>Paralel Bağlı</button>
            </div>
            
            <div className="relative bg-white border rounded-xl overflow-hidden flex h-[430px] justify-center items-center bg-gray-50/50 p-4">
               <svg width="400" height="300" className="text-zinc-800">
                   <g transform="translate(40, 250)">
                      {/* Source */}
                      <rect x="140" y="-10" width="40" height="20" fill="#fff" />
                      <line x1="145" y1="-10" x2="145" y2="10" stroke="#000" strokeWidth="3" />
                      <line x1="155" y1="-5" x2="155" y2="5" stroke="#000" strokeWidth="1" />
                      <text x="165" y="0" fontSize="12" fontWeight="bold">V = {tV}V</text>
                      
                      <line x1="140" y1="0" x2="0" y2="0" stroke="#1f2937" strokeWidth="2" />
                      <line x1="0" y1="0" x2="0" y2="-150" stroke="#1f2937" strokeWidth="2" />
                      
                      <line x1="180" y1="0" x2="320" y2="0" stroke="#1f2937" strokeWidth="2" />
                      <line x1="320" y1="0" x2="320" y2="-150" stroke="#1f2937" strokeWidth="2" />
                   </g>

                   {type === "seri" ? (
                      // SERI: draw horizontally along top wire M 40 100 L 360 100
                      <>
                         <line x1="40" y1="100" x2="360" y2="100" stroke="#1f2937" strokeWidth="2" />
                         
                         {caps.map((cap, i) => {
                             const spacing = 320 / (caps.length + 1);
                             const cx = 40 + spacing * (i + 1);
                             const data = indivData[i];
                             return (
                                <g key={`sc-${cap.id}`} transform={`translate(${cx}, 100)`}>
                                   <rect x="-10" y="-20" width="20" height="40" fill="#fff" />
                                   <line x1="-5" y1="-15" x2="-5" y2="15" stroke="#2563eb" strokeWidth="4" />
                                   <line x1="5" y1="-15" x2="5" y2="15" stroke="#dc2626" strokeWidth="4" />
                                   <text x="0" y="-25" textAnchor="middle" fontSize="14" fontWeight="bold">C{i+1}: {cap.c}μF</text>
                                   
                                   {/* Voltage bracket marking */}
                                   <path d="M -20 25 L -20 30 L 20 30 L 20 25" stroke="#ea580c" strokeWidth="1.5" fill="none" />
                                   <text x="0" y="42" textAnchor="middle" fontSize="10" fill="#ea580c" fontWeight="bold">{data.v.toFixed(1)}v</text>
                                </g>
                             )
                         })}
                         
                         <text x="200" y="30" textAnchor="middle" fontSize="12" fill="#ef4444" fontWeight="bold">Tüm yükler eşittir (Q1 = Q2 = Q_total)</text>
                      </>
                   ) : (
                      // PARALEL: draw vertically between x=40 and x=360
                      <>
                         {caps.map((cap, i) => {
                             const spacingY = 180 / (caps.length + 1);
                             const cy = 20 + spacingY * (i + 1); // center y for horizontal branch
                             const data = indivData[i];
                             const fillP = data.q / qTot; // relative visual fill
                             
                             return (
                                <g key={`pc-${cap.id}`} transform={`translate(0, ${cy})`}>
                                   <line x1="40" y1="0" x2="360" y2="0" stroke="#1f2937" strokeWidth="2" />
                                   
                                   <g transform="translate(200, 0)">
                                      <rect x="-10" y="-20" width="20" height="40" fill="#fff" />
                                      <line x1="-5" y1="-15" x2="-5" y2="15" stroke="#dc2626" strokeWidth="4" />
                                      <line x1="5" y1="-15" x2="5" y2="15" stroke="#2563eb" strokeWidth="4" />
                                      <text x="0" y="-25" textAnchor="middle" fontSize="14" fontWeight="bold">C{i+1}: {cap.c}μF</text>
                                      
                                      <text x="0" y="25" textAnchor="middle" fontSize="10" fill="#000" fontWeight="bold">{(data.q*1e6).toFixed(1)}μC</text>
                                   </g>
                                </g>
                             )
                         })}
                         <line x1="40" y1="20" x2="40" y2="200" stroke="#1f2937" strokeWidth="2" />
                         <line x1="360" y1="20" x2="360" y2="200" stroke="#1f2937" strokeWidth="2" />
                         <text x="200" y="10" textAnchor="middle" fontSize="12" fill="#ea580c" fontWeight="bold">Tüm gerilimler eşittir (V = {tV}V)</text>
                      </>
                   )}
               </svg>
            </div>
            
            <CPnl>
               <div className="flex flex-col md:flex-row gap-4 w-full">
                  <div className="w-[180px] p-2 bg-gray-50 rounded border">
                     <label className="text-xs font-bold mb-2">Toplam Gerilim (V): {tV}V</label>
                     <input type="range" min="10" max="500" step="10" value={tV} onChange={e=>setTV(Number(e.target.value))} className="w-full mt-2" />
                     
                     <button onClick={()=>{if(caps.length<3) { setCaps([...caps, {id: nextId.current++, c: 10}]) }}} disabled={caps.length>=3} className="w-full mt-4 bg-zinc-800 text-white py-1.5 rounded text-sm disabled:opacity-50 hover:bg-zinc-700 font-bold">Kondansatör Ekle</button>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                     {caps.map((cap, i) => (
                        <div key={cap.id} className="p-2 border rounded bg-white shadow-sm flex flex-col gap-2 relative">
                           <div className="text-xs font-bold text-blue-800">C{i+1}: {cap.c} μF</div>
                           <input type="range" min="1" max="100" step="1" value={cap.c} onChange={e=>{
                              setCaps(caps.map(k=>k.id===cap.id ? {...k, c: Number(e.target.value)} : k))
                           }} className="w-full"/>
                           {caps.length > 1 && (
                              <button onClick={()=>{setCaps(caps.filter(k=>k.id!==cap.id))}} className="absolute top-1 right-2 text-red-500 font-bold hover:text-red-700 text-xs">Sil</button>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            </CPnl>
         </div>

         <div className="flex flex-col gap-4">
            <CObsPnl>
               <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs">
                     <thead>
                        <tr className="border-b uppercase font-semibold text-zinc-500">
                           <th className="p-1">Bir</th>
                           <th className="p-1">C (μF)</th>
                           <th className="p-1">Q (μC)</th>
                           <th className="p-1">V (v)</th>
                        </tr>
                     </thead>
                     <tbody className="font-mono">
                        {indivData.map((d, i) => (
                           <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-1 font-sans font-bold text-gray-700">C{i+1}</td>
                              <td className="p-1">{d.c*1e6}</td>
                              <td className="p-1">{(d.q*1e6).toFixed(1)}</td>
                              <td className="p-1">{d.v.toFixed(1)}</td>
                           </tr>
                        ))}
                        <tr className="bg-blue-50/50 border-t-2 border-blue-200">
                           <td className="p-1 font-sans font-bold text-blue-900 text-sm">TOTAL</td>
                           <td className="p-1 font-bold text-blue-800">{(eqC*1e6).toFixed(2)}</td>
                           <td className="p-1 font-bold text-blue-800">{(qTot*1e6).toFixed(1)}</td>
                           <td className="p-1 font-bold text-blue-800">{tV.toFixed(1)}</td>
                        </tr>
                     </tbody>
                  </table>
               </div>
               
               <div className="flex justify-between border-t border-dashed mt-2 pt-2 text-sm bg-orange-50 p-2 rounded border border-orange-200">
                 <span className="font-bold text-orange-900">Toplam Enerji:</span>
                 <span className="font-mono font-bold text-orange-800">{(uTot*1000).toFixed(2)} mJ</span>
               </div>
               
               <details className="mt-4 border rounded p-2 bg-gray-50 border-gray-200 cursor-pointer [&_svg]:open:-rotate-180">
                 <summary className="font-bold text-sm text-zinc-800 mb-1 flex items-center justify-between">
                    Neden böyle?
                    <svg className="w-4 h-4 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinelinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                 </summary>
                 <div className="text-xs text-gray-700 mt-2 pl-1 leading-relaxed">
                    {type === "seri" ? 
                       "Seri bağlamada eşdeğer plaka mesafesi (d) artmış gibi davranır. Bu nedenle toplam sığa azalır. Hepsi aynı kol üzerinde olduğu için her kondansatörden geçen elektron miktarı (Q) aynı olmak zorundadır." : 
                       "Paralel bağlamada eşdeğer plaka alanı (A) artmış gibi davranır, bu yüzden sığalar doğrudan toplanır ve büyür. Hepsi aynı iki noktaya bağlı olduğundan iki uç arasındaki gerilim (V) eşittir."}
                 </div>
               </details>
            </CObsPnl>
         </div>
      </div>
   );
}