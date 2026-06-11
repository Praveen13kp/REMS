import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownCircle,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Mail,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
  Zap,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { useAuthStore } from "@/stores/authStore"
import { billingService } from "@/services/billingService"
import { billingInvoiceService } from "@/services/billingInvoiceService"
import { clearPlanCache, usePlan } from "@/hooks/usePlan"
import { openRazorpayCheckout } from "@/lib/razorpayCheckout"
import {
  PLANS,
  PLAN_CODES,
  formatStorage,
  planChangeKind,
} from "@/lib/planLimits"
import { fmt } from "@/lib/format"

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "usage", label: "Usage", icon: BarChart3 },
]

function inr(amount) {
  if (amount == null) return "—"
  return "₹" + Number(amount).toLocaleString("en-IN")
}

function formatBillingCycle(cycle) {
  return cycle === "annual" ? "Annual" : "Monthly"
}

const TONE_COLORS = {
  green: { fg: "#10b981", bg: "rgba(16,185,129,0.12)" },
  blue: { fg: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  purple: { fg: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  amber: { fg: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
}

function MiniStatCard({ icon, tone = "purple", label, value, sub, valueSize = "1.467rem" }) {
  const c = TONE_COLORS[tone] || TONE_COLORS.purple
  return (
    <div className="card" style={{ position: "relative", overflow: "hidden" }}>
      <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 10 }}>
        <span
          style={{
            width: 32, height: 32, borderRadius: 8, background: c.bg, color: c.fg,
            display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >{icon}</span>
        <span className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      </div>
      <div style={{ fontSize: valueSize, fontWeight: 700, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div className="text-xs text-muted" style={{ marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function PlanStatusBadge({ trial, hasActiveSub }) {
  if (trial && !hasActiveSub) {
    if (trial.expired) return <span className="badge badge-error">Trial expired</span>
    return <span className="badge badge-info">Free Trial · {trial.daysLeft}d left</span>
  }
  return <span className="badge badge-success">Active</span>
}

function UsageRow({ label, used, limit, formatter }) {
  const display = (v) => (formatter ? formatter(v) : Number(v).toLocaleString("en-IN"))
  const value = limit == null ? `${display(used)} · Unlimited` : `${display(used)} / ${display(limit)}`
  const pctVal = limit == null ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100))
  const tone = pctVal >= 90 ? "var(--lp-error)" : pctVal >= 75 ? "var(--lp-warning, #f59e0b)" : "var(--lp-accent)"
  const visualWidth = limit == null ? 100 : used > 0 && pctVal < 4 ? 4 : pctVal
  return (
    <div style={{ marginBottom: 18, minWidth: 0 }}>
      <div className="row row-between" style={{ fontSize: "0.867rem", marginBottom: 8, gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="text-muted" style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{value}</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "rgba(148,163,184,0.18)", overflow: "hidden", position: "relative" }}>
        <div style={{
          width: `${visualWidth}%`, height: "100%",
          background: limit == null ? "linear-gradient(90deg, var(--lp-accent), #06b6d4)" : `linear-gradient(90deg, ${tone}, ${tone})`,
          boxShadow: used > 0 ? `0 0 8px ${tone}55` : "none", transition: "width .3s ease", borderRadius: 999,
        }} />
      </div>
    </div>
  )
}

function PlanCard({ plan, annual, changeKind, busy, canUpgrade, onSelect, unpaidCurrent }) {
  const price = annual ? plan.price.annual : plan.price.monthly
  const isCurrent = changeKind === "current"
  return (
    <div className={`price-card ${plan.featured ? "featured" : ""}`} style={{
      position: "relative",
      ...(isCurrent ? { borderColor: "var(--lp-accent)", boxShadow: "0 0 0 1px var(--lp-accent)" } : {}),
    }}>
      {isCurrent && (
        <span style={{
          position: "absolute", top: 14, left: 14, padding: "3px 10px", borderRadius: 999,
          background: "var(--lp-accent)", color: "#fff", fontSize: "0.733rem", fontWeight: 700, letterSpacing: 0.4,
        }}>CURRENT PLAN</span>
      )}
      <div className="price-name" style={isCurrent ? { marginTop: 18 } : {}}>{plan.name}</div>
      <div className="price-amount">{inr(annual ? price * 12 : price)}<span>{annual ? "/yr" : "/mo"}</span></div>
      {annual && price > 0 && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{inr(price)}/mo equivalent · charged once a year</div>}
      <p className="text-muted text-sm mt-2">{plan.tagline}</p>
      <ul className="price-feats">{plan.bullets.map((f) => <li key={f}><Check size={16} /> {f}</li>)}</ul>
      <PlanCardCta changeKind={changeKind} plan={plan} busy={busy} canUpgrade={canUpgrade} onSelect={onSelect} unpaidCurrent={unpaidCurrent} />
    </div>
  )
}

function PlanCardCta({ changeKind, plan, busy, canUpgrade, onSelect, unpaidCurrent }) {
  if (changeKind === "current") {
    if (unpaidCurrent) {
      return <button type="button" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy || !canUpgrade} onClick={onSelect}><Zap size={14} /> {busy ? "Loading…" : `Subscribe to ${plan.name}`}</button>
    }
    return <button type="button" className="btn btn-ghost" disabled style={{ width: "100%", justifyContent: "center" }}><CheckCircle2 size={14} /> Current plan</button>
  }
  const variant = changeKind === "downgrade" ? "btn-secondary" : plan.featured ? "btn-primary" : "btn-secondary"
  const label = changeKind === "choose" ? "Choose Plan" : changeKind === "upgrade" ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`
  const Icon = changeKind === "downgrade" ? ArrowRight : Zap
  return <button type="button" className={`btn ${variant}`} style={{ width: "100%", justifyContent: "center" }} disabled={busy || !canUpgrade} onClick={onSelect}><Icon size={14} />{busy ? "Loading…" : label}</button>
}

const INVOICE_STATUS_BADGE = {
  DRAFT: "badge-info", SENT: "badge", PARTIALLY_PAID: "badge-warning",
  PAID: "badge-success", OVERDUE: "badge-error", CANCELLED: "badge-muted",
}
const PAYMENT_STATUS_BADGE = {
  captured: "badge-success", failed: "badge-error", refunded: "badge-warning",
}

function SortIcon({ field, sort }) {
  const [curField, curDir] = (sort || "").split(":")
  if (curField !== field) return <ChevronsUpDown size={12} />
  return curDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
}

// ====== INVOICES TAB ======
function InvoicesTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewTarget, setViewTarget] = useState(null)

  const search = searchParams.get("search") ?? ""
  const statusFilter = searchParams.get("status") ?? ""
  const sort = searchParams.get("sort") ?? "createdAt:desc"
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1
  const pageSize = 20

  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => { setSearchInput(search) }, [search])

  function updateParams(patch) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === undefined) next.delete(k)
        else next.set(k, String(v))
      }
      return next
    })
  }

  useEffect(() => {
    if (searchInput === search) return
    const t = setTimeout(() => updateParams({ search: searchInput || null, page: null }), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await billingInvoiceService.list({ search: search || undefined, status: statusFilter || undefined, page, pageSize, sort: sort || undefined })
      setInvoices(res.items || [])
      setTotal(res.total || 0)
    } catch { toast.error("Failed to load invoices") }
    finally { setLoading(false) }
  }, [search, statusFilter, page, pageSize, sort])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const curPage = Math.min(page, totalPages)

  const chips = []
  if (search) chips.push({ label: `Search: "${search}"`, clear: () => { setSearchInput(""); updateParams({ search: null, page: null }) } })
  if (statusFilter) chips.push({ label: `Status: ${statusFilter}`, clear: () => updateParams({ status: null, page: null }) })
  const hasFilters = chips.length > 0

  return (
    <>
      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input value={searchInput} placeholder="Search invoices…" onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary"><Filter size={14} /> Status</button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[180px] p-2">
                <div className="stack" style={{ gap: 4 }}>
                  {["", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((opt) => (
                    <button key={opt} type="button" className={`row-menu-item ${statusFilter === opt ? "active" : ""}`}
                      onClick={() => updateParams({ status: opt || null, page: null })}
                      style={{ fontSize: "0.867rem", padding: "6px 10px", width: "100%", textAlign: "left" }}
                    >{opt || "All Status"}</button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {hasFilters && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(""); updateParams({ search: null, status: null, page: null }) }}>Clear</button>}
          </div>
        </div>

        {hasFilters && (
          <div style={{ padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--lp-border)" }}>
            {chips.map((c) => (
              <span key={c.label} className="badge badge-muted">
                {c.label}
                <button type="button" onClick={c.clear} style={{ marginLeft: 4, background: "transparent", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", color: "inherit" }}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="table-scroll">
          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lp-text-muted)" }}>Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><FileText size={28} /></div>
              <h3>{hasFilters ? "No invoices match" : "No invoices yet"}</h3>
              <p>Invoices are automatically generated when subscription payments are processed.</p>
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Plan</th>
                  <th>Billing Period</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Status</th>
                  <th className="col-actions" style={{ width: 56, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => setViewTarget(inv)}>{inv.invoiceNumber}</td>
                    <td>{inv.planName || "—"}</td>
                    <td style={{ fontSize: "0.8rem" }}>{inv.billingCycle ? formatBillingCycle(inv.billingCycle) : "—"}</td>
                    <td style={{ fontSize: "0.8rem" }}>{inv.invoiceDate ? fmt.date(inv.invoiceDate) : "—"}</td>
                    <td style={{ fontSize: "0.8rem" }}>{inv.dueDate ? fmt.date(inv.dueDate) : "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt.inr(inv.totalAmount)}</td>
                    <td><span className={`badge ${INVOICE_STATUS_BADGE[inv.status] || "badge"}`}>{inv.status?.replace(/_/g, " ")}</span></td>
                    <td className="col-actions" style={{ textAlign: "right" }}>
                      <button type="button" className="btn-icon btn-ghost" onClick={() => setViewTarget(inv)} title="View"><Eye size={16} /></button>
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-icon btn-ghost" title="Download PDF"><Download size={16} /></a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > 0 && (
          <div className="table-foot">
            <div>Page {curPage} of {totalPages}</div>
            <div className="pagination">
              <button type="button" onClick={() => updateParams({ page: Math.max(1, curPage - 1) })} disabled={curPage <= 1}><ChevronLeft size={14} /></button>
              <button type="button" onClick={() => updateParams({ page: Math.min(totalPages, curPage + 1) })} disabled={curPage >= totalPages}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {viewTarget && (
        <div className="modal-backdrop" onClick={() => setViewTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="modal-head">
              <h3>Invoice {viewTarget.invoiceNumber}</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setViewTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="row" style={{ gap: 20, marginBottom: 16 }}>
                <div><span className="text-muted text-sm">Status</span><br /><span className={`badge ${INVOICE_STATUS_BADGE[viewTarget.status] || "badge"}`} style={{ marginTop: 4, display: "inline-block" }}>{viewTarget.status?.replace(/_/g, " ")}</span></div>
                <div><span className="text-muted text-sm">Plan</span><br /><span style={{ fontWeight: 600 }}>{viewTarget.planName || "—"}</span></div>
                <div><span className="text-muted text-sm">Billing</span><br /><span>{viewTarget.billingCycle ? formatBillingCycle(viewTarget.billingCycle) : "—"}</span></div>
                <div><span className="text-muted text-sm">Due Date</span><br /><span>{viewTarget.dueDate ? fmt.date(viewTarget.dueDate) : "—"}</span></div>
              </div>
              <div style={{ textAlign: "right", marginBottom: 16 }}>
                <div className="text-muted text-sm">Amount: {fmt.inr(viewTarget.amount)}</div>
                {Number(viewTarget.taxAmount) > 0 && <div className="text-muted text-sm">Tax: +{fmt.inr(viewTarget.taxAmount)}</div>}
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>Total: {fmt.inr(viewTarget.totalAmount)}</div>
              </div>
              {viewTarget.razorpayPaymentId && (
                <div className="text-xs text-muted">Razorpay Payment ID: {viewTarget.razorpayPaymentId}</div>
              )}
            </div>
            <div className="modal-foot">
              {viewTarget.pdfUrl && (
                <a href={viewTarget.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><Download size={14} /> Download PDF</a>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setViewTarget(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ====== PAYMENTS TAB ======
function PaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const pays = await billingService.listPayments(100)
        setPayments(pays || [])
      } catch { toast.error("Failed to load payments") }
      finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lp-text-muted)" }}>Loading payments…</div>
  if (payments.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon"><CreditCard size={28} /></div>
        <h3>No payments yet</h3>
        <p>Payments will appear here once subscription charges are processed through Razorpay.</p>
      </div>
    )
  }

  return (
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
            <th>Payment Date</th>
            <th>Invoice #</th>
            <th style={{ textAlign: "right" }}>Amount</th>
            <th>Method</th>
            <th>Transaction ID</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td style={{ fontWeight: 500 }}>{p.paidAt ? fmt.date(p.paidAt) : fmt.date(p.createdAt)}</td>
              <td>{p.razorpayInvoiceId ? <span className="text-xs" style={{ fontFamily: "monospace" }}>{p.razorpayInvoiceId.slice(-8)}</span> : "—"}</td>
              <td style={{ textAlign: "right", fontWeight: 600 }}>₹{(p.amount / 100).toLocaleString("en-IN")}</td>
              <td style={{ textTransform: "capitalize" }}>{p.method || "—"}</td>
              <td style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)" }}><code>{p.razorpayPaymentId?.slice(-12) || "—"}</code></td>
              <td><span className={`badge ${PAYMENT_STATUS_BADGE[p.status] || "badge-muted"}`}>{p.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ====== USAGE TAB ======
function UsageTab({ plan }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}>Resource Usage</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 24, rowGap: 0 }}>
        <UsageRow label="Users" used={plan?.usage?.users ?? 0} limit={plan?.limits?.users} />
        <UsageRow label="Leads" used={plan?.usage?.leads ?? 0} limit={plan?.limits?.leads} />
        <UsageRow label="Projects" used={plan?.usage?.projects ?? 0} limit={plan?.limits?.projects} />
        <UsageRow label="File storage" used={plan?.usage?.storageBytes ?? 0} limit={plan?.limits?.storageBytes} formatter={formatStorage} />
      </div>
    </div>
  )
}

// ====== MAIN PAGE ======
export default function SubscriptionBilling() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === "OWNER"

  const { plan, loading: planLoading } = usePlan()
  const [config, setConfig] = useState(null)
  const [payments, setPayments] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [confirmModal, setConfirmModal] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [cfg, subs, pays] = await Promise.all([
        billingService.getConfig().catch(() => ({ configured: false })),
        billingService.listSubscriptions().catch(() => []),
        billingService.listPayments(50).catch(() => []),
      ])
      setConfig(cfg)
      setSubscriptions(subs || [])
      setPayments(pays || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const activeSubscription = useMemo(() => {
    const actives = subscriptions.filter((s) => s.status === "ACTIVE")
    return actives.find((s) => s.plan === plan?.plan) || actives[0] || null
  }, [subscriptions, plan?.plan])

  const lastPayment = payments[0] || null
  const totalSpend = useMemo(() =>
    payments.filter((p) => p.status === "captured").reduce((sum, p) => sum + p.amount, 0),
    [payments],
  )

  const handleUpgrade = async (targetPlan) => {
    if (!canManage) { toast.error("Only OWNER can manage billing"); return }
    if (!config?.configured) { toast.error("Razorpay isn't configured on this environment yet."); return }
    setBusy(true)
    try {
      const billingCycle = annual ? "annual" : "monthly"
      const { razorpaySubscriptionId } = await billingService.createSubscription({ plan: targetPlan, billingCycle })
      const planObj = PLANS[targetPlan]
      await openRazorpayCheckout({
        keyId: config.razorpayKeyId,
        subscriptionId: razorpaySubscriptionId,
        description: `${planObj.name} plan · ${billingCycle}`,
        prefill: { name: user?.name || "", email: user?.email || "" },
        onSuccess: async (response) => {
          toast.success("Payment received! Activating your plan…")
          try { await billingService.verifySubscription(response) } catch {}
          clearPlanCache()
          window.location.reload()
        },
        onDismiss: () => { toast.info("Checkout closed") },
      })
    } catch (err) { toast.error(err?.message || "Failed to start checkout") }
    finally { setBusy(false) }
  }

  const handlePlanSelect = async (targetPlan, changeKind) => {
    if (changeKind === "current" && activeSubscription) return
    if (changeKind === "downgrade") {
      setConfirmModal({ kind: "downgrade", targetPlan, targetName: PLANS[targetPlan]?.name || targetPlan })
      return
    }
    await handleUpgrade(targetPlan)
  }

  const handleCancel = (sub) => {
    if (!canManage) return
    setConfirmModal({ kind: "cancel", sub })
  }

  const confirmCancel = async (sub) => {
    setBusy(true)
    try {
      await billingService.cancelSubscription(sub.id)
      toast.success("Subscription cancelled")
      clearPlanCache()
      window.location.reload()
    } catch (err) { toast.error(err?.message || "Failed to cancel") }
    finally { setBusy(false) }
  }

  if (planLoading || loading) {
    return <div className="card"><div className="card-title">Subscription & Billing</div><p className="text-muted text-sm">Loading…</p></div>
  }

  const trial = plan?.trial
  const trialExpired = trial?.expired
  const onTrial = !activeSubscription && trial?.active && !trialExpired
  const currentPlanCode = activeSubscription ? activeSubscription.plan : plan?.plan || null
  const currentPlanObj = currentPlanCode ? PLANS[currentPlanCode] : null
  const trialPlanSelected = !activeSubscription && !!currentPlanObj

  return (
    <>
      <div className="content-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Subscription & Billing</h1>
          <p>Manage your subscription, view invoices, and track payments.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem", opacity: 0.6 }} onClick={async () => {
          try {
            const res = await billingService.seedTestData()
            toast.success(`Test invoice ${res.invoiceNumber} created`)
          } catch { toast.error("Failed to seed test data") }
        }}>Seed test data</button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 14, display: "flex", gap: 0, borderBottom: "1px solid var(--lp-border)" }}>
        {TABS.map((tab) => (
          <button key={tab.key} type="button"
            className={`tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 18px", fontSize: "0.867rem", fontWeight: 500,
              borderBottom: activeTab === tab.key ? "2px solid var(--lp-accent)" : "2px solid transparent",
              color: activeTab === tab.key ? "var(--lp-accent)" : "var(--lp-text-muted)",
              background: "transparent", cursor: "pointer", transition: "all .15s",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === "overview" && (
        <>
          {!config?.configured && (
            <div className="card" style={{ borderColor: "var(--lp-warning, #f59e0b)", background: "rgba(245,158,11,0.08)", marginBottom: 14 }}>
              <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                <AlertTriangle size={16} style={{ color: "var(--lp-warning, #f59e0b)", marginTop: 2 }} />
                <div style={{ fontSize: "0.867rem", lineHeight: 1.5 }}>
                  <b>Razorpay isn't configured yet.</b> Upgrade actions are disabled until <code>RAZORPAY_KEY_ID</code> + <code>RAZORPAY_KEY_SECRET</code> are set on the server.
                </div>
              </div>
            </div>
          )}

          {/* Current plan card */}
          <div className="card" style={{
            marginBottom: 14,
            background: onTrial ? "linear-gradient(135deg, rgba(139,92,246,0.10), transparent 60%)"
              : activeSubscription ? "linear-gradient(135deg, rgba(16,185,129,0.06), transparent 60%)"
              : "linear-gradient(135deg, rgba(245,158,11,0.08), transparent 60%)",
            borderColor: activeSubscription ? "var(--lp-accent)" : onTrial ? "rgba(139,92,246,0.5)" : "var(--lp-warning, #f59e0b)",
          }}>
            <div className="row row-between" style={{ alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px", minWidth: 240 }}>
                <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {activeSubscription ? "Current plan" : "Account status"}
                  </div>
                  <PlanStatusBadge trial={trial} hasActiveSub={!!activeSubscription} />
                </div>
                {activeSubscription ? (
                  <>
                    <div style={{ fontSize: "2.133rem", fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>{currentPlanObj?.name || activeSubscription.plan}</div>
                    <p className="text-muted" style={{ marginTop: 6, marginBottom: 0, fontSize: "0.9rem" }}>{currentPlanObj?.tagline}</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "2.133rem", fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>{currentPlanObj?.name || "Free Trial"}</div>
                    <p className="text-muted" style={{ marginTop: 6, marginBottom: 0, fontSize: "0.9rem" }}>
                      {trialExpired ? (currentPlanObj ? `Your free trial of the ${currentPlanObj.name} plan has ended. Subscribe to restore access.` : "Your trial has ended. Choose a plan below.") : currentPlanObj ? `You're trialing the ${currentPlanObj.name} plan.` : "Choose a plan below to start your free trial."}
                    </p>
                    {!trialExpired && trial?.endsAt && (
                      <div className="row" style={{ gap: 8, marginTop: 14, alignItems: "center", fontSize: "0.867rem", color: trial.daysLeft <= 2 ? "var(--lp-warning, #f59e0b)" : "var(--lp-text)" }}>
                        <Clock size={14} /> Trial ends <b>{fmt.date(trial.endsAt)}</b> <span className="text-muted">({trial.daysLeft}d remaining)</span>
                      </div>
                    )}
                    {trialExpired && <div className="row" style={{ gap: 8, marginTop: 14, alignItems: "center", fontSize: "0.867rem", color: "var(--lp-error)", fontWeight: 600 }}><AlertTriangle size={14} /> Trial expired — pick a plan to restore access.</div>}
                  </>
                )}
              </div>
              <div style={{ textAlign: "right", flex: "0 1 240px" }}>
                {activeSubscription ? (
                  <>
                    <div style={{ fontSize: "1.867rem", fontWeight: 700, letterSpacing: -0.5 }}>₹{(activeSubscription.amount / 100).toLocaleString("en-IN")}<span style={{ fontSize: "0.933rem", fontWeight: 500, color: "var(--lp-text-muted)" }}>/mo</span></div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>{formatBillingCycle(activeSubscription.billingCycle)} billing</div>
                    {activeSubscription.currentPeriodEnd && <div className="text-xs text-muted" style={{ marginTop: 6, display: "flex", justifyContent: "flex-end", gap: 4, alignItems: "center" }}><ArrowRight size={12} /> Renews {fmt.date(activeSubscription.currentPeriodEnd)}</div>}
                    {canManage && <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => handleCancel(activeSubscription)} style={{ marginTop: 14 }}>Cancel subscription</button>}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "1.867rem", fontWeight: 700, letterSpacing: -0.5 }}>{currentPlanObj && trialExpired ? `${inr(currentPlanObj.price.monthly)}` : "₹0"}{currentPlanObj && trialExpired && <span style={{ fontSize: "0.933rem", fontWeight: 500, color: "var(--lp-text-muted)" }}>/mo</span>}</div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>{currentPlanObj && trialExpired ? "Subscribe to restore access" : <>while on trial{currentPlanObj && <> · then {inr(currentPlanObj.price.monthly)}/mo</>}</>}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
            <MiniStatCard icon={<IndianRupee size={16} />} tone="green" label="Total spent" value={`₹${(totalSpend / 100).toLocaleString("en-IN")}`} sub={`${payments.filter((p) => p.status === "captured").length} successful payment${payments.filter((p) => p.status === "captured").length === 1 ? "" : "s"}`} />
            <MiniStatCard icon={<Receipt size={16} />} tone="blue" label="Last payment" value={lastPayment ? `₹${(lastPayment.amount / 100).toLocaleString("en-IN")}` : "—"} sub={lastPayment?.paidAt ? fmt.date(lastPayment.paidAt) : "No payments yet"} />
            <MiniStatCard icon={<Mail size={16} />} tone="purple" label="Billing email" value={user?.email || "—"} valueSize="0.933rem" sub="Invoices sent here" />
            <MiniStatCard icon={<CreditCard size={16} />} tone="amber" label="Payment method" value={activeSubscription ? "Saved with Razorpay" : "Not added"} valueSize="0.933rem" sub="Card · UPI · Netbanking" />
          </div>

          {/* Plan comparison */}
          <div className="card" style={{ marginBottom: 14 }} id="compare-plans">
            <div className="row row-between" style={{ alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="card-title" style={{ marginBottom: 2 }}>{currentPlanObj ? "Change plan" : "Choose a plan"}</div>
                <p className="text-xs text-muted" style={{ margin: 0 }}>Switch any time. Annual billing saves 20%.</p>
              </div>
              <div className="billing-toggle">
                <button className={!annual ? "active" : ""} type="button" onClick={() => setAnnual(false)}>Monthly</button>
                <button className={annual ? "active" : ""} type="button" onClick={() => setAnnual(true)}>Annual <span style={{ opacity: 0.7, marginLeft: 4 }}>−20%</span></button>
              </div>
            </div>
            <div className="pricing-grid" style={{ marginTop: 4 }}>
              {PLAN_CODES.map((code) => {
                const p = PLANS[code]
                let changeKind
                if (currentPlanCode) { changeKind = planChangeKind(currentPlanCode, code) } else { changeKind = "choose" }
                return <PlanCard key={code} plan={p} annual={annual} changeKind={changeKind} busy={busy} canUpgrade={canManage && config?.configured} onSelect={() => handlePlanSelect(code, changeKind)} unpaidCurrent={trialPlanSelected} />
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 22, marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--lp-border)", color: "var(--lp-text-muted)", fontSize: "0.8rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ShieldCheck size={14} /> Razorpay secured</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={14} /> Cancel anytime</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={14} /> GST invoice on every charge</span>
            </div>
          </div>
        </>
      )}

      {/* ===== INVOICES TAB ===== */}
      {activeTab === "invoices" && <InvoicesTab />}

      {/* ===== PAYMENTS TAB ===== */}
      {activeTab === "payments" && <PaymentsTab />}

      {/* ===== USAGE TAB ===== */}
      {activeTab === "usage" && <UsageTab plan={plan} />}

      {confirmModal && (
        <ConfirmPlanChangeModal
          state={confirmModal}
          busy={busy}
          currentPlanName={plan?.planName || currentPlanObj?.name || activeSubscription?.plan}
          onClose={() => !busy && setConfirmModal(null)}
          onConfirm={async () => {
            if (confirmModal.kind === "downgrade") { const t = confirmModal.targetPlan; setConfirmModal(null); await handleUpgrade(t) }
            else if (confirmModal.kind === "cancel") { const s = confirmModal.sub; setConfirmModal(null); await confirmCancel(s) }
          }}
        />
      )}
    </>
  )
}

function ConfirmPlanChangeModal({ state, busy, currentPlanName, onClose, onConfirm }) {
  const isCancel = state.kind === "cancel"
  const Icon = isCancel ? XCircle : ArrowDownCircle
  const title = isCancel ? "Cancel subscription?" : `Downgrade to ${state.targetName}?`
  const accent = isCancel ? "var(--lp-error)" : "var(--lp-warning, #f59e0b)"
  const accentBg = isCancel ? "rgba(220,38,38,0.12)" : "rgba(245,158,11,0.12)"
  const ctaLabel = isCancel ? "Cancel subscription" : `Downgrade to ${state.targetName}`
  const ctaClass = isCancel ? "btn btn-danger" : "btn btn-primary"

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div className="row" style={{ gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: accentBg, color: accent, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon size={18} /></div>
            <h3 style={{ margin: 0 }}>{title}</h3>
          </div>
          <button type="button" className="btn-icon btn-ghost" onClick={onClose} aria-label="Close" disabled={busy}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isCancel ? (
            <>
              <p style={{ margin: 0 }}>Your <strong>{currentPlanName || state.sub?.plan}</strong> subscription will be cancelled immediately and you'll drop back to <strong>Basic</strong>.</p>
              <ul className="text-sm text-muted" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                <li>You'll lose access to integrations, custom stages, and lead aging.</li>
                <li>Basic plan limits will apply right away ({PLANS.BASIC.limits.users} users · {PLANS.BASIC.limits.leads.toLocaleString("en-IN")} leads · {PLANS.BASIC.limits.projects} projects · {formatStorage(PLANS.BASIC.limits.storageBytes)}).</li>
                <li>No refund for the remaining days of the current cycle.</li>
              </ul>
            </>
          ) : (
            <>
              <p style={{ margin: 0 }}>You're moving from <strong>{currentPlanName}</strong> to <strong>{state.targetName}</strong>.</p>
              <ul className="text-sm text-muted" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                <li>You'll be charged for the new plan and the current one will be cancelled.</li>
                <li>Lower-tier limits apply immediately after activation.</li>
                <li>Data above the new plan's limits stays accessible but read-only until you upgrade again.</li>
              </ul>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Keep current plan</button>
          <button type="button" className={ctaClass} onClick={onConfirm} disabled={busy}>{busy ? "Working…" : ctaLabel}</button>
        </div>
      </div>
    </div>
  )
}
