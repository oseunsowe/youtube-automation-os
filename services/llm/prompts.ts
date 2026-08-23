import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Category } from "../common/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsRoot = path.resolve(__dirname, "../../prompts");

export function loadSharedPrompt(): string {
  return readFileSync(
    path.join(promptsRoot, "shared", "documentary-script-writer.md"),
    "utf-8",
  );
}

export function loadCategoryPrompt(category: Category): string {
  return readFileSync(
    path.join(promptsRoot, "categories", `${category}.md`),
    "utf-8",
  );
}
