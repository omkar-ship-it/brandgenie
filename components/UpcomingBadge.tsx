/**
 * Marks a page or a card as a concept preview, not a live feature — used
 * on Brand Corner and Brand Drops throughout. Kept as one component so
 * every "upcoming" label reads and looks identical wherever it shows up.
 */
export function UpcomingBadge({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className={`upcoming-badge${size === "sm" ? " upcoming-badge-sm" : ""}`}>
      <span className="upcoming-dot" aria-hidden="true" />
      Upcoming
    </span>
  );
}
