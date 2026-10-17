import type { AppearanceStint } from "@/types/api";
import { seasonSpan, year } from "@/lib/format";

/** One bar per club, spanning first to last recorded appearance, on a shared year axis. */
export default function CareerTimeline({ stints, teamAId, teamBId }: { stints: AppearanceStint[]; teamAId?: number; teamBId?: number }) {
  if (!stints.length) return <p className="text-sm text-mute">No recorded appearances for this player.</p>;
  const min = Math.min(...stints.map((s) => year(s.first_appearance)));
  const max = Math.max(...stints.map((s) => year(s.last_appearance))) + 1;
  const span = Math.max(max - min, 1);
  const ticks = Array.from(new Set([min, Math.round(min + span / 2), max]));
  return (
    <div>
      <ol className="space-y-3">
        {stints.map((s) => {
          const left = ((year(s.first_appearance) - min) / span) * 100;
          const width = Math.max(((year(s.last_appearance) + 1 - year(s.first_appearance)) / span) * 100, 4);
          const color = s.club_id === teamAId ? "bg-grass" : s.club_id === teamBId ? "bg-sky" : "bg-mute/60";
          return (
            <li key={s.club_id} className="grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.club_name}</p>
                <p className="tabular text-xs text-mute">{s.appearances} apps, {seasonSpan(s.first_appearance, s.last_appearance)}</p>
              </div>
              <div className="relative h-5 rounded bg-panel2" role="img" aria-label={`${s.club_name}: ${s.appearances} appearances, ${seasonSpan(s.first_appearance, s.last_appearance)}`}>
                <div className={`absolute top-0 h-5 rounded ${color}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 grid grid-cols-[minmax(0,8.5rem)_1fr] gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
        <span />
        <div className="tabular flex justify-between border-t border-line pt-1 text-xs text-mute">{ticks.map((t) => <span key={t}>{t}</span>)}</div>
      </div>
    </div>
  );
}
