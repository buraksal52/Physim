import Link from "next/link";

interface TopicCardProps {
  slug: string;
  baslik: string;
  ozet: string;
  locked: boolean;
  completed: boolean;
}

export default function TopicCard({
  slug,
  baslik,
  ozet,
  locked,
  completed,
}: TopicCardProps) {
  if (locked) {
    return (
      <div className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-6 opacity-60">
        <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200">
          <svg
            className="h-4 w-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-400">{baslik}</h3>
        <p className="mt-2 text-sm text-zinc-400">{ozet}</p>
        <span className="mt-4 inline-block text-xs font-medium text-zinc-400">
          Kilitli — önceki konuyu tamamla
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/konular/${slug}`}
      className="group block rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
          {baslik}
        </h3>
        {completed && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-3.5 w-3.5 text-green-600"
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
        )}
      </div>
      <p className="mt-2 text-sm text-zinc-600">{ozet}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
        Konuya git
        <svg
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </span>
    </Link>
  );
}
