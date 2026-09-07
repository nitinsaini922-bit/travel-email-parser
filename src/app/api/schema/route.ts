import { NextResponse } from "next/server";

import { TRAVEL_BRIEF_JSON_SCHEMA } from "@/lib/parser/schema";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, schema: TRAVEL_BRIEF_JSON_SCHEMA });
}
