"use client";

import React, { useState, useEffect, useRef } from "react";
import CompletionCheck from "./CompletionCheck";
import {
  calculateMotionalEMF,
  calculateFaradayEMF,
} from "@/lib/physics/induction";

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

export default function InductionCanvas({
  simulation,
  onComplete,
}: {
  slug: string;
  simulation: any;
  onComplete: () => void;
}) {
  const [mode, setMode] = useState<"motional" | "lenz">("motional");

  // Mode 1: Hareket Eden İletken
  const [B_val, setB_val] = useState(0.5);
  const [L_val, setL_val] = useState(2);
  const [v_val, setV_val] = useState(3);
  const [v_dir, setV_dir] = useState<1 | -1>(1); // 1: Sağa, -1: Sola
  const [B_dir, setB_dir] = useState<"out" | "in">("in");
  const [isRunning, setIsRunning] = useState(false);
  const [posX, setPosX] = useState(100);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const motionalEMF = calculateMotionalEMF(B_val, L_val, v_val * v_dir).emf;
  // Direction of induced EMF (and current)
  // v (right), B (in) -> E (up) - positive
  // v (left), B (in) -> E (down) - negative
  // v (right), B (out) -> E (down) - negative
  // v (left), B (out) -> E (up) - positive
  const emfDir = v_dir * (B_dir === "in" ? 1 : -1);

  // Mode 2: Lenz Yasası
  const [magnetV, setMagnetV] = useState(2);
  const [N_val, setN_val] = useState(100);
  const [magnetStrength, setMagnetStrength] = useState(5);
  const [lenzMode, setLenzMode] = useState<"approaching" | "retreating" | "auto">("auto");
  const [magnetX, setMagnetX] = useState(450);
  const [magnetDir, setMagnetDir] = useState<-1 | 1>(-1); // -1: moving left (approaching), 1: moving right (retreating)

  // Simulation values for Lenz
  const solenoidX = 200;
  const magnetDistance = magnetX - solenoidX;
  const flux = (magnetStrength * N_val) / (magnetDistance * 0.1); 
  const dPhiDt = - (magnetStrength * N_val * magnetV * magnetDir) / Math.pow(magnetDistance * 0.1, 2);
  const lenzEMF = -dPhiDt;

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      
      if (mode === "motional" && isRunning) {
        setPosX((prev) => {
          let next = prev + v_val * v_dir * SCALE * deltaTime;
          if (next > 550) { next = 550; setIsRunning(false); }
          if (next < 50) { next = 50; setIsRunning(false); }
          return next;
        });
      }

      if (mode === "lenz") {
        setMagnetX((prev) => {
          let nextDir = magnetDir;
          if (lenzMode === "approaching") nextDir = -1;
          else if (lenzMode === "retreating") nextDir = 1;
          else {
             if (prev < 250) setMagnetDir(1);
             if (prev > 500) setMagnetDir(-1);
             nextDir = magnetDir;
          }
          
          let nextX = prev + nextDir * magnetV * SCALE * 0.5 * deltaTime;
          if (lenzMode === "approaching" && nextX < 250) nextX = 250;
          if (lenzMode === "retreating" && nextX > 500) nextX = 500;
          return nextX;
        });
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isRunning, v_val, v_dir, mode, magnetV, magnetDir, lenzMode]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    if (mode === "motional") {
      const railTop = 150;
      const railBottom = 150 + L_val * 50;
      
      // B-Field
      ctx.fillStyle = "#2563eb";
      ctx.font = "14px monospace";
      for (let x = 15; x < canvas.width; x += 30) {
        for (let y = 15; y < canvas.height; y += 30) {
          ctx.fillText(B_dir === "in" ? "×" : "⊙", x, y);
        }
      }

      // Rails
      ctx.strokeStyle = "#71717a";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(50, railTop); ctx.lineTo(550, railTop); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50, railBottom); ctx.lineTo(550, railBottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50, railTop); ctx.lineTo(50, railBottom); ctx.stroke();

      // Loop Shading
      ctx.fillStyle = "rgba(37, 99, 235, 0.1)";
      ctx.fillRect(50, railTop, posX - 50, railBottom - railTop);

      // Conductor Bar
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(posX, railTop - 10); ctx.lineTo(posX, railBottom + 10); ctx.stroke();

      // EMF Value
      ctx.fillStyle = "#18181b";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(`EMK: ${Math.abs(motionalEMF).toFixed(2)} V`, posX - 40, railTop - 30);

      // Bulb
      const bulbGlow = Math.abs(motionalEMF) / 10;
      ctx.fillStyle = bulbGlow > 0 ? `rgba(234, 179, 8, ${Math.min(bulbGlow, 0.8)})` : "#d1d5db";
      ctx.beginPath(); ctx.arc(30, (railTop + railBottom) / 2, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#52525b";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Current Direction (Green Arrow)
      if (isRunning && Math.abs(motionalEMF) > 0) {
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 3;
        // Draw circular arrow in loop
        const midY = (railTop + railBottom) / 2;
        const radius = 20;
        ctx.beginPath();
        ctx.arc(100, midY, radius, 0, Math.PI * 2);
        ctx.stroke();
        // Arrowhead
        const arrowAngle = emfDir > 0 ? 0 : Math.PI;
        ctx.save();
        ctx.translate(100 + radius * Math.cos(arrowAngle), midY + radius * Math.sin(arrowAngle));
        ctx.rotate(arrowAngle + (emfDir > 0 ? Math.PI / 2 : -Math.PI / 2));
        ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(0, 0); ctx.lineTo(5, -5); ctx.stroke();
        ctx.restore();
      }
    } else {
      // Mode 2: Lenz
      // Solenoid
      ctx.strokeStyle = "#52525b";
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.ellipse(solenoidX, 240, 40, 80, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(solenoidX - 30, 160, 60, 160);
      ctx.strokeRect(solenoidX - 30, 160, 60, 160);

      // Magnet
      ctx.fillStyle = "#dc2626"; // North
      ctx.fillRect(magnetX, 220, 60, 40);
      ctx.fillStyle = "#2563eb"; // South
      ctx.fillRect(magnetX + 60, 220, 60, 40);
      ctx.fillStyle = "white";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("N", magnetX + 20, 245);
      ctx.fillText("S", magnetX + 80, 245);

      // Galvanometer
      ctx.beginPath();
      ctx.arc(300, 100, 60, Math.PI, 0);
      ctx.strokeStyle = "#71717a";
      ctx.stroke();
      const deflection = (lenzEMF / 50) * (Math.PI / 4);
      ctx.save();
      ctx.translate(300, 100);
      ctx.rotate(-Math.PI / 2 + deflection);
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.stroke();
      ctx.restore();

      // Text Status
      ctx.fillStyle = "#18181b";
      ctx.font = "14px sans-serif";
      const status = magnetDir < 0 ? "Akı artıyor → İndüklenen akım karşı koyuyor" : "Akı azalıyor → İndüklenen akım destekliyor";
      ctx.fillText(status, 150, 400);

      // Lenz Force Arrow (Red)
      if (Math.abs(lenzEMF) > 0.1) {
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 4;
        const forceDir = magnetDir < 0 ? 1 : -1; // Oppose motion
        const arrowStart = magnetX - 20;
        ctx.beginPath();
        ctx.moveTo(arrowStart, 240);
        ctx.lineTo(arrowStart + forceDir * 50, 240);
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(arrowStart + forceDir * 50, 240);
        ctx.lineTo(arrowStart + forceDir * 40, 235);
        ctx.moveTo(arrowStart + forceDir * 50, 240);
        ctx.lineTo(arrowStart + forceDir * 40, 245);
        ctx.stroke();
        ctx.fillText("Lenz Kuvveti", arrowStart - 40, 210);
      }
    }

  }, [mode, posX, B_val, L_val, v_val, v_dir, B_dir, motionalEMF, magnetX, N_val, magnetStrength, lenzEMF, magnetDir]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex justify-center gap-4 p-1 bg-zinc-100 rounded-lg self-center">
        <button
          onClick={() => setMode("motional")}
          className={`px-4 py-2 rounded-md transition-all ${mode === "motional" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          Hareket Eden İletken
        </button>
        <button
          onClick={() => setMode("lenz")}
          className={`px-4 py-2 rounded-md transition-all ${mode === "lenz" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          Lenz Yasası
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative border-4 border-zinc-900 rounded-2xl overflow-hidden bg-white shadow-2xl">
            <canvas
              ref={canvasRef}
              width={600}
              height={mode === "motional" ? 420 : 480}
              className="w-full h-auto cursor-crosshair"
            />
          </div>
          <CObsPnl title="Gözlem Paneli">
            {mode === "motional" ? (
              <>
                <div className="text-zinc-500">B (Manyetik Alan):</div>
                <div className="font-mono text-blue-600 font-bold">{B_val.toFixed(2)} T</div>
                <div className="text-zinc-500">L (Tel Uzunluğu):</div>
                <div className="font-mono text-orange-600 font-bold">{L_val.toFixed(2)} m</div>
                <div className="text-zinc-500">v (Hız):</div>
                <div className="font-mono text-zinc-900 font-bold">{v_val.toFixed(1)} m/s</div>
                <div className="text-zinc-500">EMK (İndüklenen):</div>
                <div className="font-mono text-green-600 font-bold">{motionalEMF.toFixed(2)} V</div>
              </>
            ) : (
              <>
                <div className="text-zinc-500">N (Sarım Sayısı):</div>
                <div className="font-mono text-blue-600 font-bold">{N_val}</div>
                <div className="text-zinc-500">Manyetik Akı:</div>
                <div className="font-mono text-zinc-900 font-bold">{flux.toFixed(4)} Wb</div>
                <div className="text-zinc-500">EMK (V):</div>
                <div className="font-mono text-green-600 font-bold">{lenzEMF.toFixed(2)} V</div>
                <div className="text-zinc-500">Hareket:</div>
                <div className="font-mono font-bold">{magnetDir < 0 ? "Yaklaşıyor" : "Uzaklaşıyor"}</div>
              </>
            )}
          </CObsPnl>
        </div>

        <div className="flex flex-col gap-4">
          <CPnl title="Simülasyon Kontrolleri">
            {mode === "motional" ? (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-600">Alan Şiddeti B: {B_val} T</label>
                  <input type="range" min="0.1" max="2" step="0.1" value={B_val} onChange={(e) => setB_val(Number(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-600">Tel Uzunluğu L: {L_val} m</label>
                  <input type="range" min="0.5" max="3" step="0.1" value={L_val} onChange={(e) => setL_val(Number(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-600">Hız v: {v_val} m/s</label>
                  <input type="range" min="0.5" max="10" step="0.5" value={v_val} onChange={(e) => setV_val(Number(e.target.value))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setV_dir(1)} className={`text-xs p-2 rounded border ${v_dir === 1 ? "bg-zinc-900 text-white" : "bg-white"}`}>Sağa →</button>
                  <button onClick={() => setV_dir(-1)} className={`text-xs p-2 rounded border ${v_dir === -1 ? "bg-zinc-900 text-white" : "bg-white"}`}>Sola ←</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setB_dir("out")} className={`text-xs p-2 rounded border ${B_dir === "out" ? "bg-zinc-900 text-white" : "bg-white"}`}>Dışarı ⊙</button>
                  <button onClick={() => setB_dir("in")} className={`text-xs p-2 rounded border ${B_dir === "in" ? "bg-zinc-900 text-white" : "bg-white"}`}>İçeri ⊗</button>
                </div>
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`py-3 rounded-lg font-bold text-white transition-colors ${isRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}`}
                >
                  {isRunning ? "Durdur" : "Başlat"}
                </button>
                <button onClick={() => { setPosX(100); setIsRunning(false); }} className="py-2 text-sm text-zinc-500 hover:text-zinc-800">Sıfırla</button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-600">Mıknatıs Hızı: {magnetV} m/s</label>
                  <input type="range" min="0.5" max="5" step="0.5" value={magnetV} onChange={(e) => setMagnetV(Number(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-600">Sarım Sayısı N: {N_val}</label>
                  <input type="range" min="10" max="500" step="10" value={N_val} onChange={(e) => setN_val(Number(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-600">Mıknatıs Gücü: {magnetStrength}</label>
                  <input type="range" min="1" max="10" step="1" value={magnetStrength} onChange={(e) => setMagnetStrength(Number(e.target.value))} />
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setLenzMode("approaching")} className={`text-xs p-2 rounded border ${lenzMode === "approaching" ? "bg-zinc-900 text-white" : "bg-white"}`}>Yaklaşıyor</button>
                  <button onClick={() => setLenzMode("retreating")} className={`text-xs p-2 rounded border ${lenzMode === "retreating" ? "bg-zinc-900 text-white" : "bg-white"}`}>Uzaklaşıyor</button>
                  <button onClick={() => setLenzMode("auto")} className={`text-xs p-2 rounded border ${lenzMode === "auto" ? "bg-zinc-900 text-white" : "bg-white"}`}>Otomatik</button>
                </div>
              </>
            )}
          </CPnl>

          <CompletionCheck
            slug="induksiyon"
            currentValue={Math.abs(mode === "motional" ? motionalEMF : lenzEMF)}
            targetRange={simulation.zorunlu_deney.hedef_aralik}
            onComplete={onComplete}
          />
        </div>
      </div>
    </div>
  );
}
