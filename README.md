# Adaptive Repayment

One React app. Landing, login/signup, borrower dashboard, and lender
dashboard all live here, routed with React Router — no gateway, no
separate builds, no multiple ports.

## Quick start

```powershell
npm install
npm run dev
```

Open **http://localhost:5173**.

## Structure

```
src/
├── App.tsx              top-level routes
├── index.css             one shared design system for the whole app
├── main.tsx
├── lib/                  shared helpers (utils, the What-If simulator)
├── components/ui/        shared UI primitives (slider)
└── pages/
    ├── landing/          "/"            marketing page
    ├── login/            "/login"        login + signup, role toggle
    ├── borrower/         "/borrower/*"   borrower dashboard
    └── lender/           "/lender/*"     lender dashboard
```

## Workflow

**Landing** → **Login/Signup** (choose *I'm a borrower* or *I'm a
lender*) → **/borrower** or **/lender**. Each dashboard's sidebar has a
**Log out** button back to **/login**. All of this is real client-side
navigation via React Router now — no full page reloads anywhere in the
flow.

## What changed from the four-app version

This replaces the previous `landing` / `login` / `borrower` / `lender` /
`gateway` workspace setup entirely. That setup existed because `landing`
and `login` were exported from Figma Make with a huge dependency list
(MUI, Emotion, ~25 Radix packages, embla-carousel, react-hook-form, and
more) that conflicted with `borrower`/`lender`'s much leaner React 19 +
Recharts v3 stack.

Turned out none of that bloat was actually used — both pages' real code
only imports `react`, `motion` (animations), and `lucide-react` (icons).
So instead of reconciling four separate dependency trees, this version:

- Uses one lean `package.json` — the actual dependencies every page
  needs, nothing each page doesn't.
- Merges all four apps' page code into one `src/pages/` structure.
- Replaces every `window.location.href` navigation (which did a full
  page reload) with React Router's `navigate()` / `<Link>`, so moving
  between landing → login → dashboard is instant.
- Merges the color systems: the dashboards' existing token set (`success`
  / `warning` / `danger` / `info` / `navy`, already used by a dozen
  components) is the base, extended with a `cyan` accent + `Lora` serif
  font specifically for the landing page's marketing sections, without
  touching anything the dashboards already relied on.
- `login`'s internal hash-router and duplicate placeholder landing page
  were removed — the real landing page now covers `/`, and login/signup
  switching is just local state within one page.

## Honest caveat

I can't run `npm install` myself in this environment (no network access
to the npm registry here), so this hasn't been build-tested end to end.
What I did verify: every file passes a TypeScript syntax check, every
relative and `@/`-aliased import resolves to a real file, and every
custom color class used anywhere in the app (`bg-primary`, `text-danger`,
`shadow-[var(--shadow-panel)]`, etc.) is actually defined in `index.css`.
If `npm run dev` throws something, send me the error.
