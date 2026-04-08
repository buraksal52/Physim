import { getAllTopicSlugs, getTopicBySlug } from "@/lib/content";
import TopicPageClient from "./TopicPageClient";

export async function generateStaticParams() {
  const slugs = getAllTopicSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/konular/[slug]">) {
  const { slug } = await props.params;
  const topic = getTopicBySlug(slug);
  return {
    title: `${topic.baslik} — PhysicsLab`,
    description: topic.ozet,
  };
}

export default async function TopicPage(props: PageProps<"/konular/[slug]">) {
  const { slug } = await props.params;
  const topic = getTopicBySlug(slug);

  return <TopicPageClient topic={topic} />;
}
