import { useMemo, useState, useEffect } from "react"
import {
  Search,
  Check,
  UserPlus,
  Pencil,
  X,
  Flag,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_MODE, demoAuditEntries } from "@/lib/demoData"

/* =========================================================================
   Audit log entries — mirrors the borrowers, requests, and templates that
   actually exist elsewhere in the app (Requests.tsx / Borrowers.tsx) so the
   activity trail stays consistent with the rest of the product.
   ========================================================================= */

type AuditAction = "Approved" | "Created" | "Modified" | "Rejected" | "Flagged"

interface AuditEntry {
  id: number
  date: string
  time: string
  actor: string
  action: AuditAction
  actionText: string
  entity: string
}

const actionIconStyles: Record<AuditAction, { icon: typeof Check; bg: string; color: string }> = {
  Approved: { icon: Check, bg: "#DCFCE7", color: "#16A34A" },
  Created: { icon: UserPlus, bg: "#DBEAFE", color: "#2563EB" },
  Modified: { icon: Pencil, bg: "#FEF3C7", color: "#D97706" },
  Rejected: { icon: X, bg: "#FEE2E2", color: "#DC2626" },
  Flagged: { icon: Flag, bg: "#FFE4E6", color: "#E11D48" },
}


const filters: Array<"All" | AuditAction> = ["All", "Approved", "Created", "Modified", "Rejected", "Flagged"]

/* =========================================================================
   PAGE
   ========================================================================= */

export default function AuditLog() {
  const [loading, setLoading] = useState(true)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"All" | AuditAction>("All")

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      if (DEMO_MODE) {
        setAuditEntries(
          demoAuditEntries.map((e) => {
            const d = new Date(e.createdAt)
            return {
              id: e.id,
              date: d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
              time: d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
              actor: e.actorName,
              action: e.action,
              actionText: e.actionText,
              entity: e.entity,
            }
          })
        )
        setLoading(false)
        return
      }

      const { data: rows } = await supabase
        .from("audit_log")
        .select("*")
        .eq("lender_id", user.id)
        .order("created_at", { ascending: false })

      if (!rows || rows.length === 0) {
        if (active) { setAuditEntries([]); setLoading(false) }
        return
      }

      const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))]
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", actorIds)
      if (!active) return
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]))

      setAuditEntries(
        rows.map((r) => {
          const d = new Date(r.created_at)
          return {
            id: r.id,
            date: d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
            time: d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
            actor: r.actor_id === user.id ? "You" : nameById.get(r.actor_id) ?? "Unknown",
            action: r.action,
            actionText: r.action_text,
            entity: r.entity,
          }
        })
      )
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return auditEntries.filter((e) => {
      const matchesFilter = activeFilter === "All" || e.action === activeFilter
      const matchesQuery =
        !q ||
        e.actor.toLowerCase().includes(q) ||
        e.entity.toLowerCase().includes(q) ||
        e.actionText.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [auditEntries, query, activeFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEntry[]>()
    for (const entry of filtered) {
      const list = map.get(entry.date) ?? []
      list.push(entry)
      map.set(entry.date, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-4xl font-semibold text-foreground">Audit log</h2>
        <p className="text-muted-foreground mt-3 max-w-xl text-sm sm:text-base">
          A record of every action taken on borrower plans, requests, and policy templates.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by borrower, action, or reviewer"
            className="w-full text-sm bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-colors"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
                activeFilter === f
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-10 text-center text-muted-foreground text-sm">
          No matching activity found.
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, entries]) => (
            <div key={date} className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <p className="text-sm font-medium text-muted-foreground mb-4">{date}</p>
              <div className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const { icon: Icon, bg, color } = actionIconStyles[entry.action]
                  return (
                    <div key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: bg }}
                      >
                        <Icon size={14} style={{ color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">{entry.actor}</span>{" "}
                          {entry.actionText}{" "}
                          <span className="font-semibold text-foreground">{entry.entity}</span>
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">{entry.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}