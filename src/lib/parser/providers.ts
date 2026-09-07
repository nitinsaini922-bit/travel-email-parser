import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { TRAVEL_BRIEF_JSON_SCHEMA } from "./schema";

/**
 * GEMINI_MODEL=gemini-3.7-flash
 */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.7-flash";

/**
 * Can be overridden with OPENAI_MODEL in .env.local.
 */
export const OPENAI_MODEL =
  process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Supports both:
 * - GEMINI_API_KEY
 * - GOOGLE_API_KEY
 */
export function geminiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  );
}

/**
 * Return the configured OpenAI API key.
 */
export function openaiKey(): string {
  return process.env.OPENAI_API_KEY || "";
}

/**
 * Models sometimes return JSON wrapped in Markdown fences
 * or surrounded by additional explanatory text.
 *
 * This function extracts the JSON object safely.
 */
export function extractJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  // First try the entire response as JSON.
  try {
    return JSON.parse(cleaned);
  } catch {
    // If the model added prose, extract the outermost JSON object.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end <= start) {
      throw new Error("Model did not return valid JSON.");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

/**
 * Call Google Gemini to extract structured travel-booking data.
 */
export async function callGemini(
  email: string,
  today: string,
): Promise<unknown> {
  const { GoogleGenAI } = await import("@google/genai");

  const apiKey = geminiKey();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const system = buildSystemPrompt(today);
  const user = buildUserPrompt(email);

  /**
   * Gemini supports structured JSON output.
   *
   * Do not use temperature/top_p/top_k with Gemini 3.x.
   */
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,

      contents: user,

      config: {
        systemInstruction: system,

        responseMimeType: "application/json",

        // The schema shape depends on the installed @google/genai version.
        // The existing project schema is intentionally passed through here.
        // biome-ignore lint/suspicious/noExplicitAny: SDK schema shape varies by version
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: TRAVEL_BRIEF_JSON_SCHEMA as any,
      },
    });

    const text = response.text ?? "";

    if (!text.trim()) {
      throw new Error("Gemini returned an empty response.");
    }

    return extractJson(text);
  } catch (structuredError) {
    /**
     * Some versions of the Gemini SDK/API may reject structured-output
     * configuration even though normal JSON generation works.
     *
     * Retry once without responseSchema.
     */
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,

        contents: user,

        config: {
          systemInstruction: `${system}

Respond ONLY with valid JSON.

The JSON must follow this schema:

${JSON.stringify(TRAVEL_BRIEF_JSON_SCHEMA)}
`,

          responseMimeType: "application/json",
        },
      });

      const text = response.text ?? "";

      if (!text.trim()) {
        throw new Error("Gemini returned an empty response.");
      }

      return extractJson(text);
    } catch (fallbackError) {
      const structuredMessage =
        structuredError instanceof Error
          ? structuredError.message
          : String(structuredError);

      const fallbackMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);

      throw new Error(
        `Gemini request failed using model "${GEMINI_MODEL}". ` +
          `Structured request: ${structuredMessage}. ` +
          `Fallback request: ${fallbackMessage}.`,
      );
    }
  }
}

/**
 * Call OpenAI to extract structured travel-booking data.
 */
export async function callOpenAI(
  email: string,
  today: string,
): Promise<unknown> {
  const { default: OpenAI } = await import("openai");

  const apiKey = openaiKey();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({
    apiKey,
  });

  const system = buildSystemPrompt(today);

  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,

    temperature: 0.1,

    response_format: {
      type: "json_object",
    },

    messages: [
      {
        role: "system",
        content: `${system}

Respond with JSON matching this schema:

${JSON.stringify(TRAVEL_BRIEF_JSON_SCHEMA)}
`,
      },

      {
        role: "user",
        content: buildUserPrompt(email),
      },
    ],
  });

  const text =
    response.choices[0]?.message?.content ?? "";

  if (!text.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }

  return extractJson(text);
}