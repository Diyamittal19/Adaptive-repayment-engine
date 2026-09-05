<h1 align="center">Adaptive Repayment</h1>

<p align="center">
  AI-powered adaptive repayment infrastructure for borrowers and lenders with irregular income
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-AI-FF6B35?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Whisper-Speech--to--Text-412991?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<p align="center">
  <img src="Screenshots/landing page.png" alt="Adaptive Repayment Landing Page" width="100%" />
</p>

---

## Problem Statement

Traditional loan repayment systems assume that borrowers receive a stable and predictable income every month.

For freelancers, gig workers, commission-based workers, small business owners, and others with irregular income, fixed repayment schedules can create unnecessary financial pressure.

Common problems include:

- Fixed repayment amounts that don't reflect current income
- Missed or delayed payments during low-income periods
- Increasing financial stress
- Poor communication between borrowers and lenders
- Higher default risk
- Limited visibility into repayment capacity

At the same time, lenders need predictable boundaries, risk visibility, and control over repayment policies.

**Adaptive Repayment addresses this gap by making repayment more flexible without removing lender control.**

---

# 💡 Our Solution

Adaptive Repayment is a two-sided platform designed around a simple principle:

> **The engine recommends. The lender controls. The borrower gets flexibility.**

Instead of forcing borrowers into a single fixed repayment amount, the platform calculates a sustainable repayment recommendation based on their current income while respecting lender-defined boundaries.

```text
Borrower's Income
       ↓
Repayment Capacity
       ↓
Adaptive Repayment Engine
       ↓
Recommended Payment
       ↓
Borrower Flexibility + Lender Control
```

---

# ✨ Features

## 🔄 Adaptive Repayment Engine

The core repayment engine calculates a recommended payment based on the borrower's current income.

Lenders define:

- Minimum payment / Floor
- Target payment
- Maximum payment / Ceiling

The engine then determines a payment that remains within these boundaries.

### Example

```text
Monthly Income       = ₹12,000
Payment Floor        = ₹2,000
Target Payment       = ₹5,000
Payment Ceiling      = ₹7,000
```

The repayment capacity is:

```text
Payment Capacity = Income × 40%

                 = ₹12,000 × 40%

                 = ₹4,800
```

Recommended payment:

```text
₹4,800
```

The calculation is deterministic and does not depend on AI-generated numbers.

---

## 🔮 What-If Simulator

The What-If Simulator allows users to understand how financial changes could affect repayment.

Users can explore:

- Income shocks
- Income changes
- Different repayment floors
- Different repayment ceilings
- Repayment capacity
- Deferred repayment
- Additional repayment months
- Scenario severity

Example:

```text
Income decreases
       ↓
Repayment capacity changes
       ↓
Recommended payment changes
       ↓
Potential deferred amount calculated
       ↓
AI explains the scenario
```

This helps borrowers understand the consequences of financial changes before they become repayment problems.

---

## 🤖 AI-Powered Financial Insights

The platform uses AI as an **explanation and interaction layer**, not as the source of financial calculations.

The flow is:

```text
User Scenario
      ↓
Deterministic Financial Engine
      ↓
Calculated Result
      ↓
Groq AI
      ↓
Plain-English Financial Insight
```

The AI receives the calculated scenario and explains:

- What changed
- Why the repayment changed
- What the borrower should consider
- What the scenario could mean for the lender

This separation makes the financial logic predictable while still providing an intelligent user experience.

---

## 🪪 Borrower Credit Passport

The Credit Passport provides borrowers with a transparent view of their repayment behavior.

The score considers:

| Factor | Weight |
|---|---:|
| On-time repayment rate | 25% |
| Repayment consistency | 15% |
| Current debt load | 15% |
| Loan completion history | 15% |
| Proactive communication | 10% |
| Income reporting consistency | 20% |

### Score Bands

```text
0 – 44      Building
45 – 64     Fair
65 – 79     Good
80 – 100    Excellent
```

The passport also provides explanations and improvement suggestions so borrowers can understand what is influencing their score.

---

## 🏦 Lender Trust Passport

Trust should not be one-sided.

The Lender Trust Passport provides structured information about the lender side of the lending relationship.

This supports a more transparent borrower-lender ecosystem where both parties can build trust through consistent behavior and communication.

---

## 📊 Financial Tracker

Borrowers can track their financial situation through:

- Income
- Expenses
- Savings
- Repayment obligations
- Financial goals
- Repayment capacity

This gives borrowers a clearer picture of the financial factors affecting their ability to repay.

---

## 🆘 Hardship Requests

