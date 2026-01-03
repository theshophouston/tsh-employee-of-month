import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/auth";
import { db } from "../../../../lib/firebaseAdmin";

export async function POST(req: Request) {
  const s = await getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { newPassword } = await req.json();
  if (!newPassword || String(newPassword).trim().length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  }

  await db().collection("users").doc(s.userId).update({
    password: String(newPassword),
    mustChangePassword: false
  });

  return NextResponse.json({ ok: true });
}

