import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/auth";
import { db, FieldValue } from "../../../../lib/firebaseAdmin";
import { seedUsersIfEmpty } from "../../../../lib/seed";

export async function GET(req: Request) {
  await seedUsersIfEmpty();

  const url = new URL(req.url);
  const isPublic = url.searchParams.get("public") === "1";

  const s = getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  if (!isPublic && s.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const snap = await db().collection("users").orderBy("usernameLower").get();

  const users = snap.docs.map((d) => {
    const u = d.data() as any;
    const base = {
      id: d.id,
      username: u.username,
      role: u.role as "admin" | "employee",
      mustChangePassword: !!u.mustChangePassword
    };
    if (isPublic) return base;
    return { ...base, password: u.password };
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const s = getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { username, password, role } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }

  const usernameLower = String(username).toLowerCase().trim();
  const existing = await db()
    .collection("users")
    .where("usernameLower", "==", usernameLower)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ error: "That username already exists" }, { status: 400 });
  }

  const doc = await db().collection("users").add({
    username: String(username).trim(),
    usernameLower,
    password: String(password),
    mustChangePassword: true,
    role: role === "admin" ? "admin" : "employee",
    createdAt: FieldValue.serverTimestamp()
  });

  return NextResponse.json({ ok: true, id: doc.id });
}

