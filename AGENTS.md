<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Read first

1. [docs/project-lifecycle/STATUS.md](./docs/project-lifecycle/STATUS.md) — what is real, what is sample data, open questions.
2. [docs/HANDOVER.md](./docs/HANDOVER.md) — architecture, order lifecycle, code conventions, Definition of Done.
3. [docs/RBAC.md](./docs/RBAC.md) and [docs/NOTIFICATIONS.md](./docs/NOTIFICATIONS.md) when touching access or messages.
4. [DESIGN.md](./DESIGN.md) — the only design reference. No new hex colors; use tokens and `src/components/portal/ui.tsx`.

Rules:
- Every staff API starts with `requireApi("<permission>")`; prices are computed only on the server.
- Change order status only through `src/lib/commerce/orders.ts`.
- Update STATUS.md (feature matrix + decision log) when you finish a feature.
