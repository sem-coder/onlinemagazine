import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/SiteChrome";

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">Account maken</h1>
        <p className="mt-1 text-sm text-ink/60">Houd je flipbooks, haal branding weg en embed op je site.</p>
        <div className="mt-6">
          <Suspense>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
        <p className="mt-4 text-sm text-ink/60">
          Al een account? <Link href="/login" className="text-green">Inloggen</Link>
        </p>
      </div>
    </div>
  );
}
