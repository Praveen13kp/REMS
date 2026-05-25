// Wired to /api/admin/companies (S4-BE-A-03).
// Table columns = name, plan, users, leads, status, created, actions.
// Row actions: Suspend / Reactivate / Delete via PATCH/DELETE.
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Plus, Search, Ban, Trash2, X, Clock, RotateCcw, Activity, Pencil, Users } from "lucide-react"
import { fmt } from "@/lib/format"
import { adminService } from "@/services/adminService"

const normaliseStatus = (raw) => {
  const s = String(raw || "").toUpperCase()
  if (s === "SUSPENDED") return "suspended"
  return "active"
}

const STATUS_BADGE = {
  active: { cls: "badge-success", label: "Active" },
  suspended: { cls: "badge-error", label: "Suspended" },
}

// Plan badges use the same three live codes as planLimits.js. Old codes
// (FREE_TRIAL/STARTER/PROFESSIONAL) are folded onto the new ones for the
// badge colour and label.
const PLAN_BADGE_BY_KEY = {
  ENTERPRISE: "badge-warning",
  PRO: "badge-info",
  BASIC: "badge-muted",
  FREE: "badge-muted",
  FREE_TRIAL: "badge-muted",
  STARTER: "badge-info",
  PROFESSIONAL: "badge-info",
}

const PLAN_LABEL_BY_KEY = {
  BASIC: "Basic",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
  FREE: "Basic",
  FREE_TRIAL: "Basic",
  STARTER: "Pro",
  PROFESSIONAL: "Pro",
}

// Fold legacy plan codes (FREE/FREE_TRIAL/STARTER/PROFESSIONAL) onto
// the three live codes so the edit modal's dropdown matches what's
// actually in the row.
function normalisePlanLocal(raw) {
  const k = String(raw || "").toUpperCase()
  if (k === "PRO" || k === "STARTER" || k === "PROFESSIONAL") return "PRO"
  if (k === "ENTERPRISE") return "ENTERPRISE"
  return "BASIC"
}

// Render a Trial column entry: days left for active trials, "Expired" for
// past, or "—" for paid plans (where trialEndsAt is null).
function trialBadge(trialEndsAt, planKey) {
  if (planKey !== "BASIC" && planKey !== "FREE" && planKey !== "FREE_TRIAL") {
    return <span className="text-xs text-muted">—</span>
  }
  if (!trialEndsAt) return <span className="text-xs text-muted">—</span>
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  if (ms <= 0) {
    return <span className="badge badge-error">Expired</span>
  }
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000))
  if (days <= 2) {
    return <span className="badge badge-warning">{days}d left</span>
  }
  return <span className="badge badge-muted">{days}d left</span>
}

