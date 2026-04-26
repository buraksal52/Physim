"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import CompletionCheck from "./CompletionCheck";
import { calculateCenterOfMass } from "@/lib/physics/centerOfMass";

// Types
type Mode = "nokta" | "sekil";

interface PointMass {
  id: string;
  m: number;
  x: number;
  y: number;
}

interface ComponentShape {
  id: string;
  w: number; // width in grid units
  h: number; // height in grid units
  x: number; // top-left x in grid units
  y: number; // top-left y in grid units
  density: number; // 1x to 5x
}

interface CenterOfMassCanvasProps {
  slug: string;
  simulation: any;
  onComplete?: () => void;
}

export default function CenterOfMassCanvas({
  slug,
  simulation,
  onComplete,
}: CenterOfMassCanvasProps) {
  const [mode, setMode] = useState<Mode>("nokta");

  // MODE 1 State 
  const [pointMasses, setPointMasses] = useState<PointMass[]>([]);
  const [newMassInput, setNewMassInput] = useState<number>(5);
  const [isAddingMass, setIsAddingMass] = useState(false);
  const [draggingMassId, setDraggingMassId] = useState<string | null>(null);

  // MODE 2 State
  const [shapes, setShapes] = useState<ComponentShape[]>([]);

  // Simulation Results
  const [xcm, setXcm] = useState(0);
  const [ycm, setYcm] = useState(0);
  const [totalMass, setTotalMass] = useState(0);

  // General references
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Settings
  const width = 600;
  const height = 500;
  const gridSpacing = 50;
  const originX = width / 2;
  const originY = height / 2;

  // Auto calculate when masses change
  useEffect(() => {
    if (mode === "nokta") {
      const res = calculateCenterOfMass(pointMasses);
      setXcm(res.xcm);
      setYcm(res.ycm);
      setTotalMass(res.totalMass);
    } else {
      // Shape mode calculation
      const shapeMasses = shapes.map(s => {
        const area = s.w * s.h;
        const m = area * s.density;
        // centroid of rect
        const cx = s.x + s.w / 2;
        const cy = s.y - s.h / 2; // y is up in logic
        return { m, x: cx, y: cy };
      });
      const res = calculateCenterOfMass(shapeMasses);
      setXcm(res.xcm);
      setYcm(res.ycm);
      setTotalMass(res.totalMass);
    }
  }, [pointMasses, shapes, mode]);

  // Helpers
  const getSimCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = clientX - rect.left;
    const svgY = clientY - rect.top;
    
    // Pixel to Unit
    const uX = (svgX - originX) / gridSpacing;
    const uY = (originY - svgY) / gridSpacing;
    return { x: uX, y: uY };
  };

  const getPixelCoords = (uX: number, uY: number) => {
    return {
      x: originX + uX * gridSpacing,
      y: originY - uY * gridSpacing,
    };
  };

  // Interactions (Mode 1)
  const handleSvgPointerDown = (e: MouseEvent<SVGSVGElement>) => {
    if (mode !== "nokta") return;

    if (isAddingMass) {
      const { x, y } = getSimCoords(e.clientX, e.clientY);
      const newMass: PointMass = {
        id: Math.random().toString(36).substring(7),
        m: newMassInput,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
      };
      setPointMasses([...pointMasses, newMass]);
      setIsAddingMass(false);
    }
  };

  const handlePointerDownMass = (id: string, e: MouseEvent<SVGCircleElement>) => {
    if (mode !== "nokta") return;
    e.stopPropagation();
    setDraggingMassId(id);
  };

  const handlePointerMove = (e: MouseEvent<SVGSVGElement>) => {
    if (mode === "nokta" && draggingMassId) {
      const { x, y } = getSimCoords(e.clientX, e.clientY);
      setPointMasses(prev => prev.map(m => m.id === draggingMassId ? { ...m, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : m));
    }
  };

  const handlePointerUp = () => {
    setDraggingMassId(null);
  };

  // Preset Shapes (Mode 2)
  const addPresetShape = (type: "rect" | "L" | "T" | "U") => {
    let newShapes: ComponentShape[] = [];
    if (type === "rect") {
      newShapes = [
        { id: Math.random().toString(36).substring(7), w: 4, h: 2, x: -2, y: 1, density: 1 }
      ];
    } else if (type === "L") {
      newShapes = [
        { id: Math.random().toString(36).substring(7), w: 2, h: 6, x: -3, y: 3, density: 1 },
        { id: Math.random().toString(36).substring(7), w: 4, h: 2, x: -1, y: -1, density: 1 }
      ];
    } else if (type === "T") {
      newShapes = [
        { id: Math.random().toString(36).substring(7), w: 6, h: 2, x: -3, y: 4, density: 1 },
        { id: Math.random().toString(36).substring(7), w: 2, h: 4, x: -1, y: 2, density: 1 }
      ];
    } else if (type === "U") {
      newShapes = [
        { id: Math.random().toString(36).substring(7), w: 2, h: 6, x: -4, y: 3, density: 1 },
        { id: Math.random().toString(36).substring(7), w: 6, h: 2, x: -4, y: -1, density: 1 },
        { id: Math.random().toString(36).substring(7), w: 2, h: 6, x: 0, y: 3, density: 1 }
      ];
    }
    setShapes(newShapes);
  };

  // Rendering
  const renderGrid = () => {
    const lines = [];
    // Vertical lines
    for (let x = originX % gridSpacing; x <= width; x += gridSpacing) {
      lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#e5e7eb" strokeWidth={x === originX ? 2 : 1} />);
    }
    // Horizontal lines
    for (let y = originY % gridSpacing; y <= height; y += gridSpacing) {
      lines.push(<line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#e5e7eb" strokeWidth={y === originY ? 2 : 1} />);
    }
    return lines;
  };

  const cmPixel = getPixelCoords(xcm, ycm);

  // Check if CM is outside composition (Mode 2)
  const isCmOutside = () => {
    if (mode === "nokta" || shapes.length === 0) return false;
    // Check if xcm, ycm is strictly outside all rects
    for (const s of shapes) {
      if (xcm >= s.x && xcm <= s.x + s.w && ycm <= s.y && ycm >= s.y - s.h) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="flex flex-col gap-6">
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulation.zorunlu_deney}
        observedValue={xcm}
        isFinished={false}
      />

      <div className="flex justify-center gap-4">
        <button
          onClick={() => setMode("nokta")}
          className={`px-4 py-2 rounded-lg font-medium transition ${mode === "nokta" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Nokta Kütleler
        </button>
        <button
          onClick={() => setMode("sekil")}
          className={`px-4 py-2 rounded-lg font-medium transition ${mode === "sekil" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Şekil Analizi
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Canvas Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative cursor-crosshair">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">
              {mode === "nokta" ? "Koordinat Sistemi" : "Çalışma Alanı"}
            </h3>
            {mode === "nokta" && (
              <div className="flex gap-2">
                <button onClick={() => setPointMasses(prev => prev.slice(0, -1))} className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Geri Al</button>
                <button onClick={() => setPointMasses([])} className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100">Temizle</button>
              </div>
            )}
            {mode === "sekil" && (
              <button onClick={() => setShapes([])} className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100">Temizle</button>
            )}
          </div>
          
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className={`bg-white rounded-lg border border-gray-200 ${isAddingMass ? "cursor-crosshair" : ""}`}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {renderGrid()}

            {/* Default axes text */}
            <text x={width - 20} y={originY - 10} className="text-xs fill-zinc-900 font-bold">X</text>
            <text x={originX + 10} y={20} className="text-xs fill-zinc-900 font-bold">Y</text>

            {/* Mode 1 Render */}
            {mode === "nokta" && (
              <>
                {/* Connections to CM */}
                {totalMass > 0 && pointMasses.map(m => {
                  const p = getPixelCoords(m.x, m.y);
                  return <line key={`l-${m.id}`} x1={p.x} y1={p.y} x2={cmPixel.x} y2={cmPixel.y} stroke="#cbd5e1" strokeDasharray="4,4" strokeWidth={1} />;
                })}

                {/* Point Masses */}
                {pointMasses.map(m => {
                  const p = getPixelCoords(m.x, m.y);
                  const r = Math.max(10, Math.min(30, 10 + m.m)); // scaled radius based on mass
                  return (
                    <g key={m.id} className="cursor-grab active:cursor-grabbing" onPointerDown={(e) => handlePointerDownMass(m.id, e)}>
                      <circle cx={p.x} cy={p.y} r={r} fill="#2563eb" opacity={draggingMassId === m.id ? 0.7 : 1} />
                      <text x={p.x} y={p.y} fill="white" fontSize={12} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none select-none">
                        {m.m}
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {/* Mode 2 Render */}
            {mode === "sekil" && (
              <>
                {/* Shapes */}
                {shapes.map((s, i) => {
                  const p = getPixelCoords(s.x, s.y);
                  const wPx = s.w * gridSpacing;
                  const hPx = s.h * gridSpacing;
                  // centroid
                  const cx = s.x + s.w / 2;
                  const cy = s.y - s.h / 2;
                  const cp = getPixelCoords(cx, cy);

                  return (
                    <g key={s.id}>
                      <rect x={p.x} y={p.y} width={wPx} height={hPx} fill="#2563eb" fillOpacity={s.density * 0.15 + 0.1} stroke="#1d4ed8" strokeWidth={2} />
                      <circle cx={cp.x} cy={cp.y} r={4} fill="#ea580c" />
                      <text x={cp.x} y={cp.y - 8} fill="#ea580c" fontSize={10} textAnchor="middle" className="font-bold pointer-events-none select-none">
                        {Math.round(s.w * s.h * s.density)} kg
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {/* Center of Mass Indicator */}
            {totalMass > 0 && (
              <g transform={`translate(${cmPixel.x}, ${cmPixel.y})`}>
                <line x1={-10} y1={0} x2={10} y2={0} stroke="#dc2626" strokeWidth={2} />
                <line x1={0} y1={-10} x2={0} y2={10} stroke="#dc2626" strokeWidth={2} />
                <circle cx={0} cy={0} r={4} fill="#dc2626" />
                {mode === "sekil" && isCmOutside() && (
                  <g>
                    <circle cx={0} cy={0} r={16} fill="none" stroke="#dc2626" strokeDasharray="3,3" strokeWidth={2} />
                    <text x={0} y={-22} fill="#dc2626" fontSize={12} textAnchor="middle" className="font-bold shadow-sm">Cisim dışında</text>
                  </g>
                )}
              </g>
            )}
          </svg>
        </div>

        {/* Control and Observation Panel Area */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Kontroller</h3>
            
            {mode === "nokta" ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                  <p className="text-sm text-blue-800">
                    Tuvale kütle eklemek için kütle değerini seçin ve &quot;Kütle Ekle&quot;yi tıklayıp çalışma alanında istediğiniz yere dokunun.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yeni Kütle Büyüklüğü (kg)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      min="1" 
                      max="20" 
                      value={newMassInput} 
                      onChange={(e) => setNewMassInput(Number(e.target.value) || 1)}
                      className="border border-gray-300 rounded px-3 py-2 w-24 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      onClick={() => setIsAddingMass(true)}
                      className={`px-4 py-2 rounded font-medium transition ${isAddingMass ? "bg-amber-500 text-white animate-pulse" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      {isAddingMass ? "Konum Seçiniz..." : "+ Kütle Ekle"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hazır Şekiller
                  </label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <button onClick={() => addPresetShape("rect")} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition text-sm">Dikdörtgen</button>
                    <button onClick={() => addPresetShape("L")} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition text-sm">L Şekli</button>
                    <button onClick={() => addPresetShape("T")} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition text-sm">T Şekli</button>
                    <button onClick={() => addPresetShape("U")} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition text-sm">U Şekli</button>
                  </div>
                </div>

                {shapes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 border-b pb-2">Alt Bölgeler</h4>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {shapes.map((s, idx) => (
                        <div key={s.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                          <div className="font-medium text-sm text-gray-800 mb-2">Bölge {idx + 1}</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <label className="block text-xs text-gray-500">Genişlik</label>
                              <input type="number" min="1" max="10" value={s.w} onChange={e => setShapes(prev => prev.map(sh => sh.id === s.id ? { ...sh, w: Number(e.target.value) } : sh))} className="w-full border rounded p-1"/>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500">Yükseklik</label>
                              <input type="number" min="1" max="10" value={s.h} onChange={e => setShapes(prev => prev.map(sh => sh.id === s.id ? { ...sh, h: Number(e.target.value) } : sh))} className="w-full border rounded p-1"/>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500">Yoğunluk Çarpanı ({s.density}x)</label>
                              <input type="range" min="1" max="5" step="0.5" value={s.density} onChange={e => setShapes(prev => prev.map(sh => sh.id === s.id ? { ...sh, density: Number(e.target.value) } : sh))} className="w-full accent-blue-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display">Gözlem Paneli</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3">Parça</th>
                    <th className="py-2 px-3">Kütle (m)</th>
                    <th className="py-2 px-3">X Konumu</th>
                    <th className="py-2 px-3">Y Konumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {mode === "nokta" ? (
                    pointMasses.map((m, i) => (
                      <tr key={m.id}>
                        <td className="py-2 px-3 font-medium">m{i + 1}</td>
                        <td className="py-2 px-3">{m.m} kg</td>
                        <td className="py-2 px-3">{m.x.toFixed(1)}</td>
                        <td className="py-2 px-3">{m.y.toFixed(1)}</td>
                      </tr>
                    ))
                  ) : (
                    shapes.map((s, i) => {
                      const m = s.w * s.h * s.density;
                      const cx = s.x + s.w / 2;
                      const cy = s.y - s.h / 2;
                      return (
                        <tr key={s.id}>
                          <td className="py-2 px-3 font-medium">Bölge {i + 1}</td>
                          <td className="py-2 px-3">{m.toFixed(1)} kg</td>
                          <td className="py-2 px-3">{cx.toFixed(1)}</td>
                          <td className="py-2 px-3">{cy.toFixed(1)}</td>
                        </tr>
                      );
                    })
                  )}
                  
                  {/* Results Row */}
                  <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold text-blue-900">
                    <td className="py-3 px-3">Sistem</td>
                    <td className="py-3 px-3">{totalMass.toFixed(1)} kg</td>
                    <td className="py-3 px-3">x_{"{cm}"}: {xcm.toFixed(2)}</td>
                    <td className="py-3 px-3">y_{"{cm}"}: {ycm.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              {totalMass === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  Değerleri Görmek İçin Çalışma Alanına Kütle Ekleyin.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}