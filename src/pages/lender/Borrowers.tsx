import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { getBorrowerPassportById, bandTone, type CreditPassport } from "@/lib/creditPassport";
import { supabase } from "@/lib/supabaseClient";
import BorrowerPassportModal from "@/components/passport/BorrowerPassportModal";
import VoiceButton from "@/components/voice/VoiceButton";
import { extractFormFields } from "@/lib/voice";

// ── Types ──────────────────────────────────────────────────────────────────
type TxType = "loan" | "repayment" | "interest";
type BorrowerStatus = "active" | "paid" | "overdue" | "written-off" | "settled-early";

type Transaction = {
  id: number;
  date: string;
  type: TxType;
  amount: number;
  note: string;
  balance: number;
};

type Borrower = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  loanAmount: number;
  interestRate: number;
  startDate: string;
  dueDate: string;
  note: string;
  status: BorrowerStatus;
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

// DB rows come back with snake_case columns and no computed balance; map
// them into the shape the rest of this file already expects.
function mapBorrowerRow(row: any): Borrower {
  return {
    id: row.id,
    name: row.borrower_name,
    phone: row.borrower_phone ?? "",
    email: row.borrower_email ?? "",
    address: row.borrower_address ?? "",
    loanAmount: row.loan_amount,
    interestRate: row.interest_rate,
    startDate: row.start_date,
    dueDate: row.due_date ?? "",
    note: row.note ?? "",
    status: row.status,
    transactions: withComputedBalances(
      (row.lender_manual_ledger_transactions ?? []).map((t: any) => ({
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

function outstanding(b: Borrower) {
  return b.transactions.at(-1)?.balance ?? b.loanAmount;
}

function totalRepaid(b: Borrower) {
  return b.transactions.filter((t) => t.type === "repayment").reduce((s, t) => s + t.amount, 0);
}

const STATUS_LABEL: Record<BorrowerStatus, string> = {
  active: "Active",
  paid: "Repaid in full",
  overdue: "Overdue",
  "written-off": "Written off",
  "settled-early": "Settled early",
};

function StatusPill({ status }: { status: BorrowerStatus }) {
  const map: Record<BorrowerStatus, string> = {
    active: "bg-success text-success-foreground",
    paid: "bg-success text-success-foreground",
    overdue: "bg-destructive/10 text-destructive",
    "written-off": "bg-warning text-warning-foreground",
    "settled-early": "bg-info text-info-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${map[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── PDF ────────────────────────────────────────────────────────────────────
function downloadPDF(b: Borrower) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  doc.setFillColor(33, 37, 62);
  doc.rect(0, 0, pw, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Adaptive Repayment — Borrower Report", 14, 13);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text(`Generated ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`, 14, 23);

  doc.setTextColor(33, 37, 62);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Borrower Details", 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const rows = [
    ["Name", b.name], ["Phone", b.phone], ["Email", b.email || "—"],
    ["Address", b.address || "—"], ["Loan Amount", formatINR(b.loanAmount)],
    ["Interest Rate", `${b.interestRate}% p.a.`], ["Start Date", b.startDate],
    ["Due Date", b.dueDate || "—"], ["Status", STATUS_LABEL[b.status]],
    ["Outstanding", formatINR(outstanding(b))], ["Total Repaid", formatINR(totalRepaid(b))],
    ["Note", b.note || "—"],
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
  doc.setTextColor(33, 37, 62);
  doc.text("Transaction History", 14, y);
  y += 5;

  doc.setFillColor(33, 37, 62);
  doc.rect(14, y, pw - 28, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text("Date", 17, y + 5.5);
  doc.text("Type", 50, y + 5.5);
  doc.text("Amount", 95, y + 5.5);
  doc.text("Balance", 135, y + 5.5);
  doc.text("Note", 165, y + 5.5);
  y += 11;

  b.transactions.forEach((tx, i) => {
    if (y > 272) { doc.addPage(); y = 18; }
    if (i % 2 === 0) {
      doc.setFillColor(245, 246, 250);
      doc.rect(14, y - 4, pw - 28, 8, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 70, 90);
    doc.text(tx.date, 17, y + 1);
    const c = tx.type === "loan" ? [60, 100, 200] : tx.type === "repayment" ? [30, 140, 90] : [180, 100, 20];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(tx.type.charAt(0).toUpperCase() + tx.type.slice(1), 50, y + 1);
    doc.setTextColor(60, 70, 90);
    doc.text(formatINR(tx.amount), 95, y + 1);
    doc.text(formatINR(tx.balance), 135, y + 1);
    doc.text(tx.note.length > 22 ? tx.note.slice(0, 22) + "…" : tx.note, 165, y + 1);
    y += 9;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(160);
    doc.text(`Page ${i} of ${pages} · Adaptive Repayment`, pw / 2, 290, { align: "center" });
  }
  doc.save(`${b.name.replace(/\s+/g, "_")}_report.pdf`);
}

// ── Pill tab ───────────────────────────────────────────────────────────────
function PillTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-slate-900 text-white" : "text-foreground hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inp = "w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

// ── Borrowers page ────────────────────────────────────────────────────────
type Modal = null | "addBorrower" | "addTransaction" | "profile";

function ManualLedger() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [tab, setTab] = useState<"active" | "past">("active");
  const [modal, setModal] = useState<Modal>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [passportView, setPassportView] = useState<CreditPassport | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("lender_manual_ledgers")
        .select("*, lender_manual_ledger_transactions(*)")
        .eq("lender_id", user.id)
        .order("id", { ascending: false });

      if (!active) return;
      setBorrowers((data ?? []).map(mapBorrowerRow));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  // Add borrower form
  const emptyForm = { name: "", phone: "", email: "", address: "", loanAmount: "", interestRate: "", startDate: "", dueDate: "", note: "", status: "active" as BorrowerStatus, initialNote: "" };
  const [form, setForm] = useState(emptyForm);

  // Voice fill: record -> Gemini transcribes it -> Gemini extracts fields ->
  // merged into the form above. User still reviews/edits before submitting.
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  async function handleVoiceFillBorrower(transcript: string) {
    setVoiceNote(null);
    const fields = await extractFormFields(transcript, "borrower");
    setForm((f) => ({ ...f, ...fields }));
    setVoiceNote(`Filled from: "${transcript}" — review before adding.`);
  }

  // Add transaction form
  const [txForm, setTxForm] = useState({ date: new Date().toISOString().slice(0, 10), type: "repayment" as TxType, amount: "", note: "" });

  const selected = borrowers.find((b) => b.id === selectedId) ?? null;

  const activeB = borrowers.filter((b) => b.status === "active" || b.status === "overdue");
  const pastB = borrowers.filter((b) => b.status !== "active" && b.status !== "overdue");
  const list = tab === "active" ? activeB : pastB;

  const pastFilters = [
    { key: "all", label: `All ${pastB.length}` },
    { key: "paid", label: `Repaid in full ${pastB.filter(b => b.status === "paid").length}` },
    { key: "settled-early", label: `Settled early ${pastB.filter(b => b.status === "settled-early").length}` },
    { key: "written-off", label: `Written off ${pastB.filter(b => b.status === "written-off").length}` },
  ];

  const filtered = list.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search) || String(b.id).includes(search);
    const matchFilter = filterStatus === "all" || b.status === filterStatus;
    return matchSearch && matchFilter;
  });

  // Stat cards for past tab
  const closedCleanly = pastB.filter(b => b.status === "paid").length;
  const writtenOff = pastB.filter(b => b.status === "written-off").length;
  const eligibleReB = pastB.filter(b => b.status === "paid" || b.status === "settled-early").length;

  async function handleAddBorrower(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const loanAmt = parseFloat(form.loanAmount) || 0;

    const { data: ledgerRow, error } = await supabase
      .from("lender_manual_ledgers")
      .insert({
        lender_id: userId,
        borrower_name: form.name,
        borrower_phone: form.phone || null,
        borrower_email: form.email || null,
        borrower_address: form.address || null,
        loan_amount: loanAmt,
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
    if (loanAmt > 0) {
      const { data } = await supabase
        .from("lender_manual_ledger_transactions")
        .insert({
          ledger_id: ledgerRow.id,
          tx_date: form.startDate || new Date().toISOString().slice(0, 10),
          type: "loan",
          amount: loanAmt,
          note: form.initialNote || "Loan disbursed",
        })
        .select()
        .single();
      txRow = data;
    }

    const nb = mapBorrowerRow({ ...ledgerRow, lender_manual_ledger_transactions: txRow ? [txRow] : [] });
    setBorrowers(prev => [nb, ...prev]);
    setForm(emptyForm);
    setVoiceNote(null);
    setModal(null);
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const amt = parseFloat(txForm.amount) || 0;

    const { data: txRow, error } = await supabase
      .from("lender_manual_ledger_transactions")
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

    setBorrowers(prev =>
      prev.map(b =>
        b.id === selectedId
          ? {
              ...b,
              transactions: withComputedBalances([
                ...b.transactions.map((t) => ({ id: t.id, date: t.date, type: t.type, amount: t.amount, note: t.note })),
                { id: txRow.id, date: txRow.tx_date, type: txRow.type, amount: txRow.amount, note: txRow.note ?? "" },
              ]),
            }
          : b
      )
    );
    setTxForm({ date: new Date().toISOString().slice(0, 10), type: "repayment", amount: "", note: "" });
    setModal("profile");
  }

  function openProfile(id: number) {
    setSelectedId(id);
    setModal("profile");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // ── Borrowers page ────────────────────────────────────────────────────────
  const borrowersPage = (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground">Borrowers</h1>
          <p className="text-muted-foreground mt-1.5 text-sm max-w-xl">
            {activeB.length} active borrowers and {pastB.length} closed relationships across every repayment template — with current status, next payment due and full repayment history.
          </p>
        </div>
        <button
          onClick={() => setModal("addBorrower")}
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <span className="text-base">+</span> Add borrower
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mt-6 mb-5 bg-secondary/50 w-fit rounded-full p-1">
        <PillTab label={`Active loans · ${activeB.length}`} active={tab === "active"} onClick={() => { setTab("active"); setFilterStatus("all"); setSearch(""); }} />
        <PillTab label={`Past borrowers · ${pastB.length}`} active={tab === "past"} onClick={() => { setTab("past"); setFilterStatus("all"); setSearch(""); }} />
      </div>

      {/* Stat cards (past tab only) */}
      {tab === "past" && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "CLOSED CLEANLY", value: closedCleanly, sub: "Repaid in full or settled early" },
            { label: "WRITTEN OFF", value: writtenOff, sub: "Unrecovered balances" },
            { label: "ELIGIBLE TO RE-BORROW", value: eligibleReB, sub: "No active loan, good history" },
          ].map((c) => (
            <div key={c.label} className="bg-card rounded-2xl border border-border p-5 shadow-[var(--shadow-panel)]">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">{c.label}</p>
              <p className="font-display text-4xl font-bold text-foreground mb-1">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + filters */}
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-panel)] p-4 mb-4">
        <div className="relative mb-3">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role, or loan ID"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {tab === "past" && (
          <div className="flex items-center gap-2 flex-wrap">
            {pastFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
                  filterStatus === f.key
                    ? "bg-slate-900 text-white"
                    : "border border-border text-foreground hover:bg-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-panel)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground">Borrower</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground">Loan Amount</th>
              {tab === "past" && <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground">Closed on</th>}
              {tab === "active" && <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground">Due Date</th>}
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground">
                {tab === "past" ? "Total repaid" : "Outstanding"}
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground">Credit Passport</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">No borrowers found.</td></tr>
            )}
            {filtered.map((b, i) => (
              <tr
                key={b.id}
                onClick={() => openProfile(b.id)}
                className={`cursor-pointer hover:bg-secondary/50 transition-colors ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.status === "active" ? "bg-success-foreground" : b.status === "overdue" ? "bg-destructive" : "bg-muted-foreground"}`} />
                    <div>
                      <p className="font-medium text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-foreground font-medium">{formatINR(b.loanAmount)}</td>
                <td className="px-4 py-3.5 text-muted-foreground">{tab === "past" ? (b.transactions.at(-1)?.date ?? "—") : (b.dueDate || "—")}</td>
                <td className="px-4 py-3.5 text-foreground font-medium">{tab === "past" ? formatINR(totalRepaid(b)) : formatINR(outstanding(b))}</td>
                <td className="px-4 py-3.5"><StatusPill status={b.status} /></td>
                <td className="px-4 py-3.5">
                  {(() => {
                    const passport = getBorrowerPassportById(String(b.id));
                    if (!passport) return <span className="text-xs text-muted-foreground">—</span>;
                    const tone = bandTone(passport.band);
                    const toneClass: Record<string, string> = {
                      success: "bg-success/10 text-success-foreground",
                      info: "bg-info/10 text-info-foreground",
                      warning: "bg-warning/10 text-warning-foreground",
                      danger: "bg-destructive/10 text-destructive",
                    };
                    return (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPassportView(passport); }}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity ${toneClass[tone]}`}
                      >
                        {passport.overallScore} · {passport.band}
                      </button>
                    );
                  })()}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={e => { e.stopPropagation(); downloadPDF(b); }}
                    className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
                    title="Download PDF"
                  >
                    ↓ PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );

  // ── Profile modal ─────────────────────────────────────────────────────────
  const profileModal = selected && modal === "profile" && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-white font-display font-bold text-lg">
              {selected.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-semibold text-lg text-foreground">{selected.name}</h2>
                <StatusPill status={selected.status} />
              </div>
              <p className="text-xs text-muted-foreground">{selected.phone} · {selected.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadPDF(selected)}
              className="flex items-center gap-1.5 text-sm font-semibold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              ↓ Download PDF
            </button>
            <button onClick={() => setModal(null)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Loan Amount", val: formatINR(selected.loanAmount) },
              { label: "Outstanding", val: formatINR(outstanding(selected)), hi: true },
              { label: "Total Repaid", val: formatINR(totalRepaid(selected)) },
            ].map(c => (
              <div key={c.label} className={`rounded-xl p-3.5 border ${c.hi ? "bg-slate-900 text-white border-slate-900" : "bg-secondary border-border"}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${c.hi ? "text-white/70" : "text-muted-foreground"}`}>{c.label}</p>
                <p className={`font-display text-xl font-bold ${c.hi ? "text-white" : "text-foreground"}`}>{c.val}</p>
              </div>
            ))}
          </div>

          {/* Credit Passport */}
          {(() => {
            const passport = getBorrowerPassportById(String(selected.id));
            if (!passport) return null;
            const tone = bandTone(passport.band);
            const toneClass: Record<string, string> = {
              success: "bg-success/10 text-success-foreground",
              info: "bg-info/10 text-info-foreground",
              warning: "bg-warning/10 text-warning-foreground",
              danger: "bg-destructive/10 text-destructive",
            };
            return (
              <div className="rounded-xl border border-border p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Credit Passport</p>
                  <p className="text-sm text-foreground max-w-md">{passport.summary}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${toneClass[tone]}`}>
                    {passport.overallScore} · {passport.band}
                  </span>
                  <button
                    onClick={() => setPassportView(passport)}
                    className="text-xs font-semibold text-accent-foreground hover:underline"
                  >
                    View full breakdown
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ["Address", selected.address || "—"],
              ["Interest Rate", `${selected.interestRate}% p.a.`],
              ["Start Date", selected.startDate],
              ["Due Date", selected.dueDate || "—"],
              ["Note", selected.note || "—"],
            ].map(([l, v]) => (
              <div key={l} className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">{l}</span>
                <span className="text-foreground font-medium">{v}</span>
              </div>
            ))}
          </div>

          {/* Transactions */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
              <h3 className="text-sm font-semibold text-foreground">Transaction History</h3>
              <button
                onClick={() => setModal("addTransaction")}
                className="text-xs font-semibold text-accent-foreground hover:underline"
              >
                + Add entry
              </button>
            </div>
            {selected.transactions.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">No transactions recorded.</p>
            )}
            <div className="divide-y divide-border">
              {[...selected.transactions].reverse().map(tx => {
                const pill: Record<TxType, string> = {
                  loan: "bg-info text-info-foreground",
                  repayment: "bg-success text-success-foreground",
                  interest: "bg-warning text-warning-foreground",
                };
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${pill[tx.type]}`}>
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
  );

  // ── Add Borrower modal ────────────────────────────────────────────────────
  const addBorrowerModal = modal === "addBorrower" && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border gap-3">
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">Add Borrower Manually</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter contact and full loan amount details, or fill it by speaking</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <VoiceButton
              label="Fill by voice"
              busyLabel="Understanding…"
              onTranscript={handleVoiceFillBorrower}
            />
            <button onClick={() => setModal(null)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors">✕</button>
          </div>
        </div>
        {voiceNote && (
          <p className="px-6 pt-3 text-xs text-muted-foreground italic">{voiceNote}</p>
        )}

        <form onSubmit={handleAddBorrower} className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Contact */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Contact Information</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name *">
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} placeholder="e.g. Amit Kumar" />
              </Field>
              <Field label="Phone *">
                <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inp} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inp} placeholder="amit@email.com" />
              </Field>
              <Field label="Address">
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inp} placeholder="Street, City" />
              </Field>
            </div>
          </div>

          {/* Loan amount details */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Loan Amount Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loan Amount (₹) *">
                <input required type="number" min="1" value={form.loanAmount} onChange={e => setForm({ ...form, loanAmount: e.target.value })} className={inp} placeholder="e.g. 50000" />
              </Field>
              <Field label="Interest Rate (% p.a.)">
                <input type="number" min="0" step="0.1" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} className={inp} placeholder="e.g. 12" />
              </Field>
              <Field label="Start Date *">
                <input required type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className={inp} />
              </Field>
              <Field label="Due / Repayment Date">
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className={inp} />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as BorrowerStatus })} className={inp}>
                  <option value="active">Active</option>
                  <option value="paid">Repaid in full</option>
                  <option value="overdue">Overdue</option>
                  <option value="settled-early">Settled early</option>
                  <option value="written-off">Written off</option>
                </select>
              </Field>
              <Field label="Purpose / Note">
                <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className={inp} placeholder="Loan purpose" />
              </Field>
              <Field label="Initial Transaction Note">
                <input value={form.initialNote} onChange={e => setForm({ ...form, initialNote: e.target.value })} className={`${inp} col-span-2`} placeholder="e.g. Loan disbursed for home renovation" />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(null)} className="flex-1 border border-border text-foreground text-sm font-semibold py-2.5 rounded-xl hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-slate-800 transition-colors">Add Borrower</button>
          </div>
        </form>
      </div>
    </div>
  );

  // ── Add Transaction modal ─────────────────────────────────────────────────
  const addTransactionModal = modal === "addTransaction" && selected && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-display font-semibold text-base text-foreground">Add Transaction</h2>
            <p className="text-xs text-muted-foreground">{selected.name}</p>
          </div>
          <button onClick={() => setModal("profile")} className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors">✕</button>
        </div>
        <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
          <Field label="Date *">
            <input required type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} className={inp} />
          </Field>
          <Field label="Type *">
            <select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value as TxType })} className={inp}>
              <option value="repayment">Repayment</option>
              <option value="interest">Interest Charged</option>
              <option value="loan">Additional Loan</option>
            </select>
          </Field>
          <Field label="Amount (₹) *">
            <input required type="number" min="1" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} className={inp} placeholder="e.g. 5000" />
          </Field>
          <Field label="Note">
            <input value={txForm.note} onChange={e => setTxForm({ ...txForm, note: e.target.value })} className={inp} placeholder="e.g. Monthly EMI" />
          </Field>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModal("profile")} className="flex-1 border border-border text-foreground text-sm font-semibold py-2.5 rounded-xl hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-slate-800 transition-colors">Save</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="bg-background font-sans">
      {borrowersPage}
      {profileModal}
      {addBorrowerModal}
      {addTransactionModal}
      {passportView && <BorrowerPassportModal passport={passportView} onClose={() => setPassportView(null)} />}
    </div>
  );
}

/* =========================================================================
   PLATFORM BORROWERS — the lender's real, registered borrowers: a
   structured relationship via the loans table, distinct from the manual
   ledger above (which can track anyone, registered or not).
   ========================================================================= */

type PlatformLoanRow = {
  id: number;
  borrowerName: string;
  targetAmount: number;
  floor: number;
  ceiling: number;
  outstanding: number;
  dueDate: string;
  status: string;
};

type PlatformPaymentRow = {
  cycleMonth: string;
  amountDue: number;
  amountPaid: number;
  paidOnTime: boolean;
};

function PlatformBorrowerDetail({ loan, onClose }: { loan: PlatformLoanRow; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PlatformPaymentRow[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
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
            <h3 className="text-foreground font-semibold">{loan.borrowerName}</h3>
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
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.paidOnTime ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
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

function PlatformBorrowers() {
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<PlatformLoanRow[]>([]);
  const [detailLoan, setDetailLoan] = useState<PlatformLoanRow | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      const { data: loanRows } = await supabase
        .from("loans")
        .select("id, borrower_id, target_amount, floor, ceiling, outstanding, due_date, status")
        .eq("lender_id", user.id);

      if (!loanRows || loanRows.length === 0) {
        if (active) { setLoans([]); setLoading(false); }
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", [...new Set(loanRows.map((l) => l.borrower_id))]);

      if (!active) return;
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

      setLoans(
        loanRows.map((l) => ({
          id: l.id,
          borrowerName: nameById.get(l.borrower_id) ?? "Unknown borrower",
          targetAmount: l.target_amount,
          floor: l.floor,
          ceiling: l.ceiling,
          outstanding: Number(l.outstanding),
          dueDate: l.due_date,
          status: l.status,
        }))
      );
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    );
  }

  if (loans.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto p-8">
        <div className="bg-card rounded-2xl border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No platform borrowers yet.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="font-display text-4xl font-bold text-foreground">Borrowers</h1>
        <p className="text-muted-foreground mt-1.5 text-sm max-w-xl">
          {loans.length} registered borrower{loans.length === 1 ? "" : "s"} — real platform loans, structured and repaid through the app.
        </p>
      </div>
      <div className="space-y-4">
        {loans.map((loan) => (
          <div key={loan.id} className="bg-card rounded-2xl border border-border p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-foreground">{loan.borrowerName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Registered platform loan</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">{loan.status}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Target payment</p>
                <p className="text-foreground font-medium mt-0.5">{formatINR(loan.targetAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Outstanding</p>
                <p className="text-foreground font-medium mt-0.5">{formatINR(loan.outstanding)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Floor / Ceiling</p>
                <p className="text-foreground font-medium mt-0.5">{formatINR(loan.floor)} &ndash; {formatINR(loan.ceiling)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Due date</p>
                <p className="text-foreground font-medium mt-0.5">{new Date(loan.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>
            <button
              onClick={() => setDetailLoan(loan)}
              className="mt-4 text-xs font-medium text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors"
            >
              View payment history
            </button>
          </div>
        ))}
      </div>
      {detailLoan && <PlatformBorrowerDetail loan={detailLoan} onClose={() => setDetailLoan(null)} />}
    </main>
  );
}

/* =========================================================================
   PAGE — Platform borrowers vs manual ledger toggle
   ========================================================================= */

export default function Borrowers() {
  const [view, setView] = useState<"platform" | "manual">("platform");

  return (
    <div className="bg-background font-sans">
      <div className="px-8 pt-8">
        <div className="flex items-center gap-1 mb-2 bg-secondary w-fit rounded-full p-1">
          {(
            [
              ["platform", "Platform borrowers"],
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
      </div>
      {view === "platform" ? <PlatformBorrowers /> : <ManualLedger />}
    </div>
  );
}