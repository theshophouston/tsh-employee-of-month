import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebaseAdmin"
import { getSessionFromRequest } from "@/lib/auth"

type RouteCtx = {
  params: Promise<{
    id: string
    voterUserId: string
  }>
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 })
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const { id, voterUserId } = await ctx.params
  const firestore = db()

  const voteRef = firestore
    .collection("campaigns")
    .doc(id)
    .collection("votes")
    .doc(voterUserId)

  const snap = await voteRef.get()
  if (!snap.exists) {
    return NextResponse.json({ error: "Vote not found" }, { status: 404 })
  }

  await voteRef.delete()

  return NextResponse.json({
    ok: true,
    message: "Vote reset",
    voterUserId,
  })
}

