"use client";

import React, { useState, useEffect, useRef } from "react";
import CompletionCheck from "./CompletionCheck";
import {
  calculateLorentzForce,
  calculateWireForce,
  calculateCircularRadius,
  calculateCyclotronFrequency,
  getCircularOrbitPosition,
} from "@/lib/physics/magneticForce";

// Local UI Components
function CPnl({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-4">
      <h3 className="font-semibold text-zinc-800 border-b border-zinc-100 pb-2">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function CObsPnl({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col gap-3">
      <h3 className="font-semibold text-zinc-800 text-sm">{title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{children}</div>
    </div>
  );
}

const SCALE = 100; // Pixels per meter

export default function MagneticForceCanvas({
  simulation,
  onComplete,
}: {
  slug: string;
  simulation: any;
  onComplete: () => void;
}) {
  const [mode, setMode] = useState<"yuklu-parcacik" | "akim-teli">("yuklu-parcacik");

  // Mode 1: Yüklü Parçacık
  const [qVal, setQVal] = useState(1); // multiplier for 1.6e-19 C
  const [mVal, setMVal] = useState(1); // multiplier for 1.67e-27 kg
  const [v6, setV6] = useState(2); // unit: 10^6 m/s
  const [B_field, setB_field] = useState(0.1);
  const [qSign, setQSign] = useState<1 | -1>(1);
  const [B_dir, setB_dir] = useState<"out" | "in">("in");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const q = qVal * 1.602e-19 * qSign;
  const m = mVal * 1.672e-27;
  const v = v6 * 1e6;

  const { F: lorentzF } = calculateLorentzForce(q, v, B_field);
  const { r: orbitalR } = calculateCircularRadius(m, v, q, B_field);
  const { f: cyclotronF } = calculateCyclotronFrequency(q, B_field, m);
  const periodT = 1 / cyclotronF;
  const omega = 2 * Math.PI * cyclotronF * (qSign * (B_dir === "in" ? 1 : -1));

  // Mode 2: Akım Taşıyan Tel
  const [wireI, setWireI] = useState(5);
  const [wireL, setWireL] = useState(1);
  const [wireB, setWireB] = useState(0.5);
  const [wireAngle, setWireAngle] = useState(90);
  const [wireIDir, setWireIDir] = useState<"right" | "left">("right");
  const [wireBDir, setWireBDir] = useState<"out" | "in">("in");
  const [isApplyingForce, setIsApplyingForce] = useState(false);

  const currentI = wireI * (wireIDir === "right" ? 1 : -1);
  const { F: wireF } = calculateWireForce(wireB, wireI, wireL, wireAngle);
  
  // Force direction for Mode 2 (Fleming's Left Hand Rule)
  // I: right (+x), B: in (-z) -> F: up (+y)
  // I: left (-x), B: in (-z) -> F: down (-y)
  // I: right (+x), B: out (+z) -> F: down (-y)
  // I: left (-x), B: out (+z) -> F: up (+y)
  let wireFSign = 1;
  if (wireBDir === "in") {
    wireFSign = wireIDir === "right" ? 1 : -1;
  } else {
    wireFSign = wireIDir === "right" ? -1 : 1;
  }
  if (wireAngle === 0) wireFSign = 0;

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      setElapsed((prev) => prev + deltaTime);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = undefined;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning]);

  const resetPart = () => {
    setIsRunning(false);
    setElapsed(0);
    setTrail([]);
  };

  // Trail logic
  const currentPos = getCircularOrbitPosition(0, -orbitalR, orbitalR, omega, elapsed, Math.PI / 2);
  useEffect(() => {
    if (isRunning && currentPos) {
      setTrail((prev) => [...prev.slice(-100), { x: currentPos.x, y: currentPos.y }]);
    }
  }, [elapsed, isRunning]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center bg-zinc-100 p-1 rounded-lg w-fit mx-auto self-center">
        <button
          onClick={() => setMode("yuklu-parcacik")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === "yuklu-parcacik" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Yüklü Parçacık
        </button>
        <button
          onClick={() => setMode("akim-teli")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === "akim-teli" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Akım Taşıyan Tel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden relative">
            <svg
              width="600"
              height={mode === "yuklu-parcacik" ? "500" : "420"}
              viewBox={`0 0 600 ${mode === "yuklu-parcacik" ? "500" : "420"}`}
              className="w-full h-auto bg-white"
            >
              {/* Grid Background */}
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Magnetic Field Indicators */}
              {Array.from({ length: 20 }).map((_, i) =>
                Array.from({ length: mode === "yuklu-parcacik" ? 17 : 14 }).map((_, j) => (
                  <g key={`${i}-${j}`} transform={`translate(${i * 30 + 15}, ${j * 30 + 15})`}>
                    {B_dir === "in" ? (
                      <g className="opacity-20 stroke-orange-600" strokeWidth="1">
                        <line x1="-4" y1="-4" x2="4" y2="4" />
                        <line x1="4" y1="-4" x2="-4" y2="4" />
                        <circle r="6" fill="none" />
                      </g>
                    ) : (
                      <g className="opacity-20 stroke-orange-600" fill="orange">
                        <circle r="2" />
                        <circle r="6" fill="none" strokeWidth="1" />
                      </g>
                    )}
                  </g>
                ))
              )}

              {mode === "yuklu-parcacik" ? (
                <g transform="translate(300, 250)">
                  {/* Predicted Orbit */}
                  <circle
                    cx="0"
                    cy={-orbitalR * SCALE}
                    r={orbitalR * SCALE}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  
                  {/* Trail */}
                  <polyline
                    points={trail.map((p) => `${p.x * SCALE},${p.y * SCALE}`).join(" ")}
                    fill="none"
                    stroke={qSign > 0 ? "#2563eb" : "#dc2626"}
                    strokeWidth="2"
                    strokeOpacity="0.3"
                  />

                  {/* Particle */}
                  <g transform={`translate(${currentPos.x * SCALE}, ${currentPos.y * SCALE})`}>
                    <circle r="8" fill={qSign > 0 ? "#2563eb" : "#dc2626"} className="shadow-lg" />
                    <text y="4" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                      {qSign > 0 ? "+" : "-"}
                    </text>

                    {/* Velocity Arrow */}
                    <g transform={`rotate(${(currentPos.angle * 180) / Math.PI + 90})`}>
                      <line x1="0" y1="0" x2="40" y2="0" stroke="#9333ea" strokeWidth="3" markerEnd="url(#arrow-purple)" />
                    </g>
                    
                    {/* Force Arrow */}
                    <g transform={`rotate(${(currentPos.angle * 180) / Math.PI + 180})`}>
                      <line x1="0" y1="0" x2="40" y2="0" stroke="#16a34a" strokeWidth="3" markerEnd="url(#arrow-green)" />
                    </g>
                  </g>
                </g>
              ) : (
                <g transform="translate(0, 210)">
                  {/* Wire */}
                  <line
                    x1="0"
                    y1={isApplyingForce ? -wireFSign * Math.min(60, wireF * 10) : 0}
                    x2="600"
                    y2={isApplyingForce ? -wireFSign * Math.min(60, wireF * 10) : 0}
                    stroke="#3f3f46"
                    strokeWidth="6"
                    className="transition-transform duration-500 ease-out"
                  />
                  {/* Current Arrows on Wire */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <g key={i} transform={`translate(${i * 120 + 60}, ${isApplyingForce ? -wireFSign * Math.min(60, wireF * 10) : 0})`}>
                      <line
                        x1={wireIDir === "right" ? -15 : 15}
                        y1="0"
                        x2={wireIDir === "right" ? 15 : -15}
                        y2="0"
                        stroke="white"
                        strokeWidth="2"
                        markerEnd="url(#arrow-white)"
                      />
                    </g>
                  ))}

                  {/* Force Arrow on Wire */}
                  {isApplyingForce && wireAngle > 0 && (
                    <g transform={`translate(300, ${-wireFSign * Math.min(60, wireF * 10)})`}>
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2={-wireFSign * 50}
                        stroke="#16a34a"
                        strokeWidth="4"
                        markerEnd="url(#arrow-green)"
                      />
                    </g>
                  )}

                  {wireAngle === 0 && (
                     <foreignObject x="220" y="-40" width="160" height="30">
                        <div className="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded-full border border-amber-200 text-center font-medium">
                          Kuvvet yok — tel alana paralel
                        </div>
                     </foreignObject>
                  )}
                </g>
              )}

              {/* Arrow Markers */}
              <defs>
                <marker id="arrow-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
                </marker>
                <marker id="arrow-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#9333ea" />
                </marker>
                <marker id="arrow-white" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="white" />
                </marker>
              </defs>
            </svg>

            {/* Scale Label */}
            <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] text-zinc-500 font-medium">
               <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-zinc-900"/> 1m = 100px</div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-600"/> Pozitif</div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-600"/> Negatif</div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-green-600"/> Kuvvet</div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-purple-600"/> Hız</div>
            </div>

            {/* Top info badge */}
            <div className="absolute top-4 right-4 flex gap-2">
              <span className="bg-white/80 backdrop-blur px-2 py-1 rounded border border-zinc-200 text-[10px] font-bold text-zinc-600">
                {mode === "yuklu-parcacik" ? `r = ${orbitalR.toFixed(3)} m` : `F = ${wireF.toExponential(2)} N`}
              </span>
            </div>
          </div>
          
          <CompletionCheck
            slug="manyetik-kuvvet"
            simulation={simulation}
            currentValues={{ yaricap: orbitalR }}
            onComplete={onComplete}
          />
        </div>

        <div className="flex flex-col gap-6">
          <CPnl title="Kontrol Paneli">
            {mode === "yuklu-parcacik" ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 flex justify-between">
                    <span>Yük (×10⁻¹⁹ C)</span>
                    <span className="text-zinc-400">{qVal}</span>
                  </label>
                  <input type="range" min="1" max="20" step="1" value={qVal} onChange={(e) => { setQVal(Number(e.target.value)); resetPart(); }} className="w-full accent-blue-600" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 flex justify-between">
                    <span>Kütle (×10⁻²⁷ kg)</span>
                    <span className="text-zinc-400">{mVal}</span>
                  </label>
                  <input type="range" min="1" max="20" step="1" value={mVal} onChange={(e) => { setMVal(Number(e.target.value)); resetPart(); }} className="w-full accent-zinc-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 flex justify-between">
                    <span>Hız (×10⁶ m/s)</span>
                    <span className="text-zinc-400">{v6}</span>
                  </label>
                  <input type="range" min="0.5" max="10" step="0.1" value={v6} onChange={(e) => { setV6(Number(e.target.value)); resetPart(); }} className="w-full accent-purple-600" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 flex justify-between">
                    <span>Alan Şiddeti (T)</span>
                    <span className="text-zinc-400">{B_field}</span>
                  </label>
                  <input type="range" min="0.01" max="2" step="0.01" value={B_field} onChange={(e) => { setB_field(Number(e.target.value)); resetPart(); }} className="w-full accent-orange-600" />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <label className="text-xs font-semibold text-zinc-600">Yük İşareti</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setQSign(1); resetPart(); }} className={`text-[10px] py-1 rounded border transition-colors ${qSign === 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-zinc-600 border-zinc-200'}`}>Pozitif (+)</button>
                    <button onClick={() => { setQSign(-1); resetPart(); }} className={`text-[10px] py-1 rounded border transition-colors ${qSign === -1 ? 'bg-red-600 text-white border-red-600' : 'bg-white text-zinc-600 border-zinc-200'}`}>Negatif (−)</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <label className="text-xs font-semibold text-zinc-600">Alan Yönü</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setB_dir("out"); resetPart(); }} className={`text-[10px] py-1 rounded border transition-colors ${B_dir === "out" ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-zinc-600 border-zinc-200'}`}>Sayfadan Dışarı ⊙</button>
                    <button onClick={() => { setB_dir("in"); resetPart(); }} className={`text-[10px] py-1 rounded border transition-colors ${B_dir === "in" ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-zinc-600 border-zinc-200'}`}>Sayfaya İçeri ⊗</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button onClick={() => setIsRunning(!isRunning)} className={`py-2 rounded-xl text-xs font-bold transition-all ${isRunning ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
                    {isRunning ? 'Duraklat' : 'Başlat'}
                  </button>
                  <button onClick={resetPart} className="py-2 rounded-xl text-xs font-bold bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Sıfırla</button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 flex justify-between">
                    <span>Akım (A)</span>
                    <span className="text-zinc-400">{wireI}</span>
                  </label>
                  <input type="range" min="1" max="50" step="1" value={wireI} onChange={(e) => setWireI(Number(e.target.value))} className="w-full accent-zinc-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 flex justify-between">
                    <span>Tel Uzunluğu (m)</span>
                    <span className="text-zinc-400">{wireL}</span>
                  </label>
                  <input type="range" min="0.1" max="2" step="0.1" value={wireL} onChange={(e) => setWireL(Number(e.target.value))} className="w-full accent-zinc-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 flex justify-between">
                    <span>Alan Şiddeti (T)</span>
                    <span className="text-zinc-400">{wireB}</span>
                  </label>
                  <input type="range" min="0.01" max="2" step="0.01" value={wireB} onChange={(e) => setWireB(Number(e.target.value))} className="w-full accent-orange-600" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 flex justify-between">
                    <span>Açı (°)</span>
                    <span className="text-zinc-400">{wireAngle}</span>
                  </label>
                  <input type="range" min="0" max="90" step="1" value={wireAngle} onChange={(e) => setWireAngle(Number(e.target.value))} className="w-full accent-zinc-800" />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <label className="text-xs font-semibold text-zinc-600">Akım Yönü</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setWireIDir("right")} className={`text-[10px] py-1 rounded border transition-colors ${wireIDir === "right" ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-600 border-zinc-200'}`}>Sağa →</button>
                    <button onClick={() => setWireIDir("left")} className={`text-[10px] py-1 rounded border transition-colors ${wireIDir === "left" ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-600 border-zinc-200'}`}>Sola ←</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <label className="text-xs font-semibold text-zinc-600">Alan Yönü</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setWireBDir("out")} className={`text-[10px] py-1 rounded border transition-colors ${wireBDir === "out" ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-zinc-600 border-zinc-200'}`}>Sayfadan Dışarı ⊙</button>
                    <button onClick={() => setWireBDir("in")} className={`text-[10px] py-1 rounded border transition-colors ${wireBDir === "in" ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-zinc-600 border-zinc-200'}`}>Sayfaya İçeri ⊗</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button onClick={() => setIsApplyingForce(true)} className="py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all">Kuvveti Uygula</button>
                  <button onClick={() => setIsApplyingForce(false)} className="py-2 rounded-xl text-xs font-bold bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Sıfırla</button>
                </div>
              </>
            )}
          </CPnl>

          <CObsPnl title="Gözlem Masası">
            {mode === "yuklu-parcacik" ? (
              <>
                <div className="text-zinc-500">q:</div><div className="text-right font-mono">{(q).toExponential(2)} C</div>
                <div className="text-zinc-500">m:</div><div className="text-right font-mono">{(m).toExponential(2)} kg</div>
                <div className="text-zinc-500">v:</div><div className="text-right font-mono">{(v).toExponential(2)} m/s</div>
                <div className="text-zinc-500">B:</div><div className="text-right font-mono">{B_field.toFixed(2)} T</div>
                <div className="text-zinc-500 font-bold text-green-600">F:</div><div className="text-right font-mono font-bold text-green-600">{lorentzF.toExponential(2)} N</div>
                <div className="text-zinc-500">r:</div><div className="text-right font-mono">{orbitalR.toFixed(3)} m</div>
                <div className="text-zinc-500">f:</div><div className="text-right font-mono">{cyclotronF.toFixed(1)} Hz</div>
                <div className="text-zinc-500">T:</div><div className="text-right font-mono">{periodT.toExponential(2)} s</div>
              </>
            ) : (
              <>
                <div className="text-zinc-500">B:</div><div className="text-right font-mono">{wireB.toFixed(2)} T</div>
                <div className="text-zinc-500">I:</div><div className="text-right font-mono">{wireI.toFixed(0)} A</div>
                <div className="text-zinc-500">L:</div><div className="text-right font-mono">{wireL.toFixed(1)} m</div>
                <div className="text-zinc-500">θ:</div><div className="text-right font-mono">{wireAngle}°</div>
                <div className="text-zinc-500">sinθ:</div><div className="text-right font-mono">{Math.sin(wireAngle * Math.PI / 180).toFixed(2)}</div>
                <div className="text-zinc-500 font-bold text-green-600">F:</div><div className="text-right font-mono font-bold text-green-600">{wireF.toExponential(2)} N</div>
                <div className="text-zinc-500 col-span-2 text-center bg-zinc-100 rounded mt-1 py-1">
                  Yön: <span className="font-bold text-zinc-900">{wireFSign === 0 ? "Yok" : (wireFSign > 0 ? "Yukarı" : "Aşağı")}</span>
                </div>
              </>
            )}
          </CObsPnl>
        </div>
      </div>
    </div>
  );
}
