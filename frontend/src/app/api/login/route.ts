import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  const user = findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  await createSession({ id: user.id, email: user.email, name: user.name });
  return NextResponse.json({ ok: true });
}
