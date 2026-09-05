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
  <img src="./Screenshots/landing page.png" alt="Adaptive Repayment Landing Page" width="100%" />
</p>

---

## Problem Statement

Traditional loan repayment systems assume borrowers receive a stable monthly income.

For freelancers, gig workers, commission-based workers, and small business owners, fixed repayment schedules can create unnecessary financial pressure, missed payments, and higher default risk.

Lenders, meanwhile, need predictable boundaries and visibility into repayment risk.

**Adaptive Repayment bridges this gap by making repayment flexible without removing lender control.**

---

## 💡 Our Solution

> **The engine recommends. The lender controls. The borrower gets flexibility.**

Adaptive Repayment is a two-sided platform that calculates sustainable repayment recommendations based on a borrower's current income while respecting lender-defined boundaries.

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

# ✨ Key Features

### 🔄 Adaptive Repayment Engine

Calculates a recommended repayment based on current income and lender-defined:

- Minimum payment / Floor
- Target payment
- Maximum payment / Ceiling

Example:

```text
Monthly Income    = ₹12,000
Payment Floor     = ₹2,000
Target Payment    = ₹5,000
Payment Ceiling   = ₹7,000

Payment Capacity  = ₹12,000 × 40%
                  = ₹4,800

Recommended       = ₹4,800
```

Financial calculations are **deterministic and independent of AI**.

---

### 🔮 What-If Simulator

Users can simulate changes such as:

- Income shocks
- Different repayment limits
- Deferred repayments
- Additional repayment months

```text
Financial Scenario
       ↓
Deterministic Engine
       ↓
Scenario Result
       ↓
AI Explanation
```

---

### 🤖 AI-Powered Insights

Groq AI acts as an **explanation and interaction layer**, not the source of financial calculations.

It provides:

- What changed
- Why repayment changed
- Scenario interpretation
- Borrower considerations
- Lender considerations

---

### 🪪 Credit & Trust Passports

**Borrower Credit Passport**

Provides a transparent repayment score based on:

- On-time repayment
- Repayment consistency
- Debt load
- Loan completion history
- Communication
- Income reporting

**Lender Trust Passport**

Provides structured information about lender behavior and communication, creating a more balanced lending ecosystem.

---

### 📊 Financial Tracker

Borrowers can track:

- Income
- Expenses
- Savings
- Repayment obligations
- Financial goals
- Repayment capacity

---

### 🆘 Hardship Requests

Borrowers can request repayment assistance when they cannot meet their minimum payment.

```text
Hardship
   ↓
Request
   ↓
Lender Review
   ↓
Approve / Reject / Negotiate
   ↓
Updated Arrangement
```

---

### 🤝 Loan Applications & Negotiation

Borrowers can submit loan requests while lenders can review, negotiate, approve, or reject applications.

---

### 🎙️ Voice-Powered Data Entry

Users can provide financial information through voice.

```text
User Speech
    ↓
MediaRecorder
    ↓
Express Backend
    ↓
Groq Whisper
    ↓
Transcript
    ↓
Groq LLM
    ↓
Structured Data
    ↓
User Review
```

Supports conversational **English, Hindi, and mixed-language input**.

Users always review extracted information before submission.

---

### 🏦 Lender Portfolio Stress Testing

Lenders can evaluate how income shocks may affect their portfolio, including:

- Borrowers affected
- Income shock severity
- Collection rate
- Deferred amount
- Expected exceptions

---

# 👥 Two-Sided Platform

### Borrower

- Dashboard
- Repayment Tracker
- Lenders
- Loan Requests
- What-If Simulator
- Credit Passport
- Financial Goals
- Hardship Requests

### Lender

- Portfolio Overview
- Loan Requests
- Borrower Management
- What-If Simulator
- Portfolio Stress Testing
- Audit Log
- Trust Passport

---

# 🔐 Architecture

```text
                         ┌──────────────────┐
                         │  React Frontend  │
                         │ Borrower / Lender│
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
             ┌──────────────┐           ┌────────────────┐
             │   Supabase   │           │ Express Backend│
             │ Auth + DB +  │           │   AI Layer     │
             │     RLS      │           └───────┬────────┘
             └──────────────┘                   │
                                                ▼
                                         ┌──────────────┐
                                         │     Groq     │
                                         │ LLM + Whisper│
                                         └──────────────┘
```

### AI & Financial Logic Separation

**Deterministic Layer**

- Repayment capacity
- Recommended payment
- Floor / target / ceiling
- What-If calculations
- Credit scoring

**AI Layer**

- Natural-language understanding
- Scenario explanations
- Speech transcription
- Structured data extraction

This ensures AI cannot override or invent financial calculations.

---

# 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, React Router, Tailwind CSS |
| UI & Visualization | Recharts, Lucide React, Motion, Radix UI |
| Backend | Node.js, Express, dotenv, CORS |
| Database | Supabase / PostgreSQL |
| Authentication | Supabase Auth + RLS |
| AI | Groq LLM + Whisper |
| Other | jsPDF |

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
│   ├── lib/
│   ├── pages/
│   │   ├── borrower/
│   │   └── lender/
│   ├── App.tsx
│   └── main.tsx
│
├── Screenshots/
│   └── landing-page.png
│
├── package.json
└── README.md
```

---

# 🚀 Installation

### Prerequisites

- Node.js 18+
- npm
- Supabase project
- Groq API key

### Frontend

```bash
git clone <your-repository-url>
cd adaptive-repayment
npm install
```

Create `.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Run:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

### Backend

```bash
cd backend
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

Run:

```bash
npm run dev
```

Backend: `http://localhost:3001`

---

# 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| POST | `/api/whatif/insight` | Generate AI What-If insight |
| POST | `/api/voice/transcribe` | Speech-to-text |
| POST | `/api/voice/extract` | Extract structured form data |

See [`backend/README.md`](backend/README.md) for detailed API documentation.

---

# 🧪 Demo Mode

The project includes a centralized demo mode for hackathon presentations.

```text
DEMO_MODE = true
```

Demo mode provides realistic seeded data for demonstrating borrower and lender workflows.

---

# 📸 Screenshots

### Landing Page

<img src="./Screenshots/landing page.png" alt="Landing Page" width="100%" />

### Borrower Dashboard

_Add screenshot here_

### Adaptive Repayment Tracker

_Add screenshot here_

### What-If Simulator

_Add screenshot here_

### Credit Passport

_Add screenshot here_

### Lender Dashboard

_Add screenshot here_

### Portfolio Stress Test

_Add screenshot here_

---

# 🎥 Demo & Presentation

### Presentation

`<PRESENTATION_LINK>`

### Live Demo

`<LIVE_DEMO_LINK>`

### Repository

`<GITHUB_REPOSITORY_LINK>`

---

# 🔮 Future Enhancements

- Bank / UPI integrations
- Automated income verification
- WhatsApp / SMS repayment notifications
- Advanced portfolio risk modelling
- Automated hardship detection
- More regional language support
- Personalized repayment recommendations
- Mobile application
- Advanced lender analytics

---

# ⚠️ Current Limitations

This is a **prototype / hackathon project**.

Some workflows use seeded demonstration data rather than live financial integrations.

The repayment engine uses predefined rules and should not be considered a financial advisory, underwriting, or credit decisioning system.

Production deployment would require additional security hardening, compliance review, monitoring, rate limiting, and real-world validation.

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
