"use client";
import { Search, User, X, ChevronRight, Trophy } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { searchPlayers } from "@/lib/api";
import type { PlayerSearchResult } from "@/types/api";

function PositionBadge({ pos }: { pos: string | null }) {
  if (!pos) return null;
  const colors: Record<string, string> = {
    Goalkeeper: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    Defender: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Midfield: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    Attack: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  const cls = colors[pos] ?? "bg-line text-mute border-line";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {pos}
    </span>
  );
}

function ClubPill({ name, apps, first, last }: { name: string; apps: number; first: string; last: string }) {
  const yr = (d: string) => d?.slice(0, 4) ?? "?";
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2 py-1.5">
      <Trophy className="h-3 w-3 shrink-0 text-grass" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-chalk">{name}</span>
      <span className="shrink-0 text-xs text-mute tabular-nums">
        {yr(first)}–{yr(last)} · {apps.toLocaleString()} apps
      </span>
    </div>
  );
}

interface PlayerRowProps {
  player: PlayerSearchResult;
  onClose: () => void;
}

function PlayerRow({ player, onClose }: PlayerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleClubs = expanded ? player.clubs : player.clubs.slice(0, 3);
  const more = player.clubs.length - 3;

  return (
    <li className="rounded-xl border border-line bg-panel2 p-3 transition-all duration-200 hover:border-grass/40">
      {/* Player header */}
      <div className="flex items-center gap-3">
        {player.image_url ? (
          <img
            src={player.image_url}
            alt={player.name}
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-line"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-panel">
            <User className="h-5 w-5 text-mute" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold text-chalk">{player.name}</span>
            <PositionBadge pos={player.position} />
          </div>
          <p className="mt-0.5 text-xs text-mute">
            {[player.nationality, player.date_of_birth?.slice(0, 4)].filter(Boolean).join(" · ")}
            {player.clubs.length > 0 && (
              <> · <span className="text-grass">{player.clubs.length} club{player.clubs.length !== 1 ? "s" : ""}</span></>
            )}
          </p>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 rounded-md p-1 text-mute transition-colors hover:bg-line hover:text-chalk"
          aria-label={expanded ? "Collapse clubs" : "Show clubs"}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {/* Club list */}
      {player.clubs.length > 0 && (
        <div className={`mt-2 overflow-hidden transition-all duration-300 ${expanded || player.clubs.length <= 3 ? "max-h-[500px] opacity-100" : "max-h-[92px] opacity-100"}`}>
          <div className="flex flex-col gap-1">
            {visibleClubs.map((club) => (
              <ClubPill
                key={club.club_id}
                name={club.club_name}
                apps={club.appearances}
                first={club.first_appearance}
                last={club.last_appearance}
              />
            ))}
          </div>
          {!expanded && more > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-1 text-xs text-grass hover:underline"
            >
              +{more} more club{more !== 1 ? "s" : ""}…
            </button>
          )}
          {expanded && player.clubs.length > 3 && (
            <button
              onClick={() => setExpanded(false)}
              className="mt-1 text-xs text-mute hover:text-chalk"
            >
              Show less
            </button>
          )}
        </div>
      )}
      {player.clubs.length === 0 && (
        <p className="mt-2 text-xs text-mute">No recorded club appearances.</p>
      )}
    </li>
  );
}

export default function PlayerSearchBar() {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!open || !query.trim()) { setItems([]); setTotal(0); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchPlayers(query, ctrl.signal);
        setItems(res.items); setTotal(res.total); setError(null); setLoading(false);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError((e as Error).message); setItems([]); setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, open]);

  // Close on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const clear = () => { setQuery(""); setItems([]); setTotal(0); setOpen(false); inputRef.current?.focus(); };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* Label */}
      <label htmlFor={`${uid}-player-input`} className="mb-1.5 block text-sm font-medium text-chalk">
        Search a player
      </label>

      {/* Input */}
      <div className="flex items-center gap-2 rounded-xl border border-sky/50 bg-panel2 px-3 transition-colors focus-within:border-sky">
        <Search className="h-4 w-4 shrink-0 text-mute" aria-hidden />
        <input
          ref={inputRef}
          id={`${uid}-player-input`}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search players, e.g. Thierry Henry"
          autoComplete="off"
          className="h-12 w-full bg-transparent text-base text-chalk placeholder:text-mute focus:outline-none"
        />
        {query && (
          <button onClick={clear} className="shrink-0 rounded p-1 text-mute hover:text-chalk" aria-label="Clear search">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-line bg-panel shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="text-xs text-mute">
              {loading ? "Searching…" : error ? "Error" : total === 0 ? "No results" : `${total.toLocaleString()} player${total !== 1 ? "s" : ""} found`}
            </span>
            {total > 8 && !loading && (
              <span className="text-xs text-mute">Showing first 8</span>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[480px] overflow-y-auto p-2">
            {loading && !items.length && (
              <div className="flex items-center justify-center py-8 text-sm text-mute">
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching…
              </div>
            )}
            {error && (
              <p className="px-3 py-4 text-sm text-red-300">{error}</p>
            )}
            {!loading && !error && items.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-mute">
                No players match &ldquo;{query}&rdquo;. Try a shorter or different name.
              </p>
            )}
            {items.length > 0 && (
              <ul className="flex flex-col gap-2" role="list">
                {items.map((player) => (
                  <PlayerRow key={player.player_id} player={player} onClose={() => setOpen(false)} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
