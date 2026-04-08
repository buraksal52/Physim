"use client";

interface AngledThrowObservationPanelProps {
  currentX: number;
  currentY: number;
  elapsedTime: number;
  totalRange: number;
  hMax: number;
  isRunning: boolean;
  isFinished: boolean;
}

export default function AngledThrowObservationPanel({
  currentX,
  currentY,
  elapsedTime,
  totalRange,
  hMax,
  isRunning,
  isFinished,
}: AngledThrowObservationPanelProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
        Gözlem Paneli
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <Readout
          label="Yatay Konum (x)"
          value={`${currentX.toFixed(2)} m`}
          active={isRunning}
        />
        <Readout
          label="Düşey Konum (y)"
          value={`${Math.max(0, currentY).toFixed(2)} m`}
          active={isRunning}
        />
        <Readout
          label="Geçen Süre (t)"
          value={`${elapsedTime.toFixed(2)} s`}
          active={isRunning}
        />
        <Readout
          label="Anlık Yükseklik"
          value={`${Math.max(0, currentY).toFixed(2)} m`}
          active={isRunning}
        />
      </div>

      {isFinished && (
        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Sonuç:</span> Cisim maksimum{" "}
            <span className="font-mono font-semibold">{hMax.toFixed(2)} m</span>{" "}
            yüksekliğe ulaştı ve yere düştüğünde menzili{" "}
            <span className="font-mono font-semibold">{totalRange.toFixed(2)} m</span>{" "}
            oldu.
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
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-colors ${
        active ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-mono text-lg font-semibold ${
          active ? "text-blue-700" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
