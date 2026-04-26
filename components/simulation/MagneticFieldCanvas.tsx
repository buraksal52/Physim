"use client";

import React, { useState, useEffect, useRef } from "react";
import CompletionCheck from "./CompletionCheck";
import {
  calculateStraightWireField,
  calculateSolenoidField,
  calculateFieldAtPoint,
} from "@/lib/physics/magneticField";

// In-file components for panels
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

const PIXELS_PER_METER = 500; // 0.2m = 100px

interface Wire {
  id: number;
  x: number; // in meters (from center)
  y: number; // in meters (from center)
  I: number; // signed current, >0 means out of page
}

export default function MagneticFieldCanvas({
  slug,
  simulation,
  onComplete,
}: {
  slug: string;
  simulation: any;
  onComplete: () => void;
}) {
  const [mode, setMode] = useState<"duz-tel" | "solenoid">("duz-tel");

  // Mode 1: Düz Tel
  const [wires, setWires] = useState<Wire[]>([{ id: 1, x: 0, y: 0, I: 10 }]);
  const [markerPos, setMarkerPos] = useState<{ x: number; y: number } | null>(null); // in meters from center
  const [isSecondWireEnabled, setIsSecondWireEnabled] = useState(false);
  const [draggingWireId, setDraggingWireId] = useState<number | null>(null);
  const canvasRef1 = useRef<SVGSVGElement>(null);

  // Measurement state for tracking
  const [alanSiddeti, setAlanSiddeti] = useState(0); // in microTesla

  // Mode 2: Solenoid
  const [N, setN] = useState(500);
  const [L, setL] = useState(0.25);
  const [Isol, setIsol] = useState(2);
  const [solYön, setSolYön] = useState<"sag-sol" | "sol-sag">("sol-sag");
  const [crossSection, setCrossSection] = useState(false);

  // Calculate fields
  const fieldAtMarker = markerPos
    ? calculateFieldAtPoint(wires, markerPos.x, markerPos.y)
    : null;

  useEffect(() => {
    if (fieldAtMarker) {
      setAlanSiddeti(fieldAtMarker.magnitude * 1e6); // to μT
    } else {
      setAlanSiddeti(0);
    }
  }, [fieldAtMarker]);

  const solB = calculateSolenoidField(N, L, Isol);
  const solB_ic_mT = solB.B * 1e3 * (solYön === "sol-sag" ? 1 : -1);

  // Dragging logic for Mode 1
  const handlePointerDown = (e: React.PointerEvent, id: number) => {
    if (id === 1) return; // Center wire is fixed
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingWireId(id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingWireId && canvasRef1.current) {
      const rect = canvasRef1.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 300;
      const y = e.clientY - rect.top - 250;
      setWires(wires.map(w => w.id === draggingWireId ? { ...w, x: x / PIXELS_PER_METER, y: y / PIXELS_PER_METER } : w));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDraggingWireId(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (draggingWireId || (e.target as any).tagName === "circle" || (e.target as any).tagName === "text") return;
    if (canvasRef1.current) {
      const rect = canvasRef1.current.getBoundingClientRect();
      const px = e.clientX - rect.left - 300;
      const py = e.clientY - rect.top - 250;
      setMarkerPos({ x: px / PIXELS_PER_METER, y: py / PIXELS_PER_METER });
    }
  };

  const handleToggleSecondWire = () => {
    if (isSecondWireEnabled) {
      setWires([wires[0]]);
      setIsSecondWireEnabled(false);
    } else {
      setWires([...wires, { id: 2, x: 0.3, y: 0, I: wires[0].I }]);
      setIsSecondWireEnabled(true);
    }
  };

  // Grid background
  const gridPattern = (
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1" />
    </pattern>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Target Progress */}
      <CompletionCheck
        slug={slug}
        targetVariable={simulation?.zorunlu_deney?.hedef_degisken}
        targetRange={simulation?.zorunlu_deney?.hedef_aralik}
        currentValue={alanSiddeti}
        onComplete={onComplete}
        explanation={simulation?.zorunlu_deney?.aciklama}
      />

      <div className="flex justify-center bg-zinc-100 p-2 rounded-lg gap-2">
        <button
          onClick={() => setMode("duz-tel")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            mode === "duz-tel" ? "bg-white shadow text-blue-600" : "text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          Düz Tel
        </button>
        <button
          onClick={() => setMode("solenoid")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            mode === "solenoid" ? "bg-white shadow text-blue-600" : "text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          Solenoid
        </button>
      </div>

      {mode === "duz-tel" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm flex flex-col items-center p-4">
            <svg
              ref={canvasRef1}
              width={600}
              height={500}
              className="bg-white cursor-crosshair touch-none"
              onClick={handleCanvasClick}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <defs>{gridPattern}</defs>
              <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />
              
              <g transform="translate(300, 250)">
                {/* Single Wire Field Lines */}
                {wires.length === 1 && (
                  <>
                    {[0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4].map((r, i) => {
                      const pixelR = r * PIXELS_PER_METER;
                      const opacity = Math.max(0.1, 1 - r * 2);
                      const isOut = wires[0].I > 0; // Out = CCW, In = CW
                      return (
                        <g key={i} opacity={opacity}>
                          <circle cx="0" cy="0" r={pixelR} fill="none" stroke="#2563eb" strokeWidth="1.5" />
                          {/* Arrows on circle */}
                          {[0, 90, 180, 270].map(angle => {
                            const rad = (angle * Math.PI) / 180;
                            const ax = pixelR * Math.cos(rad);
                            const ay = pixelR * Math.sin(rad);
                            // tangent angle
                            const rot = angle + (isOut ? -90 : 90);
                            return (
                              <polygon
                                key={angle}
                                points={`0,-4 6,0 0,4`}
                                fill="#2563eb"
                                transform={`translate(${ax},${ay}) rotate(${rot})`}
                              />
                            );
                          })}
                        </g>
                      );
                    })}
                  </>
                )}

                {/* Multiple Wires Field Vectors */}
                {wires.length > 1 && (
                  <g opacity={0.6}>
                    {Array.from({ length: 21 }).map((_, ix) =>
                      Array.from({ length: 17 }).map((_, iy) => {
                        const px = (ix - 10) * 0.05;
                        const py = (iy - 8) * 0.05;
                        const field = calculateFieldAtPoint(wires, px, py);
                        if (field.magnitude < 1e-7) return null;
                        const cx = px * PIXELS_PER_METER;
                        const cy = py * PIXELS_PER_METER;
                        const angle = Math.atan2(field.By, field.Bx) * (180 / Math.PI);
                        const opacity = Math.min(1, field.magnitude * 1e5);
                        return (
                          <polygon
                            key={`${ix}-${iy}`}
                            points="0,-2 6,0 0,2"
                            fill="#2563eb"
                            opacity={opacity * 0.5}
                            transform={`translate(${cx}, ${cy}) rotate(${angle})`}
                          />
                        );
                      })
                    )}
                  </g>
                )}

                {/* Wires */}
                {wires.map(w => {
                  const cx = w.x * PIXELS_PER_METER;
                  const cy = w.y * PIXELS_PER_METER;
                  const isOut = w.I > 0;
                  return (
                    <g
                      key={w.id}
                      transform={`translate(${cx}, ${cy})`}
                      onPointerDown={e => handlePointerDown(e, w.id)}
                      className={w.id > 1 ? "cursor-grab active:cursor-grabbing" : ""}
                    >
                      <circle cx="0" cy="0" r="12" fill="white" stroke="#ea580c" strokeWidth="2" />
                      {isOut ? (
                        <circle cx="0" cy="0" r="3" fill="#dc2626" />
                      ) : (
                        <path d="M-5,-5 L5,5 M-5,5 L5,-5" stroke="#1e3a5f" strokeWidth="2" />
                      )}
                    </g>
                  );
                })}

                {/* Marker */}
                {markerPos && (
                  <g transform={`translate(${markerPos.x * PIXELS_PER_METER}, ${markerPos.y * PIXELS_PER_METER})`}>
                    <circle cx="0" cy="0" r="4" fill="#10b981" />
                    {fieldAtMarker && (
                      <g>
                        <line 
                          x1="0" y1="0" 
                          x2={(fieldAtMarker.Bx / fieldAtMarker.magnitude) * 30} 
                          y2={(fieldAtMarker.By / fieldAtMarker.magnitude) * 30} 
                          stroke="#10b981" strokeWidth="2" 
                          markerEnd="url(#arrow-green)"
                        />
                        <defs>
                          <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                          </marker>
                        </defs>
                        <text x="5" y="-10" fill="#10b981" fontSize="12" fontWeight="bold">
                          B ≈ {(fieldAtMarker.magnitude * 1e6).toFixed(1)} μT
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </g>
            </svg>
            <p className="text-xs text-zinc-400 mt-2">Ölçüm yapmak için ekrana tıklayın. İkinci tel eklenirse sürüklenebilir.</p>
          </div>

          <div className="flex flex-col gap-4">
            <CPnl title="Tel Kontrolleri">
              <label className="text-xs font-medium text-zinc-600">
                Akım (A): {Math.abs(wires[0].I).toFixed(1)}
              </label>
              <input
                type="range"
                min="1" max="50" step="1"
                value={Math.abs(wires[0].I)}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  const sign = wires[0].I > 0 ? 1 : -1;
                  setWires(wires.map(w => w.id === 1 ? { ...w, I: val * sign } : w));
                }}
                className="w-full"
              />
              <button
                className="mt-2 text-sm bg-zinc-100 hover:bg-zinc-200 py-1.5 rounded transition-colors"
                onClick={() => setWires(wires.map(w => w.id === 1 ? { ...w, I: -w.I } : w))}
              >
                Yön: {wires[0].I > 0 ? "Sayfadan Dışarı ⊙" : "Sayfaya İçeri ⊗"}
              </button>

              <hr className="my-2 border-zinc-100" />
              
              <button
                className={`text-sm py-1.5 rounded transition-colors ${
                  isSecondWireEnabled ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
                onClick={handleToggleSecondWire}
              >
                {isSecondWireEnabled ? "İkinci Teli Kaldır" : "İkinci Tel Ekle"}
              </button>
              
              {isSecondWireEnabled && (
                <div className="flex flex-col gap-2 p-2 bg-zinc-50 rounded">
                  <span className="text-xs font-medium">2. Tel (Sürüklenebilir)</span>
                  <input
                    type="range"
                    min="1" max="50" step="1"
                    value={Math.abs(wires[1].I)}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      const sign = wires[1].I > 0 ? 1 : -1;
                      setWires(wires.map(w => w.id === 2 ? { ...w, I: val * sign } : w));
                    }}
                  />
                  <button
                    className="text-xs bg-zinc-200 hover:bg-zinc-300 py-1 rounded"
                    onClick={() => setWires(wires.map(w => w.id === 2 ? { ...w, I: -w.I } : w))}
                  >
                    Yön Değiştir
                  </button>
                </div>
              )}
              
              <button
                className="text-sm border border-zinc-200 hover:bg-zinc-50 py-1.5 rounded mt-2 text-zinc-500"
                onClick={() => setMarkerPos(null)}
              >
                İşaretçiyi Sıfırla
              </button>
            </CPnl>

            <CObsPnl title="Ölçümler">
              <span className="text-zinc-500">I_1:</span>
              <span className="font-monotext-zinc-800 text-right">{Math.abs(wires[0].I).toFixed(1)} A</span>
              {isSecondWireEnabled && (
                <>
                  <span className="text-zinc-500">I_2:</span>
                  <span className="font-mono text-zinc-800 text-right">{Math.abs(wires[1].I).toFixed(1)} A</span>
                </>
              )}
              <div className="col-span-2 h-px bg-zinc-200 my-1"></div>
              {markerPos ? (
                <>
                  <span className="text-zinc-500">r_1 uzaklık:</span>
                  <span className="font-mono text-zinc-800 text-right">{Math.hypot(markerPos.x, markerPos.y).toFixed(3)} m</span>
                  <span className="text-zinc-500">B_toplam:</span>
                  <span className="font-mono text-blue-600 font-semibold text-right">{alanSiddeti.toFixed(2)} μT</span>
                </>
              ) : (
                <div className="col-span-2 text-center text-zinc-400 py-2">Henüz ölçüm yapılmadı.</div>
              )}
            </CObsPnl>
          </div>
        </div>
      )}

      {mode === "solenoid" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm flex flex-col items-center justify-center p-4 min-h-[450px]">
            <svg width={600} height={400} className="bg-white">
              <defs>{gridPattern}</defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              <g transform="translate(300, 200)">
                {crossSection ? (
                  // CROSS SECTION VIEW (End view)
                  <g>
                    <circle cx="0" cy="0" r="60" fill="none" stroke="#ea580c" strokeWidth="6" />
                    {/* Inner field pattern (Uniform) */}
                    {Array.from({ length: 49 }).map((_, i) => {
                      const px = (i % 7) - 3;
                      const py = Math.floor(i / 7) - 3;
                      if (px*px + py*py > 7) return null;
                      const cx = px * 15;
                      const cy = py * 15;
                      return solYön === "sol-sag" ? (
                        <circle key={i} cx={cx} cy={cy} r="2" fill="#2563eb" /> // Field into page? No, if current L->R, field goes right. In cross section, maybe out or in. Let's just say "x" or "."
                      ) : (
                        <path key={i} d={`M${cx-2},${cy-2} L${cx+2},${cy+2} M${cx-2},${cy+2} L${cx+2},${cy-2}`} stroke="#2563eb" strokeWidth="1.5" />
                      );
                    })}
                    <text x="0" y="90" textAnchor="middle" fill="#ea580c" fontSize="12">Kesit Görünümü (Akım {solYön === "sol-sag" ? "saat yönü" : "saat yönünün tersi"})</text>
                  </g>
                ) : (
                  // SIDE VIEW
                  <g>
                    {/* Outer field lines looping */}
                    <path d="M-150,0 C-150,-150 150,-150 150,0" fill="none" stroke="#2563eb" strokeWidth="1.5" opacity="0.3" markerEnd="url(#arrow-blue-fade)" />
                    <path d="M-150,0 C-150,150 150,150 150,0" fill="none" stroke="#2563eb" strokeWidth="1.5" opacity="0.3" />
                    <path d="M-150,0 C-250,-250 250,-250 150,0" fill="none" stroke="#2563eb" strokeWidth="1" opacity="0.1" />
                    <path d="M-150,0 C-250,250 250,250 150,0" fill="none" stroke="#2563eb" strokeWidth="1" opacity="0.1" />
                    
                    {/* Inner uniform field */}
                    <g>
                      <line x1="-180" y1="0" x2="180" y2="0" stroke="#2563eb" strokeWidth="2" />
                      <line x1="-160" y1="-25" x2="160" y2="-25" stroke="#2563eb" strokeWidth="1.5" opacity="0.8" />
                      <line x1="-160" y1="25" x2="160" y2="25" stroke="#2563eb" strokeWidth="1.5" opacity="0.8" />
                      
                      {/* Arrows */}
                      <polygon points={solYön === "sol-sag" ? "-10,-5 0,0 -10,5" : "10,-5 0,0 10,5"} fill="#2563eb" transform="translate(0,0)" />
                      <polygon points={solYön === "sol-sag" ? "-10,-5 0,0 -10,5" : "10,-5 0,0 10,5"} fill="#2563eb" transform="translate(80,-25)" />
                      <polygon points={solYön === "sol-sag" ? "-10,-5 0,0 -10,5" : "10,-5 0,0 10,5"} fill="#2563eb" transform="translate(-80,25)" />
                    </g>
                    
                    {/* Solenoid coils */}
                    {Array.from({ length: 20 }).map((_, i) => {
                      const x = -142.5 + i * 15;
                      return (
                        <g key={i} transform={`translate(${x}, 0)`}>
                          <ellipse cx="0" cy="0" rx="6" ry="40" fill="none" stroke="#ea580c" strokeWidth="2" opacity="0.8" />
                        </g>
                      );
                    })}

                    {/* Terminals N/S */}
                    <text x={solYön === "sol-sag" ? -170 : 170} y="60" fontSize="18" fontWeight="bold" fill="#dc2626">S</text>
                    <text x={solYön === "sol-sag" ? 170 : -170} y="60" fontSize="18" fontWeight="bold" fill="#2563eb">N</text>
                  </g>
                )}
              </g>
            </svg>
          </div>

          <div className="flex flex-col gap-4">
            <CPnl title="Solenoid Kontrolleri">
              <label className="text-xs font-medium text-zinc-600">Sarım Sayısı (N): {N}</label>
              <input type="range" min="50" max="2000" step="10" value={N} onChange={e => setN(parseInt(e.target.value))} />

              <label className="text-xs font-medium text-zinc-600">Uzunluk (L): {L.toFixed(2)} m</label>
              <input type="range" min="0.1" max="1.0" step="0.05" value={L} onChange={e => setL(parseFloat(e.target.value))} />

              <label className="text-xs font-medium text-zinc-600">Akım (A): {Isol.toFixed(1)}</label>
              <input type="range" min="0.1" max="20" step="0.1" value={Isol} onChange={e => setIsol(parseFloat(e.target.value))} />

              <button
                className="mt-2 text-sm bg-zinc-100 hover:bg-zinc-200 py-1.5 rounded"
                onClick={() => setSolYön(solYön === "sol-sag" ? "sag-sol" : "sol-sag")}
              >
                Yön: {solYön === "sol-sag" ? "Soldan Sağa" : "Sağdan Sola"}
              </button>

              <button
                className="text-sm border border-zinc-200 py-1.5 rounded mt-2"
                onClick={() => setCrossSection(!crossSection)}
              >
                {crossSection ? "Yandan Görünüm" : "Kesit Görünümü"}
              </button>
            </CPnl>

            <CObsPnl title="Hesaplamalar">
              <span className="text-zinc-500">Sarım/m (n):</span>
              <span className="font-mono text-zinc-800 text-right">{(N / L).toFixed(0)}</span>
              <div className="col-span-2 h-px bg-zinc-200 my-1"></div>
              <span className="text-zinc-500">B_iç (İç Alan):</span>
              <span className="font-mono text-blue-600 font-semibold text-right">{Math.abs(solB_ic_mT).toFixed(3)} mT</span>
              <span className="text-zinc-500">B_dış (Dış Alan):</span>
              <span className="font-mono text-zinc-800 text-right">≈ 0</span>
              <span className="text-zinc-500">Kutuplar:</span>
              <span className="font-mono text-zinc-800 text-right">{solYön === "sol-sag" ? "Sol S, Sağ N" : "Sol N, Sağ S"}</span>
            </CObsPnl>
          </div>
        </div>
      )}
    </div>
  );
}