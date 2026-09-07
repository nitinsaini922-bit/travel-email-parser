import { NextResponse } from "next/server";

import { SAMPLE_EMAILS } from "@/lib/parser/samples";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, samples: SAMPLE_EMAILS });
}
