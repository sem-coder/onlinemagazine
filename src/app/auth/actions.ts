"use server";

import { redirect } from "next/navigation";
import { getGuestId, loginUser, registerUser, setSession } from "@/lib/auth";
import { claimGuestMagazines } from "@/lib/magazines";

export type AuthState = { error: string } | null;

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "/dashboard");
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return "/dashboard";
  return next;
}

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  try {
    const user =
      mode === "signup"
        ? await registerUser({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            name: String(formData.get("name") ?? ""),
          })
        : await loginUser(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
    await setSession(user.id);
    const guestId = await getGuestId();
    if (guestId) await claimGuestMagazines(guestId, user.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Inloggen mislukt" };
  }
  redirect(safeNext(formData.get("next")));
}
