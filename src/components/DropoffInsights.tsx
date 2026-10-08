import type { FunnelInsights } from "@/lib/funnel";

export function DropoffInsights({
  insights,
  compact = false,
}: {
  insights: FunnelInsights;
  compact?: boolean;
}) {
  if (insights.sessions === 0) {
    return (
      <p className="mt-2 text-sm text-ink/55">
        Nog geen sessies. Open de publieke link of embed, blader een paar pagina’s, en ververs dit scherm.
      </p>
    );
  }

  const hotspot = insights.hotspot;

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <Stat value={String(insights.sessions)} label="sessies" />
        <Stat value={`${insights.completePct}%`} label="tot de laatste pagina" />
        {hotspot ? (
          <Stat value={`p. ${hotspot.page}`} label={`${hotspot.exitPct}% haakt hier af`} />
        ) : (
          <Stat value="—" label="geen duidelijk afhaakpunt" />
        )}
      </div>
      {hotspot ? (
        <p className="mt-3 text-sm text-ink/70">
          De meeste lezers stoppen op pagina {hotspot.page} ({hotspot.exits} van {insights.sessions} sessies).
          Pagina’s daarna zien zij niet meer.
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink/70">Lezers die starten, bladeren grotendeels tot het eind.</p>
      )}
      {compact ? null : <FunnelBars insights={insights} />}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-paper px-4 py-3 ring-1 ring-black/5">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-ink/55">{label}</p>
    </div>
  );
}

function FunnelBars({ insights }: { insights: FunnelInsights }) {
  const rows = insights.pages;
  const hotPage = insights.hotspot?.page;
  return (
    <ol className="mt-5 max-h-80 overflow-auto divide-y divide-black/5 text-sm">
      {rows.map((row) => (
        <li
          key={row.page}
          className={`grid grid-cols-[4.5rem_1fr_7rem] items-center gap-3 py-2 ${row.page === hotPage ? "font-medium" : ""}`}
        >
          <span className="text-ink/70">{row.last ? "Einde" : `Pagina ${row.page}`}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full bg-green" style={{ width: `${Math.max(row.reachedPct, row.reached ? 3 : 0)}%` }} />
          </div>
          <span className="text-right text-ink/55">
            {row.last ? `${row.reachedPct}% klaar` : row.exits ? `${row.exitPct}% stopt` : `${row.reachedPct}%`}
          </span>
        </li>
      ))}
    </ol>
  );
}
