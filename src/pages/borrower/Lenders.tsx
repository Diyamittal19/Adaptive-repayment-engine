import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { supabase } from "@/lib/supabaseClient";
import VoiceButton from "@/components/voice/VoiceButton";
import { extractFormFields } from "@/lib/voice";
import { DEMO_MODE, demoManualLedgers, demoPlatformLoans, demoPayments, demoPayments2 } from "@/lib/demoData";
import LenderPassportModal from "@/components/passport/LenderPassportModal";
import { getLenderTrustPassport, type LenderTrustPassport } from "@/lib/creditPassport";

// ── Types ──────────────────────────────────────────────────────────────────
type LedgerStatus = "active" | "paid" | "overdue" | "written-off" | "settled-early";
type TxType = "loan" | "repayment" | "interest" | "penalty";

type Transaction = {
  id: number;
  date: string;
  type: TxType;
  amount: number;
  note: string;
  balance: number;
};

type Ledger = {
  id: number;
  lenderName: string;
  lenderPhone: string;
  lenderEmail: string;
  lenderAddress: string;
  loanAmount: number;
  interestRate: number;
  startDate: string;
  dueDate: string;
  note: string;
  status: LedgerStatus;
  transactions: Transaction[];
};

// Balances aren't stored in the database (a stored running balance can
// drift out of sync with its transactions) — they're derived here from
// the transaction list every time it's loaded or changed.
function withComputedBalances(transactions: Omit<Transaction, "balance">[]): Transaction[] {
  const sorted = [...transactions].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : a.id - b.id));
  let balance = 0;
  return sorted.map((t) => {
    balance = t.type === "repayment" ? Math.max(0, balance - t.amount) : balance + t.amount;
    return { ...t, balance };
  });
}

