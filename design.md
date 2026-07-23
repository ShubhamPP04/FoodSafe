# Design — FoodSafe (Forest calm)

Locked system for this app. Read before every redesign. Amend here when the
system grows; do not invent one-off palettes per page.

## Genre
Trust-first product for Indian families. Cool bone surfaces, deep forest ink,
single emerald accent for the *safe* signal. Not cream-paper editorial. Not neon.

## Macrostructure
- **Marketing** (`/landing`): Almanac — left-aligned hero, one CTA group, quiet
  proof below the fold. No particle fields, no glow orbs.
- **App** (`/scan`, `/diary`, `/map`, …): Workbench — sidebar + focused content.
  Function carries the page; no decorative enrichment.
- **Auth** (`/auth`): Centered form on bone. Typography + mark only.

## Dials
`DESIGN_VARIANCE: 5` · `MOTION_INTENSITY: 4` · `VISUAL_DENSITY: 5`

## Theme (OKLCH)
- `--color-paper`      `oklch(97.2% 0.006 150)`  — cool bone
- `--color-paper-2`    `oklch(94.5% 0.008 150)`
- `--color-paper-3`    `oklch(91% 0.010 150)`
- `--color-paper-4`    `oklch(87% 0.012 150)`
- `--color-ink`        `oklch(22% 0.035 155)`    — deep forest
- `--color-ink-2`      `oklch(38% 0.025 155)`
- `--color-ink-3`      `oklch(52% 0.018 155)`
- `--color-rule`       `oklch(88% 0.008 150)`
- `--color-accent`     `oklch(52% 0.13 155)`     — emerald (safe)
- `--color-accent-2`   `oklch(42% 0.12 155)`
- `--color-accent-ink` `oklch(98% 0.004 150)`    — text on accent
- `--color-ochre`      `oklch(70% 0.12 75)`      — medium risk only
- `--color-chili`      `oklch(55% 0.17 28)`      — high risk only
- `--color-focus`      `oklch(52% 0.13 155)`

Accent ≤ 5% of any viewport. Never decorative. Ochre/chili are semantic risk only.

## Typography
- **Display / UI**: Outfit (500 / 600 / 700). Tracking −0.02em on display.
  Roman only on headings. No serif. No Fraunces.
- **Body**: Outfit 400 / 500. Measure ≤ 65ch.
- **Mono / labels**: DM Mono 400 / 500, uppercase, +0.12em tracking.
- **Devanagari**: Noto Sans Devanagari (body + UI).

## Spacing & shape
4pt scale via CSS vars. Corner radius: `6 / 10 / 14 / 20`. One soft system;
no mixed pill-everywhere + sharp chaos. Interactive chips may be pill; surfaces
stay 10–14px.

## Motion
- Ease: `--ease-out cubic-bezier(0.16, 1, 0.3, 1)`
- Durations: 120 / 180 / 220 / 500ms. ≤ 3 primitives per page.
- Animate `transform` + `opacity` only.
- Reveal: single `fade-up` on mount. No scroll cascades.
- Hover: `translateY(-2px)` lift. Never scale. Never glow.
- Reduced motion: opacity-only ≤ 150ms.

## CTA voice
- **Primary**: forest ink fill, bone text, 10px radius, weight 600.
- **Safe / confirm**: accent emerald fill, accent-ink text (Scan, Analyze).
- **Secondary**: paper-2 fill, ink text, 1px rule border.
- Copy = verb phrase: *Scan food*, *Check symptoms*, *Add member*.

## Shared chrome
- Wordmark **FoodSafe** in Outfit 600, tracking −0.02em.
- Mark: ShieldCheck on accent square (not ochre).
- Bone paper background. Emerald accent rule.

## Anti-patterns (banned)
- Warm cream / beige paper (`#f5f1ea` family), brass/ochre as brand color.
- Fraunces, Instrument Serif, italic display headings.
- Neon / outer glow / mesh orbs / particle fields.
- `hover:scale`, bounce easings, celebratory toasts for expected actions.
- `text-white` in new code → `text-ink` / `text-paper` / `text-accent-ink`.
- Invented metrics. Use real FSSAI figures or an em-dash placeholder.
- Em-dash as design flourish in UI copy (use hyphen or period).

## Exports
Tokens live in `src/index.css` `:root`. Tailwind extend maps `paper`, `ink`,
`brand`, `ochre`, `chili`, `rule`, `fontFamily.{sans,mono}`.
