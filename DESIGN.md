---
version: 1.0.0
name: maya-spirulina-design-system
philosophy: Modern Dark Studio Bio-Tech & Single-Product DTC Excellence
description: Canonical design specification for Maya Spirulina. A high-end scientific and biotechnology brand aesthetic with an unrelenting obsidian-matte canvas, neon emerald accents (#10b981), pharmaceutical amber highlights (#d97706), 1px precision hairline borders, and full Persian typography (Vazirmatn + tabular-nums).
reference-systems: [VoltAgent, Linear, Vercel]
---

# Maya Spirulina Design System (DESIGN.md)

This document is the single design source of truth for AI agents and developers building Maya Spirulina user interfaces.

---

## 1. Color Palette & Surface Tokens

### Dark Studio Palette (Default Mode)
```yaml
colors:
  # Canvas & Surfaces
  canvas: "#070a10"           # Matte Carbon Obsidian - Global Background
  canvas-card: "#0d121c"      # Elevated Surface Level 1 (Cards, Modules)
  canvas-subtle: "#0e1422"    # Level 2 Surface (Drawers, Sidebars, Inputs)
  canvas-glass: "rgba(13, 18, 28, 0.75)" # Backdrop-filtered glass

  # Borders & Engineering Lines
  hairline: "rgba(255, 255, 255, 0.08)" # 1px hairline border
  hairline-strong: "rgba(255, 255, 255, 0.16)" # Hover states, active inputs
  hairline-accent: "rgba(16, 185, 129, 0.28)" # Emerald highlight border

  # Text Hierarchy
  text-main: "#f8fafc"        # High-contrast titles, scientific labels
  text-muted: "#94a3b8"       # Secondary descriptions, helper text
  text-subtle: "#64748b"      # Footers, timestamps, system SKUs

  # Primary Brand Accent (Bio-Technology Emerald)
  primary: "#10b981"          # Emerald 500 - Primary actions & badges
  primary-hover: "#34d399"    # Emerald 400 - Hover interactive state
  primary-deep: "#059669"     # Emerald 600 - Darker gradients
  primary-glow: "rgba(16, 185, 129, 0.20)" # Ambient luminescent aura

  # Secondary Accent (Pharmaceutical Amber)
  amber-primary: "#d97706"    # Amber 600 - Glass bottle accent & refill highlights
  amber-soft: "rgba(217, 119, 6, 0.12)" # Background highlight for treatments

  # Semantic States
  status-success: "#10b981"
  status-warning: "#f59e0b"
  status-danger: "#f43f5e"
  status-info: "#0ea5e9"
```

### Day Theme Palette (Light Studio)
```yaml
colors-light:
  canvas: "#f8fafc"
  canvas-card: "#ffffff"
  canvas-subtle: "#f1f5f9"
  canvas-glass: "rgba(255, 255, 255, 0.85)"
  hairline: "rgba(0, 0, 0, 0.08)"
  hairline-strong: "rgba(0, 0, 0, 0.16)"
  text-main: "#0f172a"
  text-muted: "#64748b"
  text-subtle: "#94a3b8"
  primary: "#059669"
  primary-hover: "#10b981"
```

---

## 2. Typography & Numerical Formatting

- **Font Family:** `var(--font-vazirmatn), "Vazirmatn", system-ui, sans-serif`
- **Direction:** RTL (`dir="rtl"`)
- **Numerals:** Always tabular numerals (`font-feature-settings: "tnum" 1` or `font-mono`) and Persian localization (`toPersianDigits()`).

```yaml
typography:
  display-2xl:
    fontSize: "56px"
    lineHeight: "64px"
    fontWeight: 900
    letterSpacing: "-0.03em"
  display-xl:
    fontSize: "40px"
    lineHeight: "48px"
    fontWeight: 800
    letterSpacing: "-0.02em"
  display-lg:
    fontSize: "30px"
    lineHeight: "38px"
    fontWeight: 800
  title-md:
    fontSize: "20px"
    lineHeight: "28px"
    fontWeight: 700
  body-md:
    fontSize: "14px"
    lineHeight: "24px"
    fontWeight: 400
  body-sm:
    fontSize: "12px"
    lineHeight: "20px"
    fontWeight: 400
  caption-mono:
    fontSize: "11px"
    lineHeight: "16px"
    fontWeight: 600
    fontFamily: "var(--font-vazirmatn), monospace"
```

---

## 3. Radii & Geometry (The 6px / 8px Engineering Standard)

```yaml
radii:
  sm: "6px"      # Micro buttons, inputs, pills
  md: "8px"      # Standard buttons, nav items, dropdowns
  lg: "12px"     # Small cards, banners
  xl: "16px"     # Main dashboard cards, product cards
  2xl: "24px"    # Modal containers, large hero panels
  pill: "9999px" # Badges, status chips
```

---

## 4. Components & Interactive Patterns

### 1. Primary Button (`button-primary`)
- **Background:** `#10b981` (Dark) / `#059669` (Light)
- **Text:** `#070a10` (Dark) / `#ffffff` (Light), font-weight: 800
- **Border-radius:** `8px` (`rounded-lg`)
- **Focus:** `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`
- **Active:** `active:scale-[0.98]`
- **Transition:** `transition-colors duration-150` (Never `transition-all`)

### 2. Secondary & Outline Button (`button-secondary`)
- **Background:** `rgba(255, 255, 255, 0.05)`
- **Border:** `1px solid var(--hairline-strong)`
- **Text:** `var(--text-main)`
- **Hover:** `bg-white/10 text-white border-white/25`

### 3. Glass Drawer / Modal (`drawer-panel`)
- **Surface:** `bg-[#0d121c] border-r border-white/10 backdrop-blur-md`
- **Overscroll:** `overscroll-contain` (MANDATORY on all scrollable drawer containers)
- **Backdrop:** `bg-black/60 backdrop-blur-xs`
- **A11y:** `aria-modal="true"` and Escape key dismiss listener

### 4. Input Controls (`input-field`)
- **Background:** `bg-slate-50 dark:bg-white/5`
- **Border:** `border border-slate-200 dark:border-white/10`
- **Focus:** `focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20` (Never naked `outline-none`)
- **Accessibility:** Must link `<label htmlFor={id}>` with `<input id={id}>` and include `autoComplete`.

---

## 5. Web Interface Guidelines (Do's & Don'ts)

| Category | DO | DON'T |
| :--- | :--- | :--- |
| **Transitions** | Use explicit `transition-colors`, `transition-transform`, `transition-opacity` | Never use `transition-all` |
| **Focus** | Use `focus-visible:ring-*` with visible contrast | Never remove outlines with `outline-none` alone |
| **Buttons** | Provide `aria-label` for all icon-only buttons | Never have nameless interactive icons |
| **Animation** | Use `useReducedMotion()` from `motion/react` for scroll/physics | Never force heavy parallax on motion-sensitive users |
| **Forms** | Use semantic `<label htmlFor="...">`, `inputMode="tel"`, `autoComplete="name"` | Never leave orphaned inputs |
| **Drawers** | Apply `overscroll-behavior: contain` (`overscroll-contain`) | Never allow modal scroll chaining |
| **Typography** | Use Persian digits for UI, ellipsis `…` (not `...`) | Never mix Persian and English numeral formats |
| **Images** | Explicit `width` and `height`, `priority` on Hero LCP | Never use unconstrained `<img>` tags above fold |

---

## 6. Using the Tokens in Code

The palettes above are implemented as CSS variables in `src/app/globals.css` (`:root` for day, `.dark` for night) and exposed to Tailwind through `@theme inline`. Because the variables switch with the theme, **one class works in both themes** — do not pair a light class with a `dark:` hex class.

| Purpose | Tailwind class |
| :-- | :-- |
| Page / card / secondary surface | `bg-bg-page` · `bg-bg-card` · `bg-bg-subtle` |
| Text | `text-text-main` · `text-text-muted` · `text-text-subtle` |
| Borders | `border-border-hairline` · `border-border-strong` |
| Brand accent | `text-accent-primary` · `bg-accent-primary` · `bg-accent-soft` · `border-accent-border` · `bg-accent-hover` · `bg-accent-deep` |
| Status text | `text-success` · `text-warning` · `text-danger` · `text-info` |

Component classes (defined in `globals.css`): `studio-card`, `studio-card-interactive`, `btn` + `btn-primary` / `btn-outline` / `btn-ghost` / `btn-icon`, `badge-status` + `badge-status-success|warning|danger|info|neutral`, `nav-tab-base` + `nav-tab-active|inactive`, `input`.

### Portal screens

Every portal page (customer, ambassador, staff) is rendered inside `PortalShell` (header + standard right-hand sidebar) and is built from the shared kit in `src/components/portal/ui.tsx`: `PageTitle`, `StatCard`, `Table`/`Td`, `Field`, `Modal`, `Notice`, `EmptyState`, `SampleDataBanner`, plus `SectionTabs` for tabs inside a section. Using these keeps all panels visually identical; do not create panel-specific headers, sidebars or colour schemes.

### Always-dark cinematic sections

The scroll-driven hero (`HeroStorytellingSection`, `AppleBottleScrollSection`, `HeroBanner`), the ambassador story pages (`/story`) and `/showcase` are intentionally dark in both themes and keep the fixed obsidian values `#070a10` / `#0d121c`. This is the only place hex surface values are allowed.
