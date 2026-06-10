// Wired to /api/admin/companies (S4-BE-A-03).
// Table columns = name, plan, users, leads, status, created, actions.
// Row actions: Suspend / Reactivate / Delete via PATCH/DELETE.
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Plus, Search, Ban, Trash2, X, Clock, RotateCcw, Activity, Pencil, ShieldCheck, Users, MoreHorizontal, Filter, Columns3, ListChecks, Building, Calendar, Tag, User, MapPin, CreditCard } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { fmt } from "@/lib/format"
import { adminService } from "@/services/adminService"
import { useFormDraft } from "@/hooks/useFormDraft"

const ADD_ORG_INITIAL = {
  name: "",
  ownerEmail: "",
  ownerName: "",
  plan: "BASIC",
  type: "DEVELOPER",
  city: "",
}

const BASIC_TRIAL_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

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

// Trial column. Trial is now plan-agnostic — any company without an
// active subscription counts as on-trial until trialEndsAt elapses,
// regardless of which paid tier they picked at signup.
function trialBadge(trialEndsAt, hasActiveSub) {
  if (hasActiveSub) return <span className="text-xs text-muted">—</span>
  if (!trialEndsAt) return <span className="text-xs text-muted">—</span>
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  if (ms <= 0) {
    return <span className="badge badge-error">Expired</span>
  }
  const days = Math.min(BASIC_TRIAL_DAYS, Math.ceil(ms / MS_PER_DAY))
  if (days <= 2) {
    return <span className="badge badge-warning">{days}d left</span>
  }
  return <span className="badge badge-muted">{days}d left</span>
}

// "Plan" column. Mirrors the tenant-side billing model:
//   - SUBSCRIBED: show the paid plan (Pro, Enterprise, etc.)
//   - TRIAL:      show a "Free Trial" purple badge (no plan is "active")
//   - TRIAL_EXPIRED / NO_PLAN: muted "No plan" state
function planBadge(org) {
  if (org.hasActiveSubscription) {
    const key = String(org.activePlan || org.plan || "").toUpperCase()
    const cls = PLAN_BADGE_BY_KEY[key] || "badge-muted"
    return (
      <span className={`badge ${cls}`}>
        {PLAN_LABEL_BY_KEY[key] || key || "—"}
      </span>
    )
  }
  if (org.billingState === "TRIAL") {
    return (
      <span
        className="badge"
        style={{
          background: "rgba(139,92,246,0.15)",
          color: "var(--lp-accent)",
          border: "1px solid var(--lp-accent)",
        }}
      >
        Free Trial
      </span>
    )
  }
  return <span className="badge badge-muted">No plan</span>
}

const ORGS_COLUMNS = [
  { key: "name", label: "Organisation", icon: Building },
  { key: "plan", label: "Plan", icon: CreditCard },
  { key: "trial", label: "Trial", icon: Clock },
  { key: "users", label: "Users", icon: Users },
  { key: "leads", label: "Leads", icon: User },
  { key: "status", label: "Status", icon: Tag },
  { key: "created", label: "Created", icon: Calendar },
]

