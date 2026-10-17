const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2018-08-18" -> "Aug 2018" (parsed manually to avoid timezone shifts) */
export function monthYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
export function fullDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
export const year = (iso: string) => Number(iso.slice(0, 4));
export const seasonSpan = (a: string, b: string) => (year(a) === year(b) ? `${year(a)}` : `${year(a)}–${year(b)}`);

export function initials(name: string): string {
  const parts = name.replace(/#\d+/, "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
export function clubInitials(name: string): string {
  const stop = new Set(["fc", "cf", "ac", "as", "ss", "sc", "afc", "de", "club", "the", "sporting"]);
  const w = name.split(/[\s.-]+/).filter((x) => x && !stop.has(x.toLowerCase()));
  const src = w.length ? w : name.split(/\s+/);
  return (src.length === 1 ? src[0].slice(0, 3) : src.slice(0, 3).map((x) => x[0]).join("")).toUpperCase();
}
export function shortClub(name: string): string {
  return name.replace(/^(FC|CF|AC|AS|SS|SSC|AFC)\s+/i, "").replace(/\s+(FC|CF)$/i, "");
}
export function money(eur: number | null): string {
  if (eur === null || eur === undefined) return "undisclosed";
  if (eur === 0) return "free";
  if (eur >= 1e6) return `€${(eur / 1e6).toFixed(eur >= 1e7 ? 0 : 1)}m`;
  return `€${Math.round(eur / 1e3)}k`;
}