export default function Orgs() {
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: "",
    ownerEmail: "",
    ownerName: "",
    plan: "BASIC",
    type: "DEVELOPER",
    city: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [createdInvite, setCreatedInvite] = useState(null)
  // Edit-plan modal: SuperAdmin can override a company's plan without
  // going through Razorpay. Useful for support cases (gift Pro to a VIP,
  // downgrade a non-payer). Razorpay subscription rows stay untouched.
  const [editOrg, setEditOrg] = useState(null)
  const [editForm, setEditForm] = useState({ plan: "BASIC", status: "ACTIVE" })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const resetForm = () => {
    setForm({
      name: "",
      ownerEmail: "",
      ownerName: "",
      plan: "BASIC",
      type: "DEVELOPER",
      city: "",
    })
    setFormErrors({})
  }

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

  const handleAdd = async (e) => {
    e.preventDefault()

    const errors = {}
    if (!form.name.trim()) errors.name = "Organisation name is required"
    if (!form.ownerEmail.trim()) errors.ownerEmail = "Owner email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail.trim())) {
      errors.ownerEmail = "Enter a valid email"
    }
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const data = await adminService.createCompany({
        name: form.name.trim(),
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        ownerName: form.ownerName.trim() || undefined,
        plan: form.plan,
        type: form.type,
        city: form.city.trim() || undefined,
      })
      toast.success(`Created "${form.name.trim()}"`)
      setShowAdd(false)
      setCreatedInvite({
        companyName: form.name.trim(),
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        inviteLink: data?.inviteLink,
      })
      resetForm()
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to create organisation")
    } finally {
      setSubmitting(false)
    }
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

  const openEdit = (o) => {
    setEditOrg(o)
    setEditForm({
      plan: normalisePlanLocal(o.plan),
      status: o.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    })
  }

  const handleSaveEdit = async () => {
    if (!editOrg) return
    setEditSubmitting(true)
    try {
      const updated = await adminService.patchCompany(editOrg.id, {
        plan: editForm.plan,
        status: editForm.status,
      })
      setOrgs((cur) =>
        cur.map((x) =>
          x.id === editOrg.id
            ? {
                ...x,
                plan: editForm.plan,
                status: editForm.status,
                ...updated,
              }
            : x,
        ),
      )
      toast.success(`${editOrg.name}: plan updated to ${PLAN_LABEL_BY_KEY[editForm.plan] || editForm.plan}`)
      setEditOrg(null)
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to update organisation")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleTrial = async (o, action) => {
    const verb = action === "reset" ? "Reset" : "Expire"
    if (
      !window.confirm(
        `${verb} the trial for "${o.name}"? ${
          action === "reset"
            ? "Resets trialEndsAt to 7 days from now."
            : "Sets trialEndsAt to the past — the company will be locked out of writes immediately."
        }`,
      )
    ) {
      return
    }
    try {
      const updated = await adminService.patchCompany(o.id, { trialAction: action })
      setOrgs((cur) =>
        cur.map((x) =>
          x.id === o.id
            ? { ...x, trialEndsAt: updated?.trialEndsAt ?? x.trialEndsAt }
            : x,
        ),
      )
      toast.success(`${o.name}: trial ${action === "reset" ? "reset" : "expired"}`)
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to update trial")
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
                <th>Trial</th>
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
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
                    Loading organisations…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
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
                        <span className={`badge ${planCls}`}>
                          {PLAN_LABEL_BY_KEY[planKey] || o.plan || "—"}
                        </span>
                      </td>
                      <td>{trialBadge(o.trialEndsAt, planKey)}</td>
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
                          {(planKey === "BASIC" || planKey === "FREE" || planKey === "FREE_TRIAL") && (
                            <>
                              <button
                                className="btn-icon btn-ghost"
                                type="button"
                                title="Reset trial (+7 days)"
                                onClick={() => handleTrial(o, "reset")}
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                className="btn-icon btn-ghost"
                                type="button"
                                title="Expire trial now (testing)"
                                onClick={() => handleTrial(o, "expire")}
                              >
                                <Clock size={14} />
                              </button>
                            </>
                          )}
                          <button
                            className="btn-icon btn-ghost"
                            type="button"
                            title="Edit plan / status"
                            onClick={() => openEdit(o)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            type="button"
                            title="View users in this org"
                            onClick={() => navigate(`/admin/orgs/${o.id}/users`)}
                          >
                            <Users size={14} />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            type="button"
                            title="View audit log"
                            onClick={() => navigate(`/admin/orgs/${o.id}/audit-log`)}
                          >
                            <Activity size={14} />
                          </button>
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
          onClick={() => !submitting && setShowAdd(false)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-org-title"
            style={{ maxWidth: 520 }}
          >
            <div className="modal-head">
              <div>
                <h3 id="add-org-title" style={{ margin: 0 }}>
                  New Organisation
                </h3>
                <p
                  className="text-xs text-muted"
                  style={{ margin: "4px 0 0", fontWeight: 400 }}
                >
                  Creates the workspace and emails the owner an activation link.
                </p>
              </div>
              <button
                className="btn-icon btn-ghost"
                type="button"
                onClick={() => setShowAdd(false)}
                disabled={submitting}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} noValidate>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="field">
                  <label className="label">
                    Organisation name <span style={{ color: "var(--lp-error)" }}>*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Aurum Realty Group"
                    value={form.name}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, name: e.target.value }))
                      if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }))
                    }}
                    aria-invalid={!!formErrors.name}
                    autoFocus
                  />
                  {formErrors.name && (
                    <div className="text-xs" style={{ color: "var(--lp-error)", marginTop: 4 }}>
                      {formErrors.name}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div className="field">
                    <label className="label">
                      Owner email <span style={{ color: "var(--lp-error)" }}>*</span>
                    </label>
                    <input
                      className="input"
                      type="email"
                      placeholder="owner@example.com"
                      value={form.ownerEmail}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, ownerEmail: e.target.value }))
                        if (formErrors.ownerEmail) {
                          setFormErrors((p) => ({ ...p, ownerEmail: undefined }))
                        }
                      }}
                      aria-invalid={!!formErrors.ownerEmail}
                    />
                    {formErrors.ownerEmail && (
                      <div className="text-xs" style={{ color: "var(--lp-error)", marginTop: 4 }}>
                        {formErrors.ownerEmail}
                      </div>
                    )}
                  </div>
                  <div className="field">
                    <label className="label">Owner name</label>
                    <input
                      className="input"
                      placeholder="Optional"
                      value={form.ownerName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ownerName: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div className="field">
                    <label className="label">Plan</label>
                    <select
                      className="select"
                      value={form.plan}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, plan: e.target.value }))
                      }
                    >
                      <option value="BASIC">Basic (7-day trial)</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Company type</label>
                    <select
                      className="select"
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, type: e.target.value }))
                      }
                    >
                      <option value="DEVELOPER">Developer</option>
                      <option value="BROKERAGE">Brokerage</option>
                      <option value="CHANNEL_PARTNER">Channel Partner</option>
                      <option value="INDIVIDUAL">Individual Agent</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="label">City</label>
                  <input
                    className="input"
                    placeholder="Optional — e.g. Mumbai"
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setShowAdd(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Creating…" : "Create organisation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdInvite && (
        <div
          className="modal-backdrop"
          onClick={() => setCreatedInvite(null)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: 520 }}
          >
            <div className="modal-head">
              <h3 style={{ margin: 0 }}>Organisation created</h3>
              <button
                className="btn-icon btn-ghost"
                type="button"
                onClick={() => setCreatedInvite(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p className="text-sm" style={{ margin: 0 }}>
                <b>{createdInvite.companyName}</b> is ready. We&apos;ve emailed
                an activation link to <b>{createdInvite.ownerEmail}</b>.
              </p>
              {createdInvite.inviteLink && (
                <div className="field">
                  <label className="label text-xs">
                    Invite link (valid 7 days)
                  </label>
                  <div className="row" style={{ gap: 6 }}>
                    <input
                      className="input"
                      readOnly
                      value={createdInvite.inviteLink}
                      onFocus={(e) => e.target.select()}
                      style={{ fontFamily: "var(--lp-font-mono, monospace)", fontSize: "0.8rem" }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        navigator.clipboard
                          ?.writeText(createdInvite.inviteLink)
                          .then(() => toast.success("Invite link copied"))
                          .catch(() => toast.error("Copy failed"))
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <p
                    className="text-xs text-muted"
                    style={{ marginTop: 6 }}
                  >
                    Share this link if the email doesn&apos;t arrive — the owner
                    sets their password on accept.
                  </p>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreatedInvite(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {editOrg && (
        <div
          className="modal-backdrop"
          onClick={() => !editSubmitting && setEditOrg(null)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-org-title"
            style={{ maxWidth: 480 }}
          >
            <div className="modal-head">
              <div>
                <h3 id="edit-org-title" style={{ margin: 0 }}>
                  Edit organisation
                </h3>
                <p
                  className="text-xs text-muted"
                  style={{ margin: "4px 0 0", fontWeight: 400 }}
                >
                  {editOrg.name} · manual override, no Razorpay charge.
                </p>
              </div>
              <button
                className="btn-icon btn-ghost"
                type="button"
                onClick={() => setEditOrg(null)}
                disabled={editSubmitting}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="modal-body"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div className="field">
                <label className="label">Subscription plan</label>
                <select
                  className="select"
                  value={editForm.plan}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, plan: e.target.value }))
                  }
                >
                  <option value="BASIC">Basic (7-day trial)</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
                <p
                  className="text-xs text-muted"
                  style={{ marginTop: 6, marginBottom: 0 }}
                >
                  Setting Pro / Enterprise here grants access without
                  charging — useful for trials, gifts, or compensation. The
                  customer&apos;s Razorpay subscription (if any) is unaffected.
                </p>
              </div>

              <div className="field">
                <label className="label">Status</label>
                <select
                  className="select"
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <p
                  className="text-xs text-muted"
                  style={{ marginTop: 6, marginBottom: 0 }}
                >
                  Suspending blocks all sign-ins for this org&apos;s users.
                </p>
              </div>

              {(editForm.plan === "BASIC") && (
                <div
                  className="card"
                  style={{
                    padding: 12,
                    background: "var(--lp-surface-2, rgba(255,255,255,0.04))",
                  }}
                >
                  <div className="text-xs text-muted">Trial controls</div>
                  <div
                    className="row"
                    style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={editSubmitting}
                      onClick={async () => {
                        setEditSubmitting(true)
                        try {
                          await adminService.patchCompany(editOrg.id, {
                            trialAction: "reset",
                          })
                          toast.success("Trial reset to 7 days")
                          load()
                        } catch (err) {
                          toast.error(err?.message || "Failed")
                        } finally {
                          setEditSubmitting(false)
                        }
                      }}
                    >
                      <RotateCcw size={12} /> Reset trial (+7 days)
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={editSubmitting}
                      onClick={async () => {
                        setEditSubmitting(true)
                        try {
                          await adminService.patchCompany(editOrg.id, {
                            trialAction: "expire",
                          })
                          toast.success("Trial expired")
                          load()
                        } catch (err) {
                          toast.error(err?.message || "Failed")
                        } finally {
                          setEditSubmitting(false)
                        }
                      }}
                    >
                      <Clock size={12} /> Expire trial now
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-foot">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setEditOrg(null)}
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleSaveEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
