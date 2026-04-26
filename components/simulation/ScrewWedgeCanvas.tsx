"use client";

import React, { useState, useEffect, useRef } from "react";
import CompletionCheck from "./CompletionCheck";
import { calculateScrew, calculateScrewAdvancement, calculateWedge } from "@/lib/physics/screwWedge";
import { Simulasyon } from "@/lib/types";

interface ScrewWedgeCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete?: () => void;
}

export default function ScrewWedgeCanvas({ slug, simulation, onComplete }: ScrewWedgeCanvasProps) {
  const [mode, setMode] = useState<"vida" | "kama">("vida");

  // Vida state
  const [pitch, setPitch] = useState(2); // mm, need to convert to cm for calculation with arm if mixed, but standard KK = 2piR/a so units must match. Both in same units if possible, or watch out.
  const [armLength, setArmLength] = useState(15); // cm
  const [screwForce, setScrewForce] = useState(10); // N
  const [turns, setTurns] = useState(0);
  const [screwAnimProgress, setScrewAnimProgress] = useState(0);
  const [isScrewRunning, setIsScrewRunning] = useState(false);

  // Kama state
  const [wedgeLength, setWedgeLength] = useState(10); // cm
  const [wedgeThickness, setWedgeThickness] = useState(2); // cm
  const [wedgeForce, setWedgeForce] = useState(50); // N
  const [wedgeAnimProgress, setWedgeAnimProgress] = useState(0);
  const [isWedgeRunning, setIsWedgeRunning] = useState(false);

  const animRef = useRef<number>(0);

  useEffect(() => {
    if (isScrewRunning) {
      const animate = () => {
        setScrewAnimProgress((prev) => {
          if (prev >= 1) {
            setIsScrewRunning(false);
            setTurns((t) => t + 1);
            return 1;
          }
          return prev + 0.02;
        });
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isScrewRunning]);

  useEffect(() => {
    if (isWedgeRunning) {
      const animate = () => {
        setWedgeAnimProgress((prev) => {
          if (prev >= 1) {
            setIsWedgeRunning(false);
            return 1;
          }
          return prev + 0.02;
        });
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isWedgeRunning]);

  const handleScrewStart = () => {
    setScrewAnimProgress(0);
    setIsScrewRunning(true);
  };

  const handleScrewReset = () => {
    setScrewAnimProgress(0);
    setTurns(0);
    setIsScrewRunning(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  const handleWedgeStart = () => {
    if (wedgeAnimProgress >= 1) setWedgeAnimProgress(0);
    setIsWedgeRunning(true);
  };

  const handleWedgeReset = () => {
    setWedgeAnimProgress(0);
    setIsWedgeRunning(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  useEffect(() => {
    if (mode === "vida") handleScrewReset();
    else handleWedgeReset();
  }, [mode, pitch, armLength, screwForce, wedgeLength, wedgeThickness, wedgeForce]);

  // Screw calcs
  // Pitch is mm, armLength is cm. mechanicalAdvantage needs them in the same unit.
  // 1 cm = 10 mm.
  const { mechanicalAdvantage: screwMA } = calculateScrew(pitch, armLength * 10);
  const screwOutputForce = screwForce * screwMA;
  const screwDistance = calculateScrewAdvancement(turns + screwAnimProgress, pitch).distance;

  // Wedge calcs
  // Both cm, so units match.
  const { mechanicalAdvantage: wedgeMA } = calculateWedge(wedgeLength, wedgeThickness);
  const wedgeOutputForce = wedgeForce * wedgeMA; // on each side or total? Usually split, we'll just show the force on each side.

  return (
    <div className="flex flex-col gap-6">
      {mode === "vida" && (
        <CompletionCheck
          slug={`${slug}-vida`}
          zorunluDeney={simulation.zorunlu_deney}
          observedValue={screwMA}
          isFinished={isScrewRunning || turns > 0}
        />
      )}

      {/* Mode Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setMode("vida")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            mode === "vida" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Vida Modu
        </button>
        <button
          onClick={() => setMode("kama")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            mode === "kama" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Kama Modu
        </button>
      </div>

      {mode === "vida" ? (
        <VidaView
          pitch={pitch} setPitch={setPitch}
          armLength={armLength} setArmLength={setArmLength}
          screwForce={screwForce} setScrewForce={setScrewForce}
          turns={turns} screwAnimProgress={screwAnimProgress}
          isScrewRunning={isScrewRunning}
          handleStart={handleScrewStart} handleReset={handleScrewReset}
          screwMA={screwMA} screwOutputForce={screwOutputForce} screwDistance={screwDistance}
        />
      ) : (
        <KamaView
          wedgeLength={wedgeLength} setWedgeLength={setWedgeLength}
          wedgeThickness={wedgeThickness} setWedgeThickness={setWedgeThickness}
          wedgeForce={wedgeForce} setWedgeForce={setWedgeForce}
          wedgeAnimProgress={wedgeAnimProgress}
          isWedgeRunning={isWedgeRunning}
          handleStart={handleWedgeStart} handleReset={handleWedgeReset}
          wedgeMA={wedgeMA} wedgeOutputForce={wedgeOutputForce}
        />
      )}
    </div>
  );
}

function VidaView({
  pitch, setPitch, armLength, setArmLength, screwForce, setScrewForce,
  turns, screwAnimProgress, isScrewRunning, handleStart, handleReset,
  screwMA, screwOutputForce, screwDistance
}: any) {
  const canvasWidth = 500;
  const canvasHeight = 450;
  
  const boltX = 250;
  const boltTopY = 80 + screwDistance; // moves down as it turns
  const boltWidth = 40;
  const boltLen = 200;
  const threadCount = Math.floor(boltLen / (pitch * 5)); // visual scaling: not to scale

  const rotationAngle = screwAnimProgress * 360;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 w-full lg:w-auto flex-shrink-0">
        <svg width={canvasWidth} height={canvasHeight} className="block max-w-full bg-white rounded-lg border border-gray-200">
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Block to screw into */}
          <rect x={150} y={boltTopY + 50} width={200} height={300} fill="#f3f4f6" stroke="#d1d5db" />

          {/* Bolt Shaft */}
          <rect x={boltX - boltWidth/2} y={boltTopY + 20} width={boltWidth} height={boltLen} fill="#9ca3af" />
          
          {/* Threads */}
          {[...Array(threadCount)].map((_, i) => (
            <line 
              key={i} 
              x1={boltX - boltWidth/2} y1={boltTopY + 30 + i * (pitch * 5)} 
              x2={boltX + boltWidth/2} y2={boltTopY + 35 + i * (pitch * 5)} 
              stroke="#4b5563" strokeWidth="3" 
            />
          ))}

          {/* Bolt Head */}
          <rect x={boltX - boltWidth} y={boltTopY} width={boltWidth * 2} height={20} fill="#6b7280" rx="2" />

          {/* Wrench Arm - changes length based on armLength */}
          <g transform={`translate(${boltX}, ${boltTopY + 10}) rotate(${Math.sin((rotationAngle * Math.PI) / 180) * 10})`}>
            <rect x={0} y={-5} width={100 + armLength * 3} height={10} fill="#2563eb" rx="5" />
            
            {/* Input Force Arrow (Green) */}
            <line x1={100 + armLength * 3} y1={-10} x2={100 + armLength * 3} y2={-50} stroke="#16a34a" strokeWidth="3" markerEnd="url(#arrow-green)" />
            <text x={100 + armLength * 3 + 10} y={-30} fill="#16a34a" fontSize="12" fontWeight="bold">F = {screwForce} N</text>
          </g>

          {/* Output Force Arrow (Orange) downward */}
          <line x1={boltX} y1={boltTopY + 20 + boltLen + 5} x2={boltX} y2={boltTopY + 20 + boltLen + 50} stroke="#ea580c" strokeWidth="4" markerEnd="url(#arrow-orange)" />
          <text x={boltX + 15} y={boltTopY + 20 + boltLen + 30} fill="#ea580c" fontSize="12" fontWeight="bold">Çıkış Gücü</text>

          <defs>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
            </marker>
            <marker id="arrow-orange" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
            </marker>
          </defs>
        </svg>
      </div>

      <div className="flex-1 flex flex-col gap-6 w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Kontrol Paneli (Vida)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diş Adımı (p): <span className="text-gray-900 font-bold">{pitch} mm</span>
              </label>
              <input 
                type="range" min="0.5" max="5" step="0.5" 
                value={pitch} onChange={e => setPitch(Number(e.target.value))} 
                className="w-full accent-gray-600" disabled={isScrewRunning}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kol Uzunluğu (r): <span className="text-blue-600 font-bold">{armLength} cm</span>
              </label>
              <input 
                type="range" min="5" max="30" step="1" 
                value={armLength} onChange={e => setArmLength(Number(e.target.value))} 
                className="w-full accent-blue-600" disabled={isScrewRunning}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uygulanan Kuvvet (F): <span className="text-green-600 font-bold">{screwForce} N</span>
              </label>
              <input 
                type="range" min="1" max="100" step="1" 
                value={screwForce} onChange={e => setScrewForce(Number(e.target.value))} 
                className="w-full accent-green-600" disabled={isScrewRunning}
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-4">
              <button 
                onClick={handleStart}
                className={`flex-1 font-semibold py-2 rounded-lg shadow transition text-white ${isScrewRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                disabled={isScrewRunning}
              >
                {isScrewRunning ? "Dönüyor..." : "Döndür (1 Tur)"}
              </button>
              <button 
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Gözlem Paneli</h3>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
              <span className="text-gray-500 block mb-1">Tur Sayısı (n)</span>
              <span className="font-bold text-gray-700 font-mono text-lg">{turns}</span>
            </div>
            <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
              <span className="text-gray-500 block mb-1">İlerleme (d)</span>
              <span className="font-bold text-gray-700 font-mono text-lg">{screwDistance.toFixed(1)} mm</span>
            </div>
            <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
              <span className="text-gray-500 block mb-1">Kuvvet Kazancı (KK)</span>
              <span className="font-bold text-blue-600 font-mono text-lg">{screwMA.toFixed(1)}</span>
            </div>
            <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
              <span className="text-gray-500 block mb-1">Giriş Kuvveti</span>
              <span className="font-bold text-green-600 font-mono text-lg">{screwForce} N</span>
            </div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex justify-between items-center text-orange-900 font-semibold mb-1">
              <span>Çıkış Kuvveti (F_ç):</span>
              <span className="font-bold text-orange-600 text-xl font-mono">{screwOutputForce.toFixed(0)} N</span>
            </div>
            <p className="text-xs text-orange-700 mt-2">Daha fazla kol uzunluğu veya daha az diş adımı kuvvet kazancını artırır.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KamaView({
  wedgeLength, setWedgeLength, wedgeThickness, setWedgeThickness, wedgeForce, setWedgeForce,
  wedgeAnimProgress, isWedgeRunning, handleStart, handleReset,
  wedgeMA, wedgeOutputForce
}: any) {
  const canvasWidth = 500;
  const canvasHeight = 400;

  const startX = 100;
  const endX = 250;
  const wedgeX = startX + wedgeAnimProgress * (endX - startX);
  
  const centerY = 200;
  const wL_px = wedgeLength * 5;
  const wT_px = wedgeThickness * 10;

  // Blocks moving apart
  const blockGapBase = 0;
  const blockGapCurrent = blockGapBase + wedgeAnimProgress * (wT_px / 2);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 w-full lg:w-auto flex-shrink-0">
        <svg width={canvasWidth} height={canvasHeight} className="block max-w-full bg-white rounded-lg border border-gray-200">
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Two Blocks */}
          <rect x={200} y={centerY - 100 - blockGapCurrent} width={200} height={100} fill="#e5e7eb" stroke="#9ca3af" />
          <rect x={200} y={centerY + blockGapCurrent} width={200} height={100} fill="#e5e7eb" stroke="#9ca3af" />

          {/* Wedge (Triangle) */}
          <polygon 
            points={`${wedgeX},${centerY - wT_px/2} ${wedgeX},${centerY + wT_px/2} ${wedgeX + wL_px},${centerY}`} 
            fill="#2563eb" stroke="#1d4ed8" 
          />

          {/* Input Force Arrow */}
          <line x1={wedgeX - 60} y1={centerY} x2={wedgeX - 10} y2={centerY} stroke="#16a34a" strokeWidth="4" markerEnd="url(#arrow-green)" />
          <text x={wedgeX - 50} y={centerY - 10} fill="#16a34a" fontSize="12" fontWeight="bold">F = {wedgeForce} N</text>

          {/* Output.Force Arrows (Up & Down separating blocks) */}
          <line x1={Math.min(wedgeX + wL_px/2, 300)} y1={centerY - 30} x2={Math.min(wedgeX + wL_px/2, 300)} y2={centerY - 80} stroke="#ea580c" strokeWidth="4" markerEnd="url(#arrow-orange)" />
          <line x1={Math.min(wedgeX + wL_px/2, 300)} y1={centerY + 30} x2={Math.min(wedgeX + wL_px/2, 300)} y2={centerY + 80} stroke="#ea580c" strokeWidth="4" markerEnd="url(#arrow-orange)" />

        </svg>
      </div>

      <div className="flex-1 flex flex-col gap-6 w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Kontrol Paneli (Kama)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kama Uzunluğu (L): <span className="text-blue-600 font-bold">{wedgeLength} cm</span>
              </label>
              <input 
                type="range" min="5" max="30" step="1" 
                value={wedgeLength} onChange={e => setWedgeLength(Number(e.target.value))} 
                className="w-full accent-blue-600" disabled={isWedgeRunning}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kama Kalınlığı (t): <span className="text-gray-900 font-bold">{wedgeThickness} cm</span>
              </label>
              <input 
                type="range" min="1" max="10" step="1" 
                value={wedgeThickness} onChange={e => setWedgeThickness(Number(e.target.value))} 
                className="w-full accent-gray-600" disabled={isWedgeRunning}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uygulanan Kuvvet (F): <span className="text-green-600 font-bold">{wedgeForce} N</span>
              </label>
              <input 
                type="range" min="10" max="200" step="10" 
                value={wedgeForce} onChange={e => setWedgeForce(Number(e.target.value))} 
                className="w-full accent-green-600" disabled={isWedgeRunning}
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-4">
              <button 
                onClick={handleStart}
                className={`flex-1 font-semibold py-2 rounded-lg shadow transition text-white ${isWedgeRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                disabled={isWedgeRunning}
              >
                {isWedgeRunning ? "İtiliyor..." : "İt"}
              </button>
              <button 
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Gözlem Paneli</h3>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
              <span className="text-gray-500 block mb-1">Kuvvet Kazancı (KK)</span>
              <span className="font-bold text-blue-600 font-mono text-lg">{wedgeMA.toFixed(1)}</span>
            </div>
            <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
              <span className="text-gray-500 block mb-1">Giriş Kuvveti</span>
              <span className="font-bold text-green-600 font-mono text-lg">{wedgeForce} N</span>
            </div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex justify-between items-center text-orange-900 font-semibold mb-1">
              <span>Çıkış Kuvveti (Yön Başına):</span>
              <span className="font-bold text-orange-600 text-xl font-mono">{wedgeOutputForce.toFixed(0)} N</span>
            </div>
            <p className="text-xs text-orange-700 mt-2">Daha sivri (uzun ve ince) kamalar kuvveti yanlara çok daha güçlü iletir.</p>
          </div>
        </div>
      </div>
    </div>
  );
}