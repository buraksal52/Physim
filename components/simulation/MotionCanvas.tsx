"use client";

import { useState, useRef, useEffect } from "react";
import { Simulasyon } from "@/lib/types";
import CompletionCheck from "./CompletionCheck";
import {
  calculateUniformMotion,
  calculateAcceleratedMotion,
  calculateRelativeVelocity,
  getMotionGraphPoints,
} from "@/lib/physics/motion";

type MotionMode = "duzgun" | "ivmeli" | "grafik" | "bagil";

interface MotionCanvasProps {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}

function MotionControlPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
        Kontrol Paneli
      </h4>
      {children}
    </div>
  );
}

function MotionObservationPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm h-full max-h-[300px] overflow-y-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
        Gözlem Paneli
      </h4>
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

export default function MotionCanvas({
  slug,
  simulation,
  onComplete,
}: MotionCanvasProps) {
  const [mode, setMode] = useState<MotionMode>("duzgun");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="flex justify-center bg-gray-100 p-2 rounded-lg gap-2">
        {(
          [
            { id: "duzgun", label: "Düzgün Hareket" },
            { id: "ivmeli", label: "İvmeli Hareket" },
            { id: "grafik", label: "Grafik Analizi" },
            { id: "bagil", label: "Bağıl Hareket" },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === m.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "duzgun" && (
        <UniformMotionMode simulation={simulation} onComplete={onComplete} />
      )}
      {mode === "ivmeli" && (
        <AcceleratedMotionMode
          slug={slug}
          simulation={simulation}
          onComplete={onComplete}
        />
      )}
      {mode === "grafik" && <GraphAnalysisMode />}
      {mode === "bagil" && <RelativeMotionMode />}
    </div>
  );
}

// ==========================================
// MODE 1: Düzgün Hareket
// ==========================================
function UniformMotionMode({
  simulation,
  onComplete,
}: {
  simulation: Simulasyon;
  onComplete: () => void;
}) {
  const [velocity, setVelocity] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [position, setPosition] = useState(0);

  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);

  const startPause = () => {
    if (!isRunning) {
      prevTimeRef.current = performance.now();
    }
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    setTime(0);
    setPosition(0);
  };

  useEffect(() => {
    if (!isRunning) return;
    const animate = (t: number) => {
      const dt = (t - prevTimeRef.current) / 1000;
      prevTimeRef.current = t;
      setTime((prev) => {
        const nextTime = prev + dt;
        setPosition((calculateUniformMotion(velocity, nextTime).x) % 600);
        return nextTime;
      });
      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [isRunning, velocity]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[200px]">
          <svg width="600" height="200" className="bg-white">
            <defs>
              <pattern
                id="grid-duzgun"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-duzgun)" />
            {/* Road */}
            <line x1="0" y1="160" x2="600" y2="160" stroke="#9ca3af" strokeWidth="4" />
            <text x="10" y="180" className="text-xs fill-zinc-400">0m</text>
            <text x="570" y="180" className="text-xs fill-zinc-400">600m</text>
            
            {/* Car */}
            <rect
              x={position}
              y={120}
              width="60"
              height="30"
              rx="4"
              fill="#2563eb"
            />
          </svg>
        </div>

        <MotionControlPanel>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Hız: {velocity} m/s
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={velocity}
              onChange={(e) => setVelocity(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={startPause}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
            >
              {isRunning ? "Durdur" : "Başlat"}
            </button>
            <button
              onClick={reset}
              className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition"
            >
              Sıfırla
            </button>
          </div>
        </MotionControlPanel>
      </div>
      <div>
        <MotionObservationPanel>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Zaman (t):</span>
            <span className="font-mono font-medium">{time.toFixed(2)} s</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Konum (x):</span>
            <span className="font-mono font-medium">{(velocity * time).toFixed(1)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Hız (v):</span>
            <span className="font-mono font-medium text-blue-600">
              {velocity.toFixed(1)} m/s
            </span>
          </div>
        </MotionObservationPanel>
      </div>
    </div>
  );
}

// ==========================================
// MODE 2: İvmeli Hareket
// ==========================================
function AcceleratedMotionMode({
  slug,
  simulation,
  onComplete,
}: {
  slug: string;
  simulation: Simulasyon;
  onComplete: () => void;
}) {
  const [v0, setV0] = useState(0);
  const [a, setA] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [stopped, setStopped] = useState(false);

  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);

  const currentMotion = calculateAcceleratedMotion(v0, a, time);
  // wrap around visualization
  const visPosition = currentMotion.x % 600;
  const isDeceleratingToStop = a < 0 && currentMotion.v <= 0;

  useEffect(() => {
    if (!isRunning || stopped) return;
    const animate = (t: number) => {
      const dt = (t - prevTimeRef.current) / 1000;
      prevTimeRef.current = t;
      setTime((prev) => {
        const nextTime = prev + dt;
        const motion = calculateAcceleratedMotion(v0, a, nextTime);
        if (a < 0 && motion.v <= 0) {
          setStopped(true);
          return -v0 / a; // Exact time it stopped
        }
        return nextTime;
      });
      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [isRunning, stopped, v0, a]);

  const startPause = () => {
    if (!isRunning && !stopped) {
      prevTimeRef.current = performance.now();
    }
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    setStopped(false);
    setTime(0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex justify-center items-center h-[200px]">
          <svg width="600" height="200" className="bg-white">
            <defs>
              <pattern
                id="grid-ivmeli"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-ivmeli)" />
            {/* Road */}
            <line x1="0" y1="160" x2="600" y2="160" stroke="#9ca3af" strokeWidth="4" />
            
            {/* Car */}
            <rect
              x={Math.max(0, visPosition)}
              y={120}
              width="60"
              height="30"
              rx="4"
              fill="#2563eb"
            />
            
            {stopped && (
              <text x={Math.max(0, visPosition)} y={100} className="fill-red-600 font-bold text-sm">
                DURDU
              </text>
            )}
            
            {!stopped && time < 5 && simulation.zorunlu_deney && (
              <text x={300} y={30} textAnchor="middle" className="fill-gray-400 font-medium text-sm">
                5. saniyeyi bekle...
              </text>
            )}
          </svg>
        </div>

        <MotionControlPanel>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Başlangıç Hızı: {v0} m/s
              </label>
              <input
                type="range"
                min="0"
                max="40"
                value={v0}
                onChange={(e) => { setV0(Number(e.target.value)); reset(); }}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                İvme: {a} m/s²
              </label>
              <input
                type="range"
                min="-10"
                max="10"
                value={a}
                onChange={(e) => { setA(Number(e.target.value)); reset(); }}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={startPause}
              disabled={stopped}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-medium transition"
            >
              {isRunning ? "Durdur" : "Başlat"}
            </button>
            <button
              onClick={reset}
              className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition"
            >
              Sıfırla
            </button>
          </div>
        </MotionControlPanel>
      </div>
      <div className="flex flex-col gap-4">
        <MotionObservationPanel>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Zaman (t):</span>
            <span className="font-mono font-medium">{time.toFixed(2)} s</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Konum (x):</span>
            <span className="font-mono font-medium">{currentMotion.x.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Hız (v):</span>
            <span className="font-mono font-medium text-blue-600">
              {Math.max(0, currentMotion.v).toFixed(1)} m/s
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">İvme (a):</span>
            <span className="font-mono font-medium">
              {a.toFixed(1)} m/s²
            </span>
          </div>
        </MotionObservationPanel>
        {simulation.zorunlu_deney && time >= 4.9 && (
          <CompletionCheck
            slug={slug}
            zorunluDeney={simulation.zorunlu_deney}
            observedValue={currentMotion.v}
            isFinished={stopped || time >= 4.9}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// MODE 3: Grafik Analizi
// ==========================================
function GraphAnalysisMode() {
  const [v0, setV0] = useState(0);
  const [a, setA] = useState(2);
  const [duration, setDuration] = useState(10);
  const [cursorT, setCursorT] = useState(2);

  const points = getMotionGraphPoints(v0, a, duration);
  const maxT = duration;
  const maxX = Math.max(...points.map((p) => Math.abs(p.x)), 10);
  const maxV = Math.max(...points.map((p) => Math.abs(p.v)), 10);

  const mapX = (t: number) => (t / maxT) * 250 + 20;
  const mapY_x = (x: number) => 260 - ((x + maxX) / (2 * maxX)) * 220; // 0 is middle
  const mapY_v = (v: number) => 260 - ((v + maxV) / (2 * maxV)) * 220; // 0 is middle

  const pathX = points.map((p, i) => `${i === 0 ? "M" : "L"} ${mapX(p.t)} ${mapY_x(p.x)}`).join(" ");
  const pathV = points.map((p, i) => `${i === 0 ? "M" : "L"} ${mapX(p.t)} ${mapY_v(p.v)}`).join(" ");
  
  // Polygon for area under v-t graph
  const polygonV = `${pathV} L ${mapX(points[points.length-1].t)} ${mapY_v(0)} L ${mapX(points[0].t)} ${mapY_v(0)} Z`;

  const cursorPoint = points.reduce((prev, curr) => 
    Math.abs(curr.t - cursorT) < Math.abs(prev.t - cursorT) ? curr : prev
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="flex gap-4">
          {/* x-t Graph */}
          <div className="relative bg-white border rounded-xl p-2 w-[290px] h-[300px]">
             <svg width="100%" height="100%">
               <text x="10" y="15" className="text-xs font-bold fill-zinc-700">Konum-Zaman (x-t)</text>
               {/* Axes */}
               <line x1="20" y1="40" x2="20" y2="260" stroke="#9ca3af" />
               <line x1="20" y1="150" x2="270" y2="150" stroke="#9ca3af" />
               {/* Path */}
               <path d={pathX} fill="none" stroke="#16a34a" strokeWidth="2" />
               {/* Cursor */}
               <line x1={mapX(cursorPoint.t)} y1="40" x2={mapX(cursorPoint.t)} y2="260" stroke="#ef4444" strokeDasharray="4" />
               <circle cx={mapX(cursorPoint.t)} cy={mapY_x(cursorPoint.x)} r="4" fill="#ef4444" />
             </svg>
          </div>
          {/* v-t Graph */}
          <div className="relative bg-white border rounded-xl p-2 w-[290px] h-[300px]">
             <svg width="100%" height="100%">
               <text x="10" y="15" className="text-xs font-bold fill-zinc-700">Hız-Zaman (v-t)</text>
               {/* Area */}
               <path d={polygonV} fill="#3b82f6" fillOpacity="0.15" />
               {/* Axes */}
               <line x1="20" y1="40" x2="20" y2="260" stroke="#9ca3af" />
               <line x1="20" y1="150" x2="270" y2="150" stroke="#9ca3af" />
               {/* Path */}
               <path d={pathV} fill="none" stroke="#16a34a" strokeWidth="2" />
               {/* Cursor */}
               <line x1={mapX(cursorPoint.t)} y1="40" x2={mapX(cursorPoint.t)} y2="260" stroke="#ef4444" strokeDasharray="4" />
               <circle cx={mapX(cursorPoint.t)} cy={mapY_v(cursorPoint.v)} r="4" fill="#ef4444" />
               <text x="120" y="80" className="text-xs fill-blue-600 font-semibold">Alan = Δx</text>
             </svg>
          </div>
        </div>

        <MotionControlPanel>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">v₀: {v0} m/s</label>
              <input type="range" min="0" max="30" value={v0} onChange={(e) => setV0(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">a: {a} m/s²</label>
              <input type="range" min="-8" max="8" value={a} onChange={(e) => setA(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Süre: {duration} s</label>
              <input type="range" min="2" max="20" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          </div>
          <div className="mt-4 border-t pt-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Zaman İmleci: {cursorT} s</label>
            <input type="range" min="0" max={duration} step="0.1" value={cursorT} onChange={(e) => setCursorT(Number(e.target.value))} className="w-full" />
          </div>
        </MotionControlPanel>
      </div>
      <div>
        <MotionObservationPanel>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">İmleç Zamanı:</span>
            <span className="font-mono font-medium text-red-600">{cursorPoint.t.toFixed(1)} s</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Konum (x):</span>
            <span className="font-mono font-medium">{cursorPoint.x.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Hız (v):</span>
            <span className="font-mono font-medium text-blue-600">{cursorPoint.v.toFixed(1)} m/s</span>
          </div>
        </MotionObservationPanel>
      </div>
    </div>
  );
}

// ==========================================
// MODE 4: Bağıl Hareket
// ==========================================
function RelativeMotionMode() {
  const [vA, setVA] = useState(20);
  const [vB, setVB] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);

  const reqRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);

  const rel = calculateRelativeVelocity(vA, vB);

  useEffect(() => {
    if (!isRunning) return;
    const animate = (t: number) => {
      const dt = (t - prevTimeRef.current) / 1000;
      prevTimeRef.current = t;
      setTime((prev) => prev + dt);
      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [isRunning]);

  const startPause = () => {
    if (!isRunning) prevTimeRef.current = performance.now();
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    setTime(0);
  };

  const xA = (300 + vA * time) % 600;
  const xB = (300 + vB * time) % 600;
  let status = "Sabit mesafe 🟡";
  if (Math.abs(vA) > Math.abs(vB) && Math.sign(vA) === Math.sign(vB)) status = vA > vB ? "Yaklaşıyor 🟢" : "Uzaklaşıyor 🔴";
  if (Math.sign(vA) !== Math.sign(vB)) {
      // approaching or separating depending on relative positions. simple static logic for now:
      status = "Hızlar Farklı (Uzaklaşıyor/Yaklaşıyor)"; 
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="relative bg-white border rounded-xl overflow-hidden shadow-inner flex flex-col justify-center items-center h-[250px] p-2">
          {/* Reference frame A -> B */}
          <div className="w-full h-16 bg-zinc-100 border-b flex items-center px-4 relative mb-4">
            <span className="absolute top-1 left-2 text-xs font-semibold text-zinc-500">A&apos;ya göre B</span>
            <div className="relative w-full h-8">
               <rect x={(300 + rel.vBA * time) % 600} y="0" width="40" height="20" rx="4" className="fill-orange-600" />
            </div>
          </div>
          {/* Main world */}
          <svg width="600" height="150" className="bg-white">
            <line x1="0" y1="100" x2="600" y2="100" stroke="#9ca3af" strokeWidth="4" />
            {/* A Car */}
            <rect x={(xA + 600) % 600} y="60" width="50" height="20" rx="4" fill="#2563eb" />
            <text x={((xA + 600) % 600) + 20} y="75" fill="white" fontSize="12" fontWeight="bold">A</text>
            {/* B Car */}
            <rect x={(xB + 600) % 600} y="30" width="50" height="20" rx="4" fill="#ea580c" />
            <text x={((xB + 600) % 600) + 20} y="45" fill="white" fontSize="12" fontWeight="bold">B</text>
          </svg>
        </div>

        <MotionControlPanel>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">A Hız: {vA} m/s</label>
              <input type="range" min="-60" max="60" value={vA} onChange={(e) => setVA(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">B Hız: {vB} m/s</label>
              <input type="range" min="-60" max="60" value={vB} onChange={(e) => setVB(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={startPause} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition">
              {isRunning ? "Durdur" : "Başlat"}
            </button>
            <button onClick={reset} className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition">
              Sıfırla
            </button>
          </div>
        </MotionControlPanel>
      </div>
      <div>
        <MotionObservationPanel>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">v_A:</span>
            <span className="font-mono font-medium text-blue-600">{vA} m/s</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">v_B:</span>
            <span className="font-mono font-medium text-orange-600">{vB} m/s</span>
          </div>
          <div className="flex justify-between border-b pb-2 mt-2">
            <span className="text-gray-600">v_AB (B&apos;ye göre A):</span>
            <span className="font-mono font-medium">{rel.vAB} m/s</span>
          </div>
          <div className="flex justify-between pb-2 border-b mt-2">
            <span className="text-gray-600">v_BA (A&apos;ya göre B):</span>
            <span className="font-mono font-medium">{rel.vBA} m/s</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-gray-600">Durum:</span>
            <span className="font-medium text-zinc-900">{status}</span>
          </div>
        </MotionObservationPanel>
      </div>
    </div>
  );
}