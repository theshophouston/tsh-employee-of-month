import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { getSessionFromRequest } from "@/lib/auth"

const INITIAL_USERS: Array<{
  username: string
  phoneLast4: string
}> = [
  { username: "Vaughn", phoneLast4: "0996" },
  { username: "Kaina", phoneLast4: "2846" },
  { username: "Mac", phoneLast4: "0143" },
  { username: "Blake", phoneLast4: "8746" },
  { username: "Hajime", phoneLast4: "8851" },
  { username: "Collin", phoneLast4: "3858" },
  { username: "Preston", phoneLast4: "5302" },
  { username: "Kip", phoneLast4: "7182" },
  { username: "Jack", phoneLast4: "1267" },
]

async function requireAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return { ok: false as const, res: NextResponse.json({ error: "Not logged in" }, { status: 401 }) }
  if (session.role !== "admin") return { ok: false as const, res: NextResponse.json({ error: "Admin only" }, { status: 403 }) }
  return { ok: true as const, session }
}

async function deleteAllDocsInCollection(colRef: FirebaseFirestore.CollectionReference, batchSize = 400) {
  const firestore = db()
  let deleted = 0

  while (true) {
    const snap = await colRef.limit(batchSize).get()
    if (snap.empty) break

    const batch = firestore.batch()
    snap.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()

    deleted += snap.size
  }

  return deleted
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  const body = await req.json().catch(() => null) as null | { confirm?: string }
  if (!body?.confirm || body.confirm !== "RESET") {
    return NextResponse.json(
      { error: 'Confirmation required. Pass JSON body: { "confirm": "RESET" }' },
      { status: 400 }
    )
  }

  const firestore = db()

  // 1) Delete all campaigns and their votes subcollections
  const campaignsSnap = await firestore.collection("campaigns").get()
  let campaignsDeleted = 0
  let votesDeleted = 0

  for (const c of campaignsSnap.docs) {
    // delete votes under campaigns/{id}/votes/*
    const votesCol = firestore.collection("campaigns").doc(c.id).collection("votes")
    votesDeleted += await deleteAllDocsInCollection(votesCol)

    // delete campaign doc
    await firestore.collection("campaigns").doc(c.id).delete()
    campaignsDeleted += 1
  }

  // 2) Reset users back to initial passwords, force password change
  // We only reset users that exist in INITIAL_USERS by username doc id.
  // If your users doc IDs are lowercase usernames, we handle both.
  let usersReset = 0

  for (const u of INITIAL_USERS) {
    const usernameOriginal = u.username
    const usernameLower = u.username.toLowerCase()

    const refA = firestore.collection("users").doc(usernameOriginal)
    const refB = firestore.collection("users").doc(usernameLower)

    const snapA = await refA.get()
    const targetRef = snapA.exists ? refA : refB

    await targetRef.set(
      {
        password: u.phoneLast4,
        phoneLast4: u.phoneLast4,
        mustChangePassword: true,
        resetAt: FieldValue.serverTimestamp(),
        resetBy: gate.session.userId,
      },
      { merge: true }
    )

    usersReset += 1
  }

  return NextResponse.json({
    ok: true,
    campaignsDeleted,
    votesDeleted,
    usersReset,
  })
}

