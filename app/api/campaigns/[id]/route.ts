import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebaseAdmin"
import { getSessionFromRequest } from "@/lib/auth"

type RouteCtx = { params: Promise<{ id: string }> }

async function requireUser(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null
    }
  }
  return { ok: true as const, res: null as any, session }
}

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

// GET campaign details
// Non-admin users should NOT see vote counts during an open campaign.
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const gate = await requireUser(req)
  if (!gate.ok) return gate.res

  const { id } = await ctx.params

  const snap = await db().collection("campaigns").doc(id).get()
  if (!snap.exists) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const campaign = { id: snap.id, ...(snap.data() as any) }

  // If admin, optionally include vote breakdown
  if (gate.session.role === "admin") {
    const votesSnap = await db().collection("votes").where("campaignId", "==", id).get()
    const votes = votesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

    const counts: Record<string, number> = {}
    for (const v of votes) {
      const votedFor = String(v.votedForUserId || "")
      if (!votedFor) continue
      counts[votedFor] = (counts[votedFor] || 0) + 1
    }

    return NextResponse.json({
      campaign,
      admin: {
        totalVotes: votes.length,
        voteCountsByUserId: counts
      }
    })
  }

  // Non-admin view: hide vote counts during open voting
  if (campaign.status === "open") {
    return NextResponse.json({
      campaign: {
        id: campaign.id,
        month: campaign.month,
        year: campaign.year,
        status: campaign.status,
        startsAt: campaign.startsAt ?? null,
        endsAt: campaign.endsAt ?? null,
        finalizedAt: campaign.finalizedAt ?? null,
        winners: null
      }
    })
  }

  // If finalized, winners are OK to show
  return NextResponse.json({
    campaign: {
      id: campaign.id,
      month: campaign.month,
      year: campaign.year,
      status: campaign.status,
      startsAt: campaign.startsAt ?? null,
      endsAt: campaign.endsAt ?? null,
      finalizedAt: campaign.finalizedAt ?? null,
      winners: campaign.winners ?? []
    }
  })
}

// PATCH, admin edits campaign fields (optional but handy)
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  const { id } = await ctx.params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const updates: Record<string, any> = {}
  if (body.status === "open" || body.status === "finalized") updates.status = body.status
  if (body.startsAt !== undefined) updates.startsAt = body.startsAt
  if (body.endsAt !== undefined) updates.endsAt = body.endsAt

  await db().collection("campaigns").doc(id).set(updates, { merge: true })
  return NextResponse.json({ ok: true })
}
