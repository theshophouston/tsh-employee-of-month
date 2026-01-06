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

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 })

  const body = await req.json().catch(() => null) as null | {
    candidateUserId?: string
    votedForUserId?: string
    reason?: string
  }

  const votedForUserId = (body?.candidateUserId || body?.votedForUserId || "").trim()
  const reason = (body?.reason || "").toString().trim()

  if (!votedForUserId) {
    return NextResponse.json({ error: "Missing candidate" }, { status: 400 })
  }

  if (votedForUserId === session.userId) {
    return NextResponse.json({ error: "You cannot vote for yourself" }, { status: 400 })
  }

  const monthKey = currentMonthKeyChicago()
  const firestore = db()
  const campaignRef = firestore.collection("campaigns").doc(monthKey)

  // Ensure campaign exists
  const campaignSnap = await campaignRef.get()
  if (!campaignSnap.exists) {
    await campaignRef.set(
      {
        id: monthKey,
        status: "open",
        createdAt: FieldValue.serverTimestamp(),
        monthLabel: new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "long", year: "numeric" }).format(new Date()),
      },
      { merge: true }
    )
  } else {
    const c = campaignSnap.data() as any
    if (c?.status === "finalized") {
      return NextResponse.json({ error: "Voting is closed for this month" }, { status: 400 })
    }
  }

  // One vote per user per campaign, voter doc id = session.userId
  const voteRef = campaignRef.collection("votes").doc(session.userId)

  await voteRef.set(
    {
      voterUserId: session.userId,
      votedForUserId,          // ✅ admin panel expects this
      reason,                  // ✅ admin panel shows this
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return NextResponse.json({ ok: true })
}
