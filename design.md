# Design — SafeThali

/* high-end-visual-design · Soft Structuralism · Asymmetrical Bento
 * Reading: food-safety consumer app for Indian households
 * Vibe: pure white surfaces · emerald accent · massive whitespace
 * Signature: double-bezel cards · floating glass nav · fluid motion
 */

## Palette
- `--canvas`    #F5F5F7  (silver-grey background)
- `--paper`     #FFFFFF  (pure white cards)
- `--paper-2`   #FAFAFA
- `--paper-3`   #F0F0F2  (fills / toggles)
- `--ink`       #1D1D1F  (near-black)
- `--ink-2`     #6E6E73
- `--ink-3`     #AEAEB2
- `--rule`      #E5E5E7
- `--accent`    #00BFA5  (emerald — fresh / safe / trust)
- `--accent-2`  #00897B
- `--chili`     #FF3B30  (risk high/critical)

## Typography
- Display: **Plus Jakarta Sans** 800 (massive, tight tracking)
- Body: **Plus Jakarta Sans** 500–700
- Devanagari: Noto Sans Devanagari
- Mono: JetBrains Mono (tabular data)
- Eyebrow: 10px, 600 weight, 0.2em tracking, uppercase, pill-shaped

## Architecture
- **Double-Bezel Cards**: outer shell (bg-paper-3, rounded-[2rem], p-1.5) + inner core (bg-paper, rounded-[1.625rem], shadow-inner)
- **Floating Glass Nav**: detached from top, rounded-full, backdrop-blur, shadow-card
- **Pill Buttons**: rounded-full, haptic press (active:scale-97), button-in-button trailing icon
- **Bento Grid**: asymmetric card sizes (col-span-7 + col-span-5)

## Motion
- All transitions: cubic-bezier(0.32, 0.72, 0, 1) — fluid physics
- Scroll entry: fade-up with blur(6px) → blur(0), 0.7s duration
- Hover: translateY(-4px) + diffused shadow
- Press: scale(0.97) haptic feedback
- Respect prefers-reduced-motion

## Brand
- SafeThali / सेफथाली
- EN + HI only
