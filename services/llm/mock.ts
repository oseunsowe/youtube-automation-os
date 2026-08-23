import type { LLMProvider, ScriptRequest } from "./provider.js";
import type { Script, ScriptChapter } from "../common/types.js";

const WORDS_PER_MINUTE = 150;

const BEATS = [
  "hook",
  "setup",
  "revelation",
  "revelation",
  "revelation",
  "climax",
  "aftermath",
  "ending",
] as const;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Generates exactly `count` filler words, so paragraph length hits its word-count target precisely. */
function fillerWords(count: number, title: string): string {
  const words: string[] = [];
  let i = 0;
  while (words.length < count) {
    words.push(...`detail ${i + 1} about ${title}`.split(" "));
    i++;
  }
  return words.slice(0, count).join(" ");
}

function beatParagraph(
  beat: (typeof BEATS)[number],
  title: string,
  index: number,
  targetWords: number,
): string {
  const openers: Record<(typeof BEATS)[number], string> = {
    hook: `Something happened that no one saw coming: ${title}.`,
    setup: `To understand why, you need to know how it started.`,
    revelation: `What came next changed everything.`,
    climax: `Then, the truth finally came out.`,
    aftermath: `In the aftermath, the consequences became clear.`,
    ending: `The story of ${title} still raises questions today.`,
  };

  const base = openers[beat];
  const tailWordCount = wordCount(`(beat ${index + 1})`);
  const padWords = Math.max(0, targetWords - wordCount(base) - tailWordCount);
  const pad = padWords > 0 ? ` This part of the story covers ${fillerWords(padWords, title)}.` : "";
  return `${base}${pad} (beat ${index + 1})`;
}

export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  async generateScript(request: ScriptRequest): Promise<Script> {
    const targetWordCount = Math.max(
      150,
      Math.round(request.runtimeMinutes * WORDS_PER_MINUTE),
    );
    const wordsPerBeat = Math.round(targetWordCount / BEATS.length);

    const paragraphs = BEATS.map((beat, index) =>
      beatParagraph(beat, request.title, index, wordsPerBeat),
    );

    const hook = paragraphs[0];
    const script = paragraphs.join("\n\n");
    const totalWords = wordCount(script);
    const estimatedRuntimeSeconds = Math.round(
      (totalWords / WORDS_PER_MINUTE) * 60,
    );

    const secondsPerParagraph = estimatedRuntimeSeconds / paragraphs.length;
    const chapters: ScriptChapter[] = paragraphs.map((_, index) => ({
      title: `${BEATS[index]} ${index + 1}`,
      startSeconds: Math.round(index * secondsPerParagraph),
    }));

    return {
      hook,
      script,
      chapters,
      wordCount: totalWords,
      estimatedRuntimeSeconds,
    };
  }
}
