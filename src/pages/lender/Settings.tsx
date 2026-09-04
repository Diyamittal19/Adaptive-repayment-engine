import { useState, useEffect } from "react"
import Premium from "./Premium"
import { supabase } from "@/lib/supabaseClient"
import { useTheme, type ThemeMode } from "@/lib/theme"

// ─── Icons (inline, matches original settings design reference) ───────────────

function Icon({
  path,
  size = 16,
  className = "",
  style,
}: {
  path: string
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={path} />
    </svg>
  )
}

const IC = {
  check: "M5 13l4 4L19 7",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  monitor: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  globe: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  text: "M4 6h16M4 12h16M4 18h7",
  bellOn: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  repeat: "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4m14 0v2a4 4 0 01-4 4H3",
  alertCircle: "M12 8v4m0 4h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  phone: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  id: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c0 1.306.835 2.418 2 2.83M9 14a3.001 3.001 0 000 5.999",
  edit: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  chevronDown: "M19 9l-7 7-7-7",
  sparkles: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  arrowRight: "M13 7l5 5m0 0l-5 5m5-5H6",
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative inline-flex h-[22px] w-10 flex-shrink-0 items-center rounded-full cursor-pointer focus:outline-none transition-colors duration-200"
      style={{
        background: checked ? "linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)" : "var(--border)",
        boxShadow: checked ? "0 0 12px rgba(20,184,166,0.25)" : "none",
      }}
    >
      <span
        className="inline-block rounded-full shadow"
        style={{
          width: 16, height: 16,
          background: "#fff",
          transform: checked ? "translateX(20px)" : "translateX(3px)",
          transition: "transform 0.2s ease, background 0.2s ease",
        }}
      />
    </button>
  )
}

// ─── Segmented Control ─────────────────────────────────────────────────────────