export default function Orgs() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  const planFilter = searchParams.get("plan") ?? ""
  const statusFilter = searchParams.get("status") ?? ""
  const columnsParam = searchParams.get("columns") ?? ""
  const visibleColumns = useMemo(() => {
    if (!columnsParam) return ORGS_COLUMNS.map((c) => c.key)
    return columnsParam.split(",").filter((k) => ORGS_COLUMNS.some((c) => c.key === k))
  }, [columnsParam])

  const updateParams = (patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === undefined) next.delete(k)
        else next.set(k, String(v))
      }
      return next
    })
  }

  const toggleColumn = (key) => {
    const current = new Set(visibleColumns)
    if (current.has(key)) {
      if (current.size <= 1) return
      current.delete(key)
    } else {
      current.add(key)
    }
    updateParams({ columns: [...current].join(",") || null })
  }

  const toggleAllColumns = () => {
    const allKeys = ORGS_COLUMNS.map((c) => c.key)
    const allVisible = allKeys.every((k) => visibleColumns.includes(k))
    if (allVisible) {
      updateParams({ columns: allKeys[0] })
    } else {
      updateParams({ columns: allKeys.join(",") || null })
    }
  }
  const [showAdd, setShowAdd] = useState(false)
  // Draft-backed so the create form survives navigation / accidental dismiss;
  // restored on reopen, cleared on Cancel or a successful create.
  const [form, setForm, clearAddDraft] = useFormDraft(
    "superadmin:add-org",
    ADD_ORG_INITIAL,
  )
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [createdInvite, setCreatedInvite] = useState(null)
  // Edit-plan modal: SuperAdmin can override a company's plan without
  // going through Razorpay. Useful for support cases (gift Pro to a VIP,
  // downgrade a non-payer). Razorpay subscription rows stay untouched.
  const [editOrg, setEditOrg] = useState(null)
  // Grant-access modal — lets SUPER_ADMIN activate a paid plan without
  // running the customer through Razorpay (used when payment lands via
  // bank transfer or the webhook never flipped the row).
  const [grantOrg, setGrantOrg] = useState(null)
  const [grantForm, setGrantForm] = useState({
    plan: "PRO",
    billingCycle: "monthly",
    note: "",
  })
  const [grantSubmitting, setGrantSubmitting] = useState(false)

  const submitGrant = async () => {
    if (!grantOrg) return
    setGrantSubmitting(true)
    try {
      await adminService.grantAccess(grantOrg.id, grantForm)
      toast.success(`Granted ${grantForm.plan} to ${grantOrg.name}`)
      setGrantOrg(null)
      setGrantForm({ plan: "PRO", billingCycle: "monthly", note: "" })
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to grant access")
    } finally {
      setGrantSubmitting(false)
    }
  }
  const [editForm, setEditForm] = useState({ plan: "BASIC", status: "ACTIVE" })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const resetForm = () => {
    clearAddDraft() // wipe persisted draft + reset to initial values
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
    return orgs.filter((o) => {
      if (planFilter && normalisePlanLocal(o.plan) !== planFilter) return false
      if (statusFilter && normaliseStatus(o.status) !== statusFilter) return false
      if (!q) return true
      return (o.name || "").toLowerCase().includes(q)
    })
  }, [orgs, query, planFilter, statusFilter])

  // Filter chips
  const chips = []
  if (planFilter) chips.push({ label: `Plan: ${planFilter}`, clear: () => updateParams({ plan: null }) })
  if (statusFilter) chips.push({ label: `Status: ${statusFilter}`, clear: () => updateParams({ status: null }) })
  const hasFilters = chips.length > 0
  const clearAllFilters = () => updateParams({ plan: null, status: null })

  // Row selection
  const [selected, setSelected] = useState(new Set())
  useEffect(() => { setSelected(new Set()) }, [query, planFilter, statusFilter])
  const toggleRow = (id, on) => {
    setSelected((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next })
  }
  const toggleAll = (on) => { setSelected(on ? new Set(filtered.map((o) => o.id)) : new Set()) }
  const allSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.id))

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

  const [confirmModal, setConfirmModal] = useState(null)

  const handleTrial = async (o, action) => {
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
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            {selected.size > 0 && (
              <>
                <span style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)", whiteSpace: "nowrap" }}>
                  {selected.size} selected
                </span>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
                  Clear selection
                </button>
              </>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Filter size={14} /> Filters
                  {hasFilters && (
                    <span className="badge badge-muted" style={{ padding: "1px 6px", fontSize: "0.733rem", lineHeight: 1.4 }}>
                      {chips.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[200px] p-2">
                <div className="stack" style={{ gap: "4px" }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Status</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={statusFilter}
                      onChange={(e) => updateParams({ status: e.target.value || null })}
                    >
                      <option value="">All statuses</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Plan</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={planFilter}
                      onChange={(e) => updateParams({ plan: e.target.value || null })}
                    >
                      <option value="">All plans</option>
                      <option value="BASIC">Basic</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Columns3 size={14} /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[200px] p-2">
                <div className="stack" style={{ gap: "2px" }}>
                  <label className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem", borderBottom: "1px solid var(--lp-border)", marginBottom: 4 }}>
                    <input type="checkbox"
                      checked={ORGS_COLUMNS.every((c) => visibleColumns.includes(c.key))}
                      onChange={toggleAllColumns}
                      style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                    />
                    <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    Select All
                  </label>
                  {ORGS_COLUMNS.map((col) => (
                    <label key={col.key} className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem" }}>
                      <input type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                      />
                      <col.icon size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>
        {hasFilters && (
          <div style={{ padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--lp-border)" }}>
            {chips.map((c) => (
              <span key={c.label} className="badge badge-muted">
                {c.label}
                <button type="button" onClick={c.clear} aria-label={`Remove ${c.label}`} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 6, display: "inline-flex", verticalAlign: "middle", lineHeight: 1 }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />
                </th>
                {visibleColumns.includes("name") && <th>Organisation</th>}
                {visibleColumns.includes("plan") && <th>Plan</th>}
                {visibleColumns.includes("trial") && <th>Trial</th>}
                {visibleColumns.includes("users") && <th>Users</th>}
                {visibleColumns.includes("leads") && <th>Leads</th>}
                {visibleColumns.includes("status") && <th>Status</th>}
                {visibleColumns.includes("created") && <th>Created</th>}
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
                    Loading organisations…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
                    {query ? `No organisations match "${query}".` : "No organisations yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const statusKey = normaliseStatus(o.status)
                  const status = STATUS_BADGE[statusKey]
                  return (
                    <tr key={o.id}>
                      <td>
                        <input type="checkbox" checked={selected.has(o.id)} onChange={(e) => toggleRow(o.id, e.target.checked)} aria-label={`Select ${o.name}`} />
                      </td>
                      {visibleColumns.includes("name") && (
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
                      )}
                      {visibleColumns.includes("plan") && <td>{planBadge(o)}</td>}
                      {visibleColumns.includes("trial") && <td>{trialBadge(o.trialEndsAt, o.hasActiveSubscription)}</td>}
                      {visibleColumns.includes("users") && <td>{o.userCount ?? 0}</td>}
                      {visibleColumns.includes("leads") && <td>{o.leadCount ?? 0}</td>}
                      {visibleColumns.includes("status") && (
                        <td>
                          <span className={`badge ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("created") && <td>{o.createdAt ? fmt.date(o.createdAt) : "—"}</td>}
                      <td>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="btn-icon btn-ghost"
                              aria-label="Actions"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="row-menu p-0"
                            style={{ width: "auto" }}
                          >
                            <button
                              type="button"
                              className="row-menu-item"
                              onClick={() => openEdit(o)}
                            >
                              <Pencil size={14} /> Edit plan / status
                            </button>
                            <button
                              type="button"
                              className="row-menu-item"
                              onClick={() => navigate(`/admin/orgs/${o.id}/users`)}
                            >
                              <Users size={14} /> View users
                            </button>
                            <button
                              type="button"
                              className="row-menu-item"
                              onClick={() => navigate(`/admin/orgs/${o.id}/audit-log`)}
                            >
                              <Activity size={14} /> Audit log
                            </button>
                            {!o.hasActiveSubscription && (
                              <>
                                <div className="row-menu-sep" />
                                <button
                                  type="button"
                                  className="row-menu-item"
                                  onClick={() => setGrantOrg(o)}
                                  title="Activate a paid plan without going through Razorpay"
                                >
                                  <ShieldCheck size={14} /> Grant access
                                </button>
                                <button
                                  type="button"
                                  className="row-menu-item"
                                  onClick={() =>
                                    setConfirmModal({
                                      kind: "trial",
                                      action: "reset",
                                      org: o,
                                      title: `Reset trial for "${o.name}"?`,
                                      body: "Resets trialEndsAt to 7 days from now.",
                                      danger: false,
                                    })
                                  }
                                >
                                  <RotateCcw size={14} /> Reset trial (+7 days)
                                </button>
                                <button
                                  type="button"
                                  className="row-menu-item"
                                  onClick={() =>
                                    setConfirmModal({
                                      kind: "trial",
                                      action: "expire",
                                      org: o,
                                      title: `Expire trial for "${o.name}"?`,
                                      body: "Sets trialEndsAt to the past — the company will be locked out of writes immediately.",
                                      danger: true,
                                    })
                                  }
                                >
                                  <Clock size={14} /> Expire trial now
                                </button>
                              </>
                            )}
                            <div className="row-menu-sep" />
                            <button
                              type="button"
                              className="row-menu-item"
                              onClick={() => handleSuspend(o)}
                            >
                              <Ban size={14} />{" "}
                              {statusKey === "suspended" ? "Reactivate" : "Suspend"}
                            </button>
                            <button
                              type="button"
                              className="row-menu-item danger"
                              onClick={() =>
                                setConfirmModal({
                                  kind: "delete",
                                  org: o,
                                  title: `Delete "${o.name}"?`,
                                  body: "This removes the company and all its data. This cannot be undone.",
                                  danger: true,
                                })
                              }
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </PopoverContent>
                        </Popover>
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
                  onClick={() => {
                    resetForm() // explicit cancel → discard the draft
                    setShowAdd(false)
                  }}
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

      {grantOrg && (
        <div
          className="modal-backdrop"
          onClick={() => !grantSubmitting && setGrantOrg(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-head">
              <h3>Grant access</h3>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setGrantOrg(null)}
                disabled={grantSubmitting}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm" style={{ marginTop: 0 }}>
                Manually activate a paid plan for{" "}
                <b style={{ color: "var(--lp-text)" }}>{grantOrg.name}</b>.
                Use this when payment landed outside Razorpay or the
                webhook never confirmed. The company&apos;s trial will be
                cleared and a new active subscription record created.
              </p>

              <div className="field">
                <label>Plan</label>
                <select
                  className="select"
                  value={grantForm.plan}
                  onChange={(e) =>
                    setGrantForm((f) => ({ ...f, plan: e.target.value }))
                  }
                >
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <div className="field">
                <label>Billing cycle</label>
                <select
                  className="select"
                  value={grantForm.billingCycle}
                  onChange={(e) =>
                    setGrantForm((f) => ({ ...f, billingCycle: e.target.value }))
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div className="field">
                <label>Reason / note (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Bank transfer received on 28 May 2026"
                  value={grantForm.note}
                  onChange={(e) =>
                    setGrantForm((f) => ({ ...f, note: e.target.value }))
                  }
                />
                <div
                  className="text-xs text-muted"
                  style={{ marginTop: 4 }}
                >
                  Stored on the platform audit log alongside your account.
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setGrantOrg(null)}
                disabled={grantSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submitGrant}
                disabled={grantSubmitting}
              >
                {grantSubmitting ? "Granting…" : "Grant access"}
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

      {confirmModal && (
        <div className="modal-backdrop" onClick={() => setConfirmModal(null)} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <h3 style={{ margin: 0 }}>{confirmModal.title}</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setConfirmModal(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0 }}>{confirmModal.body}</p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={confirmModal.danger ? "btn btn-danger" : "btn btn-primary"}
                onClick={async () => {
                  const m = confirmModal
                  setConfirmModal(null)
                  if (m.kind === "trial") await handleTrial(m.org, m.action)
                  if (m.kind === "delete") await handleDelete(m.org)
                }}
              >
                {confirmModal.kind === "trial"
                  ? confirmModal.action === "reset" ? "Reset trial" : "Expire trial"
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
