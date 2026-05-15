// Wired to /api/admin/companies (S4-BE-A-03).
// Table columns = name, plan, users, leads, status, created, actions.
// Row actions: Suspend / Reactivate / Delete via PATCH/DELETE.
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Plus, Search, Ban, Trash2, X } from "lucide-react"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import { adminService } from "@/services/adminService"

const normaliseStatus = (raw) => {
  const s = String(raw || "").toUpperCase()
  if (s === "SUSPENDED") return "suspended"
  if (s === "TRIAL" || s === "FREE_TRIAL") return "trial"
  return "active"
}

const STATUS_BADGE = {
  active: { cls: "badge-success", label: "Active" },
  trial: { cls: "badge-warning", label: "Trial" },
  suspended: { cls: "badge-error", label: "Suspended" },
}

const PLAN_BADGE_BY_KEY = {
  ENTERPRISE: "badge-warning",
  PRO: "badge-info",
  STARTER: "badge-muted",
  FREE_TRIAL: "badge-muted",
}

export default function Orgs() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: "",
    ownerEmail: "",
    plan: "Starter",
    industry: "Real Estate",
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminService.getCompanies()
      const items = data?.items ?? data ?? []
      setOrgs(Array.isArray(items) ? items : [])
    } catch (err) {
      toast.error(err?.message || "Failed to load organisations")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orgs
    return orgs.filter((o) => (o.name || "").toLowerCase().includes(q))
  }, [orgs, query])

  const handleAdd = (e) => {
    e.preventDefault()
    toast.message("Add Org coming soon", {
      description:
        "Companies are currently created via /signup. A platform-admin create flow ships post-MVP.",
    })
    setShowAdd(false)
  }

  const handleSuspend = async (o) => {
    const normalised = normaliseStatus(o.status)
    const next = normalised === "suspended" ? "ACTIVE" : "SUSPENDED"
    try {
      const updated = await adminService.patchCompany(o.id, { status: next })
      setOrgs((cur) =>
        cur.map((x) => (x.id === o.id ? { ...x, ...updated } : x)),
      )
      toast.success(
        next === "SUSPENDED" ? `${o.name} suspended` : `${o.name} reactivated`,
      )
    } catch (err) {
      toast.error(err?.message || "Failed to update organisation")
    }
  }

  const handleDelete = async (o) => {
    if (
      !window.confirm(
        `Permanently delete "${o.name}"? This removes the company and all its data. This cannot be undone.`,
      )
    ) {
      return
    }
    try {
      await adminService.deleteCompany(o.id)
      setOrgs((cur) => cur.filter((x) => x.id !== o.id))
      toast.success(`${o.name} deleted`)
    } catch (err) {
      toast.error(err?.message || "Failed to delete organisation")
    }
  }

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Organisations</h1>
          <p>
            {loading
              ? "Loading…"
              : `${orgs.length} organisation${orgs.length === 1 ? "" : "s"} on the platform.`}
          </p>
        </div>
        <div className="row">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/admin")}
          >
            Back to overview
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={16} /> Add Org
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              placeholder="Search organisations…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Plan</th>
                <th>Users</th>
                <th>Leads</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
                    Loading organisations…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
                    {query ? `No organisations match "${query}".` : "No organisations yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const statusKey = normaliseStatus(o.status)
                  const status = STATUS_BADGE[statusKey]
                  const planKey = String(o.plan || "").toUpperCase()
                  const planCls = PLAN_BADGE_BY_KEY[planKey] || "badge-muted"
                  return (
                    <tr key={o.id}>
                      <td>
                        <div className="row">
                          <div className="avatar">{fmt.initials(o.name)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{o.name}</div>
                            <div className="text-xs text-muted">
                              {o.timezone || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${planCls}`}>{o.plan || "—"}</span>
                      </td>
                      <td>{o.userCount ?? 0}</td>
                      <td>{o.leadCount ?? 0}</td>
                      <td>
                        <span className={`badge ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>{o.createdAt ? fmt.date(o.createdAt) : "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-icon btn-ghost"
                            type="button"
                            title={
                              statusKey === "suspended" ? "Reactivate" : "Suspend"
                            }
                            onClick={() => handleSuspend(o)}
                          >
                            <Ban size={14} />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            type="button"
                            title="Delete"
                            onClick={() => handleDelete(o)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAdd(false)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-org-title"
          >
            <div
              className="row row-between"
              style={{ marginBottom: 12 }}
            >
              <h3 id="add-org-title" style={{ margin: 0 }}>
                New Organisation
              </h3>
              <button
                className="btn-icon btn-ghost"
                type="button"
                onClick={() => setShowAdd(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="stack" style={{ gap: 12 }}>
              <div>
                <label className="form-label">Organisation name</label>
                <input
                  className="input"
                  placeholder="e.g. Aurum Realty Group"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Owner email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="owner@example.com"
                  value={form.ownerEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ownerEmail: e.target.value }))
                  }
                />
              </div>
              <div
                className="row"
                style={{ gap: 12, display: "grid", gridTemplateColumns: "1fr 1fr" }}
              >
                <div>
                  <label className="form-label">Plan</label>
                  <select
                    className="input"
                    value={form.plan}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, plan: e.target.value }))
                    }
                  >
                    <option>Starter</option>
                    <option>Pro</option>
                    <option>Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Industry</label>
                  <input
                    className="input"
                    value={form.industry}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, industry: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit">
                  Create
                </button>
              </div>
              <p
                className="text-xs text-muted"
                style={{ margin: 0 }}
              >
                Created by {currentUser?.email || "platform admin"}. Stubbed
                until S4-BE-A-03 wires the platform admin API.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
