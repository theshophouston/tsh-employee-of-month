import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/auth";

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json(s);
}

