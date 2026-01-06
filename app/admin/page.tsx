"use client"

import { useEffect, useMemo, useState } from "react"

type CampaignRow = {
  id: string
  status?: string
  winnerIds?: string[]
  winningVoteCount?: number
  forcedFinalized?: boolean
  [k: string]: any
}

export default function AdminPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string>("")

  const currentCampaign = useMemo(() => campaigns?.[0] ?? null, [campaigns])

  async function refreshCampaigns() {
    setMsg("")
    const res = await fetch("/api/admin/campaigns", { cache: "no-store" })
    const data = await res.json()
    if (!res.ok) {
      setMsg(data?.error ?? "Failed to load campaigns")
      return
    }
    setCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : [])
  }

  useEffect(() => {
    refreshCampaigns()
  }, [])

  async function forceFinalizeCurrentMonth() {
    const ok = confirm("End voting early and finalize this month based on current votes, continue?")
    if (!ok) return

    setBusy("forceFinalize")
    setMsg("")
    try {
      const res = await fetch("/api/admin/campaigns/current/force-finalize", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data?.error ?? "Failed to force finalize")
        return
      }
      setMsg(`Force finalized ${data.monthKey}. Winners saved.`)
      await refreshCampaigns()
    } finally {
      setBusy(null)
    }
  }

  async function resetCurrentMonthIfForced() {
    const ok = confirm("Reset this month, delete all votes, remove winners, reopen voting. Continue?")
    if (!ok) return

    setBusy("reset")
    setMsg("")
    try {
      const res = await fetch("/api/admin/campaigns/current/reset", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data?.error ?? "Failed to reset")
        return
      }
      setMsg(`Reset ${data.monthKey}. Deleted votes: ${data.deletedVotes}. Voting is open again.`)
      await refreshCampaigns()
    } finally {
      setBusy(null)
    }
  }

  const canReset =
    !!currentCampaign &&
    currentCampaign.id &&
    currentCampaign.status === "finalized" &&
    currentCampaign.forcedFinalized === true

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
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
          {busy === "forceFinalize" ? "Finalizing…" : "End Voting Early, Finalize Current Month"}
        </button>

        <button
          onClick={resetCurrentMonthIfForced}
          disabled={busy !== null || !canReset}
          title={
            canReset
              ? "Reset the month back to open voting"
              : "Reset is only available if the month was force finalized"
          }
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            opacity: canReset ? 1 : 0.5,
            cursor: busy || !canReset ? "not-allowed" : "pointer",
          }}
        >
          {busy === "reset" ? "Resetting…" : "Reset Current Month (Only if Force Finalized)"}
        </button>

        <button
          onClick={refreshCampaigns}
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
                  <div style={{ marginTop: 8, opacity: 0.8 }}>
                    Voting is open, live totals are intentionally hidden.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

