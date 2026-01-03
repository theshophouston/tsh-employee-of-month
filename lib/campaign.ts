import { db, FieldValue } from "./firebaseAdmin";

export type Campaign = {
  id: string;               // YYYY-MM
  monthLabel: string;       // "January 2026"
  startAtISO: string;
  endAtISO: string;
  finalizedAtISO?: string;
  winners?: string[];       // userIds
  tallies?: Record<string, number>;
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function campaignIdFor(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return `${y}-${pad2(m)}`;
}

export function monthLabelFor(date: Date) {
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function startEndForMonth(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0 based
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0)); // exclusive
  return { start, end };
}

export async function ensureCampaign(date: Date) {
  const id = campaignIdFor(date);
  const { start, end } = startEndForMonth(date);
  const ref = db().collection("campaigns").doc(id);
  const snap = await ref.get();
  if (snap.exists) return;

  const data: Campaign = {
    id,
    monthLabel: monthLabelFor(date),
    startAtISO: start.toISOString(),
    endAtISO: new Date(end.getTime() - 1).toISOString()
  };

  await ref.set({ ...data, createdAt: FieldValue.serverTimestamp() });
}

export async function finalizeCampaignIfNeeded(campaignId: string) {
  const ref = db().collection("campaigns").doc(campaignId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Campaign not found");
  const data = snap.data() as any;
  if (data.finalizedAtISO) return;

  const votesSnap = await ref.collection("votes").get();
  const tallies: Record<string, number> = {};
  for (const doc of votesSnap.docs) {
    const v = doc.data() as any;
    tallies[v.candidateUserId] = (tallies[v.candidateUserId] ?? 0) + 1;
  }

  let max = 0;
  for (const k of Object.keys(tallies)) max = Math.max(max, tallies[k]);

  const winners = Object.keys(tallies).filter((k) => tallies[k] === max && max > 0);

  await ref.update({
    tallies,
    winners,
    finalizedAtISO: new Date().toISOString()
  });
}

