"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { calculatePendulumSystem, getPendulumAngle, getPendulumCartesian, getPendulumEnergy, getTruePeriod } from "@/lib/physics/pendulum";
import CompletionCheck from "./CompletionCheck";

interface PendulumBHHCanvasProps {
  simulationData: any;
}

type Mode = "Tek Sarkaç" | "Karşılaştırma";

export default function PendulumBHHCanvas({ simulationData }: PendulumBHHCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("Tek Sarkaç");
  
  // Single Pendulum Controls
  const [L, setL] = useState(1);
  const [theta0, setTheta0] = useState(10);
  const [m, setM] = useState(1);
  const [g, setG] = useState(9.8);
  const [damping, setDamping] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  
  // Comparison Mode Controls
  const [L1, setL1] = useState(0.5);
  const [L2, setL2] = useState(1.0);
  const [L3, setL3] = useState(2.0);
  const [isResonance, setIsResonance] = useState(false);

  // Animation State
  const [t, setT] = useState(0);
  const lastTimeRef = useRef<number>();
  const historyRef = useRef<{t:number, theta:number, thetaDot:number, Ek:number, Ep:number}[]>([]);

  // Physics Calculations
  const { omega, T, f } = calculatePendulumSystem(L, g);
  const trueT = getTruePeriod(T, theta0);
  const current = getPendulumAngle(theta0, omega, t, damping, m);
  const energy = getPendulumEnergy(m, L, current.theta, current.thetaDot, g);

  const CANVAS_WIDTH = 640;
  const CANVAS_HEIGHT = 660; // 300 animation + 200 graphs + 160 energy
  const PIVOT_X = 320;
  const PIVOT_Y = 50;
  const VISUAL_SCALE = 180; // pixels per meter

  useEffect(() => {
    if (isRunning) {
      const animate = (time: number) => {
        if (lastTimeRef.current !== undefined) {
          const dt = (time - lastTimeRef.current) / 1000;
          setT((prev) => {
            const nextT = prev + dt * speed;
            const cur = getPendulumAngle(theta0, omega, nextT, damping, m);
            const en = getPendulumEnergy(m, L, cur.theta, cur.thetaDot, g);
            historyRef.current = [...historyRef.current, { t: nextT, theta: cur.theta, thetaDot: cur.thetaDot, Ek: en.Ek, Ep: en.Ep }].slice(-600);
            return nextT;
          });
        }
        lastTimeRef.current = time;
        requestAnimationFrame(animate);
      };
      const req = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(req);
    } else {
      lastTimeRef.current = undefined;
    }
  }, [isRunning, speed, L, theta0, damping, m, g, omega]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for(let i=0; i<CANVAS_WIDTH; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,660); ctx.stroke(); }
    for(let i=0; i<660; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(CANVAS_WIDTH,i); ctx.stroke(); }

    if (mode === "Tek Sarkaç") {
      drawSinglePendulum(ctx);
    } else {
      drawComparisonMode(ctx);
    }

    drawGraphs(ctx);
    drawEnergyBars(ctx);

  }, [mode, t, current, energy, L, theta0, m, g, damping, L1, L2, L3, isResonance]);

  const drawSinglePendulum = (ctx: CanvasRenderingContext2D) => {
    const { x, y } = getPendulumCartesian(PIVOT_X, PIVOT_Y, L * VISUAL_SCALE, current.theta);

    // Equilibrium line
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#94a3b8";
    ctx.beginPath(); ctx.moveTo(PIVOT_X, PIVOT_Y); ctx.lineTo(PIVOT_X, PIVOT_Y + L * VISUAL_SCALE + 20); ctx.stroke();
    ctx.setLineDash([]);

    // Swing Path Arc
    ctx.beginPath();
    ctx.strokeStyle = "#f1f5f9";
    const startAngle = Math.PI/2 - (theta0 * Math.PI / 180);
    const endAngle = Math.PI/2 + (theta0 * Math.PI / 180);
    ctx.arc(PIVOT_X, PIVOT_Y, L * VISUAL_SCALE, startAngle, endAngle);
    ctx.stroke();

    // Damping envelope if exists
    if (damping > 0) {
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = "#cbd5e1";
        const envRad = theta0 * current.envelope * Math.PI / 180;
        ctx.beginPath(); ctx.arc(PIVOT_X, PIVOT_Y, L * VISUAL_SCALE, Math.PI/2 - envRad, Math.PI/2 + envRad); ctx.stroke();
        ctx.setLineDash([]);
    }

    // String
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PIVOT_X, PIVOT_Y); ctx.lineTo(x, y); ctx.stroke();

    // Bob
    const bobRadius = 10 + m * 2;
    ctx.fillStyle = "#2563eb";
    ctx.beginPath(); ctx.arc(x, y, bobRadius, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#1e40af";
    ctx.stroke();

    // Angle labeling
    ctx.strokeStyle = "#64748b";
    ctx.beginPath(); ctx.arc(PIVOT_X, PIVOT_Y, 40, Math.PI/2, Math.PI/2 + current.theta, current.theta < 0); ctx.stroke();
    ctx.fillStyle = "#1e293b";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${current.thetaDeg.toFixed(1)}°`, PIVOT_X - 10, PIVOT_Y + 55);

    // Vektors
    // Velocity (Green)
    const vScale = 10;
    const vDir = current.thetaDot > 0 ? current.theta + Math.PI : current.theta;
    drawArrow(ctx, x, y, Math.abs(current.thetaDot * L * VISUAL_SCALE / 5), current.theta + Math.PI/2, "#16a34a", "v");
    
    // Gravity component (Red)
    const gComp = g * Math.sin(current.theta) * 10;
    drawArrow(ctx, x, y, gComp, current.theta + Math.PI/2, "#dc2626", "mg sinθ");

    // Tension (Purple)
    const tension = (m * g * Math.cos(current.theta) + m * (current.thetaDot**2) * L) * 2;
    drawArrow(ctx, x, y, tension, current.theta - Math.PI/2, "#9333ea", "T");

    // Restoring Force (Orange)
    const fRest = m * g * Math.sin(current.theta) * 15;
    drawArrow(ctx, x, y, fRest, current.theta + Math.PI/2, "#ea580c", "Fs");

    // Phase Space Inset
    drawPhaseSpace(ctx);

    // Warning Badge
    if (theta0 > 15) {
        ctx.fillStyle = "#fef3c7";
        ctx.fillRect(40, 60, 240, 24);
        ctx.fillStyle = "#92400e";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText("⚠️ Büyük açı — BHH yaklaşımı zayıflıyor", 50, 76);
    }
  };

  const drawPhaseSpace = (ctx: CanvasRenderingContext2D) => {
    const insetX = 480;
    const insetY = 150;
    const insetSize = 120;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(insetX, insetY, insetSize, insetSize);
    ctx.strokeStyle = "#e2e8f0";
    ctx.strokeRect(insetX, insetY, insetSize, insetSize);
    
    // Axes
    ctx.beginPath(); ctx.moveTo(insetX + insetSize/2, insetY); ctx.lineTo(insetX + insetSize/2, insetY + insetSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(insetX, insetY + insetSize/2); ctx.lineTo(insetX + insetSize, insetY + insetSize/2); ctx.stroke();
    
    // Trace
    if (historyRef.current.length > 2) {
        ctx.strokeStyle = "#3b82f6";
        ctx.beginPath();
        historyRef.current.forEach((p, i) => {
            const px = insetX + insetSize/2 + p.theta * (insetSize/2 / (Math.PI/2));
            const py = insetY + insetSize/2 - p.thetaDot * (insetSize/2 / (Math.PI));
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
    }
    ctx.fillStyle = "#64748b";
    ctx.fillText("θ", insetX + insetSize - 10, insetY + insetSize/2 - 2);
    ctx.fillText("ω", insetX + insetSize/2 + 2, insetY + 12);
  };

  const drawComparisonMode = (ctx: CanvasRenderingContext2D) => {
    const lengths = [L1, L2, L3];
    const colors = ["#2563eb", "#ea580c", "#16a34a"];
    const names = ["Sarkaç 1", "Sarkaç 2", "Sarkaç 3"];
    
    lengths.forEach((len, i) => {
        const xPos = 120 + i * 200;
        const { omega: wLocal } = calculatePendulumSystem(len, g);
        const cur = getPendulumAngle(theta0, wLocal, t, damping, m);
        const { x, y } = getPendulumCartesian(xPos, PIVOT_Y, len * VISUAL_SCALE, cur.theta);

        // String
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xPos, PIVOT_Y); ctx.lineTo(x, y); ctx.stroke();

        // Bob
        ctx.fillStyle = colors[i];
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI*2); ctx.fill();

        // Label
        ctx.fillStyle = "#71717a";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${len.toFixed(2)}m`, xPos, PIVOT_Y - 10);
    });

    if (isResonance) {
        const completed = t % (2 * Math.PI / calculatePendulumSystem(L1, g).omega) < 0.1;
        if (completed && t > 0.5) {
            ctx.fillStyle = "#dcfce7";
            ctx.fillRect(CANVAS_WIDTH/2 - 50, 20, 100, 30);
            ctx.fillStyle = "#166534";
            ctx.font = "bold 14px sans-serif";
            ctx.fillText("Rezonans!", CANVAS_WIDTH/2, 40);
        }
    }
    ctx.textAlign = "left";
  };

  const drawGraphs = (ctx: CanvasRenderingContext2D) => {
    const startY = 320;
    const gW = 560;
    const gH = 50;
    const margin = 15;

    const render = (title: string, dataKey: string, color: string, yPos: number, scale: number, secondaryKey?: string, sColor?: string) => {
        ctx.strokeStyle = "#f1f5f9";
        ctx.strokeRect(40, yPos, gW, gH);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px font-black uppercase";
        ctx.fillText(title, 45, yPos + 12);

        // Axis
        ctx.beginPath(); ctx.moveTo(40, yPos + gH/2); ctx.lineTo(40 + gW, yPos + gH/2); ctx.stroke();

        if (historyRef.current.length > 2) {
            const startTime = historyRef.current[0].t;
            
            // Secondary if exists (Energy)
            if (secondaryKey && sColor) {
               ctx.strokeStyle = sColor; ctx.beginPath();
               historyRef.current.forEach((p, i) => {
                const px = 40 + ((p.t - startTime) * 50) % gW;
                const py = yPos + gH - (p[secondaryKey as keyof typeof p] as number) * scale;
                if (i === 0 || px < 45) ctx.moveTo(px, py); else ctx.lineTo(px, py);
               });
               ctx.stroke();
            }

            ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
            historyRef.current.forEach((p, i) => {
                const px = 40 + ((p.t - startTime) * 50) % gW;
                let val = p[dataKey as keyof typeof p] as number;
                if (dataKey === "theta") val *= (180/Math.PI);
                const py = yPos + gH/2 - val * scale;
                if (i === 0 || px < 45) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.stroke();
        }
    };

    render("Konum θ(t)", "theta", "#2563eb", startY, 0.5);
    render("Açısal Hız ω(t)", "thetaDot", "#16a34a", startY + gH + margin, 15);
    render("Enerji (K Yeşil / P Turuncu)", "Ek", "#16a34a", startY + 2*(gH + margin), 15, "Ep", "#ea580c");
  };

  const drawEnergyBars = (ctx: CanvasRenderingContext2D) => {
    const startY = 540;
    const maxH = 80;
    const barW = 60;
    const totalE = 1 * g * (L * (1 - Math.cos(theta0 * Math.PI / 180)));

    const drawBar = (x: number, val: number, color: string, label: string) => {
        const h = Math.min((val / (totalE || 1)) * maxH, maxH);
        ctx.fillStyle = color;
        ctx.fillRect(x, startY + maxH - h, barW, h);
        ctx.fillStyle = "#18181b";
        ctx.textAlign = "center";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(val.toFixed(2) + " J", x + barW/2, startY + maxH - h - 5);
        ctx.fillText(label, x + barW/2, startY + maxH + 15);
    };

    drawBar(150, energy.Ek, "#16a34a", "Kinetik");
    drawBar(250, energy.Ep, "#ea580c", "Potansiyel");
    
    // Total Line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#2563eb";
    ctx.beginPath();
    ctx.moveTo(140, startY + maxH - maxH);
    ctx.lineTo(380, startY + maxH - maxH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#2563eb";
    ctx.fillText("Toplam E", 420, startY + 4);
  };

  const drawArrow = (ctx: any, x: number, y: number, length: number, angle: number, color: string, label: string) => {
    if (Math.abs(length) < 2) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(length, 0); ctx.lineTo(length - (length > 0 ? 8 : -8), -4); ctx.lineTo(length - (length > 0 ? 8 : -8), 4); ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = color;
    ctx.font = "9px sans-serif";
    ctx.fillText(label, x + length * Math.cos(angle) + 5, y + length * Math.sin(angle));
  };

  const reset = () => {
    setIsRunning(false);
    setT(0);
    historyRef.current = [];
    lastTimeRef.current = undefined;
  };

  const setResonanceMode = () => {
    setIsResonance(true);
    // T = 2π√(L/g) => L = g * (T/2π)^2
    // Ratios 1:2:3 for T => L ratios 1:4:9
    const baseL = 0.4;
    setL1(baseL);
    setL2(baseL * 4);
    setL3(Math.min(baseL * 9, 5));
    reset();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div className="flex bg-zinc-100 p-1 rounded-xl self-center border shadow-inner">
        {(["Tek Sarkaç", "Karşılaştırma"] as Mode[]).map((m) => (
          <button key={m} onClick={() => {setMode(m); reset();}} className={`px-8 py-2 text-sm font-bold rounded-lg transition-all ${mode === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>{m}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-auto" />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Kontroller</h4>
            <div className="space-y-4">
                {mode === "Tek Sarkaç" ? (
                    <>
                    <Slider label="Uzunluk (L)" value={L} min={0.1} max={5} step={0.1} unit="m" onChange={v => {setL(v); reset();}} />
                    <Slider label="Başlangıç Açısı (θ₀)" value={theta0} min={1} max={90} unit="°" onChange={v => {setTheta0(v); reset();}} />
                    <Slider label="Kütle (m)" value={m} min={0.1} max={5} unit="kg" onChange={setM} />
                    </>
                ) : (
                    <>
                    <Slider label="L1 (Mavi)" value={L1} min={0.1} max={5} step={0.1} unit="m" onChange={setL1} />
                    <Slider label="L2 (Turuncu)" value={L2} min={0.1} max={5} step={0.1} unit="m" onChange={setL2} />
                    <Slider label="L3 (Yeşil)" value={L3} min={0.1} max={5} step={0.1} unit="m" onChange={setL3} />
                    <button onClick={setResonanceMode} className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-xs font-bold rounded">Rezonans Düzeni Yükle</button>
                    </>
                )}
                
                <div className="pt-2 border-t space-y-3">
                   <p className="text-[10px] font-bold text-zinc-400 uppercase">Yerçekimi (g)</p>
                   <div className="grid grid-cols-3 gap-1">
                      {[ {l:"Ay", v:1.6}, {l:"Dünya", v:9.8}, {l:"Jüpiter", v:24.8} ].map(item => (
                          <button key={item.l} onClick={() => {setG(item.v); reset();}} className={`py-1 text-[10px] border rounded ${g === item.v ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"}`}>{item.l} {item.v}</button>
                      ))}
                   </div>
                </div>

                <Slider label="Sönümleme (b)" value={damping} min={0} max={1} step={0.05} onChange={setDamping} />
                
                <div className="flex gap-2">
                   <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 py-3 rounded-lg font-bold text-white transition-colors ${isRunning ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"}`}>{isRunning ? "Durdur" : "Başlat"}</button>
                   <button onClick={reset} className="px-4 border rounded-lg font-bold hover:bg-zinc-50">Sıfırla</button>
                </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Gözlem</h4>
            <div className="grid grid-cols-2 gap-2">
                <Readout label="Açı" value={current.thetaDeg.toFixed(1)} unit="°" />
                <Readout label="Açısal Hız" value={current.thetaDot.toFixed(2)} unit="rad/s" />
                <Readout label="Hız" value={energy.v.toFixed(2)} unit="m/s" />
                <Readout label="Yükseklik (h)" value={energy.h.toFixed(3)} unit="m" />
                <Readout label="Periyot (BHH)" value={T.toFixed(3)} unit="s" />
                <Readout label="Periyot (Gerçek)" value={trueT.toFixed(3)} unit="s" color={theta0 > 15 ? "text-amber-600" : ""} />
                <Readout label="Frekans" value={f.toFixed(2)} unit="Hz" />
                <Readout label="Toplam E" value={energy.total.toFixed(2)} unit="J" />
            </div>
          </div>

          <CompletionCheck value={T} target={simulationData.zorunlu_deney.hedef_aralik} description={simulationData.zorunlu_deney.aciklama} />
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step=0.1, unit="", onChange }: any) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium">{label}</label>
                <span className="text-xs font-bold font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">{value} {unit}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
        </div>
    );
}

function Readout({ label, value, unit, color="" }: any) {
    return (
        <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-lg">
            <p className="text-[10px] text-zinc-400 uppercase font-black">{label}</p>
            <p className={`text-sm font-mono font-bold ${color || "text-zinc-900"}`}>{value} <span className="text-[10px] font-normal opacity-60">{unit}</span></p>
        </div>
    );
}
