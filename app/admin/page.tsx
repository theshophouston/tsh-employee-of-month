"use client"

import { useEffect, useMemo, useState } from "react"

type CampaignRow = {
  id: string
  status?: "open" | "finalized" | string
  winnerIds?: string[]
  winningVoteCount?: number
  forcedFinalized?: boolean
  [k: string]: any
}

type VoteRow = {
  voterUserId: string
  votedForUserId: string
  reason: string
  createdAt?: any
}

export default function AdminPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string>("")

  const [liveVotes, setLiveVotes] = useState<VoteRow[]>([])
  const [liveTotals, setLiveTotals] = useState<Record<string, number>>({})

  const currentCampaign = useMemo(() => campaigns?.[0] ?? null, [campaigns])

  async function refreshCampaigns() {
    setMsg("")
    const res = await fetch("/api/admin/campaigns", { cache: "no-store" })
    const data = await res.json()
    if (!res.ok) {
      setMsg(data?.error ?? "Failed to load campaigns")
      return
    }
    const rows = Array.isArray(data?.campaigns) ? data.campaigns : []
    setCampaigns(rows)
  }

  async function refreshLiveVotes(campaignId: string) {
    const res = await fetch(`/api/admin/campaigns/${campaignId}`, { cache: "no-store" })
    const data = await res.json()
    if (!res.ok) {
      setLiveVotes([])
      setLiveTotals({})
      setMsg(data?.error ?? "Failed to load live votes")
      return
    }
    setLiveVotes(Array.isArray(data?.votes) ? data.votes : [])
    setLiveTotals(data?.totals && typeof data.totals === "object" ? data.totals : {})
  }

  useEffect(() => {
    refreshCampaigns()
  }, [])

  useEffect(() => {
    if (currentCampaign?.id) {
      refreshLiveVotes(currentCampaign.id)
    } else {
      setLiveVotes([])
      setLiveTotals({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCampaign?.id])

  async function forceFinalizeCurrentMonth() {
    const ok = confirm("End voting early and finalize this month based on current votes?")
    if (!ok) return

    setBusy("forceFinalize")
    setMsg("")
    try {
      const res = await fetch("/api/admin/campaigns/current/force-finalize", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data?.error ?? "Failed to force finalize")
        return
      }
      setMsg(`Force finalized ${data.monthKey}. Winners saved.`)
      await refreshCampaigns()
      if (currentCampaign?.id) await refreshLiveVotes(currentCampaign.id)
    } finally {
      setBusy(null)
    }
  }

  async function resetCurrentMonthIfForced() {
    const ok = confirm("Reset this month, delete all votes, remove winners, and reopen voting?")
    if (!ok) return

    setBusy("reset")
    setMsg("")
    try {
      const res = await fetch("/api/admin/campaigns/current/reset", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data?.error ?? "Failed to reset")
        return
      }
      setMsg(`Reset ${data.monthKey}. Deleted votes: ${data.deletedVotes}. Voting is open again.`)
      await refreshCampaigns()
      if (currentCampaign?.id) await refreshLiveVotes(currentCampaign.id)
    } finally {
      setBusy(null)
    }
  }

  async function resetSingleVote(voterUserId: string) {
    if (!currentCampaign?.id) return

    const ok = confirm("Reset this employee’s vote so they can vote again?")
    if (!ok) return

    setBusy(`resetVote:${voterUserId}`)
    setMsg("")
    try {
      const res = await fetch(
        `/api/admin/campaigns/${currentCampaign.id}/votes/${voterUserId}/reset`,
        { method: "POST" }
      )
      const data = await res.json()
      if (!res.ok) {
        setMsg(data?.error ?? "Failed to reset vote")
        return
      }
      setMsg("Vote reset.")
      await refreshLiveVotes(currentCampaign.id)
      await refreshCampaigns()
    } finally {
      setBusy(null)
    }
  }

  const canResetMonth =
    !!currentCampaign &&
    currentCampaign.status === "finalized" &&
    currentCampaign.forcedFinalized === true

  const totalsList = Object.entries(liveTotals).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Admin Panel</h1>

      {msg ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button
          onClick={forceFinalizeCurrentMonth}
          disabled={busy !== null}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy === "forceFinalize" ? "Finalizing…" : "End Voting Early & Finalize Current Month"}
        </button>

        <button
          onClick={resetCurrentMonthIfForced}
          disabled={busy !== null || !canResetMonth}
          title={canResetMonth ? "Reset the month back to open voting" : "Reset is only available if the month was force finalized"}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            opacity: canResetMonth ? 1 : 0.5,
            cursor: busy || !canResetMonth ? "not-allowed" : "pointer",
          }}
        >
          {busy === "reset" ? "Resetting…" : "Reset Current Month (Only if Force Finalized)"}
        </button>

        <button
          onClick={async () => {
            await refreshCampaigns()
            if (currentCampaign?.id) await refreshLiveVotes(currentCampaign.id)
          }}
          disabled={busy !== null}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <h2 style={{ marginTop: 24, fontSize: 20, fontWeight: 700 }}>Current Campaign</h2>

      {!currentCampaign ? (
        <div style={{ opacity: 0.7, marginTop: 8 }}>No campaigns found.</div>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 700 }}>{currentCampaign.id}</div>
            <div style={{ opacity: 0.8 }}>
              Status: {currentCampaign.status ?? "unknown"}
              {currentCampaign.forcedFinalized ? ", forced" : ""}
            </div>
          </div>

          {currentCampaign.status === "finalized" ? (
            <div style={{ marginTop: 8, opacity: 0.9 }}>
              Winners: {Array.isArray(currentCampaign.winnerIds) && currentCampaign.winnerIds.length ? currentCampaign.winnerIds.join(", ") : "none"}
              {" , "}
              Votes: {typeof currentCampaign.winningVoteCount === "number" ? currentCampaign.winningVoteCount : "unknown"}
            </div>
          ) : (
            <div style={{ marginTop: 8, opacity: 0.8 }}>Voting is open.</div>
          )}
        </div>
      )}

      <h2 style={{ marginTop: 24, fontSize: 20, fontWeight: 700 }}>Live Vote Totals</h2>
      {totalsList.length === 0 ? (
        <div style={{ opacity: 0.7, marginTop: 8 }}>No votes yet.</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {totalsList.map(([userId, count]) => (
            <div key={userId} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
              <strong>{userId}</strong>, {count}
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 24, fontSize: 20, fontWeight: 700 }}>Live Votes (Admin Only)</h2>

      {liveVotes.length === 0 ? (
        <div style={{ opacity: 0.8, marginTop: 8 }}>No votes yet.</div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Voter</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Voted For</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Reason</th>
                <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}></th>
              </tr>
            </thead>
            <tbody>
              {liveVotes.map((v) => (
                <tr key={v.voterUserId}>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{v.voterUserId}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{v.votedForUserId}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee", opacity: 0.9 }}>
                    {v.reason ? v.reason : <em>No reason provided</em>}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                    <button
                      onClick={() => resetSingleVote(v.voterUserId)}
                      disabled={busy !== null}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                    >
                      {busy === `resetVote:${v.voterUserId}` ? "Resetting…" : "Reset Vote"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: 24, fontSize: 20, fontWeight: 700 }}>Campaign History</h2>

      <div style={{ marginTop: 10 }}>
        {campaigns.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No campaigns found.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {campaigns.map((c) => (
              <div key={c.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700 }}>{c.id}</div>
                  <div style={{ opacity: 0.8 }}>
                    Status: {c.status ?? "unknown"}
                    {c.forcedFinalized ? ", forced" : ""}
                  </div>
                </div>

                {c.status === "finalized" ? (
                  <div style={{ marginTop: 8, opacity: 0.9 }}>
                    Winners: {Array.isArray(c.winnerIds) && c.winnerIds.length ? c.winnerIds.join(", ") : "none"}
                    {" , "}
                    Votes: {typeof c.winningVoteCount === "number" ? c.winningVoteCount : "unknown"}
                  </div>
                ) : (
                  <div style={{ marginTop: 8, opacity: 0.8 }}>Voting is open.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
