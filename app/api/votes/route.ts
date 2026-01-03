import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../lib/auth";
import { db, FieldValue } from "../../../lib/firebaseAdmin";
import { campaignIdFor, ensureCampaign } from "../../../lib/campaign";

export async function POST(req: Request) {
  const s = await getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { candidateUserId, reason } = await req.json();
  if (!candidateUserId) return NextResponse.json({ error: "Pick a candidate" }, { status: 400 });

  if (candidateUserId === s.userId) {
    return NextResponse.json({ error: "You cannot vote for yourself" }, { status: 400 });
  }

  const now = new Date();
  await ensureCampaign(now);
  const campaignId = campaignIdFor(now);

  const campaignRef = db().collection("campaigns").doc(campaignId);

  const candidateSnap = await db().collection("users").doc(candidateUserId).get();
  if (!candidateSnap.exists) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 400 });
  }

  const voteRef = campaignRef.collection("votes").doc(s.userId);
  const existing = await voteRef.get();
  if (existing.exists) {
    return NextResponse.json({ error: "You already voted this month" }, { status: 400 });
  }

  await voteRef.set({
    voterUserId: s.userId,
    candidateUserId,
    reason: typeof reason === "string" ? reason.trim() : "",
    createdAt: FieldValue.serverTimestamp()
  });

  return NextResponse.json({ ok: true });
}

