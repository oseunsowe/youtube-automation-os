import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Category } from "../common/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CategorySources {
  keywords: string[];
  subreddits: string[];
}

interface DiscoverySourcesFile {
  categories: Record<Category, CategorySources>;
}

let cached: DiscoverySourcesFile | undefined;

function loadSources(): DiscoverySourcesFile {
  if (!cached) {
    const raw = readFileSync(path.resolve(__dirname, "../../config/discoverySources.json"), "utf-8");
    cached = JSON.parse(raw) as DiscoverySourcesFile;
  }
  return cached;
}

export function getCategorySources(category: Category): CategorySources | undefined {
  return loadSources().categories[category];
}
