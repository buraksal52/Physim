"use client";

import React, { useState, useEffect, useRef } from "react";
import CompletionCheck from "./CompletionCheck";
import { calculateGearSystem } from "@/lib/physics/gear";
import { Simulasyon } from "@/lib/types";

interface GearCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete?: () => void;
}

export default function GearCanvas({ slug, simulation, onComplete }: GearCanvasProps) {
  const [driverTeeth, setDriverTeeth] = useState(20);
  const [drivenTeeth, setDrivenTeeth] = useState(60);
  const [driverRpm, setDriverRpm] = useState(300);
  const [driverTorque, setDriverTorque] = useState(10);
  const [hasThirdGear, setHasThirdGear] = useState(false);
  const [thirdTeeth, setThirdTeeth] = useState(40);

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isRunning) {
      const animate = (time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const delta = (time - lastTimeRef.current) / 1000;
        setElapsedTime((prev) => prev + delta);
        lastTimeRef.current = time;
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = 0;
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedTime(0);
    setDriverTeeth(20);
    setDrivenTeeth(60);
    setDriverRpm(300);
    setDriverTorque(10);
    setHasThirdGear(false);
    lastTimeRef.current = 0;
  };

  const { gearRatio: ratio1_to_2, drivenRpm: rpm2, drivenTorque: torque2 } = calculateGearSystem(driverTeeth, drivenTeeth, driverRpm, driverTorque);
  
  let ratio2_to_3 = 1;
  let rpm3 = 0;
  let torque3 = 0;

  if (hasThirdGear) {
    const res = calculateGearSystem(drivenTeeth, thirdTeeth, rpm2, torque2);
    ratio2_to_3 = res.gearRatio;
    rpm3 = res.drivenRpm;
    torque3 = res.drivenTorque;
  }

  const overallRatio = hasThirdGear ? (driverTeeth / thirdTeeth) : ratio1_to_2;

  // Angles in degrees
  const angle1 = (driverRpm / 60) * elapsedTime * 360;
  const angle2 = -1 * (rpm2 / 60) * elapsedTime * 360;
  const angle3 = hasThirdGear ? (rpm3 / 60) * elapsedTime * 360 : 0;

  const toothSize = 5;
  const driverRadius = driverTeeth * toothSize / Math.PI;
  const drivenRadius = drivenTeeth * toothSize / Math.PI;
  const thirdRadius = hasThirdGear ? thirdTeeth * toothSize / Math.PI : 0;

  const center1X = 150;
  const center1Y = 225;

  const center2X = center1X + driverRadius + drivenRadius;
  const center2Y = 225;

  const center3X = center2X + drivenRadius + thirdRadius;
  const center3Y = 225;

  const renderGear = (x: number, y: number, radius: number, teethCount: number, angle: number, color: string) => {
    const teeth = [];
    for (let i = 0; i < teethCount; i++) {
        const toothAngle = (i / teethCount) * 360;
        teeth.push(
            <rect 
                key={i}
                x={radius - 2} y={-4} 
                width={6} height={8} 
                fill={color} 
                rx={2}
                transform={`rotate(${toothAngle})`}
            />
        );
    }

    return (
        <g transform={`translate(${x}, ${y})`}>
            <circle cx={0} cy={0} r={radius} fill="none" stroke={color} strokeWidth={8} />
            <circle cx={0} cy={0} r={radius - 8} fill={color} opacity={0.2} />
            <circle cx={0} cy={0} r={8} fill={color} />
            <g transform={`rotate(${angle})`}>
                <line x1={0} y1={0} x2={radius} y2={0} stroke={color} strokeWidth={4} />
                <line x1={0} y1={0} x2={0} y2={radius} stroke={color} strokeWidth={4} />
                <line x1={0} y1={0} x2={-radius} y2={0} stroke={color} strokeWidth={4} />
                <line x1={0} y1={0} x2={0} y2={-radius} stroke={color} strokeWidth={4} />
                {teeth}
            </g>
        </g>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulation.zorunlu_deney}
        observedValue={rpm2}
        isFinished={isRunning} // or wait a bit, but running is fine
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Canvas Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 w-full lg:w-auto relative flex-shrink-0 overflow-x-auto">
          <div style={{ minWidth: `${Math.max(600, hasThirdGear ? center3X + thirdRadius + 50 : 600)}px` }}>
            <svg width={Math.max(600, hasThirdGear ? center3X + thirdRadius + 50 : 600)} height={450} className="block max-w-full bg-white rounded-lg border border-gray-200">
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {renderGear(center1X, center1Y, driverRadius, driverTeeth, angle1, "#2563eb")}
              {renderGear(center2X, center2Y, drivenRadius, drivenTeeth, angle2, "#ea580c")}
              {hasThirdGear && renderGear(center3X, center3Y, thirdRadius, thirdTeeth, angle3, "#16a34a")}

              {/* Driver Arrow */}
              <path d={`M ${center1X - 30} ${center1Y - driverRadius - 30} Q ${center1X} ${center1Y - driverRadius - 50} ${center1X + 30} ${center1Y - driverRadius - 30}`} fill="none" stroke="#2563eb" strokeWidth="3" markerEnd="url(#arrow-blue)" />
              
              {/* Driven Arrow (Reverse) */}
              <path d={`M ${center2X + 30} ${center2Y - drivenRadius - 30} Q ${center2X} ${center2Y - drivenRadius - 50} ${center2X - 30} ${center2Y - drivenRadius - 30}`} fill="none" stroke="#ea580c" strokeWidth="3" markerEnd="url(#arrow-orange)" />

              {/* Third Arrow (Same as driver) */}
              {hasThirdGear && (
                <path d={`M ${center3X - 30} ${center3Y - thirdRadius - 30} Q ${center3X} ${center3Y - thirdRadius - 50} ${center3X + 30} ${center3Y - thirdRadius - 30}`} fill="none" stroke="#16a34a" strokeWidth="3" markerEnd="url(#arrow-green)" />
              )}
              
              <text x={center1X} y={center1Y + driverRadius + 20} fill="#2563eb" fontSize="14" fontWeight="bold" textAnchor="middle">{driverRpm.toFixed(0)} RPM</text>
              <text x={center2X} y={center2Y + drivenRadius + 20} fill="#ea580c" fontSize="14" fontWeight="bold" textAnchor="middle">{rpm2.toFixed(0)} RPM</text>
              {hasThirdGear && <text x={center3X} y={center3Y + thirdRadius + 20} fill="#16a34a" fontSize="14" fontWeight="bold" textAnchor="middle">{rpm3.toFixed(0)} RPM</text>}

              <defs>
                <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
                </marker>
                <marker id="arrow-orange" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
                </marker>
                <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>

        {/* Panel Area */}
        <div className="flex-1 flex flex-col gap-6 w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Kontrol Paneli</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sürücü Diş Sayısı: <span className="text-blue-600 font-bold">{driverTeeth}</span>
                </label>
                <input 
                  type="range" min="8" max="60" step="1" 
                  value={driverTeeth} onChange={e => setDriverTeeth(Number(e.target.value))} 
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Güdülen Diş Sayısı: <span className="text-orange-600 font-bold">{drivenTeeth}</span>
                </label>
                <input 
                  type="range" min="8" max="60" step="1" 
                  value={drivenTeeth} onChange={e => setDrivenTeeth(Number(e.target.value))} 
                  className="w-full accent-orange-600"
                />
              </div>
              {hasThirdGear && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    3. Diş Sayısı: <span className="text-green-600 font-bold">{thirdTeeth}</span>
                  </label>
                  <input 
                    type="range" min="8" max="60" step="1" 
                    value={thirdTeeth} onChange={e => setThirdTeeth(Number(e.target.value))} 
                    className="w-full accent-green-600"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sürücü Devri (RPM): <span className="text-gray-900 font-bold">{driverRpm} rpm</span>
                </label>
                <input 
                  type="range" min="10" max="500" step="10" 
                  value={driverRpm} onChange={e => setDriverRpm(Number(e.target.value))} 
                  className="w-full accent-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sürücü Tork (N·m): <span className="text-gray-900 font-bold">{driverTorque} N·m</span>
                </label>
                <input 
                  type="range" min="1" max="100" step="1" 
                  value={driverTorque} onChange={e => setDriverTorque(Number(e.target.value))} 
                  className="w-full accent-gray-600"
                />
              </div>
              
              <div className="pt-2">
                <button 
                  onClick={() => setHasThirdGear(!hasThirdGear)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  {hasThirdGear ? "Üçüncü Dişliyi Kaldır" : "Üçüncü Dişli Ekle"}
                </button>
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-4">
                {!isRunning ? (
                  <button 
                    onClick={handleStart}
                    className="flex-1 font-semibold py-2 rounded-lg shadow transition text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Başlat
                  </button>
                ) : (
                  <button 
                    onClick={handleStop}
                    className="flex-1 font-semibold py-2 rounded-lg shadow transition text-white bg-amber-500 hover:bg-amber-600"
                  >
                    Durdur
                  </button>
                )}
                
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
                <span className="text-gray-500 block mb-1">Toplam Dişli Oranı</span>
                <span className="font-bold text-gray-700 font-mono text-lg">{overallRatio.toFixed(2)}</span>
              </div>
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Son Çıkış Devri</span>
                <span className="font-bold text-blue-600 font-mono text-lg">{hasThirdGear ? rpm3.toFixed(0) : rpm2.toFixed(0)} rpm</span>
              </div>
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Sürücü Tork</span>
                <span className="font-bold text-green-600 font-mono text-lg">{driverTorque.toFixed(1)} N·m</span>
              </div>
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Çıkış Tork</span>
                <span className="font-bold text-orange-600 font-mono text-lg">{hasThirdGear ? torque3.toFixed(1) : torque2.toFixed(1)} N·m</span>
              </div>
            </div>

            <div className={`mt-4 p-4 rounded-lg border ${overallRatio < 1 ? "bg-red-50 border-red-200" : overallRatio > 1 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`${overallRatio < 1 ? "text-red-800" : overallRatio > 1 ? "text-green-800" : "text-gray-800"} font-semibold`}>Hız Değişimi:</span>
                <span className={`font-bold text-xl font-mono ${overallRatio < 1 ? "text-red-700" : overallRatio > 1 ? "text-green-700" : "text-gray-700"}`}>
                  {overallRatio < 1 ? "Hız Düştü" : overallRatio > 1 ? "Hız Arttı" : "Hız Sabit"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}