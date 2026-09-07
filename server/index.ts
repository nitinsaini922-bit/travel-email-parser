import cors from "cors";
import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";

import { engineStatus, MAX_EMAIL_LENGTH, parseTravelEmail } from "../src/lib/parser/core";
import { SAMPLE_EMAILS } from "../src/lib/parser/samples";
import { TRAVEL_BRIEF_JSON_SCHEMA } from "../src/lib/parser/schema";

const app = express();
const PORT = Number(process.env.PORT || process.env.API_PORT || 4000);

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.text({ type: "text/plain", limit: "1mb" }));

/* ------------------------------ tiny rate limit --------------------------- */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "anonymous";
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > MAX_PER_WINDOW) {
    return res.status(429).json({ ok: false, error: "Too many requests. Try again in a minute." });
  }
  next();
}

/* --------------------------------- routes --------------------------------- */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "travel-email-parser-api",
    uptimeSeconds: Math.round(process.uptime()),
    ...engineStatus(),
  });
});

app.get("/api/samples", (_req, res) => {
  res.json({ ok: true, samples: SAMPLE_EMAILS });
});

app.get("/api/schema", (_req, res) => {
  res.json({ ok: true, schema: TRAVEL_BRIEF_JSON_SCHEMA });
});

app.post("/api/parse-email", rateLimit, async (req, res) => {
  const body = req.body as { email?: unknown; text?: unknown; forceHeuristic?: unknown } | string;
  const email =
    typeof body === "string"
      ? body
      : typeof body?.email === "string"
        ? body.email
        : typeof body?.text === "string"
          ? body.text
          : "";

  if (!email.trim()) {
    return res.status(400).json({
      ok: false,
      error: "Provide the email body as { \"email\": \"...\" }.",
    });
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return res.status(413).json({
      ok: false,
      error: `Email is too long (${email.length} characters, limit ${MAX_EMAIL_LENGTH}).`,
    });
  }

  try {
    const result = await parseTravelEmail(email, {
      forceHeuristic: typeof body === "object" && body?.forceHeuristic === true,
    });
    res.json(result);
  } catch (error) {
    console.error("[parse-email]", error);
    res.status(500).json({ ok: false, error: "Parsing failed.", detail: (error as Error).message });
  }
});

app.use((_req, res) => res.status(404).json({ ok: false, error: "Not found." }));

app.listen(PORT, "0.0.0.0", () => {
  const status = engineStatus();
  console.log(`\n  Travel-email-parser API  ->  http://localhost:${PORT}`);
  console.log(`  Engine: ${status.engine} (${status.model})`);
  if (!status.aiEnabled) {
    console.log("  hint: set GEMINI_API_KEY or OPENAI_API_KEY in .env.local for AI extraction\n");
  } else {
    console.log("");
  }
});

export default app;
