import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/auth";
import { db } from "../../../../lib/firebaseAdmin";

export async function GET() {
  const s = getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const snap = await db().collection("campaigns").orderBy("id", "desc").get();
  const campaigns = snap.docs.map((d) => {
    const c = d.data() as any;
    return {
      id: d.id,
      monthLabel: c.monthLabel,
      startAtISO: c.startAtISO,
      endAtISO: c.endAtISO,
      finalizedAtISO: c.finalizedAtISO || null
    };
  });

  return NextResponse.json({ campaigns });
}

