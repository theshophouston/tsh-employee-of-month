"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  username: string;
  role: "admin" | "employee";
  password?: string;
  mustChangePassword?: boolean;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [campaignDetail, setCampaignDetail] = useState<any>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "employee">("employee");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    setErr(null);

    const uRes = await fetch("/api/admin/users");
    const uData = await uRes.json();
    if (!uRes.ok) {
      setErr(uData.error || "Failed to load users");
      return;
    }
    setUsers(uData.users);

    const cRes = await fetch("/api/admin/campaigns");
    const cData = await cRes.json();
    setCampaigns(cData.campaigns);
  }

  useEffect(() => {
    load();
  }, []);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
    });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "Failed");
    else {
      setMsg("User added");
      setNewUsername("");
      setNewPassword("");
      setNewRole("employee");
      await load();
    }
  }

  async function updateUser(id: string, patch: any) {
    setMsg(null);
    setErr(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "Failed");
    else {
      setMsg("User updated");
      await load();
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    setMsg(null);
    setErr(null);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "Failed");
    else {
      setMsg("User deleted");
      await load();
    }
  }

  async function loadCampaignDetail(id: string) {
    setSelectedCampaign(id);
    setCampaignDetail(null);
    const res = await fetch(`/api/admin/campaigns/${id}`);
    const data = await res.json();
    setCampaignDetail(data);
  }

  async function finalizeCampaign(id: string) {
    setMsg(null);
    setErr(null);
    const res = await fetch(`/api/admin/campaigns/${id}/finalize`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "Failed");
    else {
      setMsg("Campaign finalized");
      await load();
      await loadCampaignDetail(id);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="card">
      <h1>Admin panel</h1>
      <p className="small">You have the keys to the kingdom, try not to drop them in the dyno bay.</p>

      <p><Link href="/vote">Back to vote</Link></p>

      <div className="row">
        <div className="col card">
          <h2>Employees</h2>

          <form onSubmit={addUser} className="card">
            <label className="small">First name, becomes username</label>
            <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />

            <div className="hr" />

            <label className="small">Initial password</label>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />

            <div className="hr" />

            <label className="small">Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
              <option value="employee">employee</option>
              <option value="admin">admin</option>
            </select>

            <div className="hr" />
            <button>Add</button>
          </form>

          <div className="hr" />

          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Password, plain text</th>
                <th>Must change</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    >
                      <option value="employee">employee</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <input
                      defaultValue={u.password || ""}
                      onBlur={(e) => updateUser(u.id, { password: e.target.value })}
                    />
                    <div className="small">Edit and click out to save</div>
                  </td>
                  <td>{u.mustChangePassword ? "yes" : "no"}</td>
                  <td>
                    <button
                      onClick={() => updateUser(u.id, { mustChangePassword: true })}
                    >
                      Force change
                    </button>
                    <div style={{ height: 8 }} />
                    <button className="danger" onClick={() => deleteUser(u.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {msg && <p className="notice">{msg}</p>}
          {err && <p className="error">{err}</p>}
        </div>

        <div className="col card">
          <h2>Campaigns</h2>
          <p className="small">Pick a month to see votes, winners, reasons.</p>

          <select value={selectedCampaign} onChange={(e) => loadCampaignDetail(e.target.value)}>
            <option value="" disabled>Select month</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.monthLabel} {c.finalizedAtISO ? "(final)" : "(open or not finalized)"}
              </option>
            ))}
          </select>

          <div className="hr" />

          {campaignDetail && (
            <div className="card">
              <h2>{campaignDetail.monthLabel}</h2>

              <p className="small">
                Finalized, {campaignDetail.finalizedAtISO ? new Date(campaignDetail.finalizedAtISO).toLocaleString() : "no"}
              </p>

              {!campaignDetail.finalizedAtISO && (
                <button onClick={() => finalizeCampaign(campaignDetail.id)}>
                  Finalize now
                </button>
              )}

              <div className="hr" />

              <h2>Winners</h2>
              <p className="notice">
                {campaignDetail.winnerNames?.length ? campaignDetail.winnerNames.join(", ") : "No votes"}
              </p>

              <div className="hr" />

              <h2>Votes</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Voter</th>
                    <th>Voted for</th>
                    <th>Reason</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignDetail.votes?.map((v: any, idx: number) => (
                    <tr key={idx}>
                      <td>{v.voterName}</td>
                      <td>{v.candidateName}</td>
                      <td>{v.reason || ""}</td>
                      <td>{v.createdAtISO ? new Date(v.createdAtISO).toLocaleString() : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="hr" />
          <button className="danger" onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
  );
}

