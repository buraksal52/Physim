"use client";

import { useState } from "react";
import Link from "next/link";
import { Topic } from "@/lib/types";
import FormulaBlock from "@/components/ui/FormulaBlock";
import QuestionCard from "@/components/quiz/QuestionCard";
import SimulationWrapper from "@/components/simulation/SimulationWrapper";

interface TopicPageClientProps {
  topic: Topic;
}

const TABS = [
  { key: "konu", label: "Konu", icon: BookIcon },
  { key: "sorular", label: "Sorular", icon: QuestionIcon },
  { key: "simulasyon", label: "Simülasyon", icon: FlaskIcon },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function TopicPageClient({ topic }: TopicPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("konu");

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Konulara dön
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">
            {topic.baslik}
          </h1>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-6">
          <nav className="flex gap-1" role="tablist" aria-label="Konu sekmeleri">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  id={`tab-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative flex items-center gap-2 px-4 py-3 text-sm font-medium
                    transition-colors cursor-pointer
                    ${
                      isActive
                        ? "text-blue-600"
                        : "text-zinc-500 hover:text-zinc-900"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Panels */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Konu Panel */}
        <div
          role="tabpanel"
          id="panel-konu"
          aria-labelledby="tab-konu"
          hidden={activeTab !== "konu"}
        >
          {activeTab === "konu" && (
            <div className="space-y-8 animate-in">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                  Konu Anlatımı
                </h2>
                <div className="text-[15px] leading-relaxed text-zinc-700 whitespace-pre-line">
                  {topic.analatim}
                </div>
              </div>

              {topic.formuller.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Formüller
                  </h3>
                  <div className="grid gap-3">
                    {topic.formuller.map((f, i) => (
                      <FormulaBlock key={i} label={f.label} latex={f.latex} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sorular Panel */}
        <div
          role="tabpanel"
          id="panel-sorular"
          aria-labelledby="tab-sorular"
          hidden={activeTab !== "sorular"}
        >
          {activeTab === "sorular" && (
            <div className="space-y-4 animate-in">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                Sorular
              </h2>
              {topic.sorular.map((q) => (
                <QuestionCard key={q.id} question={q} />
              ))}
            </div>
          )}
        </div>

        {/* Simülasyon Panel */}
        <div
          role="tabpanel"
          id="panel-simulasyon"
          aria-labelledby="tab-simulasyon"
          hidden={activeTab !== "simulasyon"}
        >
          {activeTab === "simulasyon" && (
            <div className="space-y-6 animate-in">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                  Sandbox Simülasyonu
                </h2>
                <p className="text-sm text-zinc-500">
                  Parametreleri ayarla, simülasyonu çalıştır ve sonuçları
                  gözlemle.
                </p>
              </div>
              <SimulationWrapper
                slug={topic.slug}
                simulasyon={topic.simulasyon}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Tab Icons ─────────────────────────────────────────── */

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M5 14.5l-1.43 5.14a1.5 1.5 0 001.45 1.86h13.96a1.5 1.5 0 001.45-1.86L19 14.5m-14 0h14"
      />
    </svg>
  );
}
