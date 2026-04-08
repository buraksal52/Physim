"use client";

import { useState } from "react";
import { Question } from "@/lib/types";

interface QuestionCardProps {
  question: Question;
}

export default function QuestionCard({ question }: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const isCorrect = selected === question.dogru;
  const hasAnswered = selected !== null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <p className="font-medium text-zinc-900">{question.soru}</p>

      <div className="mt-4 grid gap-2">
        {question.secenekler.map((option, idx) => {
          let optionClass =
            "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors cursor-pointer";

          if (!hasAnswered) {
            optionClass += " border-zinc-200 hover:border-blue-300 hover:bg-blue-50";
          } else if (idx === question.dogru) {
            optionClass += " border-green-300 bg-green-50 text-green-800";
          } else if (idx === selected) {
            optionClass += " border-red-300 bg-red-50 text-red-800";
          } else {
            optionClass += " border-zinc-100 text-zinc-400";
          }

          return (
            <button
              key={idx}
              onClick={() => !hasAnswered && setSelected(idx)}
              disabled={hasAnswered}
              className={optionClass}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-medium">
                {String.fromCharCode(65 + idx)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {hasAnswered && (
        <div className="mt-4">
          {isCorrect ? (
            <p className="text-sm font-medium text-green-600">✓ Doğru cevap!</p>
          ) : (
            <p className="text-sm font-medium text-red-600">
              ✗ Yanlış. Doğru cevap:{" "}
              {String.fromCharCode(65 + question.dogru)} –{" "}
              {question.secenekler[question.dogru]}
            </p>
          )}

          {!showSolution && (
            <button
              onClick={() => setShowSolution(true)}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Çözümü Gör →
            </button>
          )}

          {showSolution && (
            <div className="mt-3 rounded-lg bg-zinc-50 border border-zinc-200 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Çözüm Adımları
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-zinc-700">
                {question.cozum_adimlari.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
