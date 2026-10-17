"use client";
import { ArrowLeftRight, Info, RotateCcw, UsersRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSharedPlayers } from "@/lib/api";
import type { Coverage, SharedPlayer, SortKey, SortOrder, Team } from "@/types/api";
import ClubBadge from "./ClubBadge";
import PlayerCard from "./PlayerCard";
import PlayerDrawer from "./PlayerDrawer";
import { CardSkeletons, ErrorBox, Spinner } from "./States";

const SORTS: { label: string; sort: SortKey; order: SortOrder }[] = [
  { label: "Most appearances", sort: "appearances", order: "desc" },
  { label: "Fewest appearances", sort: "appearances", order: "asc" },
  { label: "Name, A to Z", sort: "name", order: "asc" },
  { label: "Name, Z to A", sort: "name", order: "desc" },
];

export default function SharedPlayersView({ a, b, onReset, onSwap }: { a: Team; b: Team; onReset: () => void; onSwap: () => void }) {
  const [sortIdx, setSortIdx] = useState(0);
  const [items, setItems] = useState<SharedPlayer[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const reqId = useRef(0);
  const { sort, order } = SORTS[sortIdx];

  const load = useCallback(async (offset: number) => {
    const id = ++reqId.current;
    offset === 0 ? setLoading(true) : setMore(true);
    setError(null);
    try {
      const r = await getSharedPlayers(a.club_id, b.club_id, sort, order, offset);
      if (id !== reqId.current) return; // a newer request superseded this one
      setItems((prev) => (offset === 0 ? r.items : [...prev, ...r.items]));
      setTotal(r.total); setCoverage(r.coverage);
    } catch (e) {
      if (id === reqId.current) setError((e as Error).message);
    } finally {
      if (id === reqId.current) { setLoading(false); setMore(false); }
    }
  }, [a.club_id, b.club_id, sort, order]);

  useEffect(() => { setItems([]); setTotal(null); load(0); }, [load]);

  return (
    <section aria-labelledby="results-h" className="scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h2 id="results-h" className="font-display text-2xl font-semibold sm:text-3xl">
            {loading && total === null ? "Searching records" : total === 0 ? "No shared players found" : `${total?.toLocaleString()} shared ${total === 1 ? "player" : "players"}`}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-mute">
            <ClubBadge name={a.name} side="a" size={24} /><span className="text-chalk">{a.name}</span> and
            <ClubBadge name={b.name} side="b" size={24} /><span className="text-chalk">{b.name}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="sort">Sort players</label>
          <select id="sort" value={sortIdx} onChange={(e) => setSortIdx(Number(e.target.value))}
            className="h-10 rounded-lg border border-line bg-panel2 px-3 text-sm text-chalk">
            {SORTS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
          </select>
          <button onClick={onSwap} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-mute hover:bg-panel2 hover:text-chalk">
            <ArrowLeftRight className="h-4 w-4" aria-hidden />Swap clubs</button>
          <button onClick={onReset} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-mute hover:bg-panel2 hover:text-chalk">
            <RotateCcw className="h-4 w-4" aria-hidden />Change teams</button>
        </div>
      </div>

      {coverage && (
        <p className="mt-4 flex gap-2 rounded-lg border border-line bg-panel/60 p-3 text-sm text-mute">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{coverage.message}</span>
        </p>
      )}

      <div className="mt-6" aria-live="polite" aria-busy={loading}>
        {error && <ErrorBox message={error} onRetry={() => load(items.length)} />}
        {loading && !error && <CardSkeletons />}
        {!loading && !error && total === 0 && (
          <div className="rounded-xl border border-dashed border-line p-10 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-mute" aria-hidden />
            <p className="mt-3 font-display text-lg font-semibold">No player has a recorded appearance for both clubs</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-mute">That may be true, or the overlap may sit outside the dataset’s dates and competitions. Try a different pair.</p>
            <button onClick={onReset} className="mt-5 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-ink hover:bg-grass/90">Change teams</button>
          </div>
        )}
        {items.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((p) => <PlayerCard key={p.player_id} player={p} teamA={a} teamB={b} onOpen={() => setOpenId(p.player_id)} />)}
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="tabular text-sm text-mute">Showing {items.length} of {total}</p>
              {total !== null && items.length < total && (
                <button onClick={() => load(items.length)} disabled={more}
                  className="rounded-lg border border-line bg-panel2 px-5 py-2.5 text-sm font-medium hover:border-mute disabled:opacity-60">
                  {more ? <Spinner label="Loading more" /> : "Show more players"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {openId !== null && <PlayerDrawer playerId={openId} teamA={a} teamB={b} onClose={() => setOpenId(null)} />}
    </section>
  );
}