// ── Seed data ──────────────────────────────────────────────────────────────
// DB rows come back with snake_case columns and no computed balance;
// map them into the shape the rest of this file already expects.
function mapLedgerRow(row: any): Ledger {
  return {
    id: row.id,
    lenderName: row.lender_name,
    lenderPhone: row.lender_phone ?? "",
    lenderEmail: row.lender_email ?? "",
    lenderAddress: row.lender_address ?? "",
    loanAmount: row.loan_amount,
    interestRate: row.interest_rate,
    startDate: row.start_date,
    dueDate: row.due_date ?? "",
    note: row.note ?? "",
    status: row.status,
    transactions: withComputedBalances(
      (row.manual_ledger_transactions ?? []).map((t: any) => ({
        id: t.id,
        date: t.tx_date,
        type: t.type,
        amount: t.amount,
        note: t.note ?? "",
      }))
    ),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function outstanding(l: Ledger) {
  return l.transactions.at(-1)?.balance ?? l.loanAmount;
}
function totalRepaid(l: Ledger) {
  return l.transactions.filter((t) => t.type === "repayment").reduce((s, t) => s + t.amount, 0);
}

const STATUS_LABEL: Record<LedgerStatus, string> = {
  active: "Active",
  paid: "Repaid in full",
  overdue: "Overdue",
  "written-off": "Written off",
  "settled-early": "Settled early",
};

function StatusPill({ status }: { status: LedgerStatus }) {
  const map: Record<LedgerStatus, string> = {
    active: "bg-success/15 text-success",
    paid: "bg-success/15 text-success",
    overdue: "bg-danger/15 text-danger",
    "written-off": "bg-warning/15 text-warning",
    "settled-early": "bg-info/15 text-info",
  };
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full ${map[status]}`}>{STATUS_LABEL[status]}</span>;
}

// ── PDF ────────────────────────────────────────────────────────────────────
function downloadPDF(l: Ledger) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(18, 21, 32);
  doc.rect(0, 0, pw, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Adaptive Repayment \u2014 Ledger Report (Borrower)", 14, 13);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text(`Generated ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`, 14, 23);
  doc.setTextColor(33, 37, 62);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Lender Details", 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const rows = [
    ["Lender", l.lenderName],
    ["Phone", l.lenderPhone],
    ["Email", l.lenderEmail || "\u2014"],
    ["Address", l.lenderAddress || "\u2014"],
    ["Loan Amount", formatINR(l.loanAmount)],
    ["Interest Rate", `${l.interestRate}% p.a.`],
    ["Start Date", l.startDate],
    ["Due Date", l.dueDate || "\u2014"],
    ["Status", STATUS_LABEL[l.status]],
    ["Outstanding", formatINR(outstanding(l))],
    ["Total Repaid", formatINR(totalRepaid(l))],
    ["Note", l.note || "\u2014"],
  ];
  let y = 50;
  rows.forEach(([label, value]) => {
    doc.setTextColor(100, 110, 130);
    doc.text(label + ":", 14, y);
    doc.setTextColor(33, 37, 62);
    doc.text(String(value), 60, y);
    y += 7;
  });
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Transaction History", 14, y);
  y += 5;
  doc.setFillColor(18, 21, 32);
  doc.rect(14, y, pw - 28, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text("Date", 17, y + 5.5);
  doc.text("Type", 50, y + 5.5);
  doc.text("Amount", 95, y + 5.5);
  doc.text("Balance", 135, y + 5.5);
  doc.text("Note", 165, y + 5.5);
  y += 11;
  l.transactions.forEach((tx, i) => {
    if (y > 272) {
      doc.addPage();
      y = 18;
    }
    if (i % 2 === 0) {
      doc.setFillColor(245, 246, 250);
      doc.rect(14, y - 4, pw - 28, 8, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 70, 90);
    doc.text(tx.date, 17, y + 1);
    const c =
      tx.type === "loan" ? [60, 100, 200] : tx.type === "repayment" ? [26, 122, 69] : tx.type === "interest" ? [180, 100, 20] : [192, 57, 43];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(tx.type.charAt(0).toUpperCase() + tx.type.slice(1), 50, y + 1);
    doc.setTextColor(60, 70, 90);
    doc.text(formatINR(tx.amount), 95, y + 1);
    doc.text(formatINR(tx.balance), 135, y + 1);
    doc.text(tx.note.length > 22 ? tx.note.slice(0, 22) + "\u2026" : tx.note, 165, y + 1);
    y += 9;
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(160);
    doc.text(`Page ${i} of ${pages} \u00B7 Adaptive Repayment`, pw / 2, 290, { align: "center" });
  }
  doc.save(`${l.lenderName.replace(/\s+/g, "_")}_ledger.pdf`);
}

// ── Small UI pieces ──────────────────────────────────────────────────────
function StatCard({
  label,
  icon,
  value,
  badge,
  badgeColor,
  sub,
  borderColor,
}: {
  label: string;
  icon: string;
  value: string;
  badge?: string;
  badgeColor?: string;
  sub: string;
  borderColor: string;
}) {
  return (
    <div className={`bg-card rounded-2xl border border-border p-5 shadow-[var(--shadow-panel)] border-l-4 ${borderColor} flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="font-display text-3xl font-bold text-foreground">{value}</p>
      {badge && (
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>↗ {badge}</span>
          <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
      )}
      {!badge && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const inp =
  "w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

// ── Lenders page ─────────────────────────────────────────────────────────
type LModal = null | "addLender" | "addTransaction" | "profile";

function ManualLedger() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [tab, setTab] = useState<"active" | "past">("active");
  const [modal, setModal] = useState<LModal>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (DEMO_MODE) {
        if (!active) return;
        setUserId("demo-borrower");
        setLedgers(demoManualLedgers);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("manual_ledgers")
        .select("*, manual_ledger_transactions(*)")
        .eq("borrower_id", user.id)
        .order("id", { ascending: false });

      if (!active) return;
      setLedgers((data ?? []).map(mapLedgerRow));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const emptyForm = {
    lenderName: "",
    lenderPhone: "",
    lenderEmail: "",
    lenderAddress: "",
    loanAmount: "",
    interestRate: "",
    startDate: "",
    dueDate: "",
    note: "",
    status: "active" as LedgerStatus,
    initialNote: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Voice fill: record -> Gemini transcribes it -> Gemini extracts fields ->
  // merged into the form above. User still reviews/edits before submitting.
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  async function handleVoiceFillLender(transcript: string) {
    setVoiceNote(null);
    const fields = await extractFormFields(transcript, "lender");
    setForm((f) => ({ ...f, ...fields }));
    setVoiceNote(`Filled from: "${transcript}" — review before adding.`);
  }

  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "repayment" as TxType,
    amount: "",
    note: "",
  });

  const selected = ledgers.find((l) => l.id === selectedId) ?? null;
  const activeL = ledgers.filter((l) => l.status === "active" || l.status === "overdue");
  const pastL = ledgers.filter((l) => l.status !== "active" && l.status !== "overdue");
  const list = tab === "active" ? activeL : pastL;
  const filtered = list.filter((l) => l.lenderName.toLowerCase().includes(search.toLowerCase()) || l.lenderPhone.includes(search));

  async function handleAddLender(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const amt = parseFloat(form.loanAmount) || 0;

    const { data: ledgerRow, error } = await supabase
      .from("manual_ledgers")
      .insert({
        borrower_id: userId,
        lender_name: form.lenderName,
        lender_phone: form.lenderPhone || null,
        lender_email: form.lenderEmail || null,
        lender_address: form.lenderAddress || null,
        loan_amount: amt,
        interest_rate: parseFloat(form.interestRate) || 0,
        start_date: form.startDate || new Date().toISOString().slice(0, 10),
        due_date: form.dueDate || null,
        note: form.note || null,
        status: form.status,
      })
      .select()
      .single();

    if (error || !ledgerRow) return;

    let txRow = null;
    if (amt > 0) {
      const { data } = await supabase
        .from("manual_ledger_transactions")
        .insert({
          ledger_id: ledgerRow.id,
          tx_date: form.startDate || new Date().toISOString().slice(0, 10),
          type: "loan",
          amount: amt,
          note: form.initialNote || "Loan received",
        })
        .select()
        .single();
      txRow = data;
    }

    const nl = mapLedgerRow({ ...ledgerRow, manual_ledger_transactions: txRow ? [txRow] : [] });
    setLedgers((prev) => [nl, ...prev]);
    setForm(emptyForm);
    setVoiceNote(null);
    setModal(null);
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const amt = parseFloat(txForm.amount) || 0;

    const { data: txRow, error } = await supabase
      .from("manual_ledger_transactions")
      .insert({
        ledger_id: selected.id,
        tx_date: txForm.date,
        type: txForm.type,
        amount: amt,
        note: txForm.note || null,
      })
      .select()
      .single();

    if (error || !txRow) return;

    setLedgers((prev) =>
      prev.map((l) =>
        l.id === selectedId
          ? {
              ...l,
              transactions: withComputedBalances([
                ...l.transactions.map((t) => ({ id: t.id, date: t.date, type: t.type, amount: t.amount, note: t.note })),
                { id: txRow.id, date: txRow.tx_date, type: txRow.type, amount: txRow.amount, note: txRow.note ?? "" },
              ]),
            }
          : l
      )
    );
    setTxForm({ date: new Date().toISOString().slice(0, 10), type: "repayment", amount: "", note: "" });
    setModal("profile");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Lenders</h1>
          <p className="text-muted-foreground mt-1.5 text-sm max-w-xl">
            {activeL.length} active loans and {pastL.length} closed lenders — full repayment history and outstanding balance at a
            glance.
          </p>
        </div>
        <button
          onClick={() => setModal("addLender")}
          className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-2xl text-white hover:opacity-90 transition-opacity shrink-0 bg-slate-900"
        >
          + Add lender
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-secondary w-fit rounded-full p-1">
        {(
          [
            ["active", `Active loans \u00B7 ${activeL.length}`],
            ["past", `Past ledgers \u00B7 ${pastL.length}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setSearch("");
            }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === key ? "bg-slate-900 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active summary cards */}
      {tab === "active" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "TOTAL OUTSTANDING", value: formatINR(activeL.reduce((s, l) => s + outstanding(l), 0)), sub: "across all active loans" },
            { label: "TOTAL BORROWED", value: formatINR(activeL.reduce((s, l) => s + l.loanAmount, 0)), sub: "principal disbursed" },
            { label: "TOTAL REPAID", value: formatINR(activeL.reduce((s, l) => s + totalRepaid(l), 0)), sub: "across active ledgers" },
          ].map((c) => (
            <div key={c.label} className="bg-card rounded-2xl border border-border p-5 shadow-[var(--shadow-panel)]">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">{c.label}</p>
              <p className="font-display text-3xl font-bold text-foreground mb-1">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-panel)] px-5 py-3.5 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lender name or phone"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-panel)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground">Lender</th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-muted-foreground">Loan Amount</th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-muted-foreground">{tab === "active" ? "Due Date" : "Closed on"}</th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-muted-foreground">
                {tab === "active" ? "Outstanding" : "Total Repaid"}
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-16 text-muted-foreground">
                  No ledgers found.
                </td>
              </tr>
            )}
            {filtered.map((l, i) => (
              <tr
                key={l.id}
                onClick={() => {
                  setSelectedId(l.id);
                  setModal("profile");
                }}
                className={`cursor-pointer hover:bg-secondary/50 transition-colors ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        l.status === "active" ? "bg-success" : l.status === "overdue" ? "bg-danger" : "bg-muted-foreground/40"
                      }`}
                    />
                    <div>
                      <p className="font-semibold text-foreground">{l.lenderName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{l.lenderPhone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 font-semibold text-foreground">{formatINR(l.loanAmount)}</td>
                <td className="px-4 py-4 text-muted-foreground text-sm">
                  {tab === "active" ? l.dueDate || "\u2014" : l.transactions.at(-1)?.date ?? "\u2014"}
                </td>
                <td className="px-4 py-4 font-semibold text-foreground">
                  {tab === "active" ? formatINR(outstanding(l)) : formatINR(totalRepaid(l))}
                </td>
                <td className="px-4 py-4">
                  <StatusPill status={l.status} />
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadPDF(l);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
                  >
                    ↓ PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Profile modal ───────────────────────────────────────────────── */}
      {selected && modal === "profile" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-lg shrink-0 bg-primary">
                  {selected.lenderName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-semibold text-lg text-foreground">{selected.lenderName}</h2>
                    <StatusPill status={selected.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selected.lenderPhone}
                    {selected.lenderEmail ? ` \u00B7 ${selected.lenderEmail}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadPDF(selected)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity bg-slate-900"
                >
                  ↓ Download PDF
                </button>
                <button
                  onClick={() => setModal(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Loan Amount", val: formatINR(selected.loanAmount) },
                  { label: "Outstanding", val: formatINR(outstanding(selected)), hi: true },
                  { label: "Total Repaid", val: formatINR(totalRepaid(selected)) },
                ].map((c) => (
                  <div key={c.label} className={`rounded-xl p-3.5 border ${c.hi ? "bg-primary border-primary" : "bg-secondary border-border"}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${c.hi ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {c.label}
                    </p>
                    <p className={`font-display text-xl font-bold ${c.hi ? "text-primary-foreground" : "text-foreground"}`}>{c.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {[
                  ["Address", selected.lenderAddress || "\u2014"],
                  ["Interest Rate", `${selected.interestRate}% p.a.`],
                  ["Start Date", selected.startDate],
                  ["Due Date", selected.dueDate || "\u2014"],
                  ["Note", selected.note || "\u2014"],
                ].map(([l, v]) => (
                  <div key={l} className="flex gap-2">
                    <span className="text-muted-foreground w-28 shrink-0">{l}</span>
                    <span className="text-foreground font-medium">{v}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
                  <h3 className="text-sm font-semibold text-foreground">Transaction History</h3>
                  <button onClick={() => setModal("addTransaction")} className="text-xs font-semibold text-info hover:underline">
                    + Add entry
                  </button>
                </div>
                {selected.transactions.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No transactions recorded.</p>}
                <div className="divide-y divide-border">
                  {[...selected.transactions].reverse().map((tx) => {
                    const pill: Record<TxType, string> = {
                      loan: "bg-info/15 text-info",
                      repayment: "bg-success/15 text-success",
                      interest: "bg-warning/15 text-warning",
                      penalty: "bg-danger/15 text-danger",
                    };
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${pill[tx.type]}`}>
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{tx.date}</p>
                          <p className="text-xs text-muted-foreground truncate">{tx.note}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground">{formatINR(tx.amount)}</p>
                          <p className="text-xs text-muted-foreground">bal {formatINR(tx.balance)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Lender modal ────────────────────────────────────────────── */}
      {modal === "addLender" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border gap-3">
              <div>
                <h2 className="font-display font-semibold text-lg text-foreground">Add Lender Manually</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Enter lender contact and full loan amount details, or fill it by speaking</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <VoiceButton
                  label="Fill by voice"
                  busyLabel="Understanding…"
                  onTranscript={handleVoiceFillLender}
                />
                <button
                  onClick={() => setModal(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            {voiceNote && (
              <p className="px-6 pt-3 text-xs text-muted-foreground italic">{voiceNote}</p>
            )}
            <form onSubmit={handleAddLender} className="overflow-y-auto flex-1 p-6 space-y-6">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Lender Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lender Name *">
                    <input required value={form.lenderName} onChange={(e) => setForm({ ...form, lenderName: e.target.value })} className={inp} placeholder="e.g. Aug Finance NBFC" />
                  </Field>
                  <Field label="Phone *">
                    <input required value={form.lenderPhone} onChange={(e) => setForm({ ...form, lenderPhone: e.target.value })} className={inp} placeholder="+91 80 1234 5678" />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={form.lenderEmail} onChange={(e) => setForm({ ...form, lenderEmail: e.target.value })} className={inp} placeholder="contact@lender.in" />
                  </Field>
                  <Field label="Address">
                    <input value={form.lenderAddress} onChange={(e) => setForm({ ...form, lenderAddress: e.target.value })} className={inp} placeholder="Street, City" />
                  </Field>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Loan Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Loan Amount (\u20B9) *">
                    <input required type="number" min="1" value={form.loanAmount} onChange={(e) => setForm({ ...form, loanAmount: e.target.value })} className={inp} placeholder="e.g. 100000" />
                  </Field>
                  <Field label="Interest Rate (% p.a.)">
                    <input type="number" min="0" step="0.1" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} className={inp} placeholder="e.g. 12" />
                  </Field>
                  <Field label="Start Date *">
                    <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inp} />
                  </Field>
                  <Field label="Due / Repayment Date">
                    <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inp} />
                  </Field>
                  <Field label="Status">
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LedgerStatus })} className={inp}>
                      <option value="active">Active</option>
                      <option value="paid">Repaid in full</option>
                      <option value="overdue">Overdue</option>
                      <option value="settled-early">Settled early</option>
                      <option value="written-off">Written off</option>
                    </select>
                  </Field>
                  <Field label="Loan Purpose / Note">
                    <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inp} placeholder="e.g. Home renovation" />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Initial Transaction Note">
                      <input value={form.initialNote} onChange={(e) => setForm({ ...form, initialNote: e.target.value })} className={inp} placeholder="e.g. Loan received via bank transfer" />
                    </Field>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 border border-border text-foreground text-sm font-semibold py-2.5 rounded-xl hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity bg-slate-900">
                  Add Lender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Transaction modal ───────────────────────────────────────── */}
      {modal === "addTransaction" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="font-display font-semibold text-base text-foreground">Add Transaction</h2>
                <p className="text-xs text-muted-foreground">{selected.lenderName}</p>
              </div>
              <button onClick={() => setModal("profile")} className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <Field label="Date *">
                <input required type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} className={inp} />
              </Field>
              <Field label="Type *">
                <select value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value as TxType })} className={inp}>
                  <option value="repayment">Repayment</option>
                  <option value="interest">Interest Charged</option>
                  <option value="loan">Additional Loan</option>
                  <option value="penalty">Penalty</option>
                </select>
              </Field>
              <Field label="Amount (\u20B9) *">
                <input required type="number" min="1" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} className={inp} placeholder="e.g. 5000" />
              </Field>
              <Field label="Note">
                <input value={txForm.note} onChange={(e) => setTxForm({ ...txForm, note: e.target.value })} className={inp} placeholder="e.g. Monthly EMI" />
              </Field>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal("profile")} className="flex-1 border border-border text-foreground text-sm font-semibold py-2.5 rounded-xl hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity bg-slate-900">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   PLATFORM LOANS — the borrower's real, registered loan(s): a structured
   relationship with an actual registered lender, distinct from the manual
   ledger above (which can track anyone, registered or not).
   ========================================================================= */

type PlatformLoan = {
  id: number;
  lenderName: string;
  targetAmount: number;
  floor: number;
  ceiling: number;
  outstanding: number;
  dueDate: string;
  status: string;
};

type PlatformPayment = {
  cycleMonth: string;
  amountDue: number;
  amountPaid: number;
  paidOnTime: boolean;
};

function PlatformLoanDetail({ loan, onClose }: { loan: PlatformLoan; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (DEMO_MODE) {
        if (!active) return;
        const demoSet = loan.id === 9002 ? demoPayments2 : loan.id === 9001 ? demoPayments : [];
        setPayments(
          [...demoSet].reverse().map((p) => ({
            cycleMonth: p.cycle_month,
            amountDue: p.amount_due,
            amountPaid: p.amount_paid,
            paidOnTime: p.paid_on_time,
          }))
        );
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("payments")
        .select("cycle_month, amount_due, amount_paid, paid_on_time")
        .eq("loan_id", loan.id)
        .order("cycle_month", { ascending: false });
      if (!active) return;
      setPayments(
        (data ?? []).map((p) => ({
          cycleMonth: p.cycle_month,
          amountDue: p.amount_due,
          amountPaid: p.amount_paid,
          paidOnTime: p.paid_on_time,
        }))
      );
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [loan.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-card rounded-2xl w-full max-w-lg shadow-xl z-10 p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-foreground font-semibold">{loan.lenderName}</h3>
            <p className="text-muted-foreground text-xs mt-0.5">Payment history</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No payment cycles recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Cycle</th>
                <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Due</th>
                <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Paid</th>
                <th className="text-left py-2 text-xs font-semibold text-muted-foreground">On time</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-foreground">{new Date(p.cycleMonth).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                  <td className="py-2.5 text-foreground">{formatINR(p.amountDue)}</td>
                  <td className="py-2.5 text-foreground">{formatINR(p.amountPaid)}</td>
                  <td className="py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.paidOnTime ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                      {p.paidOnTime ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PlatformLoans() {
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<PlatformLoan[]>([]);
  const [detailLoan, setDetailLoan] = useState<PlatformLoan | null>(null);
  const [passportView, setPassportView] = useState<LenderTrustPassport | null>(null);
  const [tab, setTab] = useState<"active" | "past">("active");
  const [search, setSearch] = useState("");
  const [repaidByLoan, setRepaidByLoan] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    let active = true;
    async function load() {
      if (DEMO_MODE) {
        if (!active) return;
        setLoans(demoPlatformLoans);
        setRepaidByLoan(
          new Map([
            [9001, demoPayments.reduce((s, p) => s + p.amount_paid, 0)],
            [9002, demoPayments2.reduce((s, p) => s + p.amount_paid, 0)],
          ])
        );
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      const { data: loanRows } = await supabase
        .from("loans")
        .select("id, lender_id, target_amount, floor, ceiling, outstanding, due_date, status")
        .eq("borrower_id", user.id);

      if (!loanRows || loanRows.length === 0) {
        if (active) { setLoans([]); setLoading(false); }
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", [...new Set(loanRows.map((l) => l.lender_id))]);

      if (!active) return;
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

      setLoans(
        loanRows.map((l) => ({
          id: l.id,
          lenderName: nameById.get(l.lender_id) ?? "Unknown lender",
          targetAmount: l.target_amount,
          floor: l.floor,
          ceiling: l.ceiling,
          outstanding: Number(l.outstanding),
          dueDate: l.due_date,
          status: l.status,
        }))
      );

      const { data: paymentRows } = await supabase
        .from("payments")
        .select("loan_id, amount_paid")
        .in("loan_id", loanRows.map((l) => l.id));

      if (!active) return;
      const repaidMap = new Map<number, number>();
      for (const p of paymentRows ?? []) {
        repaidMap.set(p.loan_id, (repaidMap.get(p.loan_id) ?? 0) + p.amount_paid);
      }
      setRepaidByLoan(repaidMap);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-panel)] p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No platform loan yet. Once a lender sets one up for you, it'll show up here.
        </p>
      </div>
    );
  }

  const activeLoans = loans.filter((l) => l.status === "active" || l.status === "overdue");
  const pastLoans = loans.filter((l) => l.status !== "active" && l.status !== "overdue");
  const list = tab === "active" ? activeLoans : pastLoans;
  const filtered = list.filter((l) => l.lenderName.toLowerCase().includes(search.toLowerCase()));

  const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstanding, 0);
  const totalRepaidPlatform = activeLoans.reduce((s, l) => s + (repaidByLoan.get(l.id) ?? 0), 0);
  const totalBorrowed = totalOutstanding + totalRepaidPlatform;

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-secondary w-fit rounded-full p-1">
        {(
          [
            ["active", `Active loans \u00B7 ${activeLoans.length}`],
            ["past", `Past loans \u00B7 ${pastLoans.length}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setSearch("");
            }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === key ? "bg-slate-900 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "active" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "TOTAL OUTSTANDING", value: formatINR(totalOutstanding), sub: "across all platform loans" },
            { label: "TOTAL BORROWED", value: formatINR(totalBorrowed), sub: "principal disbursed" },
            { label: "TOTAL REPAID", value: formatINR(totalRepaidPlatform), sub: "across platform loans" },
          ].map((c) => (
            <div key={c.label} className="bg-card rounded-2xl border border-border p-5 shadow-[var(--shadow-panel)]">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">{c.label}</p>
              <p className="font-display text-3xl font-bold text-foreground mb-1">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-panel)] px-5 py-3.5 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lender name\u2026"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-panel)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground">Lender</th>
            <th className="text-left px-4 py-4 text-xs font-semibold text-muted-foreground">Target Payment</th>
            <th className="text-left px-4 py-4 text-xs font-semibold text-muted-foreground">Due Date</th>
            <th className="text-left px-4 py-4 text-xs font-semibold text-muted-foreground">Outstanding</th>
            <th className="text-left px-4 py-4 text-xs font-semibold text-muted-foreground">Status</th>
            <th className="px-4 py-4" />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-16 text-muted-foreground">
                No {tab} loans found.
              </td>
            </tr>
          )}
          {filtered.map((loan, i) => (
            <tr
              key={loan.id}
              onClick={() => setDetailLoan(loan)}
              className={`cursor-pointer hover:bg-secondary/50 transition-colors ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      loan.status === "active" ? "bg-success" : loan.status === "overdue" ? "bg-danger" : "bg-muted-foreground/40"
                    }`}
                  />
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const passport = getLenderTrustPassport(loan.lenderName);
                        if (passport) setPassportView(passport);
                      }}
                      className="font-semibold text-foreground hover:underline underline-offset-2 text-left"
                    >
                      {loan.lenderName}
                    </button>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 font-semibold text-foreground">{formatINR(loan.targetAmount)}</td>
              <td className="px-4 py-4 text-muted-foreground text-sm">
                {new Date(loan.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              </td>
              <td className="px-4 py-4 font-semibold text-foreground">{formatINR(loan.outstanding)}</td>
              <td className="px-4 py-4">
                <StatusPill status={loan.status as LedgerStatus} />
              </td>
              <td className="px-4 py-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailLoan(loan);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
                >
                  History
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {detailLoan && <PlatformLoanDetail loan={detailLoan} onClose={() => setDetailLoan(null)} />}
      {passportView && <LenderPassportModal passport={passportView} onClose={() => setPassportView(null)} />}
    </div>
  );
}

/* =========================================================================
   PAGE — Platform loans vs manual ledger toggle
   ========================================================================= */

export default function Lenders() {
  const [view, setView] = useState<"platform" | "manual">("platform");

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-1 mb-6 bg-secondary w-fit rounded-full p-1">
        {(
          [
            ["platform", "Platform loans"],
            ["manual", "Manual ledger"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              view === key ? "bg-slate-900 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "platform" ? <PlatformLoans /> : <ManualLedger />}
    </div>
  );
}