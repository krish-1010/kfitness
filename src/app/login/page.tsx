"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
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
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("next") || "/");
      router.refresh();
    } else {
      setError("Wrong email or password");
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-[320px] flex flex-col gap-3">
      <div className="text-xl font-semibold mb-2">FitR</div>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoFocus className="input" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input" />
      {error && <div className="text-destructive text-[13px]">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "..." : "Log in"}
      </button>
      <div className="text-[11px] text-muted-foreground">Stays logged in for 30 days.</div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