function Segmented({ options, value, onChange }: {
  options: { label: string; iconKey?: keyof typeof IC }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex rounded-lg p-0.5 gap-0.5" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
      {options.map((opt) => {
        const active = opt.label === value
        return (
          <button key={opt.label} onClick={() => onChange(opt.label)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer"
            style={{
              color: active ? "#fff" : "var(--muted-foreground)",
              background: active ? "linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)" : "transparent",
              border: active ? "1px solid rgba(20,184,166,0.28)" : "1px solid transparent",
            }}>
            {opt.iconKey && <Icon path={IC[opt.iconKey]} size={12} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Mini Select ──────────────────────────────────────────────────────────────

function MiniSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-xs font-medium rounded-lg px-3 py-1.5 pr-7 cursor-pointer focus:outline-none"
        style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon path={IC.chevronDown} size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
    </div>
  )
}

// ─── Settings sub-components ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-1 mt-7 first:mt-0">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] flex-shrink-0" style={{ color: "#14b8a6", fontFamily: "'JetBrains Mono', monospace" }}>{children}</span>
      <div className="flex-1 h-px" style={{ background: "var(--secondary)" }} />
    </div>
  )
}

function SettingRow({ iconKey, label, sub, control, last = false }: { iconKey: keyof typeof IC; label: string; sub?: string; control: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-secondary transition-colors duration-100" style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
        <Icon path={IC[iconKey]} size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>{label}</div>
        {sub && <div className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{sub}</div>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  )
}

function InfoRow({ iconKey, label, value, masked = false, last = false }: { iconKey: keyof typeof IC; label: string; value: string; masked?: boolean; last?: boolean }) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5" style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
        <Icon path={IC[iconKey]} size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] mb-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
        <div className="text-[13px] font-medium" style={{ color: "var(--foreground)", filter: masked ? "blur(5px)" : undefined }}>{value}</div>
      </div>
    </div>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(15,23,42,0.03)" }}>
      {children}
    </div>
  )
}

// ─── Settings Tabs ─────────────────────────────────────────────────────────────

type SettingsTab = "Profile" | "Preferences" | "Premium"

function ProfileTab() {
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [orgType, setOrgType] = useState("")
  const [rateMin, setRateMin] = useState(0)
  const [rateMax, setRateMax] = useState(0)
  const [maxAmount, setMaxAmount] = useState(0)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      setEmail(user.email ?? "")

      const [{ data: profile }, { data: lenderProfile }] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", user.id).single(),
        supabase.from("lender_profiles").select("*").eq("lender_id", user.id).single(),
      ])
      if (!active) return
      setName(profile?.name ?? "")
      setPhone(lenderProfile?.phone ?? null)
      setRole(lenderProfile?.role ?? null)
      setOrgType(lenderProfile?.org_type ?? "")
      setRateMin(lenderProfile?.rate_min ?? 0)
      setRateMax(lenderProfile?.rate_max ?? 0)
      setMaxAmount(lenderProfile?.max_amount ?? 0)
      setVerified(lenderProfile?.verified ?? false)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?"

  const fields = [name, phone, email, role, orgType, maxAmount > 0]
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100)

  if (loading) {
    return <p className="text-sm text-slate-400 py-10 text-center">Loading…</p>
  }

  return (
    <div>
      <div className="rounded-2xl p-6 mb-1 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.08) 0%, rgba(59,130,246,0.05) 45%, rgba(99,102,241,0.08) 100%)", border: "1px solid rgba(20,184,166,0.16)" }}>
        <div className="relative flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)", color: "#fff", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 6px 18px rgba(20,184,166,0.25)" }}>{initials}</div>
            {verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #14b8a6, #3b82f6)", border: "2px solid #FFFFFF" }}>
                <Icon path={IC.check} size={10} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold" style={{ color: "var(--foreground)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.01em" }}>{name}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Lender</div>
            <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: verified ? "rgba(20,184,166,0.1)" : "rgba(217,119,6,0.1)", border: verified ? "1px solid rgba(20,184,166,0.25)" : "1px solid rgba(217,119,6,0.25)", color: verified ? "#0f766e" : "#b45309" }}>
              <Icon path={IC.shield} size={9} /> {verified ? "Profile verified" : "Verification pending"}
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 hover:bg-secondary cursor-pointer" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            <Icon path={IC.edit} size={12} /> Edit Profile
          </button>
        </div>
      </div>
      <SectionLabel>Personal Information</SectionLabel>
      <Group>
        <InfoRow iconKey="id" label="Full Name" value={name || "Not set"} />
        <InfoRow iconKey="phone" label="Phone Number" value={phone || "Not set"} masked={!!phone} />
        <InfoRow iconKey="mail" label="Email Address" value={email || "Not set"} />
        <InfoRow iconKey="briefcase" label="Occupation" value={role || "Not set"} last />
      </Group>
      <SectionLabel>Lending Profile</SectionLabel>
      <Group>
        <InfoRow iconKey="id" label="Institution Type" value={orgType || "Not set"} />
        <InfoRow iconKey="dollar" label="Rate Range" value={rateMax > 0 ? `${rateMin}\u2013${rateMax}% p.a.` : "Not set"} />
        <InfoRow iconKey="dollar" label="Maximum Loan Amount" value={maxAmount > 0 ? `\u20B9${maxAmount.toLocaleString("en-IN")}` : "Not set"} />
        <InfoRow iconKey="shield" label="Verification Status" value={verified ? "Active & Verified" : "Pending verification"} last />
      </Group>
      <div className="mt-3 rounded-xl px-4 py-3.5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Profile Completeness</span>
          <span className="text-xs font-bold" style={{ background: "linear-gradient(90deg, #14b8a6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{completeness}% Complete</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
          <div className="h-full rounded-full" style={{ width: `${completeness}%`, background: "linear-gradient(90deg, #14b8a6, #3b82f6, #8b5cf6)" }} />
        </div>
        {completeness < 100 && (
          <p className="text-[11px] mt-2" style={{ color: "var(--muted-foreground)" }}>Fill in the missing fields above to reach 100%</p>
        )}
      </div>
    </div>
  )
}