When a borrower cannot comfortably meet even the minimum repayment floor, the platform provides a structured hardship workflow.

```text
Borrower faces financial hardship
              ↓
       Hardship Request
              ↓
        Lender Review
              ↓
    Approve / Reject / Negotiate
              ↓
     Updated Arrangement
```

The goal is to encourage early communication instead of waiting for a missed payment.

---

## 🤝 Loan Applications & Negotiation

Borrowers can submit loan requests and lenders can review and negotiate them.

Application states include:

```text
Pending
   ↓
Negotiating
   ↓
Approved
   ↓
Active
```

This creates a shared workflow for managing lending relationships.

---

## 🎙️ Voice-Powered Data Entry

Entering financial information manually can be time-consuming.

Adaptive Repayment allows users to use voice input for:

- Adding borrowers
- Adding lenders
- Asking What-If questions

### Voice Pipeline

```text
User speaks
     ↓
Browser MediaRecorder
     ↓
Express Backend
     ↓
Groq Whisper
     ↓
Transcript
     ↓
Groq LLM
     ↓
Structured Information
     ↓
User Reviews
     ↓
Form Submission
```

The system supports conversational English, Hindi, and mixed-language input.

**Voice extraction does not automatically submit forms.** Users can review and edit the extracted information first.

---

# 🏦 Lender Portfolio Stress Testing

Lenders can evaluate how income shocks could affect their portfolio.

The stress-testing view can surface:

- Percentage of borrowers affected
- Income shock severity
- Portfolio collection rate
- Newly deferred amount
- Expected exceptions
- Collection-rate deterioration

This allows lenders to evaluate repayment flexibility at both:

**individual borrower level → portfolio level**

---

# 👥 Two-Sided Platform

## Borrower Dashboard

Borrowers have access to:

- Dashboard
- Repayment Tracker
- Lenders
- Loan Requests
- What-If Simulator
- Credit Passport
- Financial Goals
- Hardship Requests
- Settings

---

## Lender Dashboard

Lenders have access to:

- Portfolio Overview
- Loan Requests
- Borrower Management
- What-If Simulator
- Portfolio Stress Testing
- Audit Log
- Lender Trust Passport
- Settings

---

# 🔐 Authentication & Security

Authentication and application data are handled through **Supabase**.

The application uses:

- Supabase Authentication
- PostgreSQL
- Row Level Security
- Role-based access

The Express backend acts as the server-side AI layer, keeping the Groq API key away from the frontend.

```text
React Application
      │
      ├──────────► Supabase
      │             ├── Auth
      │             ├── Database
      │             └── RLS
      │
      └──────────► Express Backend
                        │
                        └──► Groq
```

---

# 🧠 System Architecture

```text
                         ┌──────────────────┐
                         │   React Frontend │
                         │                  │
                         │ Borrower /       │
                         │ Lender Dashboard │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
             ┌──────────────┐           ┌────────────────┐
             │   Supabase   │           │ Express Backend │
             │              │           │                │
             │ Auth + DB +  │           │ AI Proxy       │
             │     RLS      │           └───────┬────────┘
             └──────────────┘                   │
                                                ▼
                                         ┌──────────────┐
                                         │     Groq     │
                                         │              │
                                         │ LLM + Whisper│
                                         └──────────────┘
```

---

# 🔁 AI & Financial Logic Separation

One of the key technical decisions in the project is separating **financial computation** from **AI interpretation**.

### Deterministic Layer

Responsible for:

- Repayment capacity
- Recommended payment
- Floor / target / ceiling constraints
- What-If calculations
- Credit Passport scoring

### AI Layer

Responsible for:

- Natural-language understanding
- What-If explanations
- Voice transcription
- Structured information extraction

```text
                 User Input
                     │
                     ▼
          ┌─────────────────────┐
          │ Deterministic Logic │
          └──────────┬──────────┘
                     │
              Financial Result
                     │
                     ▼
              ┌─────────────┐
              │   Groq AI   │
              └──────┬──────┘
                     │
                     ▼
             Human Explanation
```

---

# 🛠️ Tech Stack

## Frontend

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool
- **React Router** — Routing
- **Tailwind CSS** — Styling
- **Recharts** — Data visualization
- **Lucide React** — Icons
- **Motion** — Animations
- **Radix UI** — UI primitives
- **jsPDF** — PDF generation

## Backend

- **Node.js** — Runtime
- **Express** — API server
- **Groq SDK** — AI integration
- **Whisper** — Speech-to-text
- **dotenv** — Environment configuration
- **CORS** — Cross-origin access

## Database & Authentication

