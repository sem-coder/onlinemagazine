"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        email: form.get("email"),
        password: form.get("password"),
        name: form.get("name"),
      }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Mislukt");
      return;
    }
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3">
      {mode === "signup" ? (
        <input name="name" placeholder="Naam" className="rounded-md border border-black/10 px-3 py-2" />
      ) : null}
      <input name="email" type="email" required placeholder="E-mail" className="rounded-md border border-black/10 px-3 py-2" />
      <input
        name="password"
        type="password"
        required
        minLength={6}
        placeholder="Wachtwoord"
        className="rounded-md border border-black/10 px-3 py-2"
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button disabled={busy} className="rounded-md bg-green py-2.5 text-sm font-medium text-white">
        {mode === "signup" ? "Account maken" : "Inloggen"}
      </button>
    </form>
  );
}
