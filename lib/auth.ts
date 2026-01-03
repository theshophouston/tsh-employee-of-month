import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "tsh_eom_session";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export type SessionUser = {
  userId: string;
  username: string;
  role: "admin" | "employee";
};

export function signSession(user: SessionUser) {
  const secret = mustEnv("AUTH_JWT_SECRET");
  return jwt.sign(user, secret, { expiresIn: "30d" });
}

export function verifySessionToken(token: string): SessionUser | null {
  const secret = mustEnv("AUTH_JWT_SECRET");
  try {
    return jwt.verify(token, secret) as SessionUser;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/"
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0
  });
}

export function getSessionFromCookies(): SessionUser | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

