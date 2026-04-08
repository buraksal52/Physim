"use client";

interface VerticalThrowObservationPanelProps {
  currentY: number;
  currentV: number;
  elapsedTime: number;
  hMax: number;
  isRunning: boolean;
  isFinished: boolean;
  atPeak: boolean;
}

export default function VerticalThrowObservationPanel({
  currentY,
  currentV,
  elapsedTime,
  hMax,
  isRunning,
  isFinished,
  atPeak,
}: VerticalThrowObservationPanelProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
        Gözlem Paneli
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <Readout
          label="Yükseklik (y)"
          value={`${currentY.toFixed(2)} m`}
          active={isRunning}
        />
        <Readout
          label="Hız (v)"
          value={`${currentV.toFixed(2)} m/s`}
          active={isRunning}
        />
        <Readout
          label="Geçen Süre (t)"
          value={`${elapsedTime.toFixed(2)} s`}
          active={isRunning}
        />
        <Readout
          label="Maks. Yükseklik"
          value={`${hMax.toFixed(2)} m`}
          active={false}
          highlight={atPeak}
        />
      </div>

      {atPeak && (
        <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-300 px-4 py-3 animate-pulse">
          <p className="text-sm font-semibold text-yellow-800">
            ⬆ Zirve! Hız sıfıra ulaştı — cisim geri dönüyor.
          </p>
        </div>
      )}

      {isFinished && (
        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Sonuç:</span> Cisim{" "}
            <span className="font-mono font-semibold">
              {elapsedTime.toFixed(2)} s
            </span>{" "}
            sürede yere döndü. Zirve yüksekliği:{" "}
            <span className="font-mono font-semibold">
              {hMax.toFixed(2)} m
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function Readout({
  label,
  value,
  active,
  highlight,
}: {
  label: string;
  value: string;
  active: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-colors ${
        highlight
          ? "border-yellow-300 bg-yellow-50"
          : active
          ? "border-blue-200 bg-blue-50"
          : "border-zinc-100 bg-zinc-50"
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-mono text-lg font-semibold ${
          highlight
            ? "text-yellow-700"
            : active
            ? "text-blue-700"
            : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
