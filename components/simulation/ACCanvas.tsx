"use client";

import React, { useState, useEffect, useRef } from "react";
import CompletionCheck from "./CompletionCheck";
import {
  calculateRMS,
  calculateAngularFrequency,
  calculatePeriod,
} from "@/lib/physics/alternatingCurrent";

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

export default function ACCanvas({
  simulation,
  onComplete,
}: {
  slug: string;
  simulation: any;
  onComplete: () => void;
}) {
  const [V0, setV0] = useState(311);
  const [f, setF] = useState(50);
  const [phiDeg, setPhiDeg] = useState(0);
  const [showCurrent, setShowCurrent] = useState(false);
  const [I0, setI0] = useState(10);
  const [IphiDeg, setIphiDeg] = useState(0);

  const [t, setT] = useState(0);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const { rms: Vrms } = calculateRMS(V0);
  const { omega } = calculateAngularFrequency(f);
  const { T } = calculatePeriod(f);

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      setT((prev) => (prev + deltaTime) % (3 / f)); // Showing 3 cycles
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [f]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Layout Constants
    const midX = 400; // Boundary between graph and phasor
    const midY = 210;
    const graphWidth = 400;
    const phasorWidth = 200;
    const h = canvas.height;

    // Grid (Graph area)
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let x = 0; x <= midX; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(midX, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(midX, midY); ctx.stroke(); // X-axis
    ctx.beginPath(); ctx.moveTo(midX, 0); ctx.lineTo(midX, h); ctx.stroke(); // Divider

    // 1. WAVEFORM PANEL
    const scaleY = (midY - 40) / 500; // 500V max
    const drawWave = (amplitude: number, freq: number, phase: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const phaseRad = (phase * Math.PI) / 180;
      const duration = 3 / freq;
      for (let x = 0; x <= graphWidth; x++) {
        const timeAtX = (x / graphWidth) * duration;
        const val = amplitude * Math.sin(2 * Math.PI * freq * timeAtX + phaseRad);
        const drawY = midY - val * scaleY;
        if (x === 0) ctx.moveTo(x, drawY);
        else ctx.lineTo(x, drawY);
      }
      ctx.stroke();
    };

    // Voltage Wave
    drawWave(V0, f, phiDeg, "#2563eb");
    
    // RMS Lines
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#16a34a";
    ctx.beginPath(); ctx.moveTo(0, midY - Vrms * scaleY); ctx.lineTo(midX, midY - Vrms * scaleY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, midY + Vrms * scaleY); ctx.lineTo(midX, midY + Vrms * scaleY); ctx.stroke();
    
    // Peak Lines
    ctx.strokeStyle = "#71717a";
    ctx.beginPath(); ctx.moveTo(0, midY - V0 * scaleY); ctx.lineTo(midX, midY - V0 * scaleY); ctx.stroke();
    ctx.setLineDash([]);

    // RMS Shading
    ctx.fillStyle = "rgba(22, 163, 74, 0.05)";
    ctx.fillRect(0, midY - Vrms * scaleY, midX, 2 * Vrms * scaleY);

    if (showCurrent) {
        drawWave(I0 * 20, f, IphiDeg, "#ea580c"); // scale current for visibility
    }

    // Cursor
    const cursorX = (t / (3 / f)) * graphWidth;
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cursorX, 0); ctx.lineTo(cursorX, h); ctx.stroke();

    const currentV = V0 * Math.sin(omega * t + (phiDeg * Math.PI) / 180);
    ctx.fillStyle = "#2563eb";
    ctx.beginPath(); ctx.arc(cursorX, midY - currentV * scaleY, 4, 0, Math.PI * 2); ctx.fill();

    // Floating Label
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(cursorX + 5, midY - currentV * scaleY - 25, 60, 20);
    ctx.fillStyle = "#18181b";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${currentV.toFixed(1)}V`, cursorX + 8, midY - currentV * scaleY - 12);

    // 2. PHASOR PANEL
    const phasorCenterX = midX + phasorWidth / 2;
    const phasorCenterY = midY;
    const phasorScale = (phasorWidth / 2 - 20) / 500;

    // Unit circle
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath(); ctx.arc(phasorCenterX, phasorCenterY, V0 * phasorScale, 0, Math.PI * 2); ctx.stroke();

    const drawPhasor = (amplitude: number, phase: number, color: string, label: string) => {
        const angle = omega * t + (phase * Math.PI) / 180;
        const px = phasorCenterX + amplitude * Math.cos(angle) * phasorScale;
        const py = phasorCenterY - amplitude * Math.sin(angle) * phasorScale; // Canvas Y is inverted

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(phasorCenterX, phasorCenterY);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Arrowhead
        const headlen = 10;
        const headAngle = Math.atan2(py - phasorCenterY, px - phasorCenterX);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - headlen * Math.cos(headAngle - Math.PI / 6), py - headlen * Math.sin(headAngle - Math.PI / 6));
        ctx.moveTo(px, py);
        ctx.lineTo(px - headlen * Math.cos(headAngle + Math.PI / 6), py - headlen * Math.sin(headAngle + Math.PI / 6));
        ctx.stroke();

        // Projection
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(phasorCenterX, py); ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = color;
        ctx.fillText(label, px + 5, py - 5);
    };

    drawPhasor(V0, phiDeg, "#2563eb", "V");
    if (showCurrent) {
        drawPhasor(I0 * 20, IphiDeg, "#ea580c", "I");
        // Angle Arc
        const startA = -(omega * t + (phiDeg * Math.PI) / 180);
        const endA = -(omega * t + (IphiDeg * Math.PI) / 180);
        ctx.strokeStyle = "#9333ea";
        ctx.beginPath(); ctx.arc(phasorCenterX, phasorCenterY, 30, startA, endA, phiDeg < IphiDeg); ctx.stroke();
    }

  }, [V0, f, phiDeg, showCurrent, I0, IphiDeg, t, Vrms, omega]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative border-4 border-zinc-900 rounded-2xl overflow-hidden bg-white shadow-2xl">
            <canvas
              ref={canvasRef}
              width={600}
              height={420}
              className="w-full h-auto"
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-center">
            <div className="p-2 bg-zinc-50 rounded border border-zinc-100"><div className="text-[10px] text-zinc-500 uppercase font-bold">V₀</div><div className="text-sm font-mono">{V0} V</div></div>
            <div className="p-2 bg-green-50 rounded border border-green-100"><div className="text-[10px] text-green-600 uppercase font-bold">Vrms</div><div className="text-sm font-mono">{Vrms.toFixed(1)} V</div></div>
            <div className="p-2 bg-zinc-50 rounded border border-zinc-100"><div className="text-[10px] text-zinc-500 uppercase font-bold">Frekans</div><div className="text-sm font-mono">{f} Hz</div></div>
            <div className="p-2 bg-zinc-50 rounded border border-zinc-100"><div className="text-[10px] text-zinc-500 uppercase font-bold">Periyot</div><div className="text-sm font-mono">{(T * 1000).toFixed(1)} ms</div></div>
            <div className="p-2 bg-zinc-50 rounded border border-zinc-100"><div className="text-[10px] text-zinc-500 uppercase font-bold">Açısal Hız</div><div className="text-sm font-mono">{omega.toFixed(0)} rad/s</div></div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <CPnl title="AC Parametreleri">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">Genlik V₀: {V0} V</label>
              <input type="range" min="10" max="500" step="1" value={V0} onChange={(e) => setV0(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">Frekans f: {f} Hz</label>
              <input type="range" min="1" max="200" step="1" value={f} onChange={(e) => setF(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">Faz Açısı φ: {phiDeg}°</label>
              <input type="range" min="-180" max="180" step="1" value={phiDeg} onChange={(e) => setPhiDeg(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                <input type="checkbox" checked={showCurrent} onChange={(e) => setShowCurrent(e.target.checked)} id="showI" />
                <label htmlFor="showI" className="text-xs font-bold text-zinc-700">Akımı Göster</label>
            </div>
            {showCurrent && (
                <>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-zinc-600">Akım Genliği I₀: {I0} A</label>
                        <input type="range" min="0.1" max="20" step="0.1" value={I0} onChange={(e) => setI0(Number(e.target.value))} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-zinc-600">Akım Faz Farkı: {IphiDeg}°</label>
                        <input type="range" min="-180" max="180" step="1" value={IphiDeg} onChange={(e) => setIphiDeg(Number(e.target.value))} />
                    </div>
                </>
            )}
          </CPnl>

          <CompletionCheck
            slug="alternatif-akim"
            currentValue={Vrms}
            targetRange={simulation.zorunlu_deney.hedef_aralik}
            onComplete={onComplete}
          />
        </div>
      </div>
    </div>
  );
}
