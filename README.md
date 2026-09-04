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

## Voice command feature

Both the "Add Borrower" (lender side) and "Add Lender" (borrower side)
manual-entry forms, plus both What-If pages' custom question box, have a
mic button. Speech goes through two AI steps, chained server-side in
`backend/routes/voice.js` — both handled by **Gemini** (the same model
already used for What-If insights), so there's only one AI provider and
one API key for the whole app:

1. Gemini's audio understanding turns the recording into text.
2. For the two "add" forms, that text is then sent to Gemini a second
   time, which extracts it into the form's actual fields (name, phone,
   loan amount, dates, etc.) — the form fills in but nothing submits
   automatically, so the user always reviews before saving. For the
   What-If question box, the transcript just fills the input directly (no
   extraction needed).

Only requires the existing `GEMINI_API_KEY` in `backend/.env` — no
separate signup or key needed for voice. If that key isn't set, everything
else in the app keeps working; only the mic buttons and the What-If
insight explainer will show an error when used. The mic buttons also don't
render at all in browsers without microphone/`MediaRecorder` support,
rather than showing a control that can't work.

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

Same caveat applies to the voice feature added later: it uses only
already-installed packages (no new frontend or backend dependency), and
every new/changed file parses cleanly, but I haven't been able to
actually record audio and click through the flow myself. If a mic button
does something unexpected, send me the error from the browser console
and/or the backend terminal.
