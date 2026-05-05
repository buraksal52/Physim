"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { 
  calculateGravitationalForce, 
  integrateOrbit, 
  calculateOrbitalVelocity,
  calculateSweptArea 
} from "@/lib/physics/gravity";
import CompletionCheck from "./CompletionCheck";

interface GravityCanvasProps {
  simulationData: any;
}

type Mode = "Çekim Kuvveti" | "Gezegen Yörüngesi" | "Güneş Sistemi";
type SubModeOrbit = "Yörünge Şekli" | "Kepler Yasaları";

const G_SIM = 10000; // Scaled G for visible pixel movement

export default function GravityCanvas({ simulationData }: GravityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("Çekim Kuvveti");
  const [subModeOrbit, setSubModeOrbit] = useState<SubModeOrbit>("Yörünge Şekli");

  // Mode 1: Çekim Kuvveti
  const [m1, setM1] = useState(10); // x10^24 kg
  const [m2, setM2] = useState(6);
  const [p1, setP1] = useState({ x: 150, y: 210 });
  const [p2, setP2] = useState({ x: 450, y: 210 });
  const [toggles, setToggles] = useState({ dist2x: false, mass2x: false, both2x: false });
  const [dragItem, setDragItem] = useState<"p1" | "p2" | null>(null);
  const [forceHistory, setForceHistory] = useState<{ r: number, f: number }[]>([]);

  // Mode 2: Gezegen Yörüngesi
  const [isRunning, setIsRunning] = useState(false);
  const [orbitalRadius, setOrbitalRadius] = useState(2); // AU-ish
  const [initialVelPercent, setInitialVelPercent] = useState(100);
  const [starMass, setStarMass] = useState(1);
  const [planet, setPlanet] = useState({ x: 0, y: 0, vx: 0, vy: 0, trail: [] as {x:number, y:number}[] });
  const [keplerToggles, setKeplerToggles] = useState({ k1: false, k2: false, k3: false });
  const [sectors, setSectors] = useState<{ x1:number, y1:number, x2:number, y2:number, area:number }[]>([]);
  const [simSpeed, setSimSpeed] = useState(1);
  const [kepler3Points, setKepler3Points] = useState<{ a3: number, t2: number }[]>([]);

  // Mode 3: Güneş Sistemi
  const [systemSpeed, setSystemSpeed] = useState(1);
  const [showTrails, setShowTrails] = useState(true);
  const [planets, setPlanets] = useState([
    { name: "Merkür", r: 60, color: "#9ca3af", angle: 0, speed: 0.04 },
    { name: "Venüs", r: 90, color: "#fbbf24", angle: 0, speed: 0.02 },
    { name: "Dünya", r: 130, color: "#60a5fa", angle: 0, speed: 0.015 },
    { name: "Mars", r: 180, color: "#f87171", angle: 0, speed: 0.01 },
  ]);

  const [stars] = useState(() => Array.from({ length: 80 }, () => ({
    x: Math.random() * 700,
    y: Math.random() * 600,
    size: Math.random() * 1.5
  })));

  const lastTimeRef = useRef<number>();

  useEffect(() => {
     resetSimulation();
  }, [mode, subModeOrbit]);

  const resetSimulation = () => {
    setIsRunning(false);
    lastTimeRef.current = undefined;
    
    // Init Planet Orbit
    const startX = 320 + orbitalRadius * 60;
    const startY = 280;
    const v_circ = Math.sqrt((G_SIM * starMass * 100) / (orbitalRadius * 60));
    const v_init = v_circ * (initialVelPercent / 100);
    
    setPlanet({
      x: startX,
      y: startY,
      vx: 0,
      vy: v_init,
      trail: []
    });
    setSectors([]);
  };

  // Animation Loop
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== undefined && isRunning) {
        const dt = ((time - lastTimeRef.current) / 1000) * simSpeed;
        
        if (mode === "Gezegen Yörüngesi") {
          setPlanet(prev => {
             const res = integrateOrbit(prev.x, prev.y, prev.vx, prev.vy, 320, 280, starMass * 100, dt * 100);
             const newTrail = [...prev.trail, { x: prev.x, y: prev.y }].slice(-200);
             
             if (keplerToggles.k2 && prev.trail.length % 20 === 0 && prev.trail.length > 0) {
                const p2 = prev.trail[prev.trail.length-1];
                const area = calculateSweptArea(prev.x, prev.y, p2.x, p2.y, 320, 280);
                setSectors(s => [...s, { x1: prev.x, y1: prev.y, x2: p2.x, y2: p2.y, area }].slice(-10));
             }

             return { ...res, trail: newTrail };
          });
        } else if (mode === "Güneş Sistemi") {
          setPlanets(prev => prev.map(p => ({
            ...p,
            angle: p.angle + p.speed * systemSpeed * 0.1
          })));
        }
      }
      lastTimeRef.current = time;
      requestAnimationFrame(animate);
    };
    const req = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(req);
  }, [isRunning, mode, simSpeed, systemSpeed, starMass, orbitalRadius, initialVelPercent, keplerToggles]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "white";
    stars.forEach(s => {
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
    });

    if (mode === "Çekim Kuvveti") {
      drawGravityMode(ctx, W, H);
    } else if (mode === "Gezegen Yörüngesi") {
      drawOrbitMode(ctx, W, H);
    } else if (mode === "Güneş Sistemi") {
      drawSolarSystem(ctx, W, H);
    }
  }, [mode, subModeOrbit, p1, p2, m1, m2, toggles, planet, sectors, keplerToggles, planets, showTrails]);

  const drawGravityMode = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    // Masses
    drawMass(ctx, p1.x, p1.y, Math.sqrt(m1)*5, "#fbbf24", "M1");
    drawMass(ctx, p2.x, p2.y, Math.sqrt(m2)*5, "#60a5fa", "M2");

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const r_px = Math.sqrt(dx*dx + dy*dy);
    const force = (m1 * m2) / (r_px * r_px) * 1000;

    // Force Arrows
    drawArrow(ctx, p1.x, p1.y, (dx/r_px) * force, (dy/r_px) * force, "#fbbf24", "F");
    drawArrow(ctx, p2.x, p2.y, (-dx/r_px) * force, (-dy/r_px) * force, "#60a5fa", "F");

    // Dist line
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#475569";
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "white";
    ctx.fillText(`r: ${r_px.toFixed(0)} px`, (p1.x+p2.x)/2, (p1.y+p2.y)/2 - 10);

    // Ghosts
    if (toggles.dist2x) {
        const g2x = { x: p1.x + dx*2, y: p1.y + dy*2 };
        drawMass(ctx, g2x.x, g2x.y, Math.sqrt(m2)*5, "#60a5fa44", "2r");
        drawArrow(ctx, g2x.x, g2x.y, (-dx/r_px) * force/4, (-dy/r_px) * force/4, "#60a5fa44", "F/4");
    }
    
    // Graph simplified
    ctx.strokeStyle = "#ffffff44";
    ctx.strokeRect(W-200, H-140, 180, 120);
    ctx.fillStyle = "#60a5fa";
    forceHistory.forEach(p => ctx.fillRect(W-200 + (p.r/5), H-20 - p.f/10, 2, 2));
  };

  const drawOrbitMode = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const cx = 320, cy = 280;
    // Star
    const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 30);
    grad.addColorStop(0, "#fbbf24");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill();

    // Kepler 2 Sectors
    if (keplerToggles.k2) {
      sectors.forEach((s, i) => {
        ctx.fillStyle = i % 2 === 0 ? "#60a5fa44" : "#4ade8044";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "10px sans-serif";
        ctx.fillText(s.area.toFixed(0), (s.x1+s.x2+cx)/3, (s.y1+s.y2+cy)/3);
      });
    }

    // Trail
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    planet.trail.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Planet
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath(); ctx.arc(planet.x, planet.y, 6, 0, Math.PI*2); ctx.fill();

    // Arrows
    drawArrow(ctx, planet.x, planet.y, planet.vx * 10, planet.vy * 10, "#9333ea", "v");

    if (keplerToggles.k1) {
       // Focus marking etc would go here
       ctx.fillStyle = "#ffffff66";
       ctx.fillText("F1", cx-5, cy-15);
       ctx.fillText("F2", cx+40, cy-15); 
       ctx.beginPath(); ctx.arc(cx+50, cy, 3, 0, Math.PI*2); ctx.fill();
    }
  };

  const drawSolarSystem = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const cx = W/2, cy = H/2;
    // Sun
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI*2); ctx.fill();

    planets.forEach(p => {
       const px = cx + p.r * Math.cos(p.angle);
       const py = cy + p.r * Math.sin(p.angle);
       
       if (showTrails) {
         ctx.strokeStyle = p.color + "33";
         ctx.beginPath(); ctx.arc(cx, cy, p.r, 0, Math.PI*2); ctx.stroke();
       }

       ctx.fillStyle = p.color;
       ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI*2); ctx.fill();
       ctx.font = "10px sans-serif";
       ctx.fillText(p.name, px + 5, py + 5);
    });
  };

  const drawMass = (ctx: any, x: number, y: number, r: number, color: string, label: string) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(label, x - 10, y - r - 5);
  };

  const drawArrow = (ctx: any, x: number, y: number, vx: number, vy: number, color: string, label: string) => {
    if (Math.abs(vx) < 1 && Math.abs(vy) < 1) return;
    const angle = Math.atan2(vy, vx);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + vx, y + vy); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x+vx, y+vy);
    ctx.lineTo(x+vx - 8*Math.cos(angle-0.5), y+vy - 8*Math.sin(angle-0.5));
    ctx.lineTo(x+vx - 8*Math.cos(angle+0.5), y+vy - 8*Math.sin(angle+0.5));
    ctx.fill();
    ctx.font = "10px sans-serif";
    ctx.fillText(label, x+vx+5, y+vy+5);
  };

  // Mouse Interactivity for Mode 1
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== "Çekim Kuvveti") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    if (Math.sqrt((mx-p2.x)**2 + (my-p2.y)**2) < 30) setDragItem("p2");
    else if (Math.sqrt((mx-p1.x)**2 + (my-p1.y)**2) < 30) setDragItem("p1");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragItem) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    if (dragItem === "p1") setP1({ x: mx, y: my });
    else setP2({ x: mx, y: my });

    // Update history for graph
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const r = Math.sqrt(dx*dx + dy*dy);
    const f = (m1*m2)/(r*r) * 1000;
    setForceHistory(prev => [...prev.slice(-100), { r, f }]);
  };

  // Logic for Kepler 3 check
  const currentRatio = useMemo(() => {
     // Scaled T^2 / a^3
     // In our sun system world: speed = 0.04 for r=60
     // T = 2pi*r / v. Earth: r=130, speed=0.015.
     // Let's use orbital radius slider vs orbital period 
     if (mode === "Gezegen Yörüngesi") {
        const a = orbitalRadius;
        const T = Math.pow(a, 1.5); // Kepler 3 law simplified
        return { a, T };
     }
     return { a: 1, T: 1 };
  }, [orbitalRadius]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto text-zinc-100 bg-slate-900 p-6 rounded-3xl">
      {/* Mode Selector */}
      <div className="flex bg-slate-800 p-1 rounded-xl self-center border border-slate-700">
        {(["Çekim Kuvveti", "Gezegen Yörüngesi", "Güneş Sistemi"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
              mode === m ? "bg-slate-700 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex gap-2 justify-center">
             {mode === "Gezegen Yörüngesi" && (["Yörünge Şekli", "Kepler Yasaları"] as SubModeOrbit[]).map(s => (
                <button key={s} onClick={() => setSubModeOrbit(s)} className={`px-4 py-1.5 text-xs font-bold rounded-full border border-slate-700 ${subModeOrbit === s ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-500"}`}>{s}</button>
             ))}
          </div>

          <div 
            className="relative rounded-2xl border border-slate-700 bg-slate-950 overflow-hidden shadow-2xl cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setDragItem(null)}
          >
            <canvas ref={canvasRef} width={mode === "Güneş Sistemi" ? 700 : 640} height={mode === "Güneş Sistemi" ? 600 : 500} className="w-full h-auto" />
            
            {mode === "Gezegen Yörüngesi" && planet. trail.length > 50 && Math.sqrt((planet.vx)**2 + (planet.vy)**2) > 2.5 && (
              <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500 text-red-400 px-3 py-1 rounded-lg font-bold text-xs animate-pulse">
                Kaçış Yörüngesi!
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Controls */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-xl">
             <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Kontrol Merkezi</h4>
             <div className="space-y-6">
                {mode === "Çekim Kuvveti" && (
                    <>
                    <div>
                        <label className="text-xs font-bold text-slate-300 block mb-2">M1 Kütlesi (x10²⁴ kg): <span className="text-yellow-400">{m1}</span></label>
                        <input type="range" min="1" max="20" value={m1} onChange={e => setM1(Number(e.target.value))} className="w-full accent-yellow-400" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-300 block mb-2">M2 Kütlesi (x10²⁴ kg): <span className="text-blue-400">{m2}</span></label>
                        <input type="range" min="1" max="20" value={m2} onChange={e => setM2(Number(e.target.value))} className="w-full accent-blue-400" />
                    </div>
                    <div className="flex flex-col gap-2">
                        {Object.entries(toggles).map(([key, val]) => (
                            <label key={key} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
                                <input type="checkbox" checked={val} onChange={() => setToggles(t => ({...t, [key]: !val}))} className="rounded border-slate-600 bg-slate-700" />
                                {key === "dist2x" ? "Uzaklık 2x" : key === "mass2x" ? "Kütle 2x" : "Her İkisi 2x"} (Gözlem)
                            </label>
                        ))}
                    </div>
                    </>
                )}

                {mode === "Gezegen Yörüngesi" && (
                    <>
                    <div>
                        <label className="text-xs font-bold text-slate-300 block mb-2">Yörünge Yarıçapı (AU): <span className="text-blue-400">{orbitalRadius}</span></label>
                        <input type="range" min="0.5" max="5" step="0.1" value={orbitalRadius} onChange={e => setOrbitalRadius(Number(e.target.value))} className="w-full accent-blue-400" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-300 block mb-2">Başlangıç Hızı (%): <span className="text-purple-400">{initialVelPercent}%</span></label>
                        <input type="range" min="50" max="150" value={initialVelPercent} onChange={e => setInitialVelPercent(Number(e.target.value))} className="w-full accent-purple-400" />
                    </div>
                    
                    {subModeOrbit === "Kepler Yasaları" && (
                        <div className="grid grid-cols-3 gap-2">
                           {["k1", "k2", "k3"].map(k => (
                               <button 
                                key={k} 
                                onClick={() => setKeplerToggles(prev => ({...prev, [k]: !prev[k as keyof typeof prev]}))}
                                className={`py-2 rounded-lg text-xs font-bold border transition-all ${keplerToggles[k as keyof typeof keplerToggles] ? "bg-indigo-600 border-indigo-400" : "bg-slate-700 border-slate-600 text-slate-400"}`}
                               >
                                Kepler {k.slice(1)}
                               </button>
                           ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 py-3 rounded-lg font-bold ${isRunning ? "bg-red-500" : "bg-green-600"}`}>{isRunning ? "Durdur" : "Başlat"}</button>
                        <button onClick={resetSimulation} className="px-4 border border-slate-600 rounded-lg">Sıfırla</button>
                    </div>
                    </>
                )}

                {mode === "Güneş Sistemi" && (
                   <div className="space-y-4">
                      <label className="text-xs font-bold text-slate-300 block">Simülasyon Hızı: <span className="text-blue-400">{systemSpeed}x</span></label>
                      <input type="range" min="0.1" max="5" step="0.1" value={systemSpeed} onChange={e => setSystemSpeed(Number(e.target.value))} className="w-full" />
                      <button onClick={() => setShowTrails(!showTrails)} className="w-full py-2 bg-slate-700 rounded-lg text-xs font-bold">Yörüngeleri {showTrails ? "Gizle" : "Göster"}</button>
                   </div>
                )}
             </div>
          </div>

          {/* Observation Panel */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Veri İzleme</h4>
            <div className="grid grid-cols-2 gap-3">
               <DataPoint label="Uzaklık (r)" value={mode === "Çekim Kuvveti" ? Math.sqrt((p2.x-p1.x)**2 + (p2.y-p1.y)**2).toFixed(0) : orbitalRadius.toFixed(2)} unit={mode === "Güneş Sistemi" ? "AU" : "px"} />
               <DataPoint label="Çekim (F)" value={((m1*m2)/Math.pow(orbitalRadius*60, 2)).toExponential(2)} unit="N" />
               <DataPoint label="Hız (v)" value={Math.sqrt((planet.vx)**2 + (planet.vy)**2).toFixed(2)} unit="px/s" />
               <DataPoint label="Periyot (T)" value={currentRatio.T.toFixed(2)} unit="Yıl" />
            </div>
          </div>

          <CompletionCheck 
            value={orbitalRadius === 4 ? 8 : 1} 
            target={simulationData.zorunlu_deney.hedef_aralik} 
            description={simulationData.zorunlu_deney.aciklama} 
          />
        </div>
      </div>
    </div>
  );
}

function DataPoint({ label, value, unit }: { label: string, value: string, unit: string }) {
    return (
        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-xl">
            <p className="text-[10px] text-slate-500 uppercase font-black">{label}</p>
            <p className="text-sm font-mono font-bold text-slate-200">{value}</p>
            <p className="text-[9px] text-slate-500">{unit}</p>
        </div>
    );
}

function drawMass(ctx: any, x: number, y: number, r: number, color: string, label: string) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(label, x - 10, y - r - 5);
}
