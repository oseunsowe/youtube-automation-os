import type { LLMProvider, ScriptRequest } from "./provider.js";
import type { Script, ScriptChapter } from "../common/types.js";
import { loadSharedPrompt, loadCategoryPrompt } from "./prompts.js";
import { fetchWithTimeout } from "../common/fetchTimeout.js";

const WORDS_PER_MINUTE = 150;
const DEFAULT_MODEL = "gemini-3.6-flash";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function paragraphsToChapters(
  paragraphs: string[],
  totalSeconds: number,
): ScriptChapter[] {
  const secondsPerParagraph = totalSeconds / Math.max(1, paragraphs.length);
  return paragraphs.map((paragraph, index) => ({
    title: paragraph.slice(0, 40).trim() || `Chapter ${index + 1}`,
    startSeconds: Math.round(index * secondsPerParagraph),
  }));
}

export class GeminiLLMProvider implements LLMProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_MODEL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required to use the gemini provider");
    }
  }

  private async requestScriptText(request: ScriptRequest): Promise<string> {
    const targetWordCount = Math.max(
      150,
      Math.round(request.runtimeMinutes * WORDS_PER_MINUTE),
    );

    const systemPrompt = loadSharedPrompt();
    const categoryPrompt = loadCategoryPrompt(request.category);

    const userPrompt = [
      `Video title: "${request.title}"`,
      `Target length: approximately ${request.runtimeMinutes} minutes (~${targetWordCount} words).`,
      "Write the full narration script now, following the structure and rules above.",
    ].join("\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetchWithTimeout(this.fetchImpl, url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${systemPrompt}\n\n${categoryPrompt}` }],
        },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Gemini request failed: ${response.status} ${response.statusText} ${body}`,
      );
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) {
      throw new Error("Gemini returned an empty script");
    }
    return text;
  }

  /** Retries once on a malformed/empty response before giving up (Update 4). */
  async generateScript(request: ScriptRequest): Promise<Script> {
    let text: string | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt < 2 && text === undefined; attempt++) {
      try {
        text = await this.requestScriptText(request);
      } catch (err) {
        lastError = err;
      }
    }

    if (text === undefined) {
      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }

    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const totalWords = wordCount(text);
    const estimatedRuntimeSeconds = Math.round((totalWords / WORDS_PER_MINUTE) * 60);

    return {
      hook: paragraphs[0] ?? text.slice(0, 200),
      script: paragraphs.join("\n\n"),
      chapters: paragraphsToChapters(paragraphs, estimatedRuntimeSeconds),
      wordCount: totalWords,
      estimatedRuntimeSeconds,
    };
  }
}
