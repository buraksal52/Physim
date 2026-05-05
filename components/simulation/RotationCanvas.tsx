"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { 
  calculateMomentOfInertia, 
  calculateRollingAcceleration,
  calculateAngularMomentum 
} from "@/lib/physics/rotation";
import CompletionCheck from "./CompletionCheck";

interface RotationCanvasProps {
  simulationData: any;
}

type Mode = "Dönme" | "Yuvarlanma" | "Açısal Momentum";
type SubModeDönme = "Dönen Disk" | "Atalet Momenti Karşılaştırması";
type SubModeMomentum = "Dönüşçü" | "Gezegen";

export default function RotationCanvas({ simulationData }: RotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("Dönme");
  const [subModeDönme, setSubModeDönme] = useState<SubModeDönme>("Dönen Disk");
  const [subModeMomentum, setSubModeMomentum] = useState<SubModeMomentum>("Dönüşçü");

  // Common Animation State
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const lastTimeRef = useRef<number>();
  const requestRef = useRef<number>();

  // Mode 1: Dönme
  const [mass, setMass] = useState(10);
  const [radius, setRadius] = useState(1);
  const [torque, setTorque] = useState(10);
  const [omega0, setOmega0] = useState(0);
  const [currentOmega, setCurrentOmega] = useState(0);
  const [angle, setAngle] = useState(0);

  // Comparison State
  const [omegaDisk, setOmegaDisk] = useState(0);
  const [omegaRing, setOmegaRing] = useState(0);
  const [omegaSphere, setOmegaSphere] = useState(0);
  const [angleDisk, setAngleDisk] = useState(0);
  const [angleRing, setAngleRing] = useState(0);
  const [angleSphere, setAngleSphere] = useState(0);

  // Mode 2: Yuvarlanma
  const [elevation, setElevation] = useState(30);
  const [rampHeight, setRampHeight] = useState(5);
  const [positions, setPositions] = useState({ disk: 0, ring: 0, sphere: 0 });
  const [velocities, setVelocities] = useState({ disk: 0, ring: 0, sphere: 0 });
  const [finishTimes, setFinishTimes] = useState<{ [key: string]: number }>({});

  // Mode 3: Açısal Momentum
  const [initOmega, setInitOmega] = useState(5);
  const [armLength, setArmLength] = useState(1.5);
  const [armMass, setArmMass] = useState(5);
  const [isArmsOpen, setIsArmsOpen] = useState(true);
  const [planetPos, setPlanetPos] = useState({ x: 0, y: 0, angle: 0 });

  const PIXELS_PER_METER = 40;
  const gravity = 9.81;

  // Reset function
  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
    setAngle(0);
    setAngleDisk(0);
    setAngleRing(0);
    setAngleSphere(0);
    setCurrentOmega(omega0);
    setOmegaDisk(0);
    setOmegaRing(0);
    setOmegaSphere(0);
    setPositions({ disk: 0, ring: 0, sphere: 0 });
    setVelocities({ disk: 0, ring: 0, sphere: 0 });
    setFinishTimes({});
    lastTimeRef.current = undefined;
  };

  useEffect(() => {
    reset();
  }, [mode, subModeDönme, subModeMomentum]);

  // Animation Loop
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== undefined && isRunning) {
        const dt = (time - lastTimeRef.current) / 1000;
        setElapsed(prev => prev + dt);

        if (mode === "Dönme") {
          if (subModeDönme === "Dönen Disk") {
            const { I } = calculateMomentOfInertia("disk", mass, radius);
            const alpha = torque / I;
            setCurrentOmega(prev => prev + alpha * dt);
            setAngle(prev => prev + currentOmega * dt);
          } else {
            const I_disk = calculateMomentOfInertia("disk", mass, radius).I;
            const I_ring = calculateMomentOfInertia("ring", mass, radius).I;
            const I_sphere = calculateMomentOfInertia("sphere", mass, radius).I;
            
            setOmegaDisk(prev => prev + (torque / I_disk) * dt);
            setOmegaRing(prev => prev + (torque / I_ring) * dt);
            setOmegaSphere(prev => prev + (torque / I_sphere) * dt);
            
            setAngleDisk(prev => prev + omegaDisk * dt);
            setAngleRing(prev => prev + omegaRing * dt);
            setAngleSphere(prev => prev + omegaSphere * dt);
          }
        } else if (mode === "Yuvarlanma") {
          const shapes = ["disk", "ring", "sphere"] as const;
          const rampLength = rampHeight / Math.sin(elevation * Math.PI / 180);
          
          shapes.forEach(shape => {
            if (finishTimes[shape]) return;
            
            const { a } = calculateRollingAcceleration(shape, mass, radius, elevation);
            setVelocities(prev => ({ ...prev, [shape]: prev[shape as keyof typeof prev] + a * dt }));
            setPositions(prev => {
              const newPos = prev[shape as keyof typeof prev] + velocities[shape as keyof typeof velocities] * dt;
              if (newPos >= rampLength + 5) { // 5m is the flat part
                setFinishTimes(f => ({ ...f, [shape]: elapsed + dt }));
              }
              return { ...prev, [shape]: newPos };
            });
          });
        } else if (mode === "Açısal Momentum") {
           if (subModeMomentum === "Gezegen") {
              const a_axis = 200;
              const b_axis = 100;
              const e = Math.sqrt(1 - (b_axis**2 / a_axis**2));
              // L = m v r = const => omega * r^2 = const
              // Use Kepler's 2nd Law (Area rate is constant)
              setPlanetPos(prev => {
                  const r = (a_axis * (1 - e*e)) / (1 + e * Math.cos(prev.angle));
                  const dAngle = (0.5 * dt) / (r*r) * 10000; // Arbitrary scaling
                  return { ...prev, angle: prev.angle + dAngle };
              });
           } else {
              setAngle(prev => prev + (isArmsOpen ? initOmega : initOmega * 3) * dt); // Simple visual toggle
           }
        }
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current as number);
  }, [isRunning, mode, subModeDönme, subModeMomentum, mass, radius, torque, currentOmega, omegaDisk, omegaRing, omegaSphere, elevation, rampHeight, velocities, finishTimes, isArmsOpen, initOmega, elapsed]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    
    // Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for(let i=0; i<W; i+=40){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke(); }
    for(let i=0; i<H; i+=40){ ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(W,i); ctx.stroke(); }

    if (mode === "Dönme") {
      if (subModeDönme === "Dönen Disk") {
        const cx = W/2, cy = H/2;
        const r_px = Math.min(radius * PIXELS_PER_METER, 150);
        
        // Disk
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillStyle = "#2563eb33";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, r_px, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Spokes
        for(let i=0; i<8; i++){
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(r_px * Math.cos(i*Math.PI/4), r_px * Math.sin(i*Math.PI/4)); ctx.stroke();
        }
        ctx.restore();

        // Torque Arrow (curved)
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, r_px + 20, -Math.PI/4, Math.PI/4);
        ctx.stroke();
        
        // Momentum Arrow (out of screen)
        drawArrow(ctx, cx, cy - r_px - 60, 0, -50, "#16a34a", "L = Iω");

      } else {
        // Comparison
        const centers = [W/4, W/2, 3*W/4];
        const colors = ["#2563eb", "#dc2626", "#9333ea"];
        const labels = ["Disk", "Halka", "Küre"];
        const angles = [angleDisk, angleRing, angleSphere];
        
        centers.forEach((cx, i) => {
          const cy = H/2 - 50;
          const r = 40;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angles[i]);
          ctx.strokeStyle = colors[i];
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(r, 0); ctx.stroke();
          ctx.restore();
          
          ctx.fillStyle = "#18181b";
          ctx.textAlign = "center";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(labels[i], cx, cy + 70);
        });
        
        // Bar Chart for I
        const I_vals = [
          calculateMomentOfInertia("disk", mass, radius).I,
          calculateMomentOfInertia("ring", mass, radius).I,
          calculateMomentOfInertia("sphere", mass, radius).I
        ];
        const maxI = Math.max(...I_vals);
        I_vals.forEach((val, i) => {
           const h = (val / maxI) * 100;
           ctx.fillStyle = colors[i] + "88";
           ctx.fillRect(W - 80, H - 20 - h, 20, h);
        });
      }
    } else if (mode === "Yuvarlanma") {
      const margin = 50;
      const rampW = 300;
      const flatW = 300;
      const h_px = rampHeight * 20;
      const startX = margin, startY = H - margin - h_px;
      
      // Draw Ramp
      ctx.strokeStyle = "#71717a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + rampW, H - margin);
      ctx.lineTo(startX + rampW + flatW, H - margin);
      ctx.stroke();

      const shapes = [
        { id: "disk", color: "#2563eb", label: "Disk" },
        { id: "ring", color: "#dc2626", label: "Halka" },
        { id: "sphere", color: "#9333ea", label: "Küre" }
      ];

      shapes.forEach((s, idx) => {
        const p = positions[s.id as keyof typeof positions];
        const theta = elevation * Math.PI / 180;
        const rampLength = rampHeight / Math.sin(theta);
        
        let cx, cy, rot;
        if (p <= rampLength) {
          cx = startX + p * 20 * Math.cos(theta);
          cy = startY + p * 20 * Math.sin(theta);
        } else {
          cx = startX + rampLength * 20 * Math.cos(theta) + (p - rampLength) * 20;
          cy = H - margin - radius * 12;
        }
        
        // Offset for multiple runners
        cy -= idx * 10; 

        ctx.save();
        ctx.translate(cx, cy - 12);
        ctx.rotate(p / radius); // rotation angle
        ctx.fillStyle = s.color + "44";
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(12, 0); ctx.stroke();
        ctx.restore();
        
        if (finishTimes[s.id]) {
            ctx.fillText("🏆", cx + 20, cy - 12);
        }
      });
    } else if (mode === "Açısal Momentum") {
      if (subModeMomentum === "Gezegen") {
         const cx = W/2, cy = H/2;
         const a = 200, b = 100, e = Math.sqrt(1 - (b**2 / a**2));
         
         // Star
         ctx.fillStyle = "#fbbf24";
         ctx.beginPath(); ctx.arc(cx - a*e, cy, 15, 0, Math.PI*2); ctx.fill();
         
         // Orbit
         ctx.strokeStyle = "#e5e7eb";
         ctx.beginPath(); ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI*2); ctx.stroke();
         
         // Planet
         const r = (a * (1 - e*e)) / (1 + e * Math.cos(planetPos.angle));
         const px = cx - a*e + r * Math.cos(planetPos.angle);
         const py = cy + r * Math.sin(planetPos.angle);
         
         ctx.fillStyle = "#2563eb";
         ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI*2); ctx.fill();
         
         // Velocity Arrow
         const v_mag = 50 * (2/r - 1/a); // qualitative
         const vx = -v_mag * Math.sin(planetPos.angle);
         const vy = v_mag * Math.cos(planetPos.angle);
         drawArrow(ctx, px, py, vx*500, vy*500, "#2563eb", "v");
         
      } else {
         const cx = W/2, cy = H/2;
         ctx.save();
         ctx.translate(cx, cy);
         ctx.rotate(angle);
         // Body
         ctx.fillStyle = "#18181b";
         ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
         // Arms
         ctx.strokeStyle = "#2563eb";
         ctx.lineWidth = 8;
         const currentArmL = isArmsOpen ? armLength * 40 : 20;
         ctx.beginPath(); ctx.moveTo(-currentArmL, 0); ctx.lineTo(currentArmL, 0); ctx.stroke();
         ctx.restore();
         
         // Momentum Vector
         drawArrow(ctx, cx, cy - 100, 0, -60, "#16a34a", "L");
      }
    }

  }, [mode, subModeDönme, subModeMomentum, angle, angleDisk, angleRing, angleSphere, positions, isArmsOpen, planetPos, radius, armLength]);

  const drawArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, color: string, label: string) => {
    const headlen = 10;
    const angle = Math.atan2(vy, vx);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + vx, y + vy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + vx, y + vy);
    ctx.lineTo(x + vx - headlen * Math.cos(angle - Math.PI / 6), y + vy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x + vx - headlen * Math.cos(angle + Math.PI / 6), y + vy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.fillStyle = color; ctx.fill();
    ctx.fillText(label, x + vx + 5, y + vy - 5);
  };

  const I_current = useMemo(() => {
    if (mode === "Dönme") return calculateMomentOfInertia("disk", mass, radius).I;
    if (mode === "Açısal Momentum" && subModeMomentum === "Dönüşçü") {
        return (0.5 * 70 * 0.2**2) + (2 * armMass * (isArmsOpen ? armLength : 0.2)**2);
    }
    return 0;
  }, [mode, subModeMomentum, mass, radius, armMass, armLength, isArmsOpen]);

  const L_current = calculateAngularMomentum(I_current, mode === "Dönme" ? currentOmega : (isArmsOpen ? initOmega : initOmega * 3)).L;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Mode Selector */}
      <div className="flex bg-zinc-100 p-1 rounded-xl self-center shadow-inner">
        {(["Dönme", "Yuvarlanma", "Açısal Momentum"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-8 py-2.5 text-sm font-bold rounded-lg transition-all ${
              mode === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Submode Selectors */}
          <div className="flex gap-2 justify-center">
             {mode === "Dönme" && (["Dönen Disk", "Atalet Momenti Karşılaştırması"] as SubModeDönme[]).map(s => (
                <button key={s} onClick={() => setSubModeDönme(s)} className={`px-4 py-1.5 text-xs font-bold rounded-full border ${subModeDönme === s ? "bg-zinc-900 text-white" : "bg-white text-zinc-500"}`}>{s}</button>
             ))}
             {mode === "Açısal Momentum" && (["Dönüşçü", "Gezegen"] as SubModeMomentum[]).map(s => (
                <button key={s} onClick={() => setSubModeMomentum(s)} className={`px-4 py-1.5 text-xs font-bold rounded-full border ${subModeMomentum === s ? "bg-zinc-900 text-white" : "bg-white text-zinc-500"}`}>{s}</button>
             ))}
          </div>

          <div className="relative rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
            <canvas ref={canvasRef} width={mode === "Yuvarlanma" ? 650 : 560} height={480} className="w-full h-auto" />
          </div>

          {/* Table / Details */}
          {mode === "Yuvarlanma" && (
             <div className="bg-white border rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                    <thead className="bg-zinc-50 border-b">
                        <tr><th className="p-2 text-left">Cisim</th><th className="p-2">I/mr²</th><th className="p-2">Hız (m/s)</th><th className="p-2">Süre (s)</th></tr>
                    </thead>
                    <tbody>
                        {["disk", "ring", "sphere"].map(s => (
                            <tr key={s} className="border-b">
                                <td className="p-2 font-bold capitalize">{s}</td>
                                <td className="p-2 text-center">{s === "disk" ? "0.5" : s === "ring" ? "1.0" : "0.4"}</td>
                                <td className="p-2 text-center">{velocities[s as keyof typeof velocities].toFixed(2)}</td>
                                <td className="p-2 text-center font-mono">{finishTimes[s] ? finishTimes[s].toFixed(2) : "--"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Kontrol Paneli</h4>
            
            <div className="space-y-6">
              {mode === "Dönme" && (
                <>
                  <div>
                    <label className="text-sm font-medium block">Kütle: <span className="font-bold text-blue-600">{mass} kg</span></label>
                    <input type="range" min="1" max="20" value={mass} onChange={e => setMass(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Yarıçap: <span className="font-bold text-blue-600">{radius} m</span></label>
                    <input type="range" min="0.1" max="2" step="0.1" value={radius} onChange={e => setRadius(Number(e.target.value))} className="w-full" />
                  </div>
                  {subModeDönme === "Dönen Disk" && (
                    <div>
                      <label className="text-sm font-medium block">Tork: <span className="font-bold text-orange-600">{torque} N·m</span></label>
                      <input type="range" min="0" max="50" value={torque} onChange={e => setTorque(Number(e.target.value))} className="w-full" />
                    </div>
                  )}
                </>
              )}

              {mode === "Yuvarlanma" && (
                <>
                  <div>
                    <label className="text-sm font-medium block">Eğim Açısı: <span className="font-bold text-zinc-900">{elevation}°</span></label>
                    <input type="range" min="5" max="60" value={elevation} onChange={e => setElevation(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Yükseklik: <span className="font-bold text-zinc-900">{rampHeight} m</span></label>
                    <input type="range" min="1" max="10" value={rampHeight} onChange={e => setRampHeight(Number(e.target.value))} className="w-full" />
                  </div>
                </>
              )}

              {mode === "Açısal Momentum" && subModeMomentum === "Dönüşçü" && (
                <>
                  <div>
                    <label className="text-sm font-medium block">Kol Uzunluğu: <span className="font-bold text-blue-600">{armLength} m</span></label>
                    <input type="range" min="0.2" max="2" step="0.1" value={armLength} onChange={e => setArmLength(Number(e.target.value))} className="w-full" />
                  </div>
                  <button onClick={() => setIsArmsOpen(!isArmsOpen)} className="w-full py-2 bg-zinc-900 text-white rounded-lg font-bold">
                    Kolları {isArmsOpen ? "İçeri Al" : "Dışarı Aç"}
                  </button>
                </>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={() => setIsRunning(!isRunning)} 
                  className={`flex-1 py-3 rounded-lg font-bold text-white transition-all ${isRunning ? "bg-red-500" : "bg-blue-600"}`}
                >
                  {isRunning ? (mode === "Yuvarlanma" ? "Durdur" : "Durdur") : (mode === "Yuvarlanma" ? "Bırak" : "Başlat")}
                </button>
                <button onClick={reset} className="px-4 py-2 border rounded-lg font-bold text-zinc-600">Sıfırla</button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Gözlem Paneli</h4>
            <div className="grid grid-cols-2 gap-3">
               <Readout label="Atalet Momenti" value={I_current.toFixed(2)} unit="kg·m²" />
               <Readout label="Açısal Hız" value={(mode === "Dönme" ? currentOmega : (isArmsOpen?initOmega:initOmega*3)).toFixed(2)} unit="rad/s" />
               <Readout label="Açısal Mom." value={L_current.toFixed(2)} unit="kg·m²/s" />
            </div>
          </div>
          
          {mode === "Yuvarlanma" && (
            <CompletionCheck 
              value={velocities.sphere} 
              target={simulationData.zorunlu_deney.hedef_aralik} 
              description={simulationData.zorunlu_deney.aciklama} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Readout({ label, value, unit }: { label: string, value: string, unit: string }) {
    return (
        <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
            <p className="text-[10px] text-zinc-500 uppercase font-bold">{label}</p>
            <p className="text-lg font-mono font-bold text-zinc-900">{value}</p>
            <p className="text-[9px] text-zinc-400 font-medium">{unit}</p>
        </div>
    );
}
