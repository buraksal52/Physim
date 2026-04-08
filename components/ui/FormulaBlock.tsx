"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

interface FormulaBlockProps {
  label: string;
  latex: string;
}

export default function FormulaBlock({ label, latex }: FormulaBlockProps) {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: true,
  });

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4">
      <span className="shrink-0 text-sm font-medium text-zinc-500">
        {label}
      </span>
      <div
        className="text-lg text-zinc-900"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
