# Adaptive Repayment

One React app. Landing, login/signup, borrower dashboard, and lender
dashboard all live here, routed with React Router — no gateway, no
separate builds, no multiple ports.

## Quick start

```powershell
npm install
npm run dev
```

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


