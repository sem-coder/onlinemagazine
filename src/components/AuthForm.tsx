"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate, type AuthState } from "@/app/auth/actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const [state, action, busy] = useActionState(authenticate, null as AuthState);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={params.get("next") || "/dashboard"} />
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
      {state?.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <button disabled={busy} className="rounded-md bg-green py-2.5 text-sm font-medium text-white">
        {busy ? "Even geduld…" : mode === "signup" ? "Account maken" : "Inloggen"}
      </button>
    </form>
  );
}