- **Supabase**
- **PostgreSQL**
- **Supabase Auth**
- **Row Level Security**

## AI

- **Groq LLM**
- **Groq Whisper**

---

# 📁 Project Structure

```text
adaptive-repayment/
│
├── backend/
│   ├── routes/
│   │   ├── whatif.js
│   │   └── voice.js
│   ├── server.js
│   ├── package.json
│   └── README.md
│
├── src/
│   ├── components/
│   │   └── ui/
│   │
│   ├── lib/
│   │   ├── simulator.ts
│   │   ├── creditPassport.ts
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── borrower/
│   │   └── lender/
│   │
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
├── package.json
└── README.md
```

---

# 🚀 Installation

## Prerequisites

- Node.js 18+
- npm
- Supabase project
- Groq API key

---

## Frontend Setup

Clone the repository:

```bash
git clone <your-repository-url>
cd adaptive-repayment
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Start the frontend:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Backend Setup

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
GROQ_TRANSCRIBE_MODEL=whisper-large-v3-turbo
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

Backend:

```text
http://localhost:3001
```

---

# 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| POST | `/api/whatif/insight` | Generate AI What-If insight |
| POST | `/api/voice/transcribe` | Convert speech to text |
| POST | `/api/voice/extract` | Extract structured form data |

For detailed API and backend documentation, see:

`backend/README.md`

---

# 🧪 Demo Mode

Adaptive Repayment includes a centralized demo mode for presentations and hackathon demonstrations.

```text
DEMO_MODE = true
```

When enabled, the application can use realistic seeded data to demonstrate the borrower and lender workflows without requiring a fully populated production environment.

---

# 📸 Screenshots

> Replace the filenames below with the actual screenshots from your project.

### Landing Page

![Landing Page](Screenshots/landing-page.png)

### Borrower Dashboard

![Borrower Dashboard](Screenshots/borrower-dashboard.png)

### Adaptive Repayment Tracker

![Repayment Tracker](Screenshots/repayment-tracker.png)

### What-If Simulator

![What-If Simulator](Screenshots/what-if.png)

### Credit Passport

![Credit Passport](Screenshots/credit-passport.png)

### Lender Dashboard

![Lender Dashboard](Screenshots/lender-dashboard.png)

### Portfolio Stress Test

![Portfolio Stress Test](Screenshots/stress-test.png)

---

# 🎥 Demo & Presentation

### Presentation

**Add your project PPT / Canva / Google Slides link here:**

`<PRESENTATION_LINK>`

### Live Demo

**Add your deployed application link here:**

`<LIVE_DEMO_LINK>`

### Repository

`<GITHUB_REPOSITORY_LINK>`

---

# 🔮 Future Enhancements

- **Dynamic repayment schedules** connected to real financial data
- **Bank / UPI integrations** for automated income tracking
- **Automated income verification**
- **WhatsApp / SMS repayment notifications**
- **Advanced portfolio risk modelling**
- **Automated hardship detection**
- **More regional language support**
- **Personalized repayment recommendations**
- **Production-grade AI monitoring**
- **Advanced lender analytics**
- **Explainable risk and repayment recommendations**
- **Mobile application**

---

# ⚠️ Current Limitations

Adaptive Repayment is currently a **prototype / hackathon project**.

Some workflows use seeded or demonstration data rather than live financial integrations.

The repayment engine is based on predefined application rules and should not be considered a financial advisory, underwriting, or credit decisioning system.

A production deployment would require additional:

- Financial integrations
- Security hardening
- Compliance review
- Monitoring
- Rate limiting
- Authentication between AI services
- Validation with real-world lending data

---

# 🎯 The Core Idea

Traditional lending asks:

> **"Can the borrower adapt to the repayment schedule?"**

Adaptive Repayment asks:

> **"Can the repayment schedule adapt to the borrower's financial reality?"**

while still giving lenders control over the boundaries.

```text
             IRREGULAR INCOME
                    │
                    ▼
          ┌───────────────────┐
          │ Adaptive Repayment│
          │      Engine       │
          └─────────┬─────────┘
                    │
             Sustainable
               Payment
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      BORROWER             LENDER
      Flexibility           Control
          │                   │
          └─────────┬─────────┘
                    ▼
           Better Repayment
              Outcomes
```

---

## 🏁 Project Status

**Prototype / Hackathon-ready**

Built to explore how deterministic financial logic, AI-powered interaction, and two-sided lending workflows can make repayment more adaptive for people with irregular income.

---

## 📄 License

This project is intended for educational, demonstration, and hackathon purposes.
