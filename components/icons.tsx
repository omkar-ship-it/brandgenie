/**
 * Line icons for controls.
 *
 * Emoji were doing this job and doing it badly: 🏪 renders as a Japanese
 * convenience store complete with a "24" sign, ⏱️ and 🕚 are near-identical
 * at button size, and every platform draws them differently — so a button's
 * meaning changed depending on the device. These inherit `currentColor` and
 * the surrounding font size, so they sit on a button like type rather than
 * like a sticker.
 *
 * Emoji still belong where they're *content* rather than UI: the genie is a
 * character, and a brand's reward icon is something the brand chose.
 */
type IconProps = { className?: string; size?: number };

function Svg({ children, size = 16, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** The listing fee: a price tag. */
export function IconTag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Play: the universal triangle. */
export function IconPlay(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 4.5v15l13-7.5Z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Stop: a filled square is read faster than a hand at speed. */
export function IconStop(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** A reward. */
export function IconGift(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M3 13h18M12 9v12" />
      <path d="M12 9S10.5 3 8 3a2.5 2.5 0 0 0 0 5h4Zm0 0s1.5-6 4-6a2.5 2.5 0 0 1 0 5h-4Z" />
    </Svg>
  );
}

/** Looking without playing. */
export function IconEye(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

/** Timing. */
export function IconClock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

/** Done for today. */
export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </Svg>
  );
}

/** A brand. */
export function IconStore(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 9.5V20a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V9.5" />
      <path d="M2.5 9.5 4.2 4a1 1 0 0 1 1-.7h13.6a1 1 0 0 1 1 .7l1.7 5.5a3 3 0 0 1-5.5 1.8 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-3.5-1.8Z" />
    </Svg>
  );
}

/** Moving up the board. */
export function IconTrendUp(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </Svg>
  );
}

/** A wish. */
export function IconSparkle(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5 10.1 12 4.5 10l5.6-1.4Z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" />
    </Svg>
  );
}

/** Redeemed in someone else's checkout. */
export function IconCart(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <path d="M2.5 3.5h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h9a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
    </Svg>
  );
}

/** Redeemed in person. */
export function IconCounter(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10h18M4.5 10V6.5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1V10" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-4h4v4" />
    </Svg>
  );
}

/** Choosing brands yourself. */
export function IconHandPick(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 11V6a1.5 1.5 0 0 1 3 0v5" />
      <path d="M15 11.5V8a1.5 1.5 0 0 1 3 0v6.5a6.5 6.5 0 0 1-6.5 6.5h-.8a5 5 0 0 1-3.9-1.9L4 15a1.6 1.6 0 0 1 2.4-2.1L9 15" />
    </Svg>
  );
}
