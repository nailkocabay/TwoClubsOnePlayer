import { clubInitials } from "@/lib/format";

/** No logo source is licensed in the dataset, so clubs get a monogram badge. */
export default function ClubBadge({ name, side = "neutral", size = 40 }: { name: string; side?: "a" | "b" | "neutral"; size?: number }) {
  const ring = side === "a" ? "border-grass text-grass bg-grass-dim/30" : side === "b" ? "border-sky text-sky bg-sky-dim/30" : "border-line text-mute bg-panel2";
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 font-display font-semibold ${ring}`}
      style={{ width: size, height: size, fontSize: Math.max(size * 0.32, 10) }}>
      {clubInitials(name)}
    </span>
  );
}
