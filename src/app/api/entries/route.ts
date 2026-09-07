import { type NextRequest, NextResponse } from "next/server";

import { connectToDatabase, isDatabaseConfigured } from "@/lib/db/mongodb";
import { TravelEmailEntry } from "@/lib/db/models/TravelEmailEntry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/entries 
 */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "MONGODB_URI is not configured on the server." },
      { status: 503 },
    );
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const entry = await TravelEmailEntry.findById(id).lean();
      if (!entry) {
        return NextResponse.json({ ok: false, error: "Entry not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, entry });
    }

    const limitParam = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const [entries, total] = await Promise.all([
      TravelEmailEntry.find().sort({ createdAt: -1 }).limit(limit).lean(),
      TravelEmailEntry.countDocuments(),
    ]);

    return NextResponse.json({ ok: true, total, count: entries.length, entries });
  } catch (error) {
    console.error("[entries]", error);
    return NextResponse.json(
      { ok: false, error: "Failed to read entries.", detail: (error as Error).message },
      { status: 500 },
    );
  }
}
