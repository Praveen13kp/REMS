// TODO(S4-BE-A-03): requires /admin/stats, /admin/health, /admin/companies, /admin/activity
// Ported from leadpro-realty/src/pages/Orgs.jsx. Spec adapted per task brief:
// table columns = name, plan, users, leads, status, last-active, actions.
// Row actions: View / Suspend / Delete. Status badge: badge-success (active) /
// badge-warning (trial) / badge-error (suspended). "Add Org" opens a modal.
// No API calls in Phase 5 — inline stub data only.
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Plus, Search, Eye, Ban, Trash2, X } from "lucide-react"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

const STUB_ORGS = [
  {
    id: "o1",
    name: "Aurum Realty Group",
    plan: "Pro",
    userCount: 14,
    leadCount: 412,
    status: "active",
    lastActive: Date.now() - 1000 * 60 * 8,
    timezone: "Asia/Kolkata",
  },
  {
    id: "o2",
    name: "Skyline Estates",
    plan: "Starter",
    userCount: 6,
    leadCount: 88,
    status: "trial",
    lastActive: Date.now() - 1000 * 60 * 35,
    timezone: "Asia/Kolkata",
  },
  {
    id: "o3",
    name: "Pinecrest Properties",
    plan: "Enterprise",
    userCount: 22,
    leadCount: 1207,
    status: "active",
    lastActive: Date.now() - 1000 * 60 * 60 * 2,
    timezone: "Asia/Kolkata",
  },
  {
    id: "o4",
    name: "Marina Homes",
    plan: "Pro",
    userCount: 9,
    leadCount: 256,
    status: "active",
    lastActive: Date.now() - 1000 * 60 * 60 * 9,
    timezone: "Asia/Kolkata",
  },
  {
    id: "o5",
    name: "Lotus Builders",
    plan: "Starter",
    userCount: 3,
    leadCount: 42,
    status: "suspended",
    lastActive: Date.now() - 1000 * 60 * 60 * 24 * 6,
    timezone: "Asia/Kolkata",
  },
]

const STATUS_BADGE = {
  active: { cls: "badge-success", label: "Active" },
  trial: { cls: "badge-warning", label: "Trial" },
  suspended: { cls: "badge-error", label: "Suspended" },
}

const PLAN_BADGE = {
  Enterprise: "badge-warning",
  Pro: "badge-info",
  Starter: "badge-muted",
}

export default function Orgs() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const [orgs, setOrgs] = useState(STUB_ORGS)
  const [query, setQuery] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: "",
    ownerEmail: "",
    plan: "Starter",
    industry: "Real Estate",
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orgs
    return orgs.filter((o) => o.name.toLowerCase().includes(q))
  }, [orgs, query])

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.ownerEmail.trim()) {
      toast.error("Name and owner email are required")
      return
    }
    const next = {
      id: `o${Date.now()}`,
      name: form.name.trim(),
      plan: form.plan,
      userCount: 1,
      leadCount: 0,
      status: "trial",
      lastActive: Date.now(),
      timezone: "Asia/Kolkata",
    }
    setOrgs((cur) => [next, ...cur])
    setShowAdd(false)
    setForm({
      name: "",
      ownerEmail: "",
      plan: "Starter",
      industry: "Real Estate",
    })
    toast.success(`Organisation "${next.name}" created (stub)`)
  }

  const handleView = (o) => {
    toast.message(`View ${o.name}`, {
      description: "Org detail page lands in Phase 5+.",
    })
  }

  const handleSuspend = (o) => {
    setOrgs((cur) =>
      cur.map((x) =>
        x.id === o.id
          ? { ...x, status: x.status === "suspended" ? "active" : "suspended" }
          : x,
      ),
    )
    toast.warning(
      o.status === "suspended"
        ? `${o.name} reactivated`
        : `${o.name} suspended`,
    )
  }

  const handleDelete = (o) => {
    setOrgs((cur) => cur.filter((x) => x.id !== o.id))
    toast.success(`${o.name} deleted (stub)`)
  }

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Organisations</h1>
          <p>
            {orgs.length} organisation{orgs.length === 1 ? "" : "s"} on the
            platform.
          </p>
        </div>
        <div className="row">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/superadmin")}
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
                <th>Last Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    No organisations match “{query}”.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const status = STATUS_BADGE[o.status] || STATUS_BADGE.active
                  const planCls = PLAN_BADGE[o.plan] || "badge-muted"
                  return (
                    <tr key={o.id}>
                      <td>
                        <div className="row">
                          <div className="avatar">{fmt.initials(o.name)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{o.name}</div>
                            <div className="text-xs text-muted">
                              {o.timezone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${planCls}`}>{o.plan}</span>
                      </td>
                      <td>{o.userCount}</td>
                      <td>{o.leadCount}</td>
                      <td>
                        <span className={`badge ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>{fmt.ago(o.lastActive)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-icon btn-ghost"
                            type="button"
                            title="View"
                            onClick={() => handleView(o)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            type="button"
                            title={
                              o.status === "suspended" ? "Reactivate" : "Suspend"
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
