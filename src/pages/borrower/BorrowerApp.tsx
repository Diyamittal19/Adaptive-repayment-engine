import { useState } from "react"
import Sidebar from "./Sidebar"
import Dashboard from "./Dashboard"
import Tracker from "./Tracker"
import Lenders from "./Lenders"
import Requests from "./Requests"
import WhatIf from "./WhatIf"
import Settings from "./Settings"
import { Menu } from "lucide-react"

export default function BorrowerApp() {
  const [activeNav, setActiveNav] = useState("Dashboard")
  const [showSettings, setShowSettings] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function selectNav(label: string) {
    setActiveNav(label)
    setShowSettings(false)
  }

  const currentLabel = showSettings ? "Settings" : activeNav

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col h-full flex-shrink-0" style={{ width: 256 }}>
        <Sidebar
          activeNav={activeNav}
          setActiveNav={selectNav}
          onSettingsClick={() => setShowSettings(true)}
          settingsActive={showSettings}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 h-full flex-shrink-0">
            <Sidebar
              activeNav={activeNav}
              setActiveNav={selectNav}
              mobile
              onClose={() => setDrawerOpen(false)}
              onSettingsClick={() => setShowSettings(true)}
              settingsActive={showSettings}
            />
          </div>
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-5 py-4 border-b border-border bg-card sticky top-0 z-40">
          <button onClick={() => setDrawerOpen((o) => !o)} className="text-foreground">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-foreground">Adaptive Repayment</span>
        </div>

        {currentLabel === "Settings" && <Settings />}
        {currentLabel === "Dashboard" && <Dashboard onNavigateToRequests={() => selectNav("Requests")} />}
        {currentLabel === "Tracker" && <Tracker />}
        {currentLabel === "Lenders" && <Lenders />}
        {currentLabel === "Requests" && <Requests />}
        {currentLabel === "What-If" && <WhatIf />}
      </main>
    </div>
  )
}