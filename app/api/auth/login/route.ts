import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseAdmin";
import { signSession, setSessionCookie } from "../../../../lib/auth";
import { seedUsersIfEmpty } from "../../../../lib/seed";

export async function POST(req: Request) {
  await seedUsersIfEmpty();

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const usernameLower = String(username).toLowerCase().trim();

  const snap = await db()
    .collection("users")
    .where("usernameLower", "==", usernameLower)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json({ error: "Invalid login" }, { status: 401 });
  }

  const doc = snap.docs[0];
  const user = doc.data() as any;

  if (String(user.password) !== String(password)) {
    return NextResponse.json({ error: "Invalid login" }, { status: 401 });
  }

  const session = {
    userId: doc.id,
    username: user.username,
    role: user.role as "admin" | "employee"
  };

  const token = signSession(session);
  setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    mustChangePassword: !!user.mustChangePassword
  });
}

