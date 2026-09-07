import { NextResponse } from "next/server";

import { engineStatus } from "@/lib/parser/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "travel-email-parser-api",
    transport: "next-route-handler",
    uptimeSeconds: Math.round(process.uptime()),
    ...engineStatus(),
  });
}
