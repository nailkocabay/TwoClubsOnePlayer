"use client";
import { ArrowLeft, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCareer } from "@/lib/api";
import { fullDate, money } from "@/lib/format";
import type { CareerResponse, Team } from "@/types/api";
import CareerTimeline from "./CareerTimeline";
import ClubBadge from "./ClubBadge";
import { ErrorBox, Spinner } from "./States";

export default function PlayerDrawer({ playerId, teamA, teamB, onClose }: { playerId: number; teamA: Team; teamB: Team; onClose: () => void }) {
  const [data, setData] = useState<CareerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setData(null); setError(null);
    getCareer(playerId, ctrl.signal).then(setData).catch((e) => { if (e.name !== "AbortError") setError(e.message); });
    return () => ctrl.abort();
  }, [playerId, attempt]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const p = data?.player;
  const facts: [string, string | null][] = p ? [
    ["Nationality", p.nationality], ["Born", p.date_of_birth ? `${fullDate(p.date_of_birth)}${p.age !== null ? ` (${p.age})` : ""}` : null],
    ["Birthplace", p.country_of_birth], ["Position", p.sub_position ?? p.position], ["Foot", p.foot ? p.foot[0].toUpperCase() + p.foot.slice(1) : null],
    ["Height", p.height_cm ? `${p.height_cm} cm` : null],
  ] : [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label="Player career details" className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-panel">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel/95 px-5 py-3 backdrop-blur">
          <button ref={closeRef} onClick={onClose} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-mute hover:bg-line hover:text-chalk">
            <ArrowLeft className="h-4 w-4" aria-hidden />Back to shared players
          </button>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-2 text-mute hover:bg-line hover:text-chalk"><X className="h-4 w-4" aria-hidden /></button>
        </div>
        <div className="space-y-8 p-5">
          {error && <ErrorBox message={error} onRetry={() => setAttempt((n) => n + 1)} />}
          {!data && !error && <Spinner label="Loading career" />}
          {data && p && (
            <>
              <header>
                <h2 className="font-display text-3xl font-semibold">{p.name}</h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {facts.filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt className="text-mute">{k}</dt><dd>{v}</dd></div>))}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  {[["a", teamA], ["b", teamB]].map(([s, t]) => (
                    <span key={(t as Team).club_id} className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2 py-1 pl-1 pr-3">
                      <ClubBadge name={(t as Team).name} side={s as "a" | "b"} size={24} />{(t as Team).name}
                    </span>
                  ))}
                </div>
              </header>

              <section aria-labelledby="apps-h">
                <h3 id="apps-h" className="font-display text-xl font-semibold">Recorded appearances by club</h3>
                <p className="mb-4 mt-1 text-sm text-mute">Built from match records only. Each bar runs from the first to the last recorded match at that club.</p>
                <CareerTimeline stints={data.appearance_history} teamAId={teamA.club_id} teamBId={teamB.club_id} />
              </section>

              <section aria-labelledby="tr-h">
                <h3 id="tr-h" className="font-display text-xl font-semibold">Transfer history</h3>
                <p className="mb-4 mt-1 text-sm text-mute">Moves recorded by Transfermarkt. These are transfer dates, not the dates the player actually played, and include youth teams the match data doesn’t cover.</p>
                {data.transfer_history.length === 0 ? <p className="text-sm text-mute">No transfers recorded.</p> : (
                  <ol className="divide-y divide-line rounded-lg border border-line">
                    {data.transfer_history.map((t, i) => (
                      <li key={i} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                        <div className="min-w-0"><p className="font-medium">{t.from_club_name ?? "Unknown"} to {t.to_club_name ?? "Unknown"}</p>
                          <p className="text-xs text-mute">{fullDate(t.transfer_date)}{t.season ? `, season ${t.season}` : ""}{t.is_future ? ", scheduled" : ""}</p></div>
                        <span className="tabular shrink-0 text-xs text-mute">{money(t.fee_eur)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
