/** The three board mechanics being compared, described once. */
export const TRY_MODES = [
  {
    slug: "walk",
    mode: "classic",
    icon: "walk",
    name: "The walk",
    tagline: "The original · new grid",
    how: "He sets off from the same tile for everyone and walks until his feet give out. This board also previews a grid where the bid buys area, not just a rank number.",
    agency: "None — pure chance",
    brandFairness: "Every brand gets walked past equally often",
  },
  {
    slug: "pick",
    mode: "pick",
    icon: "pick",
    name: "Pick your brands",
    tagline: "The other experiment",
    how: "Shortlist up to five brands you'd actually use, then he draws one of them.",
    agency: "High — you choose the field",
    brandFairness: "Brands nobody shortlists are never reached",
  },
  {
    slug: "stop",
    mode: "stop",
    icon: "stop",
    name: "Stop the genie",
    tagline: "Live on the board",
    how: "He walks tile by tile and you hit stop. Timing decides where he lands.",
    agency: "Highest — skill decides it",
    brandFairness: "Good timing takes the best reward every day",
  },
] as const;

/** Keys rather than emoji, so the pages draw them with the icon set. */
export type TryIcon = "walk" | "pick" | "stop";

export const modeHref = (slug: string) => (slug ? `/try/${slug}` : "/");
