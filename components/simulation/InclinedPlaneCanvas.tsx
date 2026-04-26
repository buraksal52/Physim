"use client";

import React, { useState, useEffect, useRef } from "react";
import CompletionCheck from "./CompletionCheck";
import { calculateInclinedPlane } from "@/lib/physics/inclinedPlane";
import { Simulasyon } from "@/lib/types";

interface InclinedPlaneCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete?: () => void;
}

export default function InclinedPlaneCanvas({ slug, simulation, onComplete }: InclinedPlaneCanvasProps) {
  const [mass, setMass] = useState(10);
  const [angle, setAngle] = useState(30);
  const [friction, setFriction] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1

  const animRef = useRef<number>(0);

  useEffect(() => {
    if (isRunning) {
      const animate = () => {
        setProgress(prev => {
          if (prev >= 1) {
            setIsRunning(false);
            return 1;
          }
          return prev + 0.01; // constant speed
        });
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isRunning]);

  const handleStart = () => {
    if (progress >= 1) setProgress(0);
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setProgress(0);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  // Reset animation when parameters change
  useEffect(() => {
    handleReset();
  }, [mass, angle, friction]);

  const { weight, normal, parallel, frictionForce, effort, mechanicalAdvantage, efficiency } = calculateInclinedPlane(mass, angle, friction, 10);

  const canvasWidth = 600;
  const canvasHeight = 420;
  
  const bottomX = 100;
  const bottomY = 360;
  const topX = 500;
  const planeLength = topX - bottomX; // base length
  
  // Angle in radians
  const theta = (angle * Math.PI) / 180;
  
  // The actual end point of the plane
  const endX = bottomX + planeLength * Math.cos(theta);
  const endY = bottomY - planeLength * Math.sin(theta);
  
  // The block sliding along the plane
  // Progress goes from 0 to 1
  const blockW = 40;
  const blockH = 40;
  const slideLength = planeLength - blockW;
  
  const currentSlide = progress * slideLength;
  const blockCenterX = bottomX + (currentSlide + blockW / 2) * Math.cos(theta) - (blockH / 2) * Math.sin(theta);
  const blockCenterY = bottomY - (currentSlide + blockW / 2) * Math.sin(theta) - (blockH / 2) * Math.cos(theta);

  // Scaling factors for arrows
  const arrowScale = 0.5;

  return (
    <div className="flex flex-col gap-6">
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulation.zorunlu_deney}
        observedValue={effort}
        isFinished={progress >= 1}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Canvas Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 w-full lg:w-auto relative flex-shrink-0">
          <svg width={canvasWidth} height={canvasHeight} className="block max-w-full bg-white rounded-lg border border-gray-200">
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Ground */}
            <line x1={50} y1={bottomY} x2={550} y2={bottomY} stroke="#9ca3af" strokeWidth="4" />
            
            {/* Inclined Plane */}
            <line x1={bottomX} y1={bottomY} x2={endX} y2={endY} stroke="#6b7280" strokeWidth="6" strokeLinecap="round" />
            
            {/* Angle Arc */}
            <path 
              d={`M ${bottomX + 40} ${bottomY} A 40 40 0 0 0 ${bottomX + 40 * Math.cos(theta)} ${bottomY - 40 * Math.sin(theta)}`}
              fill="none" stroke="#6b7280" strokeWidth="2" 
            />
            <text x={bottomX + 50} y={bottomY - 10} fill="#4b5563" fontSize="14" fontWeight="bold">{angle}°</text>

            {/* Frictionless Badge */}
            {friction === 0 && (
               <g transform={`translate(${bottomX + 60}, ${bottomY - 80}) rotate(${-angle})`}>
                 <rect x={0} y={0} width={80} height={20} fill="#fef3c7" stroke="#fbbf24" rx="4" />
                 <text x={40} y={14} fill="#d97706" fontSize="11" fontWeight="bold" textAnchor="middle">Sürtünmesiz</text>
               </g>
            )}

            {/* Block and Vectors Group */}
            <g transform={`translate(${blockCenterX}, ${blockCenterY})`}>
               {/* Rotate context by -angle to draw block and parallel arrows naturally */}
               <g transform={`rotate(${-angle})`}>
                 <rect x={-blockW/2} y={-blockH/2} width={blockW} height={blockH} fill="#2563eb" rx="4" />
                 <text x={0} y={5} fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">{mass} kg</text>
                 
                 {/* Effort Arrow (Up the plane) */}
                 <line x1={0} y1={0} x2={Math.min(effort * arrowScale, 150)} y2={0} stroke="#16a34a" strokeWidth="3" markerEnd="url(#arrow-green)" />
                 <text x={Math.min(effort * arrowScale, 150) + 10} y={5} fill="#16a34a" fontSize="12" fontWeight="bold">F</text>
                 
                 {/* Friction Arrow (Down the plane) */}
                 {friction > 0 && (
                   <g>
                     <line x1={0} y1={blockH/2 + 5} x2={-Math.min(frictionForce * arrowScale, 150)} y2={blockH/2 + 5} stroke="#2563eb" strokeWidth="3" markerEnd="url(#arrow-blue)" strokeDasharray="4,2" />
                     <text x={-Math.min(frictionForce * arrowScale, 150) - 10} y={blockH/2 + 9} fill="#2563eb" fontSize="12" fontWeight="bold" textAnchor="end">Fs</text>
                   </g>
                 )}
                 
                 {/* Normal force (perpendicular up) */}
                 <line x1={0} y1={0} x2={0} y2={-Math.min(normal * arrowScale, 150)} stroke="#ea580c" strokeWidth="3" markerEnd="url(#arrow-orange)" />
                 <text x={0} y={-Math.min(normal * arrowScale, 150) - 10} fill="#ea580c" fontSize="12" fontWeight="bold" textAnchor="middle">N</text>
               </g>

               {/* Weight (Straight down, independent of angle) */}
               <line x1={0} y1={0} x2={0} y2={Math.min(weight * arrowScale, 150)} stroke="#dc2626" strokeWidth="3" markerEnd="url(#arrow-red)" />
               <text x={10} y={Math.min(weight * arrowScale, 150) + 15} fill="#dc2626" fontSize="12" fontWeight="bold">G</text>
            </g>

            <defs>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
              </marker>
              <marker id="arrow-orange" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
              </marker>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
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
                  Kütle (mg = G): <span className="text-blue-600 font-bold">{mass} kg</span>
                </label>
                <input 
                  type="range" min="1" max="50" step="1" 
                  value={mass} onChange={e => setMass(Number(e.target.value))} 
                  className="w-full accent-blue-600" disabled={isRunning}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eğim Açısı (θ): <span className="text-gray-900 font-bold">{angle}°</span>
                </label>
                <input 
                  type="range" min="5" max="85" step="1" 
                  value={angle} onChange={e => setAngle(Number(e.target.value))} 
                  className="w-full accent-gray-600" disabled={isRunning}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sürtünme Katsayısı (μ): <span className="text-orange-600 font-bold">{friction.toFixed(2)}</span>
                </label>
                <input 
                  type="range" min="0" max="0.6" step="0.05" 
                  value={friction} onChange={e => setFriction(Number(e.target.value))} 
                  className="w-full accent-orange-600" disabled={isRunning}
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-4">
                <button 
                  onClick={handleStart}
                  className={`flex-1 font-semibold py-2 rounded-lg shadow transition text-white ${isRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {isRunning ? "Hareket Ediyor..." : progress >= 1 ? "Tekrar Başlat" : "Hareketi Başlat"}
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
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Ağırlık (G)</span>
                <span className="font-bold text-red-600 font-mono text-lg">{weight.toFixed(1)} N</span>
              </div>
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Normal Kuv. (N)</span>
                <span className="font-bold text-orange-600 font-mono text-lg">{normal.toFixed(1)} N</span>
              </div>
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Paralel Bileşen (G_x)</span>
                <span className="font-bold text-gray-700 font-mono text-lg">{parallel.toFixed(1)} N</span>
              </div>
              <div className="bg-gray-50 py-2 px-3 rounded border border-gray-200">
                <span className="text-gray-500 block mb-1">Sürtünme (F_s)</span>
                <span className="font-bold text-blue-600 font-mono text-lg">{frictionForce.toFixed(1)} N</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-800 font-semibold">Gereken Kuvvet (F_k):</span>
                <span className="font-bold text-green-700 text-xl font-mono">{effort.toFixed(1)} N</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-1 mt-3">
                 <span className="text-green-800">Kuvvet Kazancı (KK):</span>
                 <span className="font-bold text-green-900">{mechanicalAdvantage.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                 <span className="text-green-800">Verim (η):</span>
                 <span className="font-bold text-green-900">{efficiency.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}