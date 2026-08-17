import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/SiteChrome";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">Inloggen</h1>
        <p className="mt-1 text-sm text-ink/60">Ga naar je klantomgeving.</p>
        <div className="mt-6">
          <Suspense>
            <AuthForm mode="login" />
          </Suspense>
        </div>
        <p className="mt-4 text-sm text-ink/60">
          Nog geen account? <Link href="/signup" className="text-green">Registreren</Link>
        </p>
      </div>
    </div>
  );
}
