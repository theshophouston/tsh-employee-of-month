import { NextResponse } from "next/server"
import { db } from "@/lib/firebaseAdmin"
import { getSessionFromCookies } from "@/lib/auth"

export async function GET() {
  const s = await getSessionFromCookies()
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 })
  if (s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const snap = await db().collection("campaigns").orderBy("id", "desc").get()
  const campaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ campaigns })
}
