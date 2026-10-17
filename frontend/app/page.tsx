"use client";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ClubPicker from "@/components/ClubPicker";
import SharedPlayersView from "@/components/SharedPlayersView";
import PlayerSearchBar from "@/components/PlayerSearchBar";
import { ErrorBox } from "@/components/States";
import { getTeam } from "@/lib/api";
import type { Team } from "@/types/api";

// Club ids come from the database (verified to return results against the supplied file).
const EXAMPLES = [
  { a: 418, b: 506, label: "Real Madrid and Juventus" },
  { a: 11, b: 631, label: "Arsenal and Chelsea" },
  { a: 16, b: 27, label: "Dortmund and Bayern" },
  { a: 131, b: 583, label: "Barcelona and PSG" },
];

function PitchMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden fill="none" stroke="#35B57A" strokeWidth="1.8">
      <rect x="2" y="5" width="28" height="22" rx="3" /><path d="M16 5v22" /><circle cx="16" cy="16" r="5" />
    </svg>
  );
}

function Logo2C1P() {
  return (
    <span className="font-display text-lg font-bold tracking-tight">
      <span className="text-grass">2</span>
      <span className="mx-0.5 text-mute"> Clubs </span>
      <span className="text-sky">1</span>
      <span className="text-mute"> Player</span>
    </span>
  );
}

export default function Home() {
  const [a, setA] = useState<Team | null>(null);
  const [b, setB] = useState<Team | null>(null);
  const [submitted, setSubmitted] = useState<{ a: Team; b: Team } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const sync = (x: Team | null, y: Team | null) => {
    const q = x && y ? `?a=${x.club_id}&b=${y.club_id}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${q}`);
  };

  const run = (x: Team, y: Team) => {
    if (x.club_id === y.club_id) { setError("Please select two different clubs."); return; }
    setError(null); setSubmitted({ a: x, b: y }); sync(x, y);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  // Restore a shared link like /?a=418&b=506
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const ia = Number(p.get("a")), ib = Number(p.get("b"));
    if (!ia || !ib) return;
    if (ia === ib) { setError("Please select two different clubs."); return; }
    Promise.all([getTeam(ia), getTeam(ib)])
      .then(([x, y]) => { setA(x); setB(y); setSubmitted({ a: x, b: y }); })
      .catch((e) => setError((e as Error).message));
  }, []);

  const reset = () => { setA(null); setB(null); setSubmitted(null); setError(null); sync(null, null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const swap = () => { if (a && b) { setA(b); setB(a); run(b, a); } };
  const same = a && b && a.club_id === b.club_id;

  const useExample = async (ex: (typeof EXAMPLES)[number]) => {
    try { const [x, y] = await Promise.all([getTeam(ex.a), getTeam(ex.b)]); setA(x); setB(y); run(x, y); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-5">
        <PitchMark /><Logo2C1P />
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="relative overflow-hidden rounded-2xl border border-line bg-panel px-5 py-10 sm:px-10 sm:py-14">
          <svg aria-hidden viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" fill="none" stroke="#E9EFF6" strokeWidth="2">
            <rect x="20" y="20" width="760" height="360" rx="6" /><path d="M400 20v360" /><circle cx="400" cy="200" r="70" />
            <rect x="20" y="120" width="110" height="160" /><rect x="670" y="120" width="110" height="160" />
          </svg>
          <div className="relative">
            <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.05] sm:text-6xl">
              Two clubs. Every player who wore both shirts.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-mute sm:text-lg">
              Pick any two clubs and see who has a recorded match appearance for each, with counts for every club. It looks at careers, not current squads.
            </p>

            {/* Player search bar */}
            <div className="mt-8 max-w-xl rounded-2xl border border-line bg-panel/60 p-4">
              <p className="mb-3 text-sm font-medium text-chalk">🔍 Curious about a specific player?</p>
              <PlayerSearchBar />
            </div>

            <form className="mt-10" onSubmit={(e) => { e.preventDefault(); if (a && b) run(a, b); }}>
              <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
                <ClubPicker label="First club" side="a" value={a} onChange={setA} blockedId={b?.club_id ?? null} />
                <div aria-hidden className="hidden h-12 w-12 items-center justify-center self-end rounded-full border-2 border-line bg-ink font-display text-sm text-mute md:flex md:mb-0">&amp;</div>
                <ClubPicker label="Second club" side="b" value={b} onChange={setB} blockedId={a?.club_id ?? null} />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button type="submit" disabled={!a || !b || !!same}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-grass px-6 font-semibold text-ink transition-colors hover:bg-grass/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-mute">
                  <Search className="h-4 w-4" aria-hidden />Find shared players
                </button>
                {!a || !b ? <span className="text-sm text-mute">Choose both clubs to continue.</span> : null}
              </div>
              {error && <div className="mt-4 max-w-xl"><ErrorBox message={error} /></div>}
            </form>

            <div className="mt-10">
              <p className="text-sm text-mute">Not sure where to start? Try one of these.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex.label} onClick={() => useExample(ex)}
                    className="rounded-full border border-line bg-panel2 px-4 py-2 text-sm hover:border-grass hover:text-grass">{ex.label}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div ref={resultsRef} className="mt-12">
          {submitted && <SharedPlayersView key={`${submitted.a.club_id}-${submitted.b.club_id}`} a={submitted.a} b={submitted.b} onReset={reset} onSwap={swap} />}
        </div>
      </main>

      <footer className="border-t border-line px-5 py-8 text-center text-xs text-mute">
        Data: Transfermarkt datasets (public match, player and transfer records). Not affiliated with Transfermarkt or any club. Club names belong to their owners.
      </footer>
    </div>
  );
}
