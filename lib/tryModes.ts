/** The three board mechanics being compared, described once. */
export const TRY_MODES = [
  {
    slug: "",
    mode: "classic",
    icon: "🧞",
    name: "The walk",
    tagline: "What's live today",
    how: "He sets off from the same tile for everyone and walks until his feet give out.",
    agency: "None — pure chance",
    brandFairness: "Every brand gets walked past equally often",
  },
  {
    slug: "pick",
    mode: "pick",
    icon: "👆",
    name: "Pick your brands",
    tagline: "Experiment A",
    how: "Shortlist up to five brands you'd actually use, then he draws one of them.",
    agency: "High — you choose the field",
    brandFairness: "Brands nobody shortlists are never reached",
  },
  {
    slug: "stop",
    mode: "stop",
    icon: "⏱️",
    name: "Stop the genie",
    tagline: "Experiment B",
    how: "He walks tile by tile and you hit stop. Timing decides where he lands.",
    agency: "Highest — skill decides it",
    brandFairness: "Good timing takes the best reward every day",
  },
] as const;

export const modeHref = (slug: string) => (slug ? `/try/${slug}` : "/");
