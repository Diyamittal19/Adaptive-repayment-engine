import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useTheme } from "@/lib/theme"
import {
  LayoutDashboard,
  Wallet,
  Search,
  Landmark,
  Sparkles,
  Settings as SettingsIcon,
  LifeBuoy,
  LogOut,
  PiggyBank,
  Moon,
} from "lucide-react"

export const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Tracker", icon: PiggyBank },
  { label: "Lenders", icon: Landmark },
  { label: "Requests", icon: Search },
  { label: "What-If", icon: Sparkles },
]

interface SidebarProps {
  activeNav: string
  setActiveNav: (s: string) => void
  mobile?: boolean
  onClose?: () => void
  onSettingsClick?: () => void
  settingsActive?: boolean
}

export default function Sidebar({
  activeNav,
  setActiveNav,
  mobile = false,
  onClose,
  onSettingsClick,
  settingsActive = false,
}: SidebarProps) {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const [name, setName] = useState("")

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single()
      if (!active) return
      setName(profile?.name ?? "")
    }
    load()
    return () => { active = false }
  }, [])

  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?"

  return (
    <div className="flex flex-col h-full bg-sidebar" style={{ width: mobile ? "100%" : "256px" }}>
      {/* Brand */}
      <div className="px-6 py-6 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-success/20 text-success shrink-0">
          <Wallet className="size-4" />
        </span>
        <span className="text-sidebar-foreground font-semibold text-[15px] tracking-tight">
          Adaptive Repayment
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        {navItems.map(({ label, icon: Icon }) => {
          const active = !settingsActive && activeNav === label
          return (
            <button
              key={label}
              onClick={() => {
                setActiveNav(label)
                onClose?.()
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors text-left ${
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 mb-1">
          <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-foreground/15 text-xs font-semibold text-sidebar-foreground shrink-0">
            {initials}
          </span>
          <div className="leading-tight flex-1">
            <p className="text-sm font-medium text-sidebar-foreground">{name || "Loading…"}</p>
            <p className="text-xs text-sidebar-foreground/50">Borrower</p>
          </div>
          <button
            onClick={toggle}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors p-1"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Moon size={15} />
          </button>
        </div>

        <button
          onClick={() => {
            onSettingsClick?.()
            onClose?.()
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
            settingsActive
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          }`}
        >
          <SettingsIcon className="size-4 shrink-0" />
          Settings
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors text-left">
          <LifeBuoy className="size-4 shrink-0" />
          Help
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate("/login") }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors text-left"
        >
          <LogOut className="size-4 shrink-0" />
          Log out
        </button>
      </div>
    </div>
  )
}