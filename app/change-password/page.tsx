"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      const d = await r.json();
      if (!r.ok) router.push("/login");
      else setMe(d);
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newPassword })
    });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "Failed");
    else {
      setOk("Password updated");
      router.push("/vote");
    }
  }

  return (
    <div className="card">
      <h1>Change password</h1>
      <p>Required on first login.</p>

      <form onSubmit={submit} className="card">
        <label className="small">New password</label>
        <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" />

        <div className="hr" />
        <button>Save and continue</button>

        {err && <p className="error">{err}</p>}
        {ok && <p className="notice">{ok}</p>}
        {me && <p className="small">Logged in as, {me.username}, role, {me.role}</p>}
      </form>
    </div>
  );
}

