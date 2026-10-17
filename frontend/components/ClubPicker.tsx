"use client";
import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { searchTeams } from "@/lib/api";
import type { Team } from "@/types/api";
import ClubBadge from "./ClubBadge";

interface Props {
  label: string;
  side: "a" | "b";
  value: Team | null;
  onChange: (t: Team | null) => void;
  /** Club already chosen in the other slot: shown but not selectable */
  blockedId: number | null;
}

export default function ClubPicker({ label, side, value, onChange, blockedId }: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const accent = side === "a" ? "border-grass/60 focus-within:border-grass" : "border-sky/60 focus-within:border-sky";

  // Debounced, abortable search; an empty query lists the clubs with the most recorded appearances.
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchTeams(query, ctrl.signal);
        setItems(res.items); setError(null); setActive(0); setLoading(false);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError((e as Error).message); setItems([]); setLoading(false);
      }
    }, query ? 200 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (t: Team) => {
    if (t.club_id === blockedId) return;
    onChange(t); setOpen(false); setQuery("");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && open && items[active]) { e.preventDefault(); choose(items[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  if (value) {
    return (
      <div className={`flex items-center gap-3 rounded-xl border bg-panel2 p-3 ${side === "a" ? "border-grass/60" : "border-sky/60"}`}>
        <ClubBadge name={value.name} side={side} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-mute">{label}</p>
          <p className="truncate font-display text-lg font-semibold leading-tight">{value.name}</p>
          <p className="truncate text-xs text-mute">{[value.country, value.competition_id].filter(Boolean).join(", ") || "Club"}</p>
        </div>
        <button onClick={() => { onChange(null); setTimeout(() => inputRef.current?.focus(), 0); }}
          className="rounded-md p-2 text-mute hover:bg-line hover:text-chalk" aria-label={`Change ${label.toLowerCase()}: ${value.name}`}>
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={`${uid}-input`} className="mb-1.5 block text-sm font-medium text-chalk">{label}</label>
      <div className={`flex items-center gap-2 rounded-xl border bg-panel2 px-3 ${accent}`}>
        <Search className="h-4 w-4 text-mute" aria-hidden />
        <input ref={inputRef} id={`${uid}-input`} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? `${uid}-opt-${items[active].club_id}` : undefined}
          value={query} placeholder="Search clubs, e.g. Arsenal" autoComplete="off"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          className="h-12 w-full bg-transparent text-base text-chalk placeholder:text-mute focus:outline-none" />
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label={`${label} suggestions`}
          className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-line bg-panel p-1 shadow-2xl shadow-black/50">
          {loading && !items.length && <li className="px-3 py-3 text-sm text-mute" role="status">Searching…</li>}
          {error && <li className="px-3 py-3 text-sm text-red-200" role="alert">{error}</li>}
          {!loading && !error && !items.length && (
            <li className="px-3 py-3 text-sm text-mute">No clubs match “{query}”. Try a shorter name or another spelling.</li>
          )}
          {items.map((t, i) => {
            const blocked = t.club_id === blockedId;
            return (
              <li key={t.club_id} id={`${uid}-opt-${t.club_id}`} role="option" aria-selected={i === active} aria-disabled={blocked}
                onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(t)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${i === active ? "bg-panel2" : ""} ${blocked ? "cursor-not-allowed opacity-50" : ""}`}>
                <ClubBadge name={t.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.name}</span>
                  <span className="block truncate text-xs text-mute">
                    {blocked ? "Already selected" : [t.country, `${t.appearances.toLocaleString()} recorded appearances`].filter(Boolean).join(", ")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