function PreferencesTab() {
  const { mode, setMode } = useTheme()
  const [language, setLanguage] = useState("English")
  const [textSize, setTextSize] = useState("Medium")
  const [notifs, setNotifs] = useState(true)
  const [repayment, setRepayment] = useState(true)
  const [borrower, setBorrower] = useState(false)
  const [financial, setFinancial] = useState(true)

  return (
    <div>
      <SectionLabel>Experience</SectionLabel>
      <Group>
        <SettingRow iconKey="sun" label="Appearance" sub="Choose your preferred display theme" control={<Segmented options={[{ label: "Light", iconKey: "sun" }, { label: "Dark", iconKey: "moon" }, { label: "System", iconKey: "monitor" }]} value={mode} onChange={(v) => setMode(v as ThemeMode)} />} />
        <SettingRow iconKey="globe" label="Language" sub="Interface display language" control={<MiniSelect options={["English", "French", "Spanish", "German", "Mandarin"]} value={language} onChange={setLanguage} />} />
        <SettingRow iconKey="text" label="Text Size" sub="Adjust interface text density" last control={<Segmented options={[{ label: "Small" }, { label: "Medium" }, { label: "Large" }]} value={textSize} onChange={setTextSize} />} />
      </Group>
      <SectionLabel>Notifications</SectionLabel>
      <Group>
        <SettingRow iconKey="bellOn" label="Notifications" sub="Receive important updates from Adaptive Repayment" control={<Toggle checked={notifs} onChange={() => setNotifs(!notifs)} />} />
        <SettingRow iconKey="repeat" label="Repayment reminders" sub="Get notified about upcoming repayments" control={<Toggle checked={repayment} onChange={() => setRepayment(!repayment)} />} />
        <SettingRow iconKey="users" label="Borrower updates" sub="Receive updates related to borrowers" control={<Toggle checked={borrower} onChange={() => setBorrower(!borrower)} />} />
        <SettingRow iconKey="alertCircle" label="Financial alerts" sub="Important financial activity and account alerts" last control={<Toggle checked={financial} onChange={() => setFinancial(!financial)} />} />
      </Group>
    </div>
  )
}

// ─── Settings Tab Bar ─────────────────────────────────────────────────────────

function SettingsTabBar({ active, setActive }: { active: SettingsTab; setActive: (t: SettingsTab) => void }) {
  const TABS: { key: SettingsTab; sub: string }[] = [
    { key: "Profile", sub: "Identity & info" },
    { key: "Preferences", sub: "Display & alerts" },
    { key: "Premium", sub: "Plan & upgrades" },
  ]
  return (
    <div className="flex items-stretch w-full rounded-2xl overflow-hidden mb-8" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(15,23,42,0.03)" }}>
      {TABS.map((tab, i) => {
        const isActive = tab.key === active
        return (
          <button key={tab.key} onClick={() => setActive(tab.key)}
            className="relative flex-1 flex flex-col items-center justify-center py-5 cursor-pointer transition-all duration-200"
            style={{ borderRight: i < TABS.length - 1 ? "1px solid var(--border)" : "none", background: isActive ? "linear-gradient(135deg, rgba(20,184,166,0.08) 0%, rgba(59,130,246,0.05) 50%, rgba(99,102,241,0.08) 100%)" : "transparent" }}>
            {isActive && <div className="absolute bottom-0 left-8 right-8 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, #14b8a6, #3b82f6, #8b5cf6)" }} />}
            <span className="text-base font-semibold tracking-[-0.01em] transition-colors duration-150" style={{ color: isActive ? "var(--foreground)" : "var(--muted-foreground)", fontFamily: "'DM Sans', sans-serif" }}>{tab.key}</span>
            {isActive && <span className="text-[10px] font-medium mt-0.5" style={{ color: "#0f766e", fontFamily: "'JetBrains Mono', monospace" }}>{tab.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("Profile")

  if (activeTab === "Premium") {
    return (
      <div>
        <div className="p-6 md:p-8 pb-0">
          <div className="mb-7">
            <h1 className="text-[28px] font-bold leading-none mb-2" style={{ color: "var(--foreground)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.03em" }}>Settings</h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Manage your preferences, profile, and subscription.</p>
          </div>
          <SettingsTabBar active={activeTab} setActive={setActiveTab} />
        </div>
        <Premium />
      </div>
    )
  }

  return (
    <main className="p-6 md:p-8">
      <div className="mb-7">
        <h1 className="text-[28px] font-bold leading-none mb-2" style={{ color: "var(--foreground)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.03em" }}>Settings</h1>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Manage your preferences, profile, and subscription.</p>
      </div>
      <SettingsTabBar active={activeTab} setActive={setActiveTab} />
      <div style={{ maxWidth: 640 }}>
        {activeTab === "Profile" && <ProfileTab />}
        {activeTab === "Preferences" && <PreferencesTab />}
      </div>
    </main>
  )
}