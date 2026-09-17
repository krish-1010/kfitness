"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("next") || "/");
      router.refresh();
    } else {
      setError("Wrong password");
    }
  };

  return (
    <form onSubmit={submit} style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Cut Tracker</div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoFocus
        style={{
          background: "#1D1B15",
          border: "1px solid #2C2A22",
          color: "#EDEAE3",
          padding: "10px 12px",
          fontSize: 14,
          outline: "none",
        }}
      />
      {error && <div style={{ color: "#C1604B", fontSize: 13 }}>{error}</div>}
      <button
        type="submit"
        disabled={loading}
        style={{ background: "#D4922C", border: "none", color: "#15140F", padding: "10px 16px", fontSize: 14, fontWeight: 600 }}
      >
        {loading ? "..." : "Log in"}
      </button>
      <div style={{ fontSize: 11, color: "#9A968C" }}>Stays logged in for 30 days.</div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#15140F",
        color: "#EDEAE3",
        padding: 16,
      }}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
