"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Me = { userId: string; username: string; role: "admin" | "employee" };

export default function VotePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!me) return employees;
    return employees.filter((e) => e.id !== me.userId);
  }, [employees, me]);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meRes.ok) window.location.href = "/login";
      setMe(meData);

      const cRes = await fetch("/api/campaigns/current");
      const cData = await cRes.json();
      setCampaign(cData);

      const uRes = await fetch("/api/admin/users?public=1");
      const uData = await uRes.json();
      setEmployees(uData.users);
    })();
  }, []);

  async function submitVote(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);

    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateUserId: candidateId, reason })
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed to vote");
    else setStatus("Vote submitted.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="card">
      <h1>Vote</h1>
      <p className="small">
        Current month, {campaign?.monthLabel || "loading"}. One vote. No live standings.
      </p>

      <div className="row">
        <div className="col card">
          <h2>Cast your vote</h2>
          <form onSubmit={submitVote}>
            <label className="small">Pick an employee</label>
            <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} required>
              <option value="" disabled>Select</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.username}
                </option>
              ))}
            </select>

            <div className="hr" />

            <label className="small">Reason, optional, admin only</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} />

            <div className="hr" />
            <button disabled={!candidateId}>Submit vote</button>

            {status && <p className="notice">{status}</p>}
            {error && <p className="error">{error}</p>}
          </form>
        </div>

        <div className="col card">
          <h2>Account</h2>
          {me && (
            <>
              <p>
                Logged in as, <span className="badge">{me.username}</span>, role, <span className="badge">{me.role}</span>
              </p>
              <p><Link href="/change-password">Change password</Link></p>
              {me.role === "admin" && <p><Link href="/admin">Admin panel</Link></p>}
              <button className="danger" onClick={logout}>Logout</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

