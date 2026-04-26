"use client";

import React, { useState, useEffect } from "react";
import { Simulasyon } from "@/lib/types";
import { checkEquilibrium, calculateSeesawBalance } from "@/lib/physics/equilibrium";
import CompletionCheck from "./CompletionCheck";

interface EquilibriumCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

export default function EquilibriumCanvas({ slug, simulation, onComplete }: EquilibriumCanvasProps) {
  const [mode, setMode] = useState<"tahterevalli" | "merdiven" | "levha">("tahterevalli");

  // Tahterevalli states
  const [leftDist, setLeftDist] = useState(2); // m
  const [leftWeight, setLeftWeight] = useState(40); // N
  const [rightDist, setRightDist] = useState(2); // m
  const [rightWeight, setRightWeight] = useState(20); // N

  // Merdiven states
  const [ladderAngle, setLadderAngle] = useState(60); // deg
  const [ladderMass, setLadderMass] = useState(10); // kg
  const [frictionCoeff, setFrictionCoeff] = useState(0.3);

  // Levha states
  const [rope1Pos, setRope1Pos] = useState(20); // %
  const [rope2Pos, setRope2Pos] = useState(80); // %
  const [loads, setLoads] = useState<{ id: number; pos: number; weight: number }[]>([
    { id: 1, pos: 50, weight: 50 },
  ]);

  // Simulation run state
  const [isRunning, setIsRunning] = useState(false);

  // Reset running state when parameters change
  useEffect(() => {
    setIsRunning(false);
  }, [leftDist, leftWeight, rightDist, rightWeight, ladderAngle, ladderMass, frictionCoeff, rope1Pos, rope2Pos, loads, mode]);

  // Add/remove loads
  const [newLoadPos, setNewLoadPos] = useState(50);
  const [newLoadWeight, setNewLoadWeight] = useState(20);
  const addLoad = () => {
    if (loads.length >= 3) return;
    setLoads([...loads, { id: Date.now(), pos: newLoadPos, weight: newLoadWeight }]);
  };
  const removeLoad = (id: number) => {
    setLoads(loads.filter(l => l.id !== id));
  };

  // derived values Tahterevalli
  const seesaw = calculateSeesawBalance(leftWeight, leftDist, rightWeight, rightDist);
  const seesawAngle = Math.max(-20, Math.min(20, seesaw.netTorque * -0.5));

  // derived values Merdiven
  const W = ladderMass * 9.8;
  const rad = (ladderAngle * Math.PI) / 180;
  // Torque about base: N_wall * L * sin(θ) = W * (L/2) * cos(θ) => N_wall = (W / 2) / tan(θ)
  const N_wall = (W / 2) / Math.tan(rad);
  const f_req = N_wall;
  const N_ground = W;
  const f_max = frictionCoeff * N_ground;
  const ladderEquilibrium = f_req <= f_max;

  // derived values Levha
  const L = 10; // 10m virtual length
  const x1 = (rope1Pos / 100) * L;
  const x2 = (rope2Pos / 100) * L;
  const totalW = loads.reduce((s, l) => s + l.weight, 0);
  const totalTorqueW = loads.reduce((s, l) => s + l.weight * ((l.pos / 100) * L), 0);
  
  let T1 = 0, T2 = 0, plateEq = false;
  if (Math.abs(x1 - x2) > 0.1) {
    // T1 + T2 = totalW
    // T1*x1 + T2*x2 = totalTorqueW
    // T1 = ( totalTorqueW - T2*x2 ) / x1 -> substituting gives:
    T2 = (totalTorqueW - totalW * x1) / (x2 - x1);
    T1 = totalW - T2;
    plateEq = (T1 >= 0 && T2 >= 0);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center mb-2 bg-gray-100 p-1 rounded-md self-center">
        <button className={`px-4 py-1 rounded-md ${mode === "tahterevalli" ? "bg-white shadow text-blue-600 font-medium" : "text-gray-600"}`} onClick={() => setMode("tahterevalli")}>Tahterevalli</button>
        <button className={`px-4 py-1 rounded-md ${mode === "merdiven" ? "bg-white shadow text-blue-600 font-medium" : "text-gray-600"}`} onClick={() => setMode("merdiven")}>Merdiven</button>
        <button className={`px-4 py-1 rounded-md ${mode === "levha" ? "bg-white shadow text-blue-600 font-medium" : "text-gray-600"}`} onClick={() => setMode("levha")}>Asılı Levha</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col bg-white p-4 rounded-xl border border-zinc-200">
          <h2 className="text-xl font-bold text-zinc-900 mb-4 font-display">
            {mode === "tahterevalli" && "Tahterevalli Dengesi"}
            {mode === "merdiven" && "Merdiven Dengesi"}
            {mode === "levha" && "Asılı Levha Dengesi"}
          </h2>

          <div className="relative mb-4">
            {/* Mode 1 */}
            {mode === "tahterevalli" && (
              <svg width="600" height="350" className="bg-white border mx-auto block max-w-full">
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/></pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                <g transform={`translate(300, 200)`}>
                  <polygon points="0,0 -20,40 20,40" fill="gray" />
                  
                  <g transform={`rotate(${isRunning ? seesawAngle : 0})`}>
                    <rect x="-250" y="-10" width="500" height="10" fill="#8B4513" />
                    
                    {/* Left weight */}
                    <g transform={`translate(${-leftDist * 50}, -30)`}>
                      <rect x="-20" y="-20" width="40" height="40" fill="#ef4444" />
                      <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{leftWeight}N</text>
                      <line x1="0" y1="20" x2="0" y2="60" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow-red)"/>
                    </g>
                    
                    {/* Right weight */}
                    <g transform={`translate(${rightDist * 50}, -30)`}>
                      <rect x="-20" y="-20" width="40" height="40" fill="#ef4444" />
                      <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{rightWeight}N</text>
                      <line x1="0" y1="20" x2="0" y2="60" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow-red)"/>
                    </g>
                  </g>
                </g>
                
                {isRunning && seesaw.isBalanced && (
                   <text x="300" y="50" textAnchor="middle" fill="#16a34a" fontSize="24" fontWeight="bold">Dengede!</text>
                )}
                {isRunning && !seesaw.isBalanced && (
                   <text x="300" y="50" textAnchor="middle" fill="#ef4444" fontSize="24" fontWeight="bold">Kayıyor!</text>
                )}
              </svg>
            )}

            {/* Mode 2 */}
            {mode === "merdiven" && (
              <svg width="500" height="450" className="bg-white border mx-auto block max-w-full">
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/></pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Wall & Ground */}
                <line x1="100" y1="0" x2="100" y2="400" stroke="black" strokeWidth="4" />
                <line x1="0" y1="400" x2="500" y2="400" stroke="black" strokeWidth="4" />
                
                {/* Ladder */}
                <g transform={`translate(100, 400)`}>
                  <g transform={(!isRunning || ladderEquilibrium) ? `rotate(${-ladderAngle})` : `rotate(${-Math.max(20, ladderAngle-20)})`}>
                    <line x1="0" y1="0" x2="300" y2="0" stroke="#8B4513" strokeWidth="8" strokeLinecap="round" />
                    
                    {/* Forces drawn if in equilibrium (simplification: draw at correct spots but always upright relative to global coords) */}
                  </g>
                </g>
                
                {/* Draw forces locally avoiding complex rotations */}
                {(() => {
                  const radDraw = (!isRunning || ladderEquilibrium ? ladderAngle : Math.max(20, ladderAngle - 20)) * Math.PI / 180;
                  const L_px = 300;
                  const xb = 100 + L_px * Math.cos(radDraw);
                  const yb = 400; // Base is at ground, wait base slides!
                  
                  // If sliding, wall point drops, base slides right.
                  // Wall point is x=100.
                  const topY = 400 - L_px * Math.sin(radDraw);
                  const basX = 100 + L_px * Math.cos(radDraw);

                  // Center of mass
                  const cx = 100 + (L_px/2) * Math.cos(radDraw);
                  const cy = 400 - (L_px/2) * Math.sin(radDraw);
                  
                  return (
                    <>
                      {/* Weight */}
                      <line x1={cx} y1={cy} x2={cx} y2={cy+40} stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow-red)"/>
                      <text x={cx+10} y={cy+20} fill="#ef4444" fontSize="12">W</text>
                      
                      {/* N_wall */}
                      <line x1="100" y1={topY} x2="140" y2={topY} stroke="blue" strokeWidth="2" markerEnd="url(#arrow-blue)"/>
                      <text x="145" y={topY+5} fill="blue" fontSize="12">Nw</text>
                      
                      {/* N_ground */}
                      <line x1={basX} y1="400" x2={basX} y2="360" stroke="blue" strokeWidth="2" markerEnd="url(#arrow-blue)"/>
                      <text x={basX+10} y="380" fill="blue" fontSize="12">Ng</text>

                      {/* Friction */}
                      <line x1={basX} y1="400" x2={basX-40} y2="400" stroke="#16a34a" strokeWidth="2" markerEnd="url(#arrow-green)"/>
                      <text x={basX-20} y="390" fill="#16a34a" fontSize="12">f</text>
                    </>
                  );
                })()}

                {isRunning && (
                  ladderEquilibrium ? (
                     <text x="300" y="50" textAnchor="middle" fill="#16a34a" fontSize="24" fontWeight="bold">Dengede!</text>
                  ) : (
                     <text x="300" y="50" textAnchor="middle" fill="#ef4444" fontSize="24" fontWeight="bold">Kayıyor!</text>
                  )
                )}
              </svg>
            )}

            {/* Mode 3 */}
            {mode === "levha" && (
              <svg width="550" height="400" className="bg-white border mx-auto block max-w-full">
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/></pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Ceiling */}
                <line x1="0" y1="20" x2="550" y2="20" stroke="black" strokeWidth="4" />
                <path d="M 0 20 L 20 0 M 20 20 L 40 0" stroke="black" strokeWidth="1" /> {/* Hatching */}

                {/* Plate */}
                <rect x="50" y="150" width="450" height="20" fill="gray" />
                
                {/* Ropes */}
                <line x1={50 + (rope1Pos/100)*450} y1="20" x2={50 + (rope1Pos/100)*450} y2="150" stroke="black" strokeWidth="2" />
                <line x1={50 + (rope2Pos/100)*450} y1="20" x2={50 + (rope2Pos/100)*450} y2="150" stroke="black" strokeWidth="2" />

                {/* Rope Tensions */}
                <line x1={50 + (rope1Pos/100)*450} y1="100" x2={50 + (rope1Pos/100)*450} y2="60" stroke="blue" strokeWidth="2" markerEnd="url(#arrow-blue)"/>
                <text x={50 + (rope1Pos/100)*450 + 10} y="80" fill="blue">T1</text>

                <line x1={50 + (rope2Pos/100)*450} y1="100" x2={50 + (rope2Pos/100)*450} y2="60" stroke="blue" strokeWidth="2" markerEnd="url(#arrow-blue)"/>
                <text x={50 + (rope2Pos/100)*450 + 10} y="80" fill="blue">T2</text>

                {/* Loads */}
                {loads.map(l => (
                  <g key={l.id} transform={`translate(${50 + (l.pos/100)*450}, 170)`}>
                     <rect x="-15" y="0" width="30" height="30" fill="#ef4444" />
                     <text x="0" y="20" textAnchor="middle" fill="white" fontSize="12">{l.weight}N</text>
                     <line x1="0" y1="30" x2="0" y2="70" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow-red)"/>
                  </g>
                ))}

                {isRunning && (
                  plateEq ? (
                     <text x="275" y="250" textAnchor="middle" fill="#16a34a" fontSize="24" fontWeight="bold">Dengede!</text>
                  ) : (
                     <text x="275" y="250" textAnchor="middle" fill="#ef4444" fontSize="24" fontWeight="bold">Denge Yok</text>
                  )
                )}
              </svg>
            )}
            
            <svg width="0" height="0">
                <defs>
                  <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" /></marker>
                  <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="blue" /></marker>
                  <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" /></marker>
                </defs>
            </svg>
          </div>

          <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg text-sm">
            <h3 className="font-semibold text-zinc-900 mb-2">Kontrol Paneli</h3>
            
            {mode === "tahterevalli" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold mb-1">Sol Taraf</h4>
                  <label className="block mb-1">Uzaklık: {leftDist} m</label>
                  <input type="range" min="0" max="5" step="0.5" value={leftDist} onChange={e => setLeftDist(Number(e.target.value))} className="w-full mb-2" />
                  <label className="block mb-1">Ağırlık: {leftWeight} N</label>
                  <input type="range" min="1" max="100" value={leftWeight} onChange={e => setLeftWeight(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Sağ Taraf</h4>
                  <label className="block mb-1">Uzaklık: {rightDist} m</label>
                  <input type="range" min="0" max="5" step="0.5" value={rightDist} onChange={e => setRightDist(Number(e.target.value))} className="w-full mb-2" />
                  <label className="block mb-1">Ağırlık: {rightWeight} N</label>
                  <input type="range" min="1" max="100" value={rightWeight} onChange={e => setRightWeight(Number(e.target.value))} className="w-full" />
                </div>
              </div>
            )}

            {mode === "merdiven" && (
              <div className="space-y-4">
                <div><label className="block mb-1">Açı (°): {ladderAngle}</label><input type="range" min="20" max="80" value={ladderAngle} onChange={e => setLadderAngle(Number(e.target.value))} className="w-full" /></div>
                <div><label className="block mb-1">Kütle (kg): {ladderMass}</label><input type="range" min="1" max="30" value={ladderMass} onChange={e => setLadderMass(Number(e.target.value))} className="w-full" /></div>
                <div><label className="block mb-1">Sürtünme Katsayısı (μ): {frictionCoeff}</label><input type="range" min="0.1" max="0.8" step="0.05" value={frictionCoeff} onChange={e => setFrictionCoeff(Number(e.target.value))} className="w-full" /></div>
              </div>
            )}

            {mode === "levha" && (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="block mb-1">İp 1 Konum (%): {rope1Pos}</label><input type="range" min="0" max="100" value={rope1Pos} onChange={e => setRope1Pos(Number(e.target.value))} className="w-full" /></div>
                  <div><label className="block mb-1">İp 2 Konum (%): {rope2Pos}</label><input type="range" min="0" max="100" value={rope2Pos} onChange={e => setRope2Pos(Number(e.target.value))} className="w-full" /></div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-bold mb-2">Yük Ekle</h4>
                  <div className="flex gap-2 items-end mb-2">
                    <div className="flex-1"><label className="block text-xs">Konum (%)</label><input type="number" min="0" max="100" value={newLoadPos} onChange={e => setNewLoadPos(Number(e.target.value))} className="border p-1 w-full rounded" /></div>
                    <div className="flex-1"><label className="block text-xs">Ağırlık (N)</label><input type="number" min="1" max="500" value={newLoadWeight} onChange={e => setNewLoadWeight(Number(e.target.value))} className="border p-1 w-full rounded" /></div>
                    <button onClick={addLoad} disabled={loads.length >= 3} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">Ekle</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {loads.map(l => (
                       <div key={l.id} className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center gap-2">
                          {l.pos}%, {l.weight}N
                          <button onClick={() => removeLoad(l.id)} className="text-red-500 font-bold ml-1">×</button>
                       </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 flex gap-4 pt-4 border-t border-zinc-200">
              <button 
                onClick={() => setIsRunning(true)} 
                disabled={isRunning}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Başlat
              </button>
              <button 
                onClick={() => setIsRunning(false)} 
                disabled={!isRunning}
                className="flex-1 bg-zinc-200 text-zinc-800 font-semibold py-2 rounded shadow hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl border border-zinc-200">
            <h3 className="font-semibold text-zinc-900 mb-2 font-display">Gözlem Paneli</h3>
            
            {mode === "tahterevalli" && (
              <div className="space-y-2 text-sm">
                <div><strong>Sol Tork:</strong> {seesaw.torque1.toFixed(2)} N·m</div>
                <div><strong>Sağ Tork:</strong> {seesaw.torque2.toFixed(2)} N·m</div>
                <div className={seesaw.isBalanced ? "text-green-600 font-bold" : "text-orange-600 font-bold"}>
                  <strong>Net Tork:</strong> {Math.abs(seesaw.netTorque).toFixed(2)} N·m 
                </div>
              </div>
            )}

            {mode === "merdiven" && (
              <div className="space-y-2 text-sm">
                <div><strong>Ağırlık (W):</strong> {W.toFixed(1)} N</div>
                <div><strong>Zemin Tepkisi (Ng):</strong> {N_ground.toFixed(1)} N</div>
                <div><strong>Duvar Tepkisi (Nw):</strong> {N_wall.toFixed(1)} N</div>
                <div><strong>Gereken Sürtünme:</strong> {f_req.toFixed(1)} N</div>
                <div><strong>Maks. Sürtünme (μ·Ng):</strong> {f_max.toFixed(1)} N</div>
                <div className={ladderEquilibrium ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  Durum: {ladderEquilibrium ? "DENGEDE" : "KAYIYOR"}
                </div>
              </div>
            )}

            {mode === "levha" && (
              <div className="space-y-2 text-sm">
                 <div><strong>Toplam Yük:</strong> {totalW} N</div>
                 {plateEq ? (
                   <>
                     <div><strong>T1:</strong> {T1.toFixed(1)} N</div>
                     <div><strong>T2:</strong> {T2.toFixed(1)} N</div>
                     <div className="text-green-600 font-bold text-xs mt-2">ΣF = 0 ve Στ = 0 sağlandı.</div>
                   </>
                 ) : (
                   <div className="text-red-600 font-bold">
                     Denge sağlanamıyor. İplerin konumu yükleri taşıyamıyor (Gereken gerilim negatif).
                   </div>
                 )}
              </div>
            )}
          </div>

          {mode === "tahterevalli" && (
            <CompletionCheck
              slug={slug}
              zorunluDeney={simulation.zorunlu_deney}
              observedValue={Math.abs(seesaw.netTorque)}
              isFinished={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
