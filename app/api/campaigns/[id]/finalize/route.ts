import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { getSessionFromRequest } from "@/lib/auth"

type RouteCtx = { params: Promise<{ id: string }> }

async function requireAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session || session.role !== "admin") {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null
    }
  }
  return { ok: true as const, res: null as any, session }
}

// POST finalize a campaign, compute winners (ties allowed)
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  const { id } = await ctx.params

  const campaignRef = db().collection("campaigns").doc(id)
  const campaignSnap = await campaignRef.get()
  if (!campaignSnap.exists) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const votesSnap = await db().collection("votes").where("campaignId", "==", id).get()
  const votes = votesSnap.docs.map(d => d.data() as any)

  const counts: Record<string, number> = {}
  for (const v of votes) {
    const votedFor = String(v.votedForUserId || "")
    if (!votedFor) continue
    counts[votedFor] = (counts[votedFor] || 0) + 1
  }

  const entries = Object.entries(counts)
  if (entries.length === 0) {
    // No votes, finalize with no winners
    await campaignRef.set(
      {
        status: "finalized",
        winners: [],
        finalizedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    )
    return NextResponse.json({ ok: true, winners: [] })
  }

  let max = 0
  for (const [, c] of entries) {
    if (c > max) max = c
  }

  const winners = entries
    .filter(([, c]) => c === max)
    .map(([userId]) => userId)

  await campaignRef.set(
    {
      status: "finalized",
      winners,
      finalizedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  )

  return NextResponse.json({ ok: true, winners, maxVotes: max })
}
