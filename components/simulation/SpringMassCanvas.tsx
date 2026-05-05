"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { calculateSpringSystem, getSpringPosition, calculateSpringEnergy } from "@/lib/physics/springMass";
import CompletionCheck from "./CompletionCheck";

interface SpringMassCanvasProps {
  simulationData: any;
}

type Mode = "Yatay Yay" | "Düşey Yay";

export default function SpringMassCanvas({ simulationData }: SpringMassCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("Yatay Yay");
  
  // Controls
  const [k, setK] = useState(100);
  const [m, setM] = useState(1);
  const [A, setA] = useState(0.5);
  const [damping, setDamping] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  
  // Animation State
  const [t, setT] = useState(0);
  const lastTimeRef = useRef<number>();
  const historyRef = useRef<{t:number, x:number, v:number, a:number}[]>([]);

  // Physics Calculations
  const { omega, T, f } = calculateSpringSystem(k, m);
  const currentPos = getSpringPosition(A, omega, t, 0, damping, m);
  const energy = calculateSpringEnergy(k, m, currentPos.x, currentPos.v);

  const CANVAS_WIDTH = 640;
  const CANVAS_HEIGHT = 700;
  const EQUIP_X = 320;
  const EQUIP_Y = 140;
  const SCALE = 100;

  useEffect(() => {
    if (isRunning) {
      const animate = (time: number) => {
        if (lastTimeRef.current !== undefined) {
          const dt = (time - lastTimeRef.current) / 1000;
          setT((prev) => {
            const nextT = prev + dt * speed;
            const pos = getSpringPosition(A, omega, nextT, 0, damping, m);
            historyRef.current = [...historyRef.current, { t: nextT, ...pos }].slice(-600);
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
  }, [isRunning, speed, A, omega, damping, m]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Background Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for(let i=0; i<CANVAS_WIDTH; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,CANVAS_HEIGHT); ctx.stroke(); }
    for(let i=0; i<CANVAS_HEIGHT; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(CANVAS_WIDTH,i); ctx.stroke(); }

    // --- SECTION 1: ANIMATION ---
    const drawAnimation = () => {
        if (mode === "Yatay Yay") {
            // Ground & Wall
            ctx.strokeStyle = "#a1a1aa";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(50, EQUIP_Y + 40); ctx.lineTo(CANVAS_WIDTH - 50, EQUIP_Y + 40); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(50, EQUIP_Y - 40); ctx.lineTo(50, EQUIP_Y + 40); ctx.stroke();
            
            // Equilibrium Line
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = "#d4d4d8";
            ctx.beginPath(); ctx.moveTo(EQUIP_X, EQUIP_Y - 50); ctx.lineTo(EQUIP_X, EQUIP_Y + 50); ctx.stroke();
            ctx.setLineDash([]);

            const blockX = EQUIP_X + currentPos.x * SCALE;
            
            // Spring
            drawSpring(ctx, 50, EQUIP_Y, blockX - 25, EQUIP_Y, 15);
            
            // Mass
            ctx.fillStyle = "#2563eb";
            ctx.fillRect(blockX - 25, EQUIP_Y - 25, 50, 50);
            ctx.strokeStyle = "#1e40af";
            ctx.strokeRect(blockX - 25, EQUIP_Y - 25, 50, 50);

            // Arrows
            if (isRunning || t > 0) {
                drawArrow(ctx, blockX, EQUIP_Y, -currentPos.x * SCALE, 0, "#ea580c", "F");
                drawArrow(ctx, blockX, EQUIP_Y - 30, currentPos.v * 20, 0, "#dc2626", "v");
                drawArrow(ctx, blockX, EQUIP_Y + 30, currentPos.a * 10, 0, "#9333ea", "a");
            }
        } else {
            // Ceiling
            ctx.strokeStyle = "#a1a1aa";
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(EQUIP_X - 60, 40); ctx.lineTo(EQUIP_X + 60, 40); ctx.stroke();
            
            // Equilibrium Line
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = "#d4d4d8";
            ctx.beginPath(); ctx.moveTo(EQUIP_X - 100, EQUIP_Y + 100); ctx.lineTo(EQUIP_X + 100, EQUIP_Y + 100); ctx.stroke();
            ctx.setLineDash([]);

            const blockY = EQUIP_Y + 100 + currentPos.x * SCALE;
            
            // Spring
            drawSpring(ctx, EQUIP_X, 40, EQUIP_X, blockY - 25, 15);
            
            // Mass
            ctx.fillStyle = "#2563eb";
            ctx.fillRect(EQUIP_X - 25, blockY - 25, 50, 50);
            ctx.strokeRect(EQUIP_X - 25, blockY - 25, 50, 50);

            // Arrows
            drawArrow(ctx, EQUIP_X, blockY, 0, -currentPos.x * SCALE, "#ea580c", "Fs");
            drawArrow(ctx, EQUIP_X + 30, blockY, 0, currentPos.v * 20, "#dc2626", "v");
            drawArrow(ctx, EQUIP_X - 30, blockY, 0, currentPos.a * 10, "#9333ea", "a");
            // Weight
            drawArrow(ctx, EQUIP_X, blockY, 0, 30, "#71717a", "G");
        }
    };
    drawAnimation();

    // --- SECTION 2: GRAPHS ---
    const drawGraphs = () => {
        const startY = 300;
        const gW = 560;
        const gH = 60;
        const margin = 20;

        const renderGraph = (title: string, dataKey: "x"|"v"|"a", color: string, yPos: number, scale: number) => {
            ctx.strokeStyle = "#e5e7eb";
            ctx.strokeRect(40, yPos, gW, gH);
            ctx.fillStyle = "#71717a";
            ctx.font = "10px sans-serif";
            ctx.fillText(title, 45, yPos + 12);
            
            // Axis
            ctx.beginPath();
            ctx.moveTo(40, yPos + gH/2);
            ctx.lineTo(40 + gW, yPos + gH/2);
            ctx.strokeStyle = "#f3f4f6";
            ctx.stroke();

            // History
            if (historyRef.current.length > 2) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                const startTime = historyRef.current[0].t;
                historyRef.current.forEach((p, i) => {
                    const x = 40 + ((p.t - startTime) * 50) % gW; 
                    const y = yPos + gH/2 - p[dataKey] * scale;
                    if (i === 0 || x < 45) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.stroke();
                
                // Cursor
                const lastP = historyRef.current[historyRef.current.length-1];
                const curX = 40 + ((lastP.t - startTime) * 50) % gW;
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(curX, yPos + gH/2 - lastP[dataKey] * scale, 3, 0, Math.PI*2); ctx.fill();
                ctx.fillText(lastP[dataKey].toFixed(2), curX + 5, yPos + gH/2 - lastP[dataKey] * scale - 5);
            }
        };

        renderGraph("Konum x(t)", "x", "#2563eb", startY, 40);
        renderGraph("Hız v(t)", "v", "#dc2626", startY + gH + margin, 15);
        renderGraph("İvme a(t)", "a", "#9333ea", startY + 2*(gH + margin), 5);
    };
    drawGraphs();

    // --- SECTION 3: ENERGY ---
    const drawEnergy = () => {
        const startY = 560;
        const barW = 60;
        const maxH = 100;
        const totalE = 0.5 * k * A * A;
        
        const drawBar = (x: number, val: number, color: string, label: string) => {
            const h = (val / totalE) * maxH;
            ctx.fillStyle = color;
            ctx.fillRect(x, startY + maxH - h, barW, h);
            ctx.fillStyle = "#18181b";
            ctx.textAlign = "center";
            ctx.fillText(val.toFixed(2) + " J", x + barW/2, startY + maxH - h - 5);
            ctx.fillText(label, x + barW/2, startY + maxH + 15);
        };

        ctx.textAlign = "center";
        drawBar(150, energy.Ek, "#16a34a", "Kinetik");
        drawBar(250, energy.Ep, "#ea580c", "Potansiyel");
        
        // Total Energy Line
        ctx.strokeStyle = damping > 0 ? "#dc2626" : "#2563eb";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const curTotal = damping > 0 ? energy.total : totalE;
        const totalH = (curTotal / totalE) * maxH;
        ctx.moveTo(140, startY + maxH - totalH);
        ctx.lineTo(380, startY + maxH - totalH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ctx.strokeStyle as string;
        ctx.fillText("Toplam E", 420, startY + maxH - totalH + 4);
    };
    drawEnergy();

  }, [mode, currentPos, t, energy, damping, k, A, isRunning]);

  const drawSpring = (ctx: any, x1: number, y1: number, x2: number, y2: number, r: number) => {
    const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    const steps = 20;
    const stepDist = dist / steps;
    const angle = Math.atan2(y2-y1, x2-x1);
    
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for(let i=1; i<=steps; i++) {
        const d = i * stepDist;
        const offset = (i % 2 === 0 ? r : -r);
        ctx.lineTo(
            x1 + d * Math.cos(angle) + offset * Math.cos(angle + Math.PI/2),
            y1 + d * Math.sin(angle) + offset * Math.sin(angle + Math.PI/2)
        );
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const drawArrow = (ctx: any, x: number, y: number, length: number, angleOffset: number, color: string, label: string) => {
    if (Math.abs(length) < 2) return;
    const angle = mode === "Yatay Yay" ? (length > 0 ? 0 : Math.PI) : (length > 0 ? Math.PI/2 : -Math.PI/2);
    const absLen = Math.abs(length);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(absLen, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(absLen, 0); ctx.lineTo(absLen-8, -5); ctx.lineTo(absLen-8, 5); ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = color;
    ctx.font = "bold 12px sans-serif";
    if (mode === "Yatay Yay") ctx.fillText(label, x + length, y - 10);
    else ctx.fillText(label, x + 10, y + length);
  };

  const reset = () => {
    setIsRunning(false);
    setT(0);
    historyRef.current = [];
    lastTimeRef.current = undefined;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div className="flex bg-zinc-100 p-1 rounded-xl self-center border shadow-inner">
        {(["Yatay Yay", "Düşey Yay"] as Mode[]).map((m) => (
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
            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Kontrol Paneli</h4>
            <div className="space-y-6">
                <div>
                   <label className="text-sm font-medium block">Yay Sabiti (k): <b>{k} N/m</b></label>
                   <input type="range" min="10" max="500" value={k} onChange={e => {setK(Number(e.target.value)); reset();}} className="w-full" />
                </div>
                <div>
                   <label className="text-sm font-medium block">Kütle (m): <b>{m} kg</b></label>
                   <input type="range" min="0.1" max="10" step="0.1" value={m} onChange={e => {setM(Number(e.target.value)); reset();}} className="w-full" />
                </div>
                <div>
                   <label className="text-sm font-medium block">Genlik (A): <b>{A} m</b></label>
                   <input type="range" min="0.05" max="1" step="0.05" value={A} onChange={e => {setA(Number(e.target.value)); reset();}} className="w-full" />
                </div>
                <div>
                   <label className="text-sm font-medium block">Sönümleme (b): <b>{damping}</b></label>
                   <input type="range" min="0" max="2" step="0.1" value={damping} onChange={e => setDamping(Number(e.target.value))} className="w-full" />
                </div>
                
                <div className="flex gap-2">
                   <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 py-3 rounded-lg font-bold text-white ${isRunning ? "bg-red-500" : "bg-blue-600"}`}>{isRunning ? "Durdur" : "Başlat"}</button>
                   <button onClick={reset} className="px-4 border rounded-lg font-bold">Sıfırla</button>
                </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Gözlem</h4>
            <div className="grid grid-cols-2 gap-2">
                <Readout label="Konum (x)" value={currentPos.x.toFixed(2)} unit="m" />
                <Readout label="Hız (v)" value={currentPos.v.toFixed(2)} unit="m/s" />
                <Readout label="Periyot (T)" value={T.toFixed(3)} unit="s" />
                <Readout label="Frekans (f)" value={f.toFixed(2)} unit="Hz" />
            </div>
          </div>

          <CompletionCheck 
            value={T} 
            target={simulationData.zorunlu_deney.hedef_aralik} 
            description={simulationData.zorunlu_deney.aciklama} 
          />
        </div>
      </div>
    </div>
  );
}

function Readout({ label, value, unit }: { label: string, value: string, unit: string }) {
    return (
        <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-lg">
            <p className="text-[10px] text-zinc-500 uppercase font-black">{label}</p>
            <p className="text-sm font-mono font-bold text-zinc-900">{value} <span className="text-[10px] font-normal">{unit}</span></p>
        </div>
    );
}
