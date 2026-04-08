const fs = require("fs"); 
let content = fs.readFileSync("components/simulation/SimulationWrapper.tsx", "utf8");

// find grid gap-6 lg:grid-cols-2 inside Newton1Simulation
// it's the last such div
const idx = content.lastIndexOf('<div className="grid gap-6 lg:grid-cols-2">');

const replacement = `<div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Kontrol Paneli
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
                  <span>Başlangıç Hızı (m/s)</span>
                  <span className="font-semibold text-blue-600">{v0.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={v0}
                  onChange={(e) => { setV0(Number(e.target.value)); setCurrentV(Number(e.target.value)); }}
                  className="w-full accent-blue-600"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
                  <span>Sürtünme Katsayısı</span>
                  <span className="font-semibold text-blue-600">{friction.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.1"
                  value={friction}
                  onChange={(e) => setFriction(Number(e.target.value))}
                  className="w-full accent-blue-600"
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={handleStart}
                disabled={isRunning}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Başlat
              </button>
              <button
                onClick={handleReset}
                disabled={isRunning && !isFinished}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sıfırla
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
              Gözlem Paneli
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={\`col-span-1 rounded-lg border px-4 py-3 transition-colors \${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }\`}
              >
                <p className="text-xs text-zinc-500">Geçen Süre (t)</p>
                <p
                  className={\`mt-1 font-mono text-lg font-semibold \${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }\`}
                >
                  {elapsedTime.toFixed(2)} s
                </p>
              </div>

              <div
                className={\`col-span-1 rounded-lg border px-4 py-3 transition-colors \${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }\`}
              >
                <p className="text-xs text-zinc-500">Konum (x)</p>
                <p
                  className={\`mt-1 font-mono text-lg font-semibold \${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }\`}
                >
                  {currentX.toFixed(1)} m
                </p>
              </div>

              <div
                className={\`col-span-2 rounded-lg border px-4 py-3 transition-colors \${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }\`}
              >
                <p className="text-xs text-zinc-500">Anlık Hız (v)</p>
                <p
                  className={\`mt-1 font-mono text-lg font-semibold \${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }\`}
                >
                  {currentV.toFixed(1)} m/s
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CompletionCheck`;

// find where CompletionCheck is, starting from idx
const endIdx = content.indexOf('<CompletionCheck', idx);

if (idx > -1 && endIdx > -1) {
  content = content.substring(0, idx) + replacement + content.substring(endIdx + '<CompletionCheck'.length);
}

fs.writeFileSync("components/simulation/SimulationWrapper.tsx", content);
