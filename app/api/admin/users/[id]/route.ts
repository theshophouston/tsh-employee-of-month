import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../../lib/auth";
import { db } from "../../../../../lib/firebaseAdmin";

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const s = getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = ctx.params;
  const patch = await req.json();

  const allowed: any = {};
  if (typeof patch.password === "string") allowed.password = patch.password;
  if (typeof patch.role === "string") allowed.role = patch.role === "admin" ? "admin" : "employee";
  if (typeof patch.mustChangePassword === "boolean") allowed.mustChangePassword = patch.mustChangePassword;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await db().collection("users").doc(id).update(allowed);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const s = getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = ctx.params;
  await db().collection("users").doc(id).delete();
  return NextResponse.json({ ok: true });
}

