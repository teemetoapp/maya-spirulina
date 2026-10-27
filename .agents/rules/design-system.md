# Design System Rule

All agents MUST follow [DESIGN.md](../../DESIGN.md), the single design reference.
- Use the theme tokens (`bg-bg-page`, `bg-bg-card`, `bg-bg-subtle`, `text-text-main`, `text-text-muted`, `border-border-hairline`, `text-accent-primary`, `bg-accent-soft`, …). Do not add hex colors in class names.
- Portal screens use the shared kit in `src/components/portal/ui.tsx` and the classes `studio-card`, `btn`, `badge-status-*`, `nav-tab-*`, `input`.
- Persian numerals via `toPersianDigits()` / `formatToman()`.
- Use `motion/react` for scroll interactions and respect `useReducedMotion`.
- `npx tsc --noEmit`, `npm run lint` and `npm run build` must pass.
