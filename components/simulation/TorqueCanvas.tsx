"use client";

import React, { useState, useEffect, useRef } from "react";
import { Simulasyon } from "@/lib/types";
import { calculateTorque, calculateNetTorque } from "@/lib/physics/torque";
import CompletionCheck from "./CompletionCheck";

interface ForceItem {
  id: number;
  position: number;
  magnitude: number;
  angle: number;
  torque: number;
  direction: 1 | -1;
}

interface TorqueCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function Readout({
  label,
  value,
  active = false,
}: {
  label: string;
  value: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-colors ${
        active ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-mono text-lg font-semibold ${
          active ? "text-blue-700" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function TorqueCanvas({ slug, simulation, onComplete }: TorqueCanvasProps) {
  const [mode, setMode] = useState<"cubuk" | "kapi">("cubuk");
  
  // Çubuk mode states
  const [pivotPosition, setPivotPosition] = useState(50); // % of rod length (0-100)
  const rodLengthInMeters = 10;
  const [forces, setForces] = useState<ForceItem[]>([]);
  const [netTorque, setNetTorque] = useState(0);

  // New force input relative to pivot
  const [newForcePos, setNewForcePos] = useState(3);
  const [newForceMag, setNewForceMag] = useState(20);
  const [newForceAng, setNewForceAng] = useState(90);

  // Kapı mode states
  const [doorForcePos, setDoorForcePos] = useState(100); // 5-100 %
  const [doorForceMag, setDoorForceMag] = useState(20); // 1-100 N
  const [doorAngle, setDoorAngle] = useState(0);
  const [cubukAngle, setCubukAngle] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const doorLengthMeters = 1;
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  // Auto calculate net torque on forces change
  useEffect(() => {
    if (mode === "cubuk") {
      const recomputed = forces.map((f) => {
        const dist = Math.abs(f.position);
        const t = calculateTorque(f.magnitude, dist, f.angle);
        const isRightOfPivot = f.position > 0;
        const direction = Math.sin((f.angle * Math.PI) / 180) * (isRightOfPivot ? 1 : -1) >= 0 ? 1 : -1;
        return {
          ...f,
          torque: t.torque,
          direction: direction as 1 | -1,
        };
      });
      const net = calculateNetTorque(recomputed.map(f => ({ value: f.torque, direction: f.direction }))).net;
      setNetTorque(net);
    }
  }, [forces, pivotPosition, mode]);

  useEffect(() => {
    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (isRunning) {
        if (mode === "kapi") {
          const distance = (doorForcePos / 100) * doorLengthMeters;
          const t = calculateTorque(doorForceMag, distance, 90).torque;
          setDoorAngle((prev) => Math.min(Math.max(prev + t * dt * 0.5, -90), 90));
        } else if (mode === "cubuk") {
          // Accelerate rod angle proportionally to net torque (just visual)
          setCubukAngle((prev) => prev - netTorque * dt * 0.1); 
        }
      }
      
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [mode, doorForcePos, doorForceMag, isRunning, netTorque]);

  const resetAll = () => {
    setIsRunning(false);
    setDoorAngle(0);
    setCubukAngle(0);
    setForces([]);
  };

  const addForce = () => {
    // newForcePos is relative to pivot. < 0 means left, > 0 means right.
    const isRightOfPivot = newForcePos > 0;
    const dist = Math.abs(newForcePos);
    const t = calculateTorque(newForceMag, dist, newForceAng);
    // Simple heuristic for direction
    const direction = Math.sin((newForceAng * Math.PI) / 180) * (isRightOfPivot ? 1 : -1) >= 0 ? 1 : -1;
    
    setForces([
      ...forces,
      {
        id: Date.now(),
        position: newForcePos,
        magnitude: newForceMag,
        angle: newForceAng,
        torque: t.torque,
        direction: direction as 1 | -1,
      },
    ]);
  };

  const undoForce = () => {
    setForces((prev) => prev.slice(0, -1));
  };

  const clearForces = () => {
    resetAll();
  };

  // Canvas drawing properties
  const w = mode === "cubuk" ? 600 : 500;
  const h = mode === "cubuk" ? 300 : 400;

  // Render Çubuk Mode canvas
  const renderCubuk = () => {
    const marginX = 50;
    const lineY = h / 2;
    const effectiveW = w - marginX * 2;
    const pivotX = marginX + (pivotPosition / 100) * effectiveW;

    return (
      <svg width={w} height={h} className="bg-white border text-zinc-900 mx-auto block mb-4">
        {/* Grid */}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Pivot */}
        <polygon points={`${pivotX},${lineY} ${pivotX - 10},${lineY + 20} ${pivotX + 10},${lineY + 20}`} fill="gray" />

        <g transform={`rotate(${cubukAngle}, ${pivotX}, ${lineY})`}>
          {/* Rod */}
          <line x1={marginX} y1={lineY} x2={w - marginX} y2={lineY} stroke="black" strokeWidth={4} />
          
          {/* Forces */}
          {forces.map((f) => {
            // Absolute position on rod = pivot position + relative force position
            const absolutePos = (pivotPosition / 100) * rodLengthInMeters + f.position;
            const fx = marginX + (absolutePos / rodLengthInMeters) * effectiveW;
            const arrowLength = Math.min(f.magnitude, 100); 
            const rad = (180 - f.angle) * (Math.PI / 180); // point up
            const headX = fx + arrowLength * Math.cos(rad);
            const headY = lineY - arrowLength * Math.sin(rad);
            
            return (
              <g key={f.id}>
                {/* Arrow body */}
                <line x1={fx} y1={lineY} x2={headX} y2={headY} stroke="blue" strokeWidth={2} markerEnd="url(#arrow)" />
              </g>
            );
          })}
        </g>

        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="blue" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderKapi = () => {
    // Top-down view
    const hingeX = 100;
    const hingeY = h / 2;
    const doorW = 300;
    const doorH = 10;
    
    const rad = (doorAngle * Math.PI) / 180;
    const endX = hingeX + doorW * Math.cos(rad);
    const endY = hingeY + doorW * Math.sin(rad);

    const forceDist = (doorForcePos / 100) * doorW;
    const fx = hingeX + forceDist * Math.cos(rad);
    const fy = hingeY + forceDist * Math.sin(rad);

    const forceLength = doorForceMag;
    // Perpendicular to the door
    const fAngleRad = rad - Math.PI / 2;
    const fhX = fx + forceLength * Math.cos(fAngleRad);
    const fhY = fy + forceLength * Math.sin(fAngleRad);

    return (
      <svg width={w} height={h} className="bg-white border text-zinc-900 mx-auto block mb-4">
         <pattern id="gridK" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#gridK)" />

        {/* Hinge Point */}
        <circle cx={hingeX} cy={hingeY} r={6} fill="gray" />

        {/* Door */}
        <line x1={hingeX} y1={hingeY} x2={endX} y2={endY} stroke="#8B4513" strokeWidth={doorH} strokeLinecap="round" />

        {/* Force Arrow */}
        <line x1={fx} y1={fy} x2={fhX} y2={fhY} stroke="blue" strokeWidth={2} markerEnd="url(#arrow)" />
        
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="blue" />
          </marker>
        </defs>
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center mb-2 bg-gray-100 p-1 rounded-md self-center">
        <button
          className={`px-4 py-1 rounded-md ${mode === "cubuk" ? "bg-white shadow text-blue-600 font-medium" : "text-gray-600"}`}
          onClick={() => setMode("cubuk")}
        >
          Çubuk
        </button>
        <button
          className={`px-4 py-1 rounded-md ${mode === "kapi" ? "bg-white shadow text-blue-600 font-medium" : "text-gray-600"}`}
          onClick={() => setMode("kapi")}
        >
          Kapı Analojisi
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col bg-white p-4 rounded-xl border border-zinc-200">
          <div className="flex justify-between items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-zinc-900 font-display">Tork Simülasyonu</h2>
            <div className="flex gap-2">
               {!isRunning ? (
                  <button onClick={() => setIsRunning(true)} className="px-4 py-1.5 bg-green-600 text-white rounded font-bold text-sm shadow hover:bg-green-700">Başlat</button>
               ) : (
                  <button onClick={() => setIsRunning(false)} className="px-4 py-1.5 bg-orange-500 text-white rounded font-bold text-sm shadow hover:bg-orange-600">Duraklat</button>
               )}
               <button onClick={resetAll} className="px-4 py-1.5 bg-zinc-200 text-zinc-800 rounded font-bold text-sm shadow hover:bg-zinc-300">Sıfırla</button>
            </div>
          </div>
          
          {mode === "cubuk" && (
            <div className="flex gap-2 mb-4">
               <button onClick={undoForce} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">Son Kuvveti Geri Al</button>
               <button onClick={clearForces} className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm">Tüm Kuvvetleri Temizle</button>
            </div>
          )}

          {mode === "cubuk" ? renderCubuk() : renderKapi()}

          <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg">
            <h3 className="font-semibold text-zinc-900 mb-2">Kontrol Paneli</h3>
            
            {mode === "cubuk" ? (
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block mb-1">Pivot Konumu ({pivotPosition}%)</label>
                  <input type="range" min="0" max="100" value={pivotPosition} onChange={(e) => setPivotPosition(Number(e.target.value))} className="w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Konum (m), -10 ile 10</label>
                    <input type="number" min="-10" max="10" step="0.1" value={newForcePos} onChange={e => setNewForcePos(Number(e.target.value))} className="border p-1 w-full rounded" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Büyüklük (N), 1-100</label>
                    <input type="number" min="1" max="100" value={newForceMag} onChange={e => setNewForceMag(Number(e.target.value))} className="border p-1 w-full rounded" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Açı (°), 0-180</label>
                    <input type="number" min="0" max="180" value={newForceAng} onChange={e => setNewForceAng(Number(e.target.value))} className="border p-1 w-full rounded" />
                  </div>
                </div>
                <button onClick={addForce} className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 w-full mt-2">Kuvvet Ekle</button>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block mb-1">Kuvvet Uygulama Noktası ({doorForcePos}%)</label>
                  <input type="range" min="5" max="100" value={doorForcePos} onChange={(e) => setDoorForcePos(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="block mb-1">Kuvvet Büyüklüğü ({doorForceMag} N)</label>
                  <input type="range" min="1" max="100" value={doorForceMag} onChange={(e) => setDoorForceMag(Number(e.target.value))} className="w-full" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-4 bg-blue-500 rounded-full"></div>
              <h3 className="font-semibold text-zinc-900 tracking-tight">Gözlem Paneli</h3>
            </div>
            
            {mode === "cubuk" ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                  <span className="text-zinc-500 text-sm">Net Tork (τ)</span>
                  <span className={`font-mono font-medium ${netTorque === 0 ? "text-green-600" : "text-zinc-900"}`}>{Math.abs(netTorque).toFixed(1)} N·m</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                  <span className="text-zinc-500 text-sm">Durum</span>
                  <span className={`font-medium text-sm px-2 py-0.5 rounded-md ${netTorque === 0 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {netTorque === 0 ? "Dengede" : netTorque > 0 ? "Saat Tersi (+)" : "Saat Yönü (-)"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                  <span className="text-zinc-500 text-sm">Kuvvet Sayısı</span>
                  <span className="font-medium text-zinc-900 text-sm">{forces.length} adet</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-500 text-sm">En Büyük Kuvvet</span>
                  <span className="font-mono font-medium text-zinc-900 text-sm">{forces.length > 0 ? Math.max(...forces.map(f => f.magnitude)).toFixed(1) : 0} N</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                  <span className="text-zinc-500 text-sm">Menteşe Uzaklığı (d)</span>
                  <span className="font-mono font-medium text-zinc-900">{((doorForcePos / 100) * doorLengthMeters).toFixed(2)} m</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                  <span className="text-zinc-500 text-sm">İtme Kuvveti (F)</span>
                  <span className="font-mono font-medium text-zinc-900">{doorForceMag.toFixed(1)} N</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                  <span className="text-zinc-500 text-sm">Uygulanma Açısı</span>
                  <span className="font-medium text-zinc-900 text-sm">90° (Dik)</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-500 text-sm font-medium">Oluşan Tork (τ)</span>
                  <span className="font-mono font-bold text-blue-600 text-lg">
                    {calculateTorque(doorForceMag, (doorForcePos / 100) * doorLengthMeters, 90).torque.toFixed(1)} N·m
                  </span>
                </div>
              </div>
            )}
            
            {isRunning && mode === "kapi" && (
              <div className="mt-6 flex gap-3 items-start p-3 bg-zinc-50 rounded-lg text-sm text-zinc-600 border border-zinc-100">
                <span className="text-blue-500 text-lg leading-none">ℹ</span>
                <p>Tork değeri ne kadar yüksekse kapı o kadar büyük bir ivmeyle açılır.</p>
              </div>
            )}
            {isRunning && mode === "cubuk" && netTorque !== 0 && (
              <div className="mt-6 flex gap-3 items-start p-3 bg-zinc-50 rounded-lg text-sm text-zinc-600 border border-zinc-100">
                <span className="text-blue-500 text-lg leading-none">↻</span>
                <p>Çubuk <strong>{netTorque > 0 ? "saat yönünün tersine" : "saat yönüne"}</strong> dönüyor.</p>
              </div>
            )}
            {isRunning && mode === "cubuk" && netTorque === 0 && forces.length > 0 && (
              <div className="mt-6 flex gap-3 items-start p-3 bg-green-50 rounded-lg text-sm text-green-800 border border-green-100">
                <span className="text-green-600 text-lg leading-none">✓</span>
                <p><strong>Denge Sağlandı!</strong> Sağ ve sol torklar birbirine eşit.</p>
              </div>
            )}
          </div>

          <CompletionCheck
            slug={slug}
            zorunluDeney={simulation.zorunlu_deney}
            observedValue={Math.abs(netTorque)}
            isFinished={true}
          />
        </div>
      </div>
    </div>
  );
}
