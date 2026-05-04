"use client";

import React, { useState, useEffect, useRef } from "react";
import CompletionCheck from "./CompletionCheck";
import {
  calculateTransformer,
  getTransformerType,
  calculateTransmissionLoss,
} from "@/lib/physics/transformer";

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

export default function TransformerCanvas({
  simulation,
  onComplete,
}: {
  slug: string;
  simulation: any;
  onComplete: () => void;
}) {
  const [N1, setN1] = useState(500);
  const [N2, setN2] = useState(100);
  const [V1, setV1] = useState(220);
  const [I1, setI1] = useState(2);
  const [efficiency, setEfficiency] = useState(100);
  const [showTransmission, setShowTransmission] = useState(false);

  const [t, setT] = useState(0);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const results = calculateTransformer(V1, N1, N2, I1, efficiency / 100);
  const transformerType = getTransformerType(N1, N2);

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      setT((prev) => (prev + deltaTime) % 1);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

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
    for (let x = 0; x <= canvas.width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 1. MAIN TRANSFORMER DIAGRAM
    const coreX = 200;
    const coreY = 50;
    const coreW = 300;
    const coreH = 240;
    const coreThickness = 50;

    // Iron Core
    ctx.fillStyle = "#a1a1aa";
    ctx.strokeStyle = "#52525b";
    ctx.lineWidth = 3;
    // Outer rect
    ctx.strokeRect(coreX, coreY, coreW, coreH);
    ctx.fillRect(coreX, coreY, coreW, coreH);
    // Inner rect (the "hole")
    ctx.clearRect(coreX + coreThickness, coreY + coreThickness, coreW - 2 * coreThickness, coreH - 2 * coreThickness);
    ctx.strokeRect(coreX + coreThickness, coreY + coreThickness, coreW - 2 * coreThickness, coreH - 2 * coreThickness);

    // Flux Animation (Green Arrows)
    const fluxOpacity = Math.abs(Math.sin(2 * Math.PI * t));
    ctx.strokeStyle = `rgba(22, 163, 74, ${fluxOpacity})`;
    ctx.lineWidth = 2;
    const drawFluxArrow = (x: number, y: number, angle: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
        ctx.moveTo(5, -5); ctx.lineTo(10, 0); ctx.lineTo(5, 5);
        ctx.stroke();
        ctx.restore();
    };
    drawFluxArrow(coreX + coreW / 2, coreY + coreThickness / 2, 0); // Top
    drawFluxArrow(coreX + coreW - coreThickness / 2, coreY + coreH / 2, Math.PI / 2); // Right
    drawFluxArrow(coreX + coreW / 2, coreY + coreH - coreThickness / 2, Math.PI); // Bottom
    drawFluxArrow(coreX + coreThickness / 2, coreY + coreH / 2, -Math.PI / 2); // Left

    // Coils
    const drawCoil = (x: number, y: number, count: number, color: string, label: string) => {
        const visibleTurns = Math.min(20, Math.max(5, Math.ceil(count / 100)));
        const spacing = (coreH - 2 * coreThickness) / visibleTurns;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        for (let i = 0; i < visibleTurns; i++) {
            const ty = y + coreThickness + i * spacing + spacing / 2;
            ctx.beginPath();
            ctx.moveTo(x - 20, ty);
            ctx.lineTo(x + coreThickness + 20, ty);
            ctx.stroke();
        }
        ctx.fillStyle = color;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(label, x - 60, y + coreH / 2);
    };

    drawCoil(coreX, coreY, N1, "#2563eb", `Primer (N₁=${N1})`);
    drawCoil(coreX + coreW - coreThickness, coreY, N2, "#ea580c", `Sekonder (N₂=${N2})`);

    // Badge
    const badgeX = coreX + coreW / 2;
    const badgeY = coreY + coreH / 2;
    let badgeTxt = "İzolasyon ↔";
    let badgeColor = "#71717a";
    if (transformerType === "step-up") { badgeTxt = "Yükseltici ↑"; badgeColor = "#ea580c"; }
    else if (transformerType === "step-down") { badgeTxt = "Düşürücü ↓"; badgeColor = "#2563eb"; }
    
    ctx.fillStyle = badgeColor;
    ctx.beginPath(); ctx.roundRect(badgeX - 45, badgeY - 15, 90, 30, 5); ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(badgeTxt, badgeX, badgeY + 5);
    ctx.textAlign = "left";

    // Labels
    ctx.fillStyle = "#2563eb";
    ctx.fillText(`V₁: ${V1}V`, coreX - 80, coreY + 20);
    ctx.fillText(`I₁: ${I1}A`, coreX - 80, coreY + 40);

    ctx.fillStyle = "#ea580c";
    ctx.fillText(`V₂: ${results.V2.toFixed(1)}V`, coreX + coreW + 20, coreY + 20);
    ctx.fillText(`I₂: ${results.I2actual.toFixed(2)}A`, coreX + coreW + 20, coreY + 40);

    // 2. POWER FLOW PANEL
    const panelY = 360;
    const barW = 40;
    const maxBarH = 100;
    const maxP = 5000;
    
    // Giriş Gücü P1
    ctx.fillStyle = "#2563eb";
    const h1 = (results.P1 / maxP) * maxBarH;
    ctx.fillRect(100, panelY + (maxBarH - h1), barW, h1);
    ctx.fillText(`P₁: ${results.P1.toFixed(0)}W`, 100, panelY + maxBarH + 20);

    // Çıkış Gücü P2
    ctx.fillStyle = "#ea580c";
    const h2 = (results.P2 / maxP) * maxBarH;
    ctx.fillRect(200, panelY + (maxBarH - h2), barW, h2);
    ctx.fillText(`P₂: ${results.P2.toFixed(0)}W`, 200, panelY + maxBarH + 20);

    // Loss
    const loss = results.P1 - results.P2;
    if (loss > 0) {
        ctx.fillStyle = "#dc2626";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(`Kayıp: ${loss.toFixed(0)}W`, 150, panelY + maxBarH - 30);
    }

    if (showTransmission) {
        // Simple Transmission Diagram
        const transX = 350;
        const transY = panelY + 20;
        ctx.strokeStyle = "#71717a";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(transX, transY); ctx.lineTo(transX + 250, transY); ctx.stroke();
        
        ctx.fillStyle = "#18181b";
        ctx.font = "10px sans-serif";
        ctx.fillText("Santral", transX - 10, transY + 20);
        ctx.fillText("Şehir", transX + 240, transY + 20);

        const { loss: lineLoss } = calculateTransmissionLoss(results.P2, results.V2, 5); // 5 Ohm resistance
        ctx.fillStyle = "#dc2626";
        ctx.fillText(`İletim Kaybı (5Ω): ${lineLoss.toFixed(1)}W`, transX + 50, transY - 10);
    }

  }, [N1, N2, V1, I1, efficiency, t, results, transformerType, showTransmission]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative border-4 border-zinc-900 rounded-2xl overflow-hidden bg-white shadow-2xl">
            <canvas
              ref={canvasRef}
              width={700}
              height={500}
              className="w-full h-auto"
            />
          </div>
          <CObsPnl title="Gözlem Paneli">
            <div className="text-zinc-500">Giriş (P₁):</div>
            <div className="font-mono font-bold text-blue-600">{results.P1.toFixed(0)} W</div>
            <div className="text-zinc-500">Çıkış (P₂):</div>
            <div className="font-mono font-bold text-orange-600">{results.P2.toFixed(0)} W</div>
            <div className="text-zinc-500">Sarım Oranı:</div>
            <div className="font-mono font-bold">{(N1/N2).toFixed(2)}</div>
            <div className="text-zinc-500">Verim:</div>
            <div className="font-mono font-bold text-green-600">%{efficiency}</div>
          </CObsPnl>
        </div>

        <div className="flex flex-col gap-4">
          <CPnl title="Parametreler">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">Primer Sarım N₁: {N1}</label>
              <input type="range" min="100" max="2000" step="100" value={N1} onChange={(e) => setN1(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">Sekonder Sarım N₂: {N2}</label>
              <input type="range" min="100" max="2000" step="100" value={N2} onChange={(e) => setN2(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">Giriş Gerilimi V₁: {V1} V</label>
              <input type="range" min="10" max="500" step="1" value={V1} onChange={(e) => setV1(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">Giriş Akımı I₁: {I1} A</label>
              <input type="range" min="0.1" max="20" step="0.1" value={I1} onChange={(e) => setI1(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">Verim %: {efficiency}</label>
              <input type="range" min="70" max="100" step="1" value={efficiency} onChange={(e) => setEfficiency(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                <input type="checkbox" checked={showTransmission} onChange={(e) => setShowTransmission(e.target.checked)} id="showTrans" />
                <label htmlFor="showTrans" className="text-xs font-bold text-zinc-700">Enerji İletimi Göster</label>
            </div>
            <button onClick={() => { setN1(500); setN2(100); setV1(220); setI1(2); setEfficiency(100); }} className="py-2 text-xs text-zinc-400 hover:text-zinc-600 underline">Sıfırla</button>
          </CPnl>

          <CompletionCheck
            slug="transformator"
            currentValue={results.V2}
            targetRange={simulation.zorunlu_deney.hedef_aralik}
            onComplete={onComplete}
          />
        </div>
      </div>
    </div>
  );
}
