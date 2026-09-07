import { type NextRequest, NextResponse } from "next/server";

import { connectToDatabase, isDatabaseConfigured } from "@/lib/db/mongodb";
import { TravelEmailEntry } from "@/lib/db/models/TravelEmailEntry";
import { MAX_EMAIL_LENGTH, parseTravelEmail } from "@/lib/parser/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------ tiny rate limit --------------------------- */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const buckets = new Map<string, { count: number; resetAt: number }>();

function overLimit(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (overLimit(key)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  let email = "";
  let forceHeuristic = false;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as {
        email?: unknown;
        text?: unknown;
        forceHeuristic?: unknown;
      };
      email =
        typeof body?.email === "string" ? body.email : typeof body?.text === "string" ? body.text : "";
      forceHeuristic = body?.forceHeuristic === true;
    } else {
      email = await req.text();
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read the request body." }, { status: 400 });
  }

  if (!email.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Provide the email body as { "email": "..." }.' },
      { status: 400 },
    );
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: `Email is too long (${email.length} characters, limit ${MAX_EMAIL_LENGTH}).`,
      },
      { status: 413 },
    );
  }

  try {
    const result = await parseTravelEmail(email, { forceHeuristic });

    // Persist every parsed entry. We await this (rather than firing-and-
    // forgetting) because serverless functions can be frozen/torn down the
    // moment the response is sent, which would silently drop un-awaited
    // writes. A DB failure is logged but never fails the response to the
    // caller — the parse result still gets returned either way.
    try {
      await saveEntry(email, key, result);
    } catch (error) {
      console.error("[parse-email] failed to save entry to MongoDB:", error);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[parse-email]", error);
    return NextResponse.json(
      { ok: false, error: "Parsing failed.", detail: (error as Error).message },
      { status: 500 },
    );
  }
}

/* --------------------------------- storage --------------------------------- */

async function saveEntry(
  rawEmail: string,
  clientIp: string,
  result: Awaited<ReturnType<typeof parseTravelEmail>>,
) {
  if (!isDatabaseConfigured()) {
    console.warn("[parse-email] MONGODB_URI not set — skipping database save.");
    return;
  }

  await connectToDatabase();

  const { data } = result;
  await TravelEmailEntry.create({
    rawEmail,
    characters: result.characters,

    summary: data.summary,
    tripType: data.tripType,
    purpose: data.purpose,
    urgency: data.urgency,
    traveller: data.traveller,
    origin: data.origin,
    destinations: data.destinations,
    dates: data.dates,
    party: data.party,
    budget: data.budget,
    flights: data.flights,
    accommodation: data.accommodation,
    ground: data.ground,
    activities: data.activities,
    dietary: data.dietary,
    accessibility: data.accessibility,
    specialRequests: data.specialRequests,
    dealBreakers: data.dealBreakers,
    missingInfo: data.missingInfo,
    followUpQuestions: data.followUpQuestions,
    confidence: data.confidence,

    engine: result.engine,
    parserModel: result.model,
    latencyMs: result.latencyMs,
    warnings: result.warnings,

    clientIp: clientIp === "anonymous" ? null : clientIp,
  });
}
