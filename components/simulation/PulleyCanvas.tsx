"use client";

import React, { useState, useEffect } from "react";
import CompletionCheck from "./CompletionCheck";
import { calculatePulley } from "@/lib/physics/pulley";
import { Simulasyon } from "@/lib/types";

interface PulleyCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete?: () => void;
}

type Mode = "sabit" | "hareketli" | "kombine";

export default function PulleyCanvas({ slug, simulation, onComplete }: PulleyCanvasProps) {
  const [mode, setMode] = useState<Mode>("sabit");
  const [load, setLoad] = useState(400);
  const [movableCount, setMovableCount] = useState(2);
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0); // 0 to 100

  // Animated pull
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setPullProgress(prev => {
        if (isPulling) {
          if (prev < 100) return Math.min(prev + 1.5, 100);
          return prev;
        }
        return prev;
      });
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPulling]);

  const handleReset = () => {
    setIsPulling(false);
    setPullProgress(0);
  };

  const handleCheck = () => {
    if (pullProgress === 0) setIsPulling(true);
    else handleReset();
  };

  const actualPulleys = mode === "sabit" ? 0 : movableCount;
  const { effort, mechanicalAdvantage, ropeSegments } = calculatePulley(load, actualPulleys);

  const canvasW = 500;
  const canvasH = 500;
  const ceilingY = 40;
  const initLoadY = 380;
  const loadY = initLoadY - pullProgress;

  const renderMechanism = () => {
    if (mode === "sabit") {
      const pX = 250;
      const pY = 120;
      const loadX = pX - 25;
      const effortX = pX + 25;
      const r = 25;

      return (
        <g>
          {/* Ceiling anchor */}
          <line x1={pX} y1={ceilingY} x2={pX} y2={pY} stroke="#6b7280" strokeWidth="6" />

          {/* Fixed Pulley */}
          <circle cx={pX} cy={pY} r={r} fill="#6b7280" stroke="#4b5563" strokeWidth="2" />
          <circle cx={pX} cy={pY} r={4} fill="#1f2937" />

          {/* Ropes */}
          <line x1={loadX} y1={pY} x2={loadX} y2={loadY} stroke="#2563eb" strokeWidth="3" />
          <line x1={effortX} y1={pY} x2={effortX} y2={loadY + pullProgress * 2} stroke="#2563eb" strokeWidth="3" />

          {/* Load */}
          <rect x={loadX - 20} y={loadY} width={40} height={40} fill="#dc2626" rx="4" />
          <text x={loadX} y={loadY + 25} fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">Yük</text>

          {/* Effort Arrow */}
          <g transform={`translate(${effortX}, ${loadY + pullProgress * 2})`}>
            <line x1={0} y1={0} x2={0} y2={40} stroke="#16a34a" strokeWidth="4" markerEnd="url(#arrow-green)" />
            <text x={0} y={60} fill="#16a34a" fontSize="14" fontWeight="bold" textAnchor="middle">{effort.toFixed(0)} N</text>
          </g>
        </g>
      );
    }

    // Hareketli or Kombine
    const pulleySpacing = 40;
    const bracketW = actualPulleys * pulleySpacing + 10;
    const startX = 250 - bracketW / 2 + 25;
    
    // Elements container for Movable pulleys
    const movables = [];
    const ropes = [];

    // Top block/ceiling anchors
    const topY = ceilingY;

    // The load goes on the bottom block
    const blockY = loadY - 40; 
    
    // Draw rope segments
    for (let i = 0; i < actualPulleys; i++) {
        const x = startX + i * pulleySpacing;
        
        // Movable pulley
        movables.push(
            <g key={`m-${i}`}>
               <circle cx={x} cy={blockY} r={15} fill="#6b7280" stroke="#4b5563" strokeWidth="2" />
               <circle cx={x} cy={blockY} r={3} fill="#1f2937" />
               {/* Axle pin to block */}
               <line x1={x} y1={blockY} x2={x} y2={blockY + 20} stroke="#4b5563" strokeWidth="4" />
            </g>
        );

        // Left rope of this pulley goes up to ceiling 
        ropes.push(<line key={`rl-${i}`} x1={x - 15} y1={topY} x2={x - 15} y2={blockY} stroke="#2563eb" strokeWidth="3" />);

        if (i < actualPulleys - 1) {
             // Right rope goes up to ceiling then to next pulley over a small fixed pin
             // To simplify visually without drawing a top block, just run it straight to ceiling
             ropes.push(<line key={`rr-${i}`} x1={x + 15} y1={topY} x2={x + 15} y2={blockY} stroke="#2563eb" strokeWidth="3" />);
        }
    }

    // Last rope (effort side)
    const lastX = startX + (actualPulleys - 1) * pulleySpacing + 15;
    const effortY = loadY;
    
    if (mode === "hareketli") {
        ropes.push(<line key="re" x1={lastX} y1={effortY - 120 - pullProgress*2} x2={lastX} y2={blockY} stroke="#2563eb" strokeWidth="3" />);
        // Arrow points UP for hareketli
        movables.push(
           <g key="effort" transform={`translate(${lastX}, ${effortY - 120 - pullProgress*2})`}>
              <line x1={0} y1={0} x2={0} y2={-40} stroke="#16a34a" strokeWidth="4" markerEnd="url(#arrow-green)" />
              <text x={0} y={-50} fill="#16a34a" fontSize="14" fontWeight="bold" textAnchor="middle">{effort.toFixed(0)} N</text>
           </g>
        );
    } else { // Kombine
        // Ropes goes up to Top Fixed Pulley (at lastX + 15)
        const topPx = lastX + 15;
        const topPy = ceilingY + 30;
        
        // Anchor top fixed pulley
        movables.push(<line key="top-anch" x1={topPx} y1={ceilingY} x2={topPx} y2={topPy} stroke="#6b7280" strokeWidth="4" />);
        movables.push(<circle key="top-p" cx={topPx} cy={topPy} r={15} fill="#6b7280" stroke="#4b5563" strokeWidth="2" />);
        movables.push(<circle key="top-c" cx={topPx} cy={topPy} r={3} fill="#1f2937" />);

        // Up to fixed pulley
        ropes.push(<line key="re-up" x1={lastX} y1={topPy} x2={lastX} y2={blockY} stroke="#2563eb" strokeWidth="3" />);
        // Down to hand
        const downX = topPx + 15;
        ropes.push(<line key="re-down" x1={downX} y1={topPy} x2={downX} y2={effortY + pullProgress*2} stroke="#2563eb" strokeWidth="3" />);
        
        // Arrow points DOWN for kombine
        movables.push(
           <g key="effort" transform={`translate(${downX}, ${effortY + pullProgress * 2})`}>
              <line x1={0} y1={0} x2={0} y2={40} stroke="#16a34a" strokeWidth="4" markerEnd="url(#arrow-green)" />
              <text x={0} y={60} fill="#16a34a" fontSize="14" fontWeight="bold" textAnchor="middle">{effort.toFixed(0)} N</text>
           </g>
        );
    }

    return (
      <g>
        {/* Ropes First */}
        {ropes}
        
        {/* Bottom Block Body */}
        <rect x={250 - bracketW / 2} y={blockY + 20} width={bracketW} height={10} fill="#4b5563" rx={4} />

        {/* Load Block attached below it */}
        <rect x={250 - 25} y={loadY} width={50} height={40} fill="#dc2626" rx="4" />
        <text x={250} y={loadY + 25} fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">Yük</text>

        {/* Pulleys Overlapping */}
        {movables}

        {/* Tension Indicators for each supporting rope segment (always show for Kombine & Hareketli) */}
        {Array.from({ length: actualPulleys * 2 }).map((_, i) => {
            const ropeX = startX - 15 + Math.floor(i / 2) * pulleySpacing + (i % 2 === 0 ? 0 : 30);
            return (
               <g key={`t-${i}`} transform={`translate(${ropeX}, ${(topY + blockY) / 2 + (i % 2 === 0 ? -10 : 10)})`}>
                   <rect x={-15} y={-10} width={30} height={16} fill="white" fillOpacity={0.8} />
                   <text x={0} y={2} fill="#2563eb" fontSize={10} fontWeight="bold" textAnchor="middle">T</text>
               </g>
            );
        })}
      </g>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulation.zorunlu_deney}
        observedValue={effort}
        isFinished={pullProgress === 100}
      />

      {/* Mode Selector */}
      <div className="flex justify-center mb-2 bg-gray-100 p-1 rounded-md self-center">
        <button className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${mode === "sabit" ? "bg-white shadow text-blue-700" : "text-gray-600 hover:text-gray-900"}`} onClick={() => { setMode("sabit"); handleReset(); }}>Sabit Makara</button>
        <button className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${mode === "hareketli" ? "bg-white shadow text-blue-700" : "text-gray-600 hover:text-gray-900"}`} onClick={() => { setMode("hareketli"); handleReset(); }}>Hareketli Makara</button>
        <button className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${mode === "kombine" ? "bg-white shadow text-blue-700" : "text-gray-600 hover:text-gray-900"}`} onClick={() => { setMode("kombine"); handleReset(); }}>Kombine Sistem</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Canvas Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 w-full lg:w-auto relative flex-shrink-0">
          <svg width={canvasW} height={canvasH} className="block max-w-full bg-white rounded-lg border border-gray-200">
            <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Ceiling */}
            <rect x={0} y={0} width={canvasW} height={ceilingY} fill="#e5e7eb" />
            <path d="M 0 40 L 40 0 M 40 40 L 80 0 M 80 40 L 120 0 M 120 40 L 160 0 M 160 40 L 200 0 M 200 40 L 240 0 M 240 40 L 280 0 M 280 40 L 320 0 M 320 40 L 360 0 M 360 40 L 400 0 M 400 40 L 440 0 M 440 40 L 480 0 M 480 40 L 520 0" stroke="#d1d5db" strokeWidth="2" />
            <line x1={0} y1={ceilingY} x2={canvasW} y2={ceilingY} stroke="#9ca3af" strokeWidth="4" />

            {renderMechanism()}

            <defs>
                <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
                </marker>
            </defs>
          </svg>
        </div>

        {/* Panel Area */}
        <div className="flex-1 flex flex-col gap-6 w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Kontrol Paneli</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yük (G): <span className="text-red-600 font-bold">{load} N</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="1000" 
                  step="50" 
                  value={load} 
                  onChange={e => setLoad(Number(e.target.value))} 
                  className="w-full accent-red-600" 
                  disabled={pullProgress > 0}
                />
              </div>

              {mode !== "sabit" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hareketli Makara Sayısı (n): <span className="text-blue-600 font-bold">{movableCount}</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="4" 
                    step="1" 
                    value={movableCount} 
                    onChange={e => setMovableCount(Number(e.target.value))} 
                    className="w-full accent-blue-600" 
                    disabled={pullProgress > 0}
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex gap-4">
                <button 
                  onClick={handleCheck}
                  className={`flex-1 font-semibold py-2 rounded-lg shadow transition text-white ${pullProgress > 0 && !isPulling ? "bg-amber-500 hover:bg-amber-600" : isPulling ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {pullProgress === 0 ? "Kuvvet Uygula (Çek)" : isPulling ? "Çekiliyor..." : "Sıfırla"}
                </button>
                <button 
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Durdur / Sıfırla
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Gözlem Paneli</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Kaldırılan Yük (G):</span>
                <span className="font-bold text-red-600 font-mono text-lg">{load.toFixed(0)} N</span>
              </div>
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Gereken Kuvvet (F):</span>
                <span className="font-bold text-green-600 font-mono text-lg">{effort.toFixed(0)} N</span>
              </div>
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Kuvvet Kazancı:</span>
                <span className="font-bold text-gray-900 border-b border-gray-300">{mechanicalAdvantage.toFixed(1)}x</span>
              </div>
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Kuvvet Yönü Değişimi:</span>
                <span className="font-bold text-gray-900 border-b border-gray-300">
                  {mode === "hareketli" ? "Hayır" : "Evet"}
                </span>
              </div>
            </div>

            {mode !== "sabit" && (
               <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                  <strong>İp Gerilmesi (T) İncelemesi:</strong><br />
                  Yük, sistemi taşıyan <span className="font-bold">{ropeSegments}</span> adet ip segmenti tarafından paylaşılmaktadır. Her segmentte oluşan gerilim: T = {effort.toFixed(0)} N.
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}