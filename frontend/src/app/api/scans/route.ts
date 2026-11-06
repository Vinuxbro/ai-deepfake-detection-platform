import { NextResponse } from "next/server";
import { listScans, insertScan } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ scans: listScans(user.id) });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.verdict || typeof b.confidence !== "number") {
    return NextResponse.json({ error: "Invalid scan payload" }, { status: 400 });
  }
  const id = insertScan({
    userId: user.id,
    verdict: b.verdict,
    confidence: b.confidence,
    probFake: b.probFake ?? 0,
    probReal: b.probReal ?? 0,
    gradcam: b.gradcam ?? "",
  });
  return NextResponse.json({ ok: true, id });
}
