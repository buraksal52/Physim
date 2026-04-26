"use client";

import React, { useState } from "react";
import CompletionCheck from "./CompletionCheck";
import { calculateLever, getLeverClass } from "@/lib/physics/lever";
import { Simulasyon } from "@/lib/types";

interface LeverCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete?: () => void;
}

export default function LeverCanvas({ slug, simulation, onComplete }: LeverCanvasProps) {
  const [load, setLoad] = useState(200);
  const [fulcrumPos, setFulcrumPos] = useState(5);
  const [effortPos, setEffortPos] = useState(1);
  const [loadPos, setLoadPos] = useState(9);

  const [dragging, setDragging] = useState<"fulcrum" | "effort" | "load" | null>(null);

  const handlePointerDown = (type: "fulcrum" | "effort" | "load", e: React.PointerEvent) => {
    setDragging(type);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    // 50px offset, 50px per meter
    let xM = (xPx - 50) / 50;
    xM = Math.round(xM * 2) / 2; // snap to 0.5m
    xM = Math.max(0, Math.min(10, xM));

    if (dragging === "fulcrum" && xM !== effortPos && xM !== loadPos) setFulcrumPos(xM);
    if (dragging === "effort" && xM !== fulcrumPos && xM !== loadPos) setEffortPos(xM);
    if (dragging === "load" && xM !== fulcrumPos && xM !== effortPos) setLoadPos(xM);
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const handleReset = () => {
    setFulcrumPos(5);
    setEffortPos(1);
    setLoadPos(9);
    setLoad(200);
  };

  const effortArm = Math.abs(effortPos - fulcrumPos);
  const loadArm = Math.abs(loadPos - fulcrumPos);

  const safeEffortArm = effortArm === 0 ? 0.001 : effortArm;
  const { effort, mechanicalAdvantage } = calculateLever(safeEffortArm, loadArm, load);
  
  const reportedEffort = effortArm === 0 ? 0 : effort;
  const reportedMA = effortArm === 0 ? 0 : mechanicalAdvantage;
  const leverClass = getLeverClass(fulcrumPos, effortPos, loadPos);

  const fX = 50 + fulcrumPos * 50;
  const eX = 50 + effortPos * 50;
  const lX = 50 + loadPos * 50;
  const beamY = 200;

  // If load and effort are on the same side of the fulcrum, effort must act upwards to maintain equilibrium
  const isSameSide = Math.sign(effortPos - fulcrumPos) === Math.sign(loadPos - fulcrumPos);
  
  const scaledEffort = Math.min(120, Math.max(30, reportedEffort * 0.3));
  const scaledLoad = Math.min(120, Math.max(30, load * 0.3));

  return (
    <div className="flex flex-col gap-6">
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulation.zorunlu_deney}
        observedValue={reportedEffort}
        isFinished={false}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Canvas Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 w-full lg:w-auto relative cursor-crosshair flex-shrink-0">
          <h3 className="font-semibold text-gray-800 mb-4 font-display">Kaldıraç Modeli ({leverClass}. Sınıf)</h3>
          <div className="overflow-hidden bg-white border border-gray-200 rounded-lg">
            <svg
              width={600}
              height={380}
              style={{ touchAction: "none" }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="block max-w-full"
            >
              <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Grid Labels */}
              {[0, 2, 4, 6, 8, 10].map(m => (
                <text key={m} x={50 + m * 50} y={beamY + 80} fontSize={12} fill="#9ca3af" textAnchor="middle">{m}m</text>
              ))}

              {/* Beam */}
              <rect x={50} y={beamY - 4} width={500} height={8} fill="#6b7280" rx={4} />

              {/* Fulcrum base */}
              <g transform={`translate(${fX}, ${beamY})`}>
                <polygon points="0,4 -25,45 25,45" fill="#4b5563" />
              </g>

              {/* Load Arrow (Red) */}
              <g transform={`translate(${lX}, ${beamY})`}>
                <line x1={0} y1={0} x2={0} y2={scaledLoad} stroke="#dc2626" strokeWidth={4} markerEnd="url(#arrow-red)" />
                <rect x={-15} y={scaledLoad + 5} width={30} height={20} fill="#dc2626" rx={4} />
                <text x={0} y={scaledLoad + 19} fill="white" fontSize={11} fontWeight="bold" textAnchor="middle" className="pointer-events-none">Y</text>
                <text x={0} y={scaledLoad + 40} fill="#dc2626" fontSize={12} fontWeight="bold" textAnchor="middle">{load} N</text>
              </g>

              {/* Effort Arrow (Blue) */}
              <g transform={`translate(${eX}, ${beamY})`}>
                <line x1={0} y1={0} x2={0} y2={isSameSide ? -scaledEffort : scaledEffort} stroke="#2563eb" strokeWidth={4} markerEnd="url(#arrow-blue)" />
                <circle cx={0} cy={isSameSide ? -scaledEffort - 15 : scaledEffort + 15} r={15} fill="#2563eb" />
                <text x={0} y={isSameSide ? -scaledEffort - 11 : scaledEffort + 19} fill="white" fontSize={12} fontWeight="bold" textAnchor="middle" className="pointer-events-none">K</text>
                <text x={0} y={isSameSide ? -scaledEffort - 35 : scaledEffort + 45} fill="#2563eb" fontSize={12} fontWeight="bold" textAnchor="middle">{reportedEffort.toFixed(1)} N</text>
              </g>

              {/* Draggable Markers */}
              <circle cx={eX} cy={beamY} r={14} fill="#2563eb" opacity={0.4} className="cursor-grab active:cursor-grabbing hover:opacity-60" onPointerDown={e => handlePointerDown("effort", e)} />
              <circle cx={lX} cy={beamY} r={14} fill="#dc2626" opacity={0.4} className="cursor-grab active:cursor-grabbing hover:opacity-60" onPointerDown={e => handlePointerDown("load", e)} />
              <circle cx={fX} cy={beamY + 15} r={14} fill="#4b5563" opacity={0.4} className="cursor-grab active:cursor-grabbing hover:opacity-60" onPointerDown={e => handlePointerDown("fulcrum", e)} />

              {/* Equilibrium Badge */}
              <g transform="translate(300, 40)">
                <rect x={-50} y={-15} width={100} height={30} fill="#16a34a" rx={15} />
                <text x={0} y={5} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">Dengede!</text>
              </g>

              <defs>
                <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
                </marker>
                <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>

        {/* Panels */}
        <div className="flex-1 flex flex-col gap-6 w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Kontrol Paneli</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yük Büyüklüğü: <span className="text-red-600 font-bold">{load} N</span>
              </label>
              <input 
                type="range" 
                min="10" 
                max="500" 
                step="10" 
                value={load} 
                onChange={e => setLoad(Number(e.target.value))} 
                className="w-full accent-red-600" 
              />
            </div>
            
            <p className="mt-6 text-sm text-gray-500 bg-gray-50 border p-3 rounded leading-relaxed">
              Mavi (Kuvvet), Kırmızı (Yük) ve Gri (Destek) işaretleyicileri çubuk üzerinde fare ile sağa/sola sürükleyerek kaldıraç tipini ve moment kollarını değiştirebilirsiniz. Sistem gereken dengeleyici kuvveti otomatik bulur.
            </p>

            <button onClick={handleReset} className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition">
              Sıfırla
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Gözlem Paneli</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded border border-gray-100">
                <div className="text-gray-500 text-xs mb-1">Kuvvet Kolu (d_k)</div>
                <div className="font-mono text-xl font-bold text-blue-700">{effortArm.toFixed(1)} m</div>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-100">
                <div className="text-gray-500 text-xs mb-1">Yük Kolu (d_y)</div>
                <div className="font-mono text-xl font-bold text-red-700">{loadArm.toFixed(1)} m</div>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-100">
                <div className="text-gray-500 text-xs mb-1">Yük / Direnç (F_y)</div>
                <div className="font-mono text-xl font-bold text-red-700">{load.toFixed(1)} N</div>
              </div>
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="text-blue-800 text-xs mb-1 font-bold">Hesaplanan Kuvvet (F_k)</div>
                <div className="font-mono text-xl font-bold text-blue-700">{reportedEffort.toFixed(1)} N</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-gray-600">Kuvvet Kazancı (KK):</span>
                 <span className="font-bold text-gray-900 border-b border-gray-300 pb-1">{reportedMA.toFixed(2)}x</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-gray-600">Kaldıraç Tipi:</span>
                 <span className="font-bold text-gray-900 border-b border-gray-300 pb-1">{leverClass}. Sınıf</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}