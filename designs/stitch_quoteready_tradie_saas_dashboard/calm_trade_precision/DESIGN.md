---
name: Calm Trade Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#3e4947'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#146683'
  on-secondary: '#ffffff'
  secondary-container: '#9addff'
  on-secondary-container: '#0e6380'
  tertiary: '#3b536e'
  on-tertiary: '#ffffff'
  tertiary-container: '#546b87'
  on-tertiary-container: '#deebff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#bfe9ff'
  secondary-fixed-dim: '#8ccff0'
  on-secondary-fixed: '#001f2a'
  on-secondary-fixed-variant: '#004d65'
  tertiary-fixed: '#d1e4ff'
  tertiary-fixed-dim: '#b0c9e8'
  on-tertiary-fixed: '#011d35'
  on-tertiary-fixed-variant: '#314863'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  data-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-dense: 1rem
  margin: 2rem
  margin-compact: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for operational clarity, rapid estimation, and quiet confidence in residential plumbing businesses across Melbourne. The aesthetic rejects flashy tech gimmicks, heavy enterprise clutter, and neon gradients in favor of utilitarian elegance: grounded, purposeful, and structured. 

It synthesizes modern utilitarian minimalism with subtle tactile detailing. Visual rhythm is dictated by clear structural containers, calm tonal surfaces, deliberate data hierarchy, and swift keyboard-driven operational pathways. It evokes trust, mastery, and professional competence—enabling dispatchers, lead technicians, and business owners to manage quotes, material margins, and job statuses without friction or visual fatigue.

## Colors

The palette grounds high-frequency business operations with high-contrast functional color roles:

- **Canvas & Backgrounds**: The base app surface uses `#F8F9F7` (warm off-white), preventing harsh glare during prolonged desktop use while sustaining distinction against pure `#FFFFFF` card containers.
- **Structural Nav Surface**: The deep navy `#102A43` powers navigation bars and sidebars, anchoring the workspace and separating configuration from data entry.
- **Action Hierarchy**: Primary actions rely on rich teal `#0F766E` (hover: `#0D655E`; active: `#0B534E`), paired with white labels for accessible legibility. Secondary utility accents apply `#3B82A0` for links, auxiliary toggles, and multi-step progress indicators.
- **Text & Structural Line Work**: Primary typographic copy is anchored in charcoal `#1F2937`, with supporting metadata and captions rendered in `#6B7280`. System partitions, data tables, and card containers use subtle borders calibrated to `#E5E7EB`.
- **Operational Status Tokens**:
  - *Success / Ready / Approved*: Text `#15803D` on container `#DCFCE7`
  - *Warning / Inspection / Awaiting Quote*: Text `#D97706` on container `#FEF3C7`
  - *Danger / Needs Info / Overdue*: Text `#B91C1C` on container `#FEE2E2`

## Typography

Typography prioritizes tabular readability and typographic balance across dense operational screens:

- **Manrope** provides authoritative, modern, geometric presence for high-level numbers, page titles, and modal headers.
- **Inter** handles high-density forms, operational line items, line-cost calculations, and data grids. It delivers optimal legibility at compact sizes (11px–14px).
- Sentence case governs all copy throughout buttons, field labels, status badges, and table headers. Capitalization is strictly reserved for Australian tax/currency codes (e.g., `AUD`, `GST`) and standard acronyms.
- Numeric columns (costs, part counts, margins, times) use font feature settings `font-feature-settings: "tnum" 1` for consistent tabular vertical alignment.

## Layout & Spacing

The layout is built for high-productivity desktop views using a fluid fixed-sidebar architecture:

- **Sidebar Anchor**: Fixed desktop rail at 260px (`#102A43`), collapsable to 72px icon-only state for smaller laptop screens (under 1280px).
- **Work Surface**: Fluid layout within a maximum bounding frame of 1680px, retaining comfortable left/right canvas margins (`2rem` / `32px`).
- **12-Column Grid Rhythm**: Line item builders and invoice summaries follow an asymmetrical 8/4 or 9/3 column split. Column gutters sit at `1.5rem` (`24px`), compressing to `1rem` (`16px`) inside dense modal dialogues.
- **Spacing Scale Discipline**: Compact paddings (`0.5rem` to `1rem`) ensure data density without crowding input targets, retaining ample whitespace around primary callouts.

## Elevation & Depth

This system intentionally departs from heavy diffuse drop shadows, opting for low-profile architectural separation:

- **Surface Layering**: The primary depth mechanic is the contrast between `#F8F9F7` (app canvas) and `#FFFFFF` (interactive cards and modules), joined with crisp 1px borders in `#E5E7EB`.
- **Resting Cards**: Border `1px solid #E5E7EB`, accompanied by an ambient micro-shadow: `0 1px 2px 0 rgba(16, 42, 67, 0.04)`.
- **Hover / Interactive States**: Slight lift achieved with `0 4px 6px -1px rgba(16, 42, 67, 0.07), 0 2px 4px -2px rgba(16, 42, 67, 0.05)`, while the border shifts to `#D1D5DB`.
- **Floating Overlays & Popovers**: Quick-filter menus, flyout drawers, and cost preview tooltips leverage `0 10px 15px -3px rgba(16, 42, 67, 0.10), 0 4px 6px -4px rgba(16, 42, 67, 0.05)`.
- **Modals & Dialogs**: Centered overlays use `0 20px 25px -5px rgba(16, 42, 67, 0.12)` over a subtle backdrop scrim of `#102A43` at 40% opacity.

## Shapes

The geometric framework balances tactile friendliness with crisp efficiency:

- **Card Containers & Modules**: Formally bound at 10px to 12px radii (`rounded-lg`), delivering a modern, clean silhouette that prevents structural fatigue.
- **Interactive Controls (Inputs, Buttons, Dropdowns)**: Built uniformly at 8px (`0.5rem`), ensuring consistent optical alignment across paired form rows.
- **Status Badges & Quick Filters**: Rendered at full pill radii (9999px) to visually distinguish immutable status metadata from interactive rectangular text inputs.

## Components

### Primary & Secondary Buttons
- **Primary CTA**: Background `#0F766E`, text `#FFFFFF`, border `1px solid transparent`, height 40px, padding `0 18px`, font `label-lg`, radius 8px. Hover state shifts to `#0D655E`. Focus ring: `0 0 0 3px rgba(15, 118, 110, 0.25)`.
- **Secondary Button**: Background `#FFFFFF`, text `#1F2937`, border `1px solid #E5E7EB`, height 40px, padding `0 18px`, font `label-lg`, radius 8px. Hover state: background `#F9FAFB` with border `#D1D5DB`.
- **Tertiary / Destructive Action**: Muted gray or danger-tinted button `#B91C1C` for quote discarding or line item deletions.

### Input Fields & Controls
- **Form Inputs**: Height 40px, background `#FFFFFF`, border `1px solid #E5E7EB`, border-radius 8px, text `#1F2937` in `body-md`, padding `0 12px`.
- **Active Focus**: Border transitions to `#0F766E` with subtle glow ring `0 0 0 3px rgba(15, 118, 110, 0.15)`.
- **Prefix / Suffix**: Tabular currency prefix (`$ AUD`) styled in `#6B7280` with a subtle grey inner wall separator.

### Status Tag Badges
- Pill-shaped tags (height 24px, padding `0 10px`, font `label-sm`, radius 9999px).
- Accompanied by a 6px status bullet or mini icon (12x12px):
  - *Ready / Approved*: Text `#15803D`, background `#DCFCE7`, border `1px solid #BBF7D0`.
  - *Inspection / Draft*: Text `#D97706`, background `#FEF3C7`, border `1px solid #FDE68A`.
  - *Needs Info / Revision*: Text `#B91C1C`, background `#FEE2E2`, border `1px solid #FECACA`.

### Data Tables
- Header row height 40px, background `#F8F9F7`, uppercase/sentence case `label-sm` in `#6B7280`, bottom border `1px solid #E5E7EB`.
- Data row height 48px to 52px, alternating row hover background `#F9FAFB`. Numeric data (labour rates, pipe dimensions, line totals) right-aligned and set in `data-mono`.

### Cards & Calculation Panels
- White `#FFFFFF` surface, 12px radius, `1px solid #E5E7EB` border.
- Calculation cards include distinct summary blocks (e.g., Subtotal, GST, Net Margin) highlighted with warm off-white `#F8F9F7` background segments and clear separator lines.

### Quick Filter Bar
- Inline segment tabs (All, Needs Quote, In Progress, Invoiced) resting inside a `#F3F4F6` track container with 8px radius. Active pill tab sits on `#FFFFFF` with micro-shadow and `#1F2937` active text.