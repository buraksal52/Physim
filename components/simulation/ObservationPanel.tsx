"use client";

interface ObservationPanelProps {
  height: number;
  currentVelocity: number;
  elapsedTime: number;
  currentDistance: number;
  isRunning: boolean;
  isFinished: boolean;
}

export default function ObservationPanel({
  height,
  currentVelocity,
  elapsedTime,
  currentDistance,
  isRunning,
  isFinished,
}: ObservationPanelProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
        Gözlem Paneli
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <Readout
          label="Yükseklik (h)"
          value={`${height.toFixed(1)} m`}
          active={false}
        />
        <Readout
          label="Düşülen Yol"
          value={`${currentDistance.toFixed(2)} m`}
          active={isRunning}
        />
        <Readout
          label="Anlık Hız (v)"
          value={`${currentVelocity.toFixed(2)} m/s`}
          active={isRunning}
        />
        <Readout
          label="Geçen Süre (t)"
          value={`${elapsedTime.toFixed(2)} s`}
          active={isRunning}
        />
      </div>
      {isFinished && (
        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Sonuç:</span> Cisim{" "}
            <span className="font-mono font-semibold">
              {elapsedTime.toFixed(2)} s
            </span>{" "}
            sürede yere ulaştı. Son hız:{" "}
            <span className="font-mono font-semibold">
              {currentVelocity.toFixed(2)} m/s
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
