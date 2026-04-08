"use client";

import { useState } from "react";
import { Question } from "@/lib/types";

interface SolutionRevealProps {
  question: Question;
}

export default function SolutionReveal({ question }: SolutionRevealProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        Çözümü Gör →
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Çözüm Adımları
      </p>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-zinc-700">
        {question.cozum_adimlari.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
