import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/auth";
import { db } from "../../../../lib/firebaseAdmin";
import { campaignIdFor, ensureCampaign, finalizeCampaignIfNeeded } from "../../../../lib/campaign";

function addMonthsUTC(date: Date, delta: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d;
}

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const now = new Date();
  await ensureCampaign(now);

  const id = campaignIdFor(now);
  const ref = db().collection("campaigns").doc(id);
  const snap = await ref.get();
  const data = snap.data() as any;

  const lastMonth = addMonthsUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), -1);
  const lastId = campaignIdFor(lastMonth);
  const lastRef = db().collection("campaigns").doc(lastId);
  const lastSnap = await lastRef.get();
  if (lastSnap.exists) {
    const last = lastSnap.data() as any;
    const endAt = new Date(last.endAtISO);
    if (now > endAt && !last.finalizedAtISO) {
      await finalizeCampaignIfNeeded(lastId);
    }
  }

  return NextResponse.json({
    id,
    monthLabel: data.monthLabel,
    startAtISO: data.startAtISO,
    endAtISO: data.endAtISO
  });
}

