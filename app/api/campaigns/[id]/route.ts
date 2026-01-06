import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebaseAdmin"
import { getSessionFromRequest } from "@/lib/auth"

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 })
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const { id } = await ctx.params
  const firestore = db()
  const campaignRef = firestore.collection("campaigns").doc(id)
  const campaignSnap = await campaignRef.get()

  if (!campaignSnap.exists) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const campaign = { id: campaignSnap.id, ...(campaignSnap.data() as any) }

  const votesSnap = await campaignRef
    .collection("votes")
    .orderBy("createdAt", "asc")
    .get()

  const votes = votesSnap.docs.map((d) => ({
    voterUserId: d.id,
    votedForUserId: d.data().votedForUserId,
    reason: d.data().reason || "",
    createdAt: d.data().createdAt || null,
  }))

  const totals: Record<string, number> = {}
  for (const v of votes) {
    totals[v.votedForUserId] = (totals[v.votedForUserId] || 0) + 1
  }

  return NextResponse.json({
    campaign,
    votes,
    totals,
  })
}

