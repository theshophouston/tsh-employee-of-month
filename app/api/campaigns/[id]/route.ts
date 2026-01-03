import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../../lib/auth";
import { db } from "../../../../../lib/firebaseAdmin";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const s = getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const id = ctx.params.id;
  const ref = db().collection("campaigns").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const c = snap.data() as any;

  const votesSnap = await ref.collection("votes").get();
  const votesRaw = votesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  const userIds = new Set<string>();
  for (const v of votesRaw) {
    userIds.add(v.voterUserId);
    userIds.add(v.candidateUserId);
  }

  const usersMap: Record<string, string> = {};
  if (userIds.size) {
    const ids = Array.from(userIds);
    const chunks: string[][] = [];
    while (ids.length) chunks.push(ids.splice(0, 10));

    for (const chunk of chunks) {
      const us = await db().collection("users").where("__name__", "in", chunk).get();
      for (const u of us.docs) usersMap[u.id] = (u.data() as any).username;
    }
  }

  const votes = votesRaw
    .map((v) => ({
      voterName: usersMap[v.voterUserId] || v.voterUserId,
      candidateName: usersMap[v.candidateUserId] || v.candidateUserId,
      reason: v.reason || "",
      createdAtISO: v.createdAt?.toDate ? v.createdAt.toDate().toISOString() : null
    }))
    .sort((a, b) => (a.createdAtISO || "").localeCompare(b.createdAtISO || ""));

  const winnerNames = (c.winners || []).map((id: string) => usersMap[id] || id);

  return NextResponse.json({
    id,
    monthLabel: c.monthLabel,
    startAtISO: c.startAtISO,
    endAtISO: c.endAtISO,
    finalizedAtISO: c.finalizedAtISO || null,
    winners: c.winners || [],
    winnerNames,
    tallies: c.tallies || {},
    votes
  });
}

