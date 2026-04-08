"use client";

interface ProjectileControlPanelProps {
  height: number;
  velocity: number;
  onHeightChange: (h: number) => void;
  onVelocityChange: (v: number) => void;
  onStart: () => void;
  onReset: () => void;
  isRunning: boolean;
  isFinished: boolean;
}

export default function ProjectileControlPanel({
  height,
  velocity,
  onHeightChange,
  onVelocityChange,
  onStart,
  onReset,
  isRunning,
  isFinished,
}: ProjectileControlPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <label
          htmlFor="proj-height-slider"
          className="block text-sm font-medium text-zinc-700"
        >
          Yükseklik:{" "}
          <span className="font-semibold text-blue-600">{height} m</span>
        </label>
        <input
          id="proj-height-slider"
          type="range"
          min={10}
          max={80}
          step={1}
          value={height}
          onChange={(e) => onHeightChange(Number(e.target.value))}
          disabled={isRunning}
          className="mt-2 w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>10 m</span>
          <span>80 m</span>
        </div>
      </div>

      <div>
        <label
          htmlFor="proj-velocity-slider"
          className="block text-sm font-medium text-zinc-700"
        >
          Yatay Hız:{" "}
          <span className="font-semibold text-blue-600">{velocity} m/s</span>
        </label>
        <input
          id="proj-velocity-slider"
          type="range"
          min={5}
          max={30}
          step={1}
          value={velocity}
          onChange={(e) => onVelocityChange(Number(e.target.value))}
          disabled={isRunning}
          className="mt-2 w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>5 m/s</span>
          <span>30 m/s</span>
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
