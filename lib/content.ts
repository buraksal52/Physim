import fs from "fs";
import path from "path";
import { Topic } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "konular");

/**
 * Get all topic slugs for static generation.
 */
export function getAllTopicSlugs(): string[] {
  const files = fs.readdirSync(CONTENT_DIR);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

/**
 * Get all topics (summary data for the home page).
 */
export function getAllTopics(): Topic[] {
  const slugs = getAllTopicSlugs();
  return slugs.map((slug) => getTopicBySlug(slug));
}

/**
 * Get a single topic by its slug.
 */
export function getTopicBySlug(slug: string): Topic {
  const filePath = path.join(CONTENT_DIR, `${slug}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Topic;
}
