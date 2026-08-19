"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BookshelfForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [value, setValue] = useState(slug);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookshelfSlug: value }),
    });
    const data = (await response.json()) as { error?: string; bookshelfSlug?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Opslaan mislukt");
      return;
    }
    if (data.bookshelfSlug) setValue(data.bookshelfSlug);
    setMessage("Opgeslagen");
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <label className="block text-sm">
        Boekenkast-URL
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
      </label>
      <p className="mt-2 text-sm text-ink/55">onlinemagazine.vercel.app/b/{value || "jouw-naam"}</p>
      <button type="button" onClick={() => void save()} className="mt-4 rounded-md bg-green px-4 py-2 text-sm text-white">
        Opslaan
      </button>
      {message ? <p className="mt-2 text-sm text-ink/60">{message}</p> : null}
    </div>
  );
}
