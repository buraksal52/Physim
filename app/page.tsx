import { getAllTopics } from "@/lib/content";
import HomeClient from "./HomeClient";

export default function HomePage() {
  const topics = getAllTopics();

  // Pass serializable topic data to the client component
  const topicData = topics.map((t) => ({
    slug: t.slug,
    baslik: t.baslik,
    ozet: t.ozet,
  }));

  return <HomeClient topics={topicData} />;
}
