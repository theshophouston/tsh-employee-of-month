import { db } from "../lib/firebaseAdmin";
import { campaignIdFor, ensureCampaign, finalizeCampaignIfNeeded } from "../lib/campaign";
import Link from "next/link";

function addMonthsUTC(date: Date, delta: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d;
}

export default async function HomePage() {
  const now = new Date();
  await ensureCampaign(now);

  const lastMonth = addMonthsUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), -1);
  const lastId = campaignIdFor(lastMonth);

  const lastRef = db().collection("campaigns").doc(lastId);
  const lastSnap = await lastRef.get();

  if (lastSnap.exists) {
    const data = lastSnap.data() as any;
    const endAt = new Date(data.endAtISO);
    if (now > endAt && !data.finalizedAtISO) {
      await finalizeCampaignIfNeeded(lastId);
    }
  }

  const freshSnap = await lastRef.get();
  const last = freshSnap.exists ? (freshSnap.data() as any) : null;

  let winnerNames: string[] = [];
  if (last?.winners?.length) {
    const winners = last.winners as string[];
    const usersSnap = await db().collection("users").where("__name__", "in", winners).get();
    winnerNames = usersSnap.docs.map((d) => (d.data() as any).username);
  }

  return (
    <div className="card">
      <h1>TSH Employee of the Month</h1>
      <p>
        Vote once per month, do not vote for yourself, no live standings, we are not running a reality show.
      </p>

      <div className="row">
        <div className="col card">
          <h2>Last month</h2>
          {!last?.finalizedAtISO && <p>Not finalized yet, check back soon.</p>}
          {last?.finalizedAtISO && winnerNames.length === 0 && <p>No votes last month.</p>}
          {last?.finalizedAtISO && winnerNames.length > 0 && (
            <>
              <p className="notice">
                Winner{winnerNames.length > 1 ? "s" : ""}, {winnerNames.join(", ")}
              </p>
              <p className="small">
                Month, {last.monthLabel}. Finalized, {new Date(last.finalizedAtISO).toLocaleString()}
              </p>
            </>
          )}
        </div>

        <div className="col card">
          <h2>Links</h2>
          <p><Link href="/login">Login</Link></p>
          <p><Link href="/vote">Vote</Link></p>
          <p><Link href="/admin">Admin panel</Link></p>
        </div>
      </div>
    </div>
  );
}

