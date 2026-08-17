import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center text-ink">
      <p className="font-display text-4xl">Magazine niet gevonden</p>
      <p className="mt-3 max-w-md text-ink/65">
        Deze link bestaat niet (meer). Upload het PDF opnieuw om een nieuw magazine te maken.
      </p>
      <Link href="/" className="mt-8 rounded-full bg-ink px-5 py-2.5 text-sm text-paper">
        Terug naar Folio
      </Link>
    </div>
  );
}
