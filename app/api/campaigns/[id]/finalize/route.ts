import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../../../lib/auth";
import { finalizeCampaignIfNeeded } from "../../../../../../lib/campaign";

export async function POST(_: Request, ctx: { params: { id: string } }) {
  const s = getSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  await finalizeCampaignIfNeeded(ctx.params.id);
  return NextResponse.json({ ok: true });
}

