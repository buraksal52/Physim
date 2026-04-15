"use client";

import { useState, useRef, useEffect } from "react";
import CompletionCheck from "./CompletionCheck";
import { calculateResultantForce, calculateInclinedPlane } from "@/lib/physics/force";
import { Simulasyon } from "@/lib/types";

interface ForceNode {
  id: string;
  fx: number;
  fy: number;
  magnitude: number;
  angle: number;
  color: string;
}

export default function ForceCanvas({
  slug,
  simulation,
  onComplete,
}: {
  slug: string;
  simulation: Simulasyon;
  onComplete?: () => void;
}) {
  const [mode, setMode] = useState<"bileske" | "egimli">("bileske");

  // Mode 1: Bileşke
  const [forces, setForces] = useState<ForceNode[]>([]);
  const [inputMag, setInputMag] = useState<number>(10);
  const [inputAngle, setInputAngle] = useState<number>(0);
  const [massBileske, setMassBileske] = useState<number>(10);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [calcAcc, setCalcAcc] = useState({ ax: 0, ay: 0 });

  // Mode 2: Eğimli Düzlem
  const [mass, setMass] = useState<number>(10);
  const [slopeAngle, setSlopeAngle] = useState<number>(30);

  const resultant = calculateResultantForce(forces);

  const addForce = () => {
    const angleRad = (inputAngle * Math.PI) / 180;
    const fx = inputMag * Math.cos(angleRad);
    const fy = inputMag * Math.sin(angleRad);
    setForces((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        fx,
        fy,
        magnitude: inputMag,
        angle: inputAngle,
        color: "#2563eb",
      },
    ]);
  };

  const undoForce = () => {
    setForces((prev) => prev.slice(0, -1));
  };

  const resetMotion = () => {
    setIsRunning(false);
    posRef.current = { x: 0, y: 0 };
    velRef.current = { vx: 0, vy: 0 };
    setCalcAcc({ ax: 0, ay: 0 });
  };

  const clearForces = () => {
    setForces([]);
    resetMotion();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const dtScale = 2; // speed up time a bit for visual clarity

    const render = (time: number) => {
      const dt = ((time - lastTime) / 1000) * dtScale;
      lastTime = time;

      let ax = 0;
      let ay = 0;

      if (isRunning && mode === "bileske") {
        ax = resultant.fx / massBileske;
        const G = massBileske * 9.8;
        const netY = resultant.fy - G;
        ay = netY > 0 ? netY / massBileske : (posRef.current.y > 0.01 ? netY / massBileske : 0);

        if (posRef.current.y <= 0 && netY <= 0) {
            velRef.current.vy = 0;
            posRef.current.y = 0;
        } else {
            velRef.current.vy += ay * dt;
        }
        
        velRef.current.vx += ax * dt;
        posRef.current.x += velRef.current.vx * dt;
        posRef.current.y += velRef.current.vy * dt;

        if (posRef.current.y < 0) {
            posRef.current.y = 0;
            velRef.current.vy = 0;
        }
        
        setCalcAcc(prev => {
           if (Math.abs(prev.ax - ax) > 0.01 || Math.abs(prev.ay - ay) > 0.01) {
               return { ax, ay };
           }
           return prev;
        });
      } else if (!isRunning && mode === "bileske") {
         const ax_calc = resultant.fx / massBileske;
         const G = massBileske * 9.8;
         const netY = resultant.fy - G;
         const ay_calc = netY > 0 ? netY / massBileske : 0;
         setCalcAcc(prev => {
            if (Math.abs(prev.ax - ax_calc) > 0.01 || Math.abs(prev.ay - ay_calc) > 0.01) {
                return { ax: ax_calc, ay: ay_calc };
            }
            return prev;
         });
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let camX = 0;
      let camY = 0;
      if (mode === "bileske") {
        camX = posRef.current.x * 20;
        camY = posRef.current.y * 20;
      }

      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      
      const gridOffsetX = -camX % 50;
      const gridOffsetY = camY % 50;
      
      for (let x = gridOffsetX > 0 ? gridOffsetX - 50 : gridOffsetX; x <= canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = gridOffsetY > 0 ? gridOffsetY - 50 : gridOffsetY; y <= canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (mode === "bileske") {
        const cx = canvas.width / 2; // Keep box horizontally centered
        const groundY = canvas.height - 50 + camY; // Ground descends as box ascends
        const cy = canvas.height - 50; // Keep box vertically fixed relative to the screen at its start pos

        // Draw ground
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();

        // Draw box
        ctx.fillStyle = "#374151";
        ctx.fillRect(cx - 30, cy - 60, 60, 60);

        const labelBoxes: { x: number, y: number, w: number, h: number }[] = [];

        const drawArrow = (
          sx: number,
          sy: number,
          ex: number,
          ey: number,
          color: string,
          dashed = false,
          label = ""
        ) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.setLineDash(dashed ? [6, 6] : []);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.setLineDash([]);

          const angle = Math.atan2(ey - sy, ex - sx);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - 15 * Math.cos(angle - Math.PI / 6), ey - 15 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(ex - 15 * Math.cos(angle + Math.PI / 6), ey - 15 * Math.sin(angle + Math.PI / 6));
          ctx.fill();

          if (label) {
            ctx.font = "13px sans-serif";
            const textWidth = ctx.measureText(label).width;
            const textHeight = 15;

            // Place label near the middle of the arrow, offset by the normal
            const mx = sx + (ex - sx) / 2;
            const my = sy + (ey - sy) / 2;
            const normal = angle - Math.PI / 2;
            
            // push it a bit further so it's right above the arrow line
            const pushOut = 15;

            let bx = mx + Math.cos(normal) * pushOut - textWidth / 2;
            let by = my + Math.sin(normal) * pushOut - textHeight / 2;

            // Simple collision check to slide overlapping labels
            let intersecting = true;
            let attempts = 0;
            while (intersecting && attempts < 20) {
              intersecting = false;
              for (const b of labelBoxes) {
                if (
                  bx < b.x + b.w + 4 &&
                  bx + textWidth + 4 > b.x &&
                  by < b.y + b.h + 4 &&
                  by + textHeight + 4 > b.y
                ) {
                  intersecting = true;
                  // Nudge upward or downward depending on orientation to avoid each other
                  by += (Math.sin(normal) >= 0 ? 20 : -20);
                  break;
                }
              }
              attempts++;
            }

            labelBoxes.push({ x: bx, y: by, w: textWidth, h: textHeight });

            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(bx - 3, by - 3, textWidth + 6, textHeight + 6);

            ctx.fillStyle = "#18181b";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(label, bx, by);
          }
        };

        const scale = 12;
        forces.forEach((f) => {
          const ex = cx + f.fx * scale;
          const ey = cy - 30 - f.fy * scale;
          drawArrow(cx, cy - 30, ex, ey, "#2563eb", false, `${f.magnitude.toFixed(1)}N, ${f.angle}°`);
        });

        if (resultant.magnitude > 0.1) {
          const rx = cx + resultant.fx * scale;
          const ry = cy - 30 - resultant.fy * scale;
          drawArrow(cx, cy - 30, rx, ry, "#dc2626", true, `Net: ${resultant.magnitude.toFixed(1)}N`);
        }
      } else {
        ctx.save();
        const cx = canvas.width / 2;
        const cy = canvas.height - 50;

        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(50, cy);
        ctx.lineTo(canvas.width - 50, cy);
        ctx.stroke();

        const theta = (slopeAngle * Math.PI) / 180;
        const bw = 70;
        const bh = 70;

        ctx.translate(cx, cy);
        ctx.rotate(-theta);
        ctx.fillStyle = "#4b5563";
        ctx.fillRect(-bw / 2, -bh, bw, bh);

        const drawArrow = (
          sx: number,
          sy: number,
          ex: number,
          ey: number,
          color: string,
          label: string,
          lOffset: number = 0
        ) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          const a = Math.atan2(ey - sy, ex - sx);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - 12 * Math.cos(a - Math.PI / 6), ey - 12 * Math.sin(a - Math.PI / 6));
          ctx.lineTo(ex - 12 * Math.cos(a + Math.PI / 6), ey - 12 * Math.sin(a + Math.PI / 6));
          ctx.fill();

          ctx.font = "14px sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          const tw = ctx.measureText(label).width;
          const th = 16;
          
          // Place label near the middle of the arrow, offset by the normal slightly
          const mx = sx + (ex - sx) / 2;
          const my = sy + (ey - sy) / 2;
          const normal = a - Math.PI / 2;
          
          let pushOut = 15;
          let bx = mx + Math.cos(normal) * pushOut - tw / 2;
          let by = my + Math.sin(normal) * pushOut - th / 2;
          
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillRect(bx - 3, by - 3, tw + 6, th + 6);
          
          ctx.fillStyle = "#18181b";
          ctx.fillText(label, bx, by);
        };

        const { parallel, normal } = calculateInclinedPlane(mass, slopeAngle);
        const G = mass * 9.8;
        const scale = 8;

        ctx.restore();
        ctx.save();
        ctx.translate(cx, cy - bh / 2 * Math.cos(theta));

        // Weight (Gray)
        drawArrow(0, 0, 0, G * scale, "#2563eb", `G=${G.toFixed(1)}N`, 5);

        // Normal component (Green)
        ctx.rotate(-theta);
        drawArrow(0, 0, 0, -normal * scale, "#2563eb", `N=${normal.toFixed(1)}N`);

        // Parallel component (Blue)
        drawArrow(0, 0, -parallel * scale, 0, "#2563eb", `F∥=${parallel.toFixed(1)}N`, -15);
        
        ctx.restore();
      }

      if (isRunning) {
        animId = requestAnimationFrame(render);
      }
    };

    if (isRunning) {
      animId = requestAnimationFrame(render);
    } else {
      render(performance.now());
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [forces, mode, resultant, mass, slopeAngle, isRunning, massBileske]);

  const { parallel, normal } = calculateInclinedPlane(mass, slopeAngle);
  const G = mass * 9.8;

  const currentVariables = {
    bileskekuvvet: resultant.magnitude,
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 space-y-4">
        <div className="flex bg-white rounded-lg shadow p-1 w-max">
          <button
            onClick={() => setMode("bileske")}
            className={`px-4 py-2 rounded-md ${
              mode === "bileske" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Bileşke Kuvvet
          </button>
          <button
            onClick={() => setMode("egimli")}
            className={`px-4 py-2 rounded-md ${
              mode === "egimli" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Eğimli Düzlem
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <canvas
            ref={canvasRef}
            width={500}
            height={mode === "bileske" ? 400 : 350}
            className="w-full rounded-lg border border-gray-200"
          />
        </div>

        {mode === "bileske" && simulation.zorunlu_deney && (
          <CompletionCheck
            slug={slug}
            zorunluDeney={simulation.zorunlu_deney}
            observedValue={currentVariables.bileskekuvvet}
            isFinished={true}
          />
        )}
      </div>

      <div className="w-full md:w-80 space-y-6">
        {mode === "bileske" ? (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">Kuvvet Ekle</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Kütle (kg)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={massBileske}
                    onChange={(e) => setMassBileske(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Büyüklük (N)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={inputMag}
                    onChange={(e) => setInputMag(Number(e.target.value))}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Açı (°)</label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={inputAngle}
                    onChange={(e) => setInputAngle(Number(e.target.value))}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={addForce}
                  disabled={isRunning}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Kuvvet Ekle
                </button>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                     if (isRunning) resetMotion();
                     else setIsRunning(true);
                  }}
                  className={`flex-1 px-4 py-2 border rounded-md text-sm font-medium ${
                    isRunning 
                      ? "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100" 
                      : "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
                  }`}
                >
                  {isRunning ? "Durdur" : "Başlat"}
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={undoForce}
                  disabled={forces.length === 0 || isRunning}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Geri Al
                </button>
                <button
                  onClick={clearForces}
                  disabled={forces.length === 0}
                  className="flex-1 px-4 py-2 border border-rose-300 rounded-md text-sm font-medium text-rose-700 bg-white hover:bg-rose-50 disabled:opacity-50"
                >
                  Temizle
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2">Gözlem Tablosu</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left text-xs text-gray-500 uppercase">Açı</th>
                      <th className="px-2 py-2 text-left text-xs text-gray-500 uppercase">Mag(N)</th>
                      <th className="px-2 py-2 text-left text-xs text-gray-500 uppercase">Fx</th>
                      <th className="px-2 py-2 text-left text-xs text-gray-500 uppercase">Fy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {forces.map((f, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-2">{f.angle}°</td>
                        <td className="px-2 py-2">{f.magnitude}</td>
                        <td className="px-2 py-2">{f.fx.toFixed(1)}</td>
                        <td className="px-2 py-2">{f.fy.toFixed(1)}</td>
                      </tr>
                    ))}
                    <tr className="bg-red-50 font-semibold text-red-700">
                      <td className="px-2 py-2">Net: {resultant.angle.toFixed(1)}°</td>
                      <td className="px-2 py-2">{resultant.magnitude.toFixed(1)}</td>
                      <td className="px-2 py-2">{resultant.fx.toFixed(1)}</td>
                      <td className="px-2 py-2">{resultant.fy.toFixed(1)}</td>
                    </tr>
                    <tr className="bg-blue-50 font-semibold text-blue-700">
                      <td className="px-2 py-2" colSpan={2}>İvme (a)</td>
                      <td className="px-2 py-2">{calcAcc.ax.toFixed(2)} m/s²</td>
                      <td className="px-2 py-2">{calcAcc.ay.toFixed(2)} m/s²</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-800 mb-2">Kontrol Paneli</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Kütle (kg): {mass}</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={mass}
                  onChange={(e) => setMass(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Açı (°): {slopeAngle}</label>
                <input
                  type="range"
                  min="5"
                  max="85"
                  value={slopeAngle}
                  onChange={(e) => setSlopeAngle(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2">Gözlem Tablosu</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Ağırlık (G)</span>
                  <span className="font-medium">{G.toFixed(1)} N</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Paralel Bileşen (F∥)</span>
                  <span className="font-medium text-blue-600">{parallel.toFixed(1)} N</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Normal Kuvvet (N)</span>
                  <span className="font-medium text-green-600">{normal.toFixed(1)} N</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
