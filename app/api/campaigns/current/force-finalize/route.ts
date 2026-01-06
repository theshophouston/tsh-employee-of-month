import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { getSessionFromRequest } from "@/lib/auth"

function currentMonthKeyChicago() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date())

  const year = parts.find(p => p.type === "year")?.value
  const month = parts.find(p => p.type === "month")?.value
  if (!year || !month) throw new Error("Unable to compute month key")

  return `${year}-${month}`
}

async function requireAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return { ok: false as const, res: NextResponse.json({ error: "Not logged in" }, { status: 401 }) }
  if (session.role !== "admin") return { ok: false as const, res: NextResponse.json({ error: "Admin only" }, { status: 403 }) }
  return { ok: true as const, session }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  const monthKey = currentMonthKeyChicago()
  const firestore = db()
  const campaignRef = firestore.collection("campaigns").doc(monthKey)

  const campaignSnap = await campaignRef.get()

  if (!campaignSnap.exists) {
    return NextResponse.json(
      { error: "Current month campaign does not exist yet", monthKey },
      { status: 404 }
    )
  }

  const campaign = campaignSnap.data() as any

  if (campaign?.status === "finalized") {
    return NextResponse.json({
      ok: true,
      monthKey,
      status: "finalized",
      winners: campaign?.winnerIds ?? [],
      winningVoteCount: campaign?.winningVoteCount ?? 0,
      forcedFinalized: !!campaign?.forcedFinalized,
      note: "Campaign already finalized",
    })
  }

  const votesSnap = await campaignRef.collection("votes").get()

  const tally = new Map<string, number>()
  votesSnap.docs.forEach(d => {
    const v = d.data() as any
    const votedForUserId = typeof v?.votedForUserId === "string" ? v.votedForUserId : ""
    if (!votedForUserId) return
    tally.set(votedForUserId, (tally.get(votedForUserId) ?? 0) + 1)
  })

  let maxVotes = 0
  for (const n of tally.values()) maxVotes = Math.max(maxVotes, n)

  const winnerIds = Array.from(tally.entries())
    .filter(([, n]) => n === maxVotes && maxVotes > 0)
    .map(([userId]) => userId)

  await campaignRef.set(
    {
      status: "finalized",
      finalizedAt: FieldValue.serverTimestamp(),
      winnerIds,
      winningVoteCount: maxVotes,
      forcedFinalized: true,
      forcedFinalizedAt: FieldValue.serverTimestamp(),
      forcedFinalizedBy: gate.session.userId,
    },
    { merge: true }
  )

  return NextResponse.json({
    ok: true,
    monthKey,
    status: "finalized",
    winners: winnerIds,
    winningVoteCount: maxVotes,
    forcedFinalized: true,
  })
}

