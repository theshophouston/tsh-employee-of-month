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

// PUT, admin edits user fields (including password reset)
export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  const { id } = await ctx.params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Allow only these fields to be updated
  const updates: Record<string, any> = {}
  if (typeof body.username === "string") updates.username = body.username.trim()
  if (body.role === "admin" || body.role === "employee") updates.role = body.role

  // Password handling:
  // If you store password hashes, hash here instead of storing plaintext.
  // Your spec says plain text in admin panel, so this matches that (not recommended, but you asked for “fun not secure”).
  if (typeof body.password === "string") {
    updates.password = body.password
    updates.mustChangePassword = true
  }

  // Optional: if you track phone last4, etc.
  if (typeof body.phoneLast4 === "string") updates.phoneLast4 = body.phoneLast4

  updates.updatedAt = FieldValue.serverTimestamp()

  await db().collection("users").doc(id).set(updates, { merge: true })
  return NextResponse.json({ ok: true })
}

// DELETE, admin deletes a user
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  const { id } = await ctx.params

  await db().collection("users").doc(id).delete()
  return NextResponse.json({ ok: true })
}
