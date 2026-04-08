"use client";

interface VerticalThrowControlPanelProps {
  v0: number;
  onV0Change: (v: number) => void;
  onStart: () => void;
  onReset: () => void;
  isRunning: boolean;
  isFinished: boolean;
}

export default function VerticalThrowControlPanel({
  v0,
  onV0Change,
  onStart,
  onReset,
  isRunning,
  isFinished,
}: VerticalThrowControlPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <label
          htmlFor="vthrow-v0-slider"
          className="block text-sm font-medium text-zinc-700"
        >
          Başlangıç Hızı:{" "}
          <span className="font-semibold text-blue-600">{v0} m/s</span>
        </label>
        <input
          id="vthrow-v0-slider"
          type="range"
          min={10}
          max={50}
          step={1}
          value={v0}
          onChange={(e) => onV0Change(Number(e.target.value))}
          disabled={isRunning}
          className="mt-2 w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>10 m/s</span>
          <span>50 m/s</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onStart}
          disabled={isRunning}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Başlat
        </button>
        <button
          onClick={onReset}
          disabled={isRunning && !isFinished}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sıfırla
        </button>
      </div>
    </div>
  );
}
