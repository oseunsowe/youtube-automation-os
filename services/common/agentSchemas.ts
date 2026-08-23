import { z } from "zod";

/**
 * Structured JSON contracts for pipeline stages that don't have an
 * implementation yet (Research Agent, Story Architect -- both Sprint 3 in
 * TODO.md). Defined now so that when those stages are built, every agent
 * boundary in the system already returns validated JSON per Update 4 --
 * nothing here is wired to a real agent yet.
 */

export const ResearchOutputSchema = z.object({
  topic: z.string(),
  thesis: z.string(),
  timeline: z.array(z.object({ date: z.string(), event: z.string() })),
  people: z.array(z.string()),
  organizations: z.array(z.string()),
  claims: z.array(z.object({ claim: z.string(), status: z.enum(["alleged", "confirmed", "disputed"]) })),
  financial_figures: z.array(z.object({ label: z.string(), amount: z.string(), source: z.string().optional() })),
  sources: z.array(z.object({ url: z.string(), title: z.string().optional(), reliability: z.string().optional() })),
  visual_opportunities: z.array(z.string()),
});
export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;

export const StoryArchitectOutputSchema = z.object({
  central_question: z.string(),
  hook: z.string(),
  acts: z.array(z.object({ title: z.string(), summary: z.string() })),
  open_loops: z.array(z.string()),
  reveal: z.string(),
  ending: z.string(),
});
export type StoryArchitectOutput = z.infer<typeof StoryArchitectOutputSchema>;

/**
 * Parses and validates a JSON-agent response, retrying once with the
 * provided retry callback if the first response fails schema validation
 * (Update 4 -- "retry malformed outputs"). Any real future Research/Story
 * agent should route its output through this rather than trusting raw text.
 */
export async function parseAgentJson<T>(
  schema: z.ZodType<T>,
  raw: string,
  retry?: () => Promise<string>,
): Promise<T> {
  const tryParse = (text: string): T => {
    const json: unknown = JSON.parse(text);
    return schema.parse(json);
  };

  try {
    return tryParse(raw);
  } catch (err) {
    if (!retry) throw err;
    const retried = await retry();
    return tryParse(retried);
  }
}
