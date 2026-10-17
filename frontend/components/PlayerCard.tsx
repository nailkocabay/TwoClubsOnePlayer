import type { ClubStat, SharedPlayer, Team } from "@/types/api";
import { initials, seasonSpan, shortClub } from "@/lib/format";

function Stat({ team, stat, side }: { team: Team; stat: ClubStat; side: "a" | "b" }) {
  const c = side === "a" ? "border-grass text-grass" : "border-sky text-sky";
  return (
    <div className={`min-w-0 flex-1 border-l-2 pl-3 ${c}`}>
      <p className="truncate text-xs text-mute">{shortClub(team.name)}</p>
      <p className="tabular text-xl font-semibold leading-tight text-chalk">{stat.appearances}<span className="ml-1 text-xs font-normal text-mute">apps</span></p>
      <p className="tabular text-xs text-mute">{seasonSpan(stat.first_appearance, stat.last_appearance)}</p>
    </div>
  );
}

export default function PlayerCard({ player, teamA, teamB, onOpen }: { player: SharedPlayer; teamA: Team; teamB: Team; onOpen: () => void }) {
  const meta = [player.nationality, player.sub_position ?? player.position, player.age ? `${player.age} yrs` : null].filter(Boolean).join(", ");
  return (
    <button onClick={onOpen} aria-label={`Open career details for ${player.name}`}
      className="group flex flex-col gap-4 rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-mute/60 hover:bg-panel2">
      <div className="flex items-center gap-3">
        {player.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.image_url} alt="" className="h-12 w-12 rounded-full border border-line object-cover" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-panel2 font-display text-base font-semibold text-mute">{initials(player.name)}</span>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold leading-tight">{player.name}</h3>
          <p className="truncate text-sm text-mute">{meta || "Details unavailable"}</p>
        </div>
      </div>
      <div className="flex gap-4"><Stat team={teamA} stat={player.team_a} side="a" /><Stat team={teamB} stat={player.team_b} side="b" /></div>
    </button>
  );
}
