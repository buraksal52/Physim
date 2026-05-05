"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { getCircularPosition } from "@/lib/physics/circularMotion";
import CompletionCheck from "./CompletionCheck";

interface CircularMotionCanvasProps {
  simulationData: any;
}

type Mode = "Düzgün Çembersel Hareket" | "Merkezcil Kuvvet";
type Scenario = "A" | "B" | "C";

export default function CircularMotionCanvas({ simulationData }: CircularMotionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("Düzgün Çembersel Hareket");
  const [scenario, setScenario] = useState<Scenario>("A");
  
  // Controls
  const [radius, setRadius] = useState(5);
  const [velocity, setVelocity] = useState(10);
  const [mass, setMass] = useState(3);
  const [isClockwise, setIsClockwise] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [maxTension, setMaxTension] = useState(200);
  const [mu, setMu] = useState(0.5);
  const gravity = 9.81;

  // Animation state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [trail, setTrail] = useState<{ x: number, y: number, time: number }[]>([]);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const [status, setStatus] = useState<"normal" | "broken" | "skidding" | "falling">("normal");

  const CANVAS_WIDTH = 560;
  const CANVAS_HEIGHT = 500;
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const PIXELS_PER_METER = 20;

  // Derived physics
  const omega = velocity / radius;
  const signedOmega = isClockwise ? omega : -omega;
  const period = (2 * Math.PI) / omega;
  const frequency = 1 / period;
  const ac = (velocity * velocity) / radius;
  const fc = mass * ac;

  const currentPos = useMemo(() => {
    if (status !== "normal") {
       // Calculation for decoupled motion would be here, but using simplified logic:
       // The requirement says "animate flying off tangentially as a straight dotted line"
       // We'll handle this in the draw loop with a snapshot of break-off velocity
    }
    return getCircularPosition(centerX, centerY, radius * PIXELS_PER_METER, signedOmega, elapsed);
  }, [centerX, centerY, radius, signedOmega, elapsed, status]);

  // Handle Animation
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== undefined && isRunning) {
        const deltaTime = (time - lastTimeRef.current) / 1000;
        
        let shouldStop = false;
        if (mode === "Merkezcil Kuvvet") {
          if (scenario === "A" && fc > maxTension) {
            setStatus("broken");
            shouldStop = true;
          } else if (scenario === "B" && fc > mu * mass * gravity) {
            setStatus("skidding");
            shouldStop = true;
          } else if (scenario === "C") {
            // Check top condition for vertical loop
            // In vertical loop, at the top, gravity points down, Fc = N + mg.
            // Minimum speed for v_min = sqrt(g*r)
            const angleDeg = (currentPos.angle * 180 / Math.PI) % 360;
            // Depending on coordinate system, top might be around -90 or 270 deg
            // Let's assume standard math coords where sin(-pi/2) = -1 (down) 
            // Our Y is flipped in canvas, so sin(-pi/2) is UP.
            if (Math.sin(currentPos.angle) < -0.98 && velocity < Math.sqrt(gravity * radius)) {
                setStatus("falling");
                shouldStop = true;
            }
          }
        }

        if (!shouldStop) {
          setElapsed(prev => prev + deltaTime);
          if (showTrail) {
            setTrail(prev => [
              ...prev.filter(p => time/1000 - p.time < 2),
              { x: currentPos.x, y: currentPos.y, time: time/1000 }
            ]);
          }
        } else {
          setIsRunning(false);
        }
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, mode, scenario, fc, maxTension, mu, mass, radius, velocity, currentPos, showTrail, status]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_WIDTH; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += 40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke();
    }

    // Trajectory
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#16a34a";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * PIXELS_PER_METER, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scenario Backgrounds
    if (mode === "Merkezcil Kuvvet" && scenario === "B") {
        ctx.fillStyle = "#f3f4f6";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * PIXELS_PER_METER + 20, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, radius * PIXELS_PER_METER - 20, 0, Math.PI * 2, true);
        ctx.fill();
    }

    // Trail
    if (showTrail && status === "normal") {
      ctx.fillStyle = "#16a34a33";
      trail.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Radius line / String
    if (scenario === "A" && status !== "broken" && mode === "Merkezcil Kuvvet") {
        ctx.strokeStyle = "#71717a";
        ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(currentPos.x, currentPos.y); ctx.stroke();
    } else if (mode === "Düzgün Çembersel Hareket") {
        ctx.strokeStyle = "#d4d4d8";
        ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(currentPos.x, currentPos.y); ctx.stroke();
    }

    // Object
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(currentPos.x, currentPos.y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Vectors
    const drawArrow = (x: number, y: number, vx: number, vy: number, color: string, label?: string) => {
        const angle = Math.atan2(vy, vx);
        const length = Math.sqrt(vx * vx + vy * vy);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + vx, y + vy);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + vx, y + vy);
        ctx.lineTo(x + vx - 10 * Math.cos(angle - Math.PI/6), y + vy - 10 * Math.sin(angle - Math.PI/6));
        ctx.lineTo(x + vx - 10 * Math.cos(angle + Math.PI/6), y + vy - 10 * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fill();

        if (label) {
            ctx.font = "12px sans-serif";
            ctx.fillText(label, x + vx + 5, y + vy + 5);
        }
    };

    if (status === "normal") {
        // Velocity (blue)
        drawArrow(currentPos.x, currentPos.y, currentPos.vx * 2, currentPos.vy * 2, "#2563eb", "v");
        // Acceleration/Force (red)
        const ax_dir = -Math.cos(currentPos.angle);
        const ay_dir = -Math.sin(currentPos.angle);
        const forceMagn = mode === "Merkezcil Kuvvet" ? Math.min(fc, 100) : Math.min(ac, 100);
        drawArrow(currentPos.x, currentPos.y, ax_dir * forceMagn, ay_dir * forceMagn, "#dc2626", mode === "Merkezcil Kuvvet" ? "Fc" : "ac");
    }

    // Angle indicator
    if (mode === "Düzgün Çembersel Hareket") {
        ctx.strokeStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, currentPos.angle);
        ctx.stroke();
        ctx.fillStyle = "#000";
        ctx.fillText(`${((currentPos.angle * 180 / Math.PI) % 360).toFixed(0)}°`, currentPos.x + 15, currentPos.y - 15);
        
        // Rotation indicator
        ctx.strokeStyle = "#ea580c";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, currentPos.angle - 0.5, currentPos.angle + 0.5);
        ctx.stroke();
    }

    // Info Box (90 deg)
    if (mode === "Merkezcil Kuvvet" && status === "normal") {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(currentPos.x - 40, currentPos.y - 40, 30, 20);
        ctx.fillStyle = "#000";
        ctx.fillText("90°", currentPos.x - 35, currentPos.y - 25);
    }

    // Status Badges
    if (status !== "normal") {
        ctx.fillStyle = "#dc2626";
        ctx.font = "bold 20px sans-serif";
        const text = status === "broken" ? "İp Koptu!" : status === "skidding" ? "Kayıyor!" : "Düşüyor!";
        ctx.fillText(text, centerX - 50, centerY - radius * PIXELS_PER_METER - 30);
    }

  }, [currentPos, radius, mode, scenario, status, fc, ac, showTrail, trail, isClockwise]);

  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
    setTrail([]);
    setStatus("normal");
    lastTimeRef.current = undefined;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Mode Selector */}
      <div className="flex bg-zinc-100 p-1 rounded-xl self-center">
        {(["Düzgün Çembersel Hareket", "Merkezcil Kuvvet"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); reset(); }}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-auto"
            />
          </div>

          {/* Scenario Selector */}
          {mode === "Merkezcil Kuvvet" && (
            <div className="flex gap-2 justify-center">
              {[
                { id: "A", label: "İp ile Bağlı Top" },
                { id: "B", label: "Virajdaki Araç" },
                { id: "C", label: "Düşey Düzlem" }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setScenario(s.id as Scenario); reset(); }}
                  className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
                    scenario === s.id ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Key Values Bar */}
          <div className="grid grid-cols-5 gap-2">
             {[
               { label: "T (s)", value: period.toFixed(2) },
               { label: "f (Hz)", value: frequency.toFixed(2) },
               { label: "ω (rad/s)", value: omega.toFixed(2) },
               { label: "v (m/s)", value: velocity.toFixed(2) },
               { label: "ac (m/s²)", value: ac.toFixed(2) }
             ].map(item => (
                <div key={item.label} className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">{item.label}</p>
                    <p className="text-sm font-mono font-bold text-zinc-900">{item.value}</p>
                </div>
             ))}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Controls */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Kontrol Paneli</h4>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-2">Yarıçap r: <span className="text-blue-600 font-bold">{radius} m</span></label>
                <input type="range" min="1" max="10" value={radius} onChange={e => setRadius(Number(e.target.value))} className="w-full accent-blue-600" />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-2">Hız v: <span className="text-blue-600 font-bold">{velocity} m/s</span></label>
                <input type="range" min="1" max="30" value={velocity} onChange={e => setVelocity(Number(e.target.value))} className="w-full accent-blue-600" />
              </div>

              {mode === "Merkezcil Kuvvet" && (
                <div>
                  <label className="text-sm font-medium text-zinc-700 block mb-2">Kütle m: <span className="text-blue-600 font-bold">{mass} kg</span></label>
                  <input type="range" min="1" max="50" value={mass} onChange={e => setMass(Number(e.target.value))} className="w-full accent-blue-600" />
                </div>
              )}

              {mode === "Düzgün Çembersel Hareket" ? (
                <button 
                  onClick={() => setIsClockwise(!isClockwise)}
                  className="w-full py-2 border rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  Yön: {isClockwise ? "Saat Yönü" : "Saat Yönünün Tersi"}
                </button>
              ) : (
                scenario === "A" ? (
                  <div>
                    <label className="text-sm font-medium text-zinc-700 block mb-2">Max Gerilme: <span className="text-red-600 font-bold">{maxTension} N</span></label>
                    <input type="range" min="10" max="500" value={maxTension} onChange={e => setMaxTension(Number(e.target.value))} className="w-full accent-red-600" />
                  </div>
                ) : scenario === "B" ? (
                   <div>
                    <label className="text-sm font-medium text-zinc-700 block mb-2">Sürtünme μ: <span className="text-green-600 font-bold">{mu}</span></label>
                    <input type="range" min="0.1" max="0.9" step="0.1" value={mu} onChange={e => setMu(Number(e.target.value))} className="w-full accent-green-600" />
                  </div>
                ) : null
              )}

              {mode === "Düzgün Çembersel Hareket" && (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showTrail} onChange={e => setShowTrail(e.target.checked)} className="rounded border-zinc-300" />
                    <span className="text-sm font-medium text-zinc-700">İz Bırak</span>
                </label>
              )}

              <div className="flex gap-2">
                <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 py-3 rounded-lg font-bold text-white transition-all ${isRunning ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {isRunning ? "Durdur" : "Başlat"}
                </button>
                <button onClick={reset} className="px-4 py-2 border border-zinc-300 rounded-lg text-sm font-bold text-zinc-600 hover:bg-zinc-50">Sıfırla</button>
              </div>
            </div>
          </div>

          {/* Observation */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Gözlem Paneli</h4>
            <div className="grid grid-cols-2 gap-2">
                <Readout label="Açı" value={`${((currentPos.angle * 180 / Math.PI) % 360).toFixed(1)}°`} />
                <Readout label="x (m)" value={(currentPos.x/PIXELS_PER_METER).toFixed(1)} />
                <Readout label="y (m)" value={(currentPos.y/PIXELS_PER_METER).toFixed(1)} />
                <Readout label="Fc (N)" value={fc.toFixed(1)} />
                {scenario === "B" && mode === "Merkezcil Kuvvet" && (
                    <Readout label="Max Sürtünme" value={(mu * mass * gravity).toFixed(1)} highlight={fc > mu * mass * gravity} />
                )}
                {scenario === "A" && mode === "Merkezcil Kuvvet" && (
                    <Readout label="Max Gerilme" value={maxTension.toFixed(0)} highlight={fc > maxTension} />
                )}
            </div>
          </div>

          <CompletionCheck 
            value={fc} 
            target={simulationData.zorunlu_deney.hedef_aralik} 
            description={simulationData.zorunlu_deney.aciklama}
          />
        </div>
      </div>
    </div>
  );
}

function Readout({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
    return (
        <div className={`p-2 rounded-lg border ${highlight ? "bg-red-50 border-red-200" : "bg-zinc-50 border-zinc-100"}`}>
            <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
            <p className={`font-mono font-bold ${highlight ? "text-red-700" : "text-zinc-900"}`}>{value}</p>
        </div>
    );
}
