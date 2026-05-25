import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Briefcase,
  Building2,
  CalendarClock,
  ChevronDown,
  Eye,
  Flame,
  LogOut,
  Plus,
  Share2,
  Trash2,
  Users,
  X,
} from "lucide-react"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import KpiCard from "@/components/common/KpiCard"
import { fmt } from "@/lib/format"

// Channel Partner workspace. A single login that may be connected to many
// companies — the Switch Company control in the top-left swaps the active
// company and re-scopes every panel below it.

const STORAGE_KEY = "cp:activeCompanyId"
const TABS = [
  { id: "shared", label: "Shared with me" },
  { id: "own", label: "My leads in this company" },
  { id: "private", label: "Private leads" },
]
const VISIBILITY_OPTIONS = [
  { value: "FULL", label: "Full Visible", help: "Company sees everything" },
  { value: "PARTIAL", label: "Partial", help: "Hide phone & email" },
  { value: "ANONYMOUS", label: "Anonymous", help: "Hide name, phone & email" },
]

export default function ChannelPartnerDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  const [companies, setCompanies] = useState([])
  const [activeCompanyId, setActiveCompanyId] = useState(null)
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false)
  const [kpis, setKpis] = useState({})
  const [tab, setTab] = useState("shared")
  const [leads, setLeads] = useState([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [shareTargetLead, setShareTargetLead] = useState(null)

  // Load companies on mount, restore last selection from localStorage.
  useEffect(() => {
    let cancelled = false
    api
      .get("/channel-partner/companies")
      .then((res) => {
        if (cancelled) return
        const list = res?.data ?? []
        setCompanies(list)
        if (list.length === 0) return
        const stored = window.localStorage.getItem(STORAGE_KEY)
        const valid = list.find((c) => c.id === stored && c.status === "ACTIVE")
        const fallback = list.find((c) => c.status === "ACTIVE") || list[0]
        const initial = valid?.id || fallback?.id || null
        setActiveCompanyId(initial)
      })
      .catch((err) => toast.error(err?.message || "Failed to load companies"))
    return () => {
      cancelled = true
    }
  }, [])

  // Persist the active company server-side too (sticky across devices).
  useEffect(() => {
    if (!activeCompanyId) return
    window.localStorage.setItem(STORAGE_KEY, activeCompanyId)
    api
      .patch("/channel-partner/default-company", { companyId: activeCompanyId })
      .catch(() => {})
  }, [activeCompanyId])

  // KPIs whenever the company filter changes.
  useEffect(() => {
    if (!activeCompanyId) return
    let cancelled = false
    api
      .get(`/channel-partner/dashboard?companyId=${encodeURIComponent(activeCompanyId)}`)
      .then((res) => {
        if (!cancelled) setKpis(res?.data ?? {})
      })
      .catch((err) => toast.error(err?.message || "Failed to load KPIs"))
    return () => {
      cancelled = true
    }
  }, [activeCompanyId])

  // Leads list whenever tab or company changes.
  const loadLeads = () => {
    if (!activeCompanyId && tab !== "private") return
    let cancelled = false
    setLoadingLeads(true)
    const params = new URLSearchParams()
    params.set("scope", tab)
    if (tab !== "private" && activeCompanyId) {
      params.set("companyId", activeCompanyId)
    }
    api
      .get(`/channel-partner/leads?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setLeads(res?.data ?? [])
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load leads")
      })
      .finally(() => {
        if (!cancelled) setLoadingLeads(false)
      })
    return () => {
      cancelled = true
    }
  }
  useEffect(loadLeads, [activeCompanyId, tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeCompanies = useMemo(
    () => companies.filter((c) => c.status === "ACTIVE"),
    [companies],
  )
  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId),
    [companies, activeCompanyId],
  )

  const handleSignOut = async () => {
    await signOut()
    navigate("/login", { replace: true })
  }

  if (companies.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--lp-bg)" }}>
        <CpHeader user={user} onSignOut={handleSignOut} switcher={null} />
        <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
          <EmptyState />
        </main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--lp-bg)" }}>
      <CpHeader
        user={user}
        onSignOut={handleSignOut}
        switcher={
          <CompanySwitcher
            companies={activeCompanies}
            active={activeCompany}
            open={companyPickerOpen}
            onToggle={() => setCompanyPickerOpen((v) => !v)}
            onPick={(id) => {
              setActiveCompanyId(id)
              setCompanyPickerOpen(false)
            }}
          />
        }
      />

      <main style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>
              {activeCompany?.name || "All companies"} workspace
            </h2>
            <p className="text-muted text-sm" style={{ marginTop: 4 }}>
              Manage leads, track deals, and collaborate with this company.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreateOpen(true)}
            disabled={!activeCompany}
          >
            <Plus size={16} /> Add Lead
          </button>
        </div>

        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          <KpiCard label="Leads in this company" value={kpis.totalLeads ?? 0} icon={Users} color="amber" />
          <KpiCard label="Hot leads" value={kpis.hotLeads ?? 0} icon={Flame} color="red" />
          <KpiCard label="Tasks due today" value={kpis.tasksToday ?? 0} icon={CalendarClock} color="blue" />
          <KpiCard label="Private leads" value={kpis.privateLeads ?? 0} icon={Briefcase} color="purple" />
        </div>

        {kpis.perCompany && kpis.perCompany.length > 1 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">All companies at a glance</div>
            <div className="grid grid-3" style={{ gap: 12 }}>
              {kpis.perCompany.map((c) => (
                <button
                  key={c.companyId}
                  type="button"
                  onClick={() => setActiveCompanyId(c.companyId)}
                  className="card"
                  style={{
                    background: c.companyId === activeCompanyId ? "var(--lp-surface-2)" : "var(--lp-surface)",
                    borderColor: c.companyId === activeCompanyId ? "var(--lp-accent)" : "var(--lp-border)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{c.companyName}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {c.totalLeads} lead{c.totalLeads === 1 ? "" : "s"}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {Object.entries(c.byStatus).slice(0, 4).map(([s, n]) => (
                      <span key={s} className="badge" style={{ fontSize: 11 }}>
                        {s}: {n}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="row" style={{ gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </TabButton>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loadingLeads ? (
            <div style={{ padding: 24, color: "var(--lp-text-muted)" }}>Loading…</div>
          ) : leads.length === 0 ? (
            <div style={{ padding: 24, color: "var(--lp-text-muted)" }}>
              {tab === "private"
                ? "No private leads yet. Click \"Add Lead\" with the \"Keep private\" toggle on to capture leads before sharing them with a company."
                : "No leads to show."}
            </div>
          ) : (
            <LeadTable
              leads={leads}
              tab={tab}
              onRowClick={(lead) => navigate(`/cp/leads/${lead.id}`)}
              onShare={(lead) => setShareTargetLead(lead)}
              onUnshare={(lead) => unshareLead(lead, activeCompanyId, loadLeads)}
            />
          )}
        </div>
      </main>

      {createOpen && activeCompany && (
        <AddLeadModal
          company={activeCompany}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            loadLeads()
          }}
        />
      )}

      {shareTargetLead && (
        <ShareLeadModal
          lead={shareTargetLead}
          companies={activeCompanies}
          onClose={() => setShareTargetLead(null)}
          onShared={() => {
            setShareTargetLead(null)
            loadLeads()
          }}
        />
      )}
    </div>
  )
}

// ---------- Header / company switcher ----------------------------------

function CpHeader({ user, onSignOut, switcher }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 24px",
        borderBottom: "1px solid var(--lp-border)",
        background: "var(--lp-surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--lp-surface-2)",
              border: "1px solid var(--lp-border)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--lp-accent)",
            }}
          >
            <Briefcase size={16} />
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>Channel Partner</div>
            <div className="text-xs text-muted">{user?.email}</div>
          </div>
        </div>
        {switcher}
      </div>
      <button type="button" className="btn btn-secondary" onClick={onSignOut}>
        <LogOut size={16} /> Sign out
      </button>
    </header>
  )
}

function CompanySwitcher({ companies, active, open, onToggle, onPick }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        className="btn btn-secondary"
        style={{ minWidth: 220, justifyContent: "space-between" }}
      >
        <span className="row" style={{ gap: 8, alignItems: "center" }}>
          <Building2 size={14} />
          <span style={{ fontWeight: 600 }}>{active?.name || "Pick a company"}</span>
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 280,
            background: "var(--lp-surface)",
            border: "1px solid var(--lp-border)",
            borderRadius: 10,
            boxShadow: "var(--lp-shadow-lg)",
            padding: 6,
            zIndex: 30,
          }}
        >
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: c.id === active?.id ? "var(--lp-surface-2)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: c.brandColor || "var(--lp-accent)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {c.logoUrl ? <img src={c.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6 }} /> : initials(c.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                <div className="text-xs text-muted">{c.city || ""}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function initials(name) {
  return (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

// ---------- Lead table -------------------------------------------------

function LeadTable({ leads, tab, onRowClick, onShare, onUnshare }) {
  return (
    <table className="data">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Visibility</th>
          <th>Updated</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {leads.map((l) => (
          <tr key={l.id} style={{ cursor: "pointer" }}>
            <td onClick={() => onRowClick(l)}>{l.name}</td>
            <td onClick={() => onRowClick(l)}>{fmt.phone(l.phone)}</td>
            <td onClick={() => onRowClick(l)}>{l.status}</td>
            <td onClick={() => onRowClick(l)}>
              {l.priority ? (
                <span className="badge">{l.priority}</span>
              ) : (
                "—"
              )}
            </td>
            <td onClick={() => onRowClick(l)}>
              <span className="badge">{l.visibility || "FULL"}</span>
            </td>
            <td onClick={() => onRowClick(l)}>
              {new Date(l.updatedAt).toLocaleDateString()}
            </td>
            <td>
              <div className="row" style={{ gap: 4 }}>
                {tab === "private" ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => onShare(l)}
                    title="Share this lead with a company"
                  >
                    <Share2 size={12} /> Share
                  </button>
                ) : tab === "own" ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => onUnshare(l)}
                    title="Remove from this company"
                  >
                    <Trash2 size={12} />
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

async function unshareLead(lead, companyId, refresh) {
  if (!companyId) return
  if (!window.confirm("Remove this lead from the current company? Other companies you've shared it with are unaffected.")) return
  try {
    await api.post(`/channel-partner/leads/${lead.id}/unshare`, { companyId })
    toast.success("Lead removed from this company")
    refresh()
  } catch (err) {
    toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
  }
}

// ---------- Modals -----------------------------------------------------

function AddLeadModal({ company, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    requirementType: "",
    budget: "",
    visibility: "FULL",
    visibleToCompany: true,
  })
  const [saving, setSaving] = useState(false)
  const u = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: v }))
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required")
      return
    }
    setSaving(true)
    try {
      await api.post("/channel-partner/leads", {
        ...form,
        companyId: company.id,
      })
      toast.success(form.visibleToCompany ? `Shared with ${company.name}` : "Saved to your private list")
      onCreated()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed to add lead")
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal onClose={onClose} title={`Add lead for ${company.name}`}>
      <form onSubmit={submit}>
        <div className="grid grid-2" style={{ gap: "0 12px" }}>
          <Field label="Name *">
            <input className="input" value={form.name} onChange={u("name")} required />
          </Field>
          <Field label="Phone *">
            <input className="input" value={form.phone} onChange={u("phone")} required />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={u("email")} />
          </Field>
          <Field label="City">
            <input className="input" value={form.city} onChange={u("city")} />
          </Field>
          <Field label="Requirement">
            <input className="input" value={form.requirementType} onChange={u("requirementType")} placeholder="2BHK Apartment" />
          </Field>
          <Field label="Budget">
            <input className="input" value={form.budget} onChange={u("budget")} placeholder="₹50 L - ₹1 Cr" />
          </Field>
        </div>
        <Field label="Visibility for company">
          <select className="select" value={form.visibility} onChange={u("visibility")}>
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label} — {o.help}</option>
            ))}
          </select>
        </Field>
        <label className="checkbox" style={{ marginTop: 4 }}>
          <input type="checkbox" checked={form.visibleToCompany} onChange={u("visibleToCompany")} />
          Share with {company.name} immediately
          <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
            (uncheck to keep in your private list)
          </span>
        </label>
        <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Add Lead"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ShareLeadModal({ lead, companies, onClose, onShared }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id || "")
  const [visibility, setVisibility] = useState("FULL")
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!companyId) {
      toast.error("Pick a company")
      return
    }
    setSaving(true)
    try {
      await api.post(`/channel-partner/leads/${lead.id}/share`, { companyId, visibility })
      toast.success("Lead shared")
      onShared()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal onClose={onClose} title={`Share "${lead.name}" with a company`}>
      <form onSubmit={submit}>
        <Field label="Company">
          <select className="select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Visibility">
          <select className="select" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label} — {o.help}</option>
            ))}
          </select>
        </Field>
        <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Sharing…" : <><Share2 size={14} /> Share</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        border: "1px solid var(--lp-border)",
        background: active ? "var(--lp-accent)" : "var(--lp-surface)",
        color: active ? "#0A0A0F" : "var(--lp-text)",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="card" style={{ textAlign: "center", padding: 48, marginTop: 32 }}>
      <Building2 size={32} style={{ opacity: 0.5 }} />
      <h2 style={{ marginTop: 12 }}>No companies linked yet</h2>
      <p className="text-muted">
        When a company invites you and you accept, this workspace will show
        their leads here.
      </p>
    </div>
  )
}
