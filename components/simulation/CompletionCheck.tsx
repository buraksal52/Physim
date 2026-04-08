"use client";

import { ZorunluDeney } from "@/lib/types";
import { markDeneyComplete, isDeneyComplete } from "@/lib/progress";
import { useEffect, useState } from "react";

interface CompletionCheckProps {
  slug: string;
  zorunluDeney: ZorunluDeney;
  observedValue: number;
  isFinished: boolean;
}

export default function CompletionCheck({
  slug,
  zorunluDeney,
  observedValue,
  isFinished,
}: CompletionCheckProps) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Check initial state from localStorage
    setCompleted(isDeneyComplete(slug));
  }, [slug]);

  useEffect(() => {
    if (!isFinished || completed) return;

    const { min, max } = zorunluDeney.hedef_aralik;
    if (observedValue >= min && observedValue <= max) {
      markDeneyComplete(slug);
      setCompleted(true);
    }
  }, [isFinished, observedValue, zorunluDeney, slug, completed]);

  return (
    <div
      className={`rounded-xl border p-5 ${
        completed
          ? "border-green-300 bg-green-50"
          : "border-zinc-200 bg-white"
      }`}
    >
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Zorunlu Deney
      </h4>
      <p className="text-sm text-zinc-700">{zorunluDeney.aciklama}</p>

      {completed ? (
        <div className="mt-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600">
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </span>
          <p className="text-sm font-semibold text-green-700">
            Deneyi tamamladın!
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-400">
          Hedef: {zorunluDeney.hedef_degisken} değeri{" "}
          {zorunluDeney.hedef_aralik.min} – {zorunluDeney.hedef_aralik.max}{" "}
          aralığında olmalı.
        </p>
      )}
    </div>
  );
}
