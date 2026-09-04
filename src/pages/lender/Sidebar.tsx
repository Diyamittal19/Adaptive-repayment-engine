import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useTheme } from "@/lib/theme"
import {
  Home,
  Users,
  FileText,
  Sparkles,
  Clock,
  Settings,
  HelpCircle,
  LogOut,
  Moon,
  Bell,
  Menu,
} from "lucide-react"

export const navItems = [
  { label: "Dashboard", icon: Home },
  { label: "Requests", icon: FileText },
  { label: "Borrowers", icon: Users },
  { label: "What-If", icon: Sparkles },
  { label: "Audit Log", icon: Clock },
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
    <div className="flex flex-col h-full" style={{ backgroundColor: "#0B1324", width: mobile ? "100%" : "256px" }}>
      {/* Brand */}
      <div className="px-6 py-6 flex items-center gap-3">
        {mobile && (
          <button onClick={onClose} className="text-white mr-1">
            <Menu size={20} />
          </button>
        )}
        <span className="text-white font-semibold text-xl tracking-tight">Adaptive Repayment</span>
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
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all duration-150 text-left ${
                active ? "text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              style={
                active
                  ? {
                      background: "rgba(37,99,235,0.16)",
                      border: "1px solid rgba(37,99,235,0.28)",
                    }
                  : { border: "1px solid transparent" }
              }
            >
              <Icon size={17} style={active ? { color: "#60A5FA" } : undefined} />
              <span className="flex-1 text-left">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }} className="px-3 py-3">
        {/* Profile row */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
            style={{ backgroundColor: "#1E3A5F" }}
          >
            {initials}
          </div>
          <span className="text-white text-sm font-medium flex-1">{name || "Loading…"}</span>
          <button
            onClick={toggle}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Moon size={15} />
          </button>
          <button className="relative text-slate-400 hover:text-white transition-colors p-1">
            <Bell size={15} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-500 border border-[#0B1324]" />
          </button>
        </div>

        {/* Settings */}
        <button
          onClick={() => {
            onSettingsClick?.()
            onClose?.()
          }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
            settingsActive ? "text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          style={
            settingsActive
              ? {
                  background: "rgba(37,99,235,0.16)",
                  border: "1px solid rgba(37,99,235,0.28)",
                }
              : { border: "1px solid transparent" }
          }
        >
          <Settings size={16} style={settingsActive ? { color: "#60A5FA" } : undefined} /> Settings
        </button>

        {/* Help */}
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors text-left">
          <HelpCircle size={16} /> Help
        </button>

        {/* Log out */}
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate("/login") }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors text-left"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  )
}