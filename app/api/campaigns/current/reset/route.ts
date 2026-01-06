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

  if (!campaign?.forcedFinalized) {
    return NextResponse.json(
      { error: "Reset is only allowed if this month was force finalized", monthKey },
      { status: 400 }
    )
  }

  const votesCol = campaignRef.collection("votes")
  const votesSnap = await votesCol.get()

  // Delete votes in batches
  const batchSize = 400
  let deleted = 0

  const docs = votesSnap.docs
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = firestore.batch()
    const slice = docs.slice(i, i + batchSize)
    slice.forEach(doc => batch.delete(doc.ref))
    await batch.commit()
    deleted += slice.length
  }

  await campaignRef.set(
    {
      status: "open",
      winnerIds: [],
      winningVoteCount: 0,
      finalizedAt: null,
      forcedFinalized: false,
      forcedFinalizedAt: null,
      forcedFinalizedBy: null,
      resetAt: FieldValue.serverTimestamp(),
      resetBy: gate.session.userId,
    },
    { merge: true }
  )

  return NextResponse.json({
    ok: true,
    monthKey,
    status: "open",
    deletedVotes: deleted,
  })
}

