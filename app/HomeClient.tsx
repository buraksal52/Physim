"use client";

import { useEffect, useState } from "react";
import TopicCard from "@/components/ui/TopicCard";
import { isDeneyComplete } from "@/lib/progress";

interface TopicSummary {
  slug: string;
  baslik: string;
  ozet: string;
}

interface HomeClientProps {
  topics: TopicSummary[];
}

export default function HomeClient({ topics }: HomeClientProps) {
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Read progress from localStorage on mount
    const completed = new Set<string>();
    topics.forEach((t) => {
      if (isDeneyComplete(t.slug)) {
        completed.add(t.slug);
      }
    });
    setCompletedSlugs(completed);
  }, [topics]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-200">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">PhysicsLab</h1>
              <p className="text-sm text-zinc-500">YKS Fizik Hazırlık</p>
            </div>
          </div>
        </div>
      </header>

      {/* Topic list */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-lg font-semibold text-zinc-900">Konular</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Her konuyu sırasıyla tamamlayarak ilerle.
        </p>

        <div className="mt-6 grid gap-4">
          {topics.map((topic, idx) => {
            // First topic always unlocked, rest unlock when previous is complete
            const isUnlocked =
              idx === 0 || completedSlugs.has(topics[idx - 1].slug);
            const isCompleted = completedSlugs.has(topic.slug);

            return (
              <TopicCard
                key={topic.slug}
                slug={topic.slug}
                baslik={topic.baslik}
                ozet={topic.ozet}
                locked={!isUnlocked}
                completed={isCompleted}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
