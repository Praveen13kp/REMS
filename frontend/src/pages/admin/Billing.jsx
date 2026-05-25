import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  IndianRupee,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"

import { useAuthStore } from "@/stores/authStore"
import { billingService } from "@/services/billingService"
import { clearPlanCache, usePlan } from "@/hooks/usePlan"
import { openRazorpayCheckout } from "@/lib/razorpayCheckout"
import { PLANS, PLAN_CODES, formatStorage } from "@/lib/planLimits"
import { fmt } from "@/lib/format"

// ----- helpers -----------------------------------------------------------

function inr(amount) {
  if (amount == null) return "—"
  return "₹" + Number(amount).toLocaleString("en-IN")
}

function pct(used, limit) {
  if (limit == null) return 0
  if (limit === 0) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}

function formatBillingCycle(cycle) {
  return cycle === "annual" ? "Annual" : "Monthly"
}

// ----- atom components ---------------------------------------------------

function PlanStatusBadge({ planCode, trial, hasActiveSub }) {
  // Trial-state takes precedence on every plan now — none of them are
  // permanently free anymore. Once they have a paid sub the badge below
  // flips to "Active" via the hasActiveSub branch.
  if (trial && !hasActiveSub) {
    if (trial.expired) {
      return <span className="badge badge-error">Trial expired</span>
    }
    return (
      <span className="badge badge-info">
        Trial · {trial.daysLeft}d left
      </span>
    )
  }
  return (
    <span className="badge badge-success">{hasActiveSub ? "Active" : planCode}</span>
  )
}

function UsageRow({ label, used, limit, formatter }) {
  const display = (v) => (formatter ? formatter(v) : Number(v).toLocaleString("en-IN"))
  const value =
    limit == null
      ? `${display(used)} · Unlimited`
      : `${display(used)} / ${display(limit)}`
  const p = pct(used, limit)
  const tone =
    p >= 90
      ? "var(--lp-error)"
      : p >= 75
        ? "var(--lp-warning, #f59e0b)"
        : "var(--lp-accent)"
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        className="row row-between"
        style={{ fontSize: "0.867rem", marginBottom: 6 }}
      >
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span className="text-muted" style={{ fontSize: "0.8rem" }}>
          {value}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "var(--lp-surface-2, rgba(255,255,255,0.06))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${limit == null ? 100 : p}%`,
            height: "100%",
            background: limit == null
              ? "linear-gradient(90deg, var(--lp-accent), #06b6d4)"
              : tone,
            transition: "width .25s ease",
          }}
        />
      </div>
    </div>
  )
}

// Plan comparison card. Each plan in PLAN_CODES gets one card; the current
// plan shows "Current plan" instead of an upgrade button.
function PlanCard({
  plan,
  annual,
  isCurrent,
  isPaid,
  busy,
  canUpgrade,
  onUpgrade,
}) {
  const price = annual ? plan.price.annual : plan.price.monthly
  return (
    <div
      className={`price-card ${plan.featured ? "featured" : ""}`}
      style={{
        position: "relative",
        ...(isCurrent
          ? {
              borderColor: "var(--lp-accent)",
              boxShadow: "0 0 0 1px var(--lp-accent)",
            }
          : {}),
      }}
    >
      {isCurrent && (
        <span
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            padding: "3px 10px",
            borderRadius: 999,
            background: "var(--lp-accent)",
            color: "#fff",
            fontSize: "0.733rem",
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          CURRENT PLAN
        </span>
      )}
      <div className="price-name" style={isCurrent ? { marginTop: 18 } : {}}>
        {plan.name}
      </div>
      <div className="price-amount">
        {price === 0 ? "Free" : inr(annual ? price * 12 : price)}
        <span>{price ? (annual ? "/yr" : "/mo") : ""}</span>
      </div>
      {annual && price > 0 && (
        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
          {inr(price)}/mo equivalent · charged once a year
        </div>
      )}
      <p className="text-muted text-sm mt-2">{plan.tagline}</p>
      <ul className="price-feats">
        {plan.bullets.map((f) => (
          <li key={f}>
            <Check size={16} /> {f}
          </li>
        ))}
      </ul>
      {isCurrent ? (
        <button
          type="button"
          className="btn btn-ghost"
          disabled
          style={{ width: "100%", justifyContent: "center" }}
        >
          <CheckCircle2 size={14} /> Current plan
        </button>
      ) : isPaid ? (
        <button
          type="button"
          className={`btn ${plan.featured ? "btn-primary" : "btn-secondary"}`}
          style={{ width: "100%", justifyContent: "center" }}
          disabled={busy || !canUpgrade}
          onClick={onUpgrade}
        >
          <Zap size={14} />
          {busy ? "Loading…" : `Upgrade to ${plan.name}`}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          disabled
          style={{ width: "100%", justifyContent: "center" }}
        >
          Free forever
        </button>
      )}
    </div>
  )
}

// ----- main page ---------------------------------------------------------

export default function Billing() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN"

  const { plan, loading: planLoading } = usePlan()
  const [config, setConfig] = useState(null)
  const [payments, setPayments] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [annual, setAnnual] = useState(false)

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const activeSubscription = useMemo(
    () => subscriptions.find((s) => s.status === "ACTIVE"),
    [subscriptions],
  )

  const lastPayment = payments[0] || null
  const totalSpend = useMemo(
    () =>
      payments
        .filter((p) => p.status === "captured")
        .reduce((sum, p) => sum + p.amount, 0),
    [payments],
  )

  const handleUpgrade = async (targetPlan) => {
    if (!canManage) {
      toast.error("Only OWNER or ADMIN can manage billing")
      return
    }
    if (!config?.configured) {
      toast.error("Razorpay isn't configured on this environment yet.")
      return
    }
    setBusy(true)
    try {
      const billingCycle = annual ? "annual" : "monthly"
      const { razorpaySubscriptionId } = await billingService.createSubscription({
        plan: targetPlan,
        billingCycle,
      })
      const planObj = PLANS[targetPlan]
      await openRazorpayCheckout({
        keyId: config.razorpayKeyId,
        subscriptionId: razorpaySubscriptionId,
        description: `${planObj.name} plan · ${billingCycle}`,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        onSuccess: () => {
          toast.success("Payment received! Activating your plan…")
          setTimeout(() => {
            clearPlanCache()
            window.location.reload()
          }, 2500)
        },
        onDismiss: () => {
          toast.info("Checkout closed")
        },
      })
    } catch (err) {
      toast.error(err?.message || "Failed to start checkout")
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async (sub) => {
    if (!canManage) return
    if (
      !window.confirm(
        `Cancel your ${sub.plan} subscription? You'll drop back to Basic immediately and lose access to integrations, custom stages, and lead aging.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await billingService.cancelSubscription(sub.id)
      toast.success("Subscription cancelled")
      clearPlanCache()
      window.location.reload()
    } catch (err) {
      toast.error(err?.message || "Failed to cancel")
    } finally {
      setBusy(false)
    }
  }

  if (planLoading || loading) {
    return (
      <div className="card">
        <div className="card-title">Billing</div>
        <p className="text-muted text-sm">Loading…</p>
      </div>
    )
  }

  const currentPlanObj = plan ? PLANS[plan.plan] : PLANS.BASIC
  const trial = plan?.trial
  const trialExpired = trial?.expired

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Billing & plans</h1>
          <p>
            Manage your subscription, view invoices, and upgrade when your
            team is ready for more.
          </p>
        </div>
      </div>

      {!config?.configured && (
        <div
          className="card"
          style={{
            borderColor: "var(--lp-warning, #f59e0b)",
            background: "rgba(245,158,11,0.08)",
            marginBottom: 14,
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle
              size={16}
              style={{ color: "var(--lp-warning, #f59e0b)", marginTop: 2 }}
            />
            <div style={{ fontSize: "0.867rem", lineHeight: 1.5 }}>
              <b>Razorpay isn&apos;t configured yet.</b> Upgrade actions are
              disabled until <code>RAZORPAY_KEY_ID</code> +{" "}
              <code>RAZORPAY_KEY_SECRET</code> are set on the server, plus the
              per-plan IDs from your Razorpay dashboard. You can still view
              your plan, usage, and invoices below.
            </div>
          </div>
        </div>
      )}

      {/* ===== HERO: current plan card ====================================== */}
      <div
        className="card"
        style={{
          marginBottom: 14,
          background:
            plan?.plan === "BASIC"
              ? "linear-gradient(135deg, rgba(139,92,246,0.06), transparent 60%)"
              : "linear-gradient(135deg, rgba(16,185,129,0.06), transparent 60%)",
          borderColor: plan?.plan === "BASIC" ? "var(--lp-border)" : "var(--lp-accent)",
        }}
      >
        <div className="row row-between" style={{ alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          {/* Left: plan name + status + tagline */}
          <div style={{ flex: "1 1 280px", minWidth: 240 }}>
            <div
              className="row"
              style={{ alignItems: "center", gap: 10, marginBottom: 6 }}
            >
              <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
                Current plan
              </div>
              <PlanStatusBadge
                planCode={plan?.plan}
                trial={trial}
                hasActiveSub={!!activeSubscription}
              />
            </div>
            <div
              style={{
                fontSize: "2.133rem",
                fontWeight: 700,
                letterSpacing: -0.5,
                lineHeight: 1.1,
              }}
            >
              {currentPlanObj.name}
            </div>
            <p
              className="text-muted"
              style={{ marginTop: 6, marginBottom: 0, fontSize: "0.9rem" }}
            >
              {currentPlanObj.tagline}
            </p>

            {plan?.plan === "BASIC" && trial?.endsAt && !trialExpired && (
              <div
                className="row"
                style={{
                  gap: 8,
                  marginTop: 14,
                  alignItems: "center",
                  fontSize: "0.867rem",
                  color: trial.daysLeft <= 2 ? "var(--lp-warning, #f59e0b)" : "var(--lp-text)",
                }}
              >
                <Clock size={14} />
                Trial ends <b>{fmt.date(trial.endsAt)}</b>{" "}
                <span className="text-muted">
                  ({trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} left)
                </span>
              </div>
            )}
            {trialExpired && (
              <div
                className="row"
                style={{
                  gap: 8,
                  marginTop: 14,
                  alignItems: "center",
                  fontSize: "0.867rem",
                  color: "var(--lp-error)",
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={14} />
                Your trial has ended. Upgrade to restore access.
              </div>
            )}
          </div>

          {/* Right: price + next renewal + actions */}
          <div style={{ textAlign: "right", flex: "0 1 240px" }}>
            {activeSubscription ? (
              <>
                <div
                  style={{
                    fontSize: "1.867rem",
                    fontWeight: 700,
                    letterSpacing: -0.5,
                  }}
                >
                  ₹{(activeSubscription.amount / 100).toLocaleString("en-IN")}
                  <span
                    style={{ fontSize: "0.933rem", fontWeight: 500, color: "var(--lp-text-muted)" }}
                  >
                    /mo
                  </span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  {formatBillingCycle(activeSubscription.billingCycle)} billing
                </div>
                {activeSubscription.currentPeriodEnd && (
                  <div
                    className="text-xs text-muted"
                    style={{ marginTop: 6, display: "flex", justifyContent: "flex-end", gap: 4, alignItems: "center" }}
                  >
                    <ArrowRight size={12} />
                    Renews {fmt.date(activeSubscription.currentPeriodEnd)}
                  </div>
                )}
                {canManage && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => handleCancel(activeSubscription)}
                    style={{ marginTop: 14 }}
                  >
                    Cancel subscription
                  </button>
                )}
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: "1.867rem",
                    fontWeight: 700,
                    letterSpacing: -0.5,
                  }}
                >
                  Free
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  during your trial
                </div>
                {canManage && config?.configured && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => {
                      document
                        .getElementById("compare-plans")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                    style={{ marginTop: 14 }}
                  >
                    <Sparkles size={14} /> Upgrade now
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Usage gauges */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid var(--lp-border)",
          }}
        >
          <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
            This billing period · usage
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              columnGap: 24,
              rowGap: 0,
            }}
          >
            <UsageRow label="Users" used={plan?.usage?.users ?? 0} limit={plan?.limits?.users} />
            <UsageRow label="Leads" used={plan?.usage?.leads ?? 0} limit={plan?.limits?.leads} />
            <UsageRow label="Projects" used={plan?.usage?.projects ?? 0} limit={plan?.limits?.projects} />
            <UsageRow
              label="File storage"
              used={plan?.usage?.storageBytes ?? 0}
              limit={plan?.limits?.storageBytes}
              formatter={formatStorage}
            />
          </div>
        </div>
      </div>

      {/* ===== MINI-STATS row ============================================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div className="card">
          <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
            Total spent
          </div>
          <div style={{ fontSize: "1.467rem", fontWeight: 700, marginTop: 4 }}>
            <IndianRupee size={16} style={{ verticalAlign: "middle" }} />
            {(totalSpend / 100).toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            {payments.filter((p) => p.status === "captured").length} successful payments
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
            Last payment
          </div>
          <div style={{ fontSize: "1.467rem", fontWeight: 700, marginTop: 4 }}>
            {lastPayment ? (
              <>
                <IndianRupee size={16} style={{ verticalAlign: "middle" }} />
                {(lastPayment.amount / 100).toLocaleString("en-IN")}
              </>
            ) : (
              "—"
            )}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            {lastPayment?.paidAt
              ? fmt.date(lastPayment.paidAt)
              : "No payments yet"}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
            Billing email
          </div>
          <div
            style={{
              fontSize: "0.933rem",
              fontWeight: 600,
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.email || "—"}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            Invoices sent here
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
            Payment method
          </div>
          <div style={{ fontSize: "0.933rem", fontWeight: 600, marginTop: 4 }}>
            {activeSubscription ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <CreditCard size={14} /> Saved with Razorpay
              </span>
            ) : (
              "—"
            )}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            Card / UPI / Netbanking
          </div>
        </div>
      </div>

      {/* ===== COMPARE PLANS =============================================== */}
      <div className="card" style={{ marginBottom: 14 }} id="compare-plans">
        <div
          className="row row-between"
          style={{ alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}
        >
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>
              {activeSubscription ? "Change plan" : "Choose a plan"}
            </div>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              Switch any time. Annual billing saves 20%. All plans include
              unlimited contacts and the full Kanban board.
            </p>
          </div>
          <div className="billing-toggle">
            <button
              className={!annual ? "active" : ""}
              type="button"
              onClick={() => setAnnual(false)}
            >
              Monthly
            </button>
            <button
              className={annual ? "active" : ""}
              type="button"
              onClick={() => setAnnual(true)}
            >
              Annual{" "}
              <span style={{ opacity: 0.7, marginLeft: 4 }}>−20%</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid" style={{ marginTop: 4 }}>
          {PLAN_CODES.map((code) => {
            const p = PLANS[code]
            return (
              <PlanCard
                key={code}
                plan={p}
                annual={annual}
                isCurrent={plan?.plan === code}
                isPaid={true}
                busy={busy}
                canUpgrade={canManage && config?.configured}
                onUpgrade={() => handleUpgrade(code)}
              />
            )
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 22,
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid var(--lp-border)",
            color: "var(--lp-text-muted)",
            fontSize: "0.8rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={14} /> Razorpay secured · India-compliant
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> Cancel anytime
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> GST invoice on every charge
          </span>
        </div>
      </div>

      {/* ===== PAYMENT HISTORY ============================================ */}
      <div className="card">
        <div
          className="row row-between"
          style={{ alignItems: "center", marginBottom: 12 }}
        >
          <div className="card-title" style={{ marginBottom: 0 }}>
            <Receipt size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Invoices & payments
          </div>
          {payments.length > 0 && (
            <span className="text-xs text-muted">{payments.length} record{payments.length === 1 ? "" : "s"}</span>
          )}
        </div>
        {payments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              border: "1px dashed var(--lp-border)",
              borderRadius: 8,
              background: "var(--lp-surface-2, rgba(255,255,255,0.02))",
            }}
          >
            <Receipt
              size={28}
              style={{ color: "var(--lp-text-muted)", marginBottom: 10, opacity: 0.5 }}
            />
            <div style={{ fontWeight: 600, fontSize: "0.933rem", marginBottom: 4 }}>
              No invoices yet
            </div>
            <p
              className="text-muted text-sm"
              style={{ margin: 0, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}
            >
              Once you upgrade to a paid plan, every Razorpay charge will
              appear here with a downloadable GST invoice.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Method</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {p.paidAt ? fmt.date(p.paidAt) : fmt.date(p.createdAt)}
                      </div>
                      <div className="text-xs text-muted">
                        {fmt.ago ? fmt.ago(p.paidAt || p.createdAt) : ""}
                      </div>
                    </td>
                    <td>{p.description || "Subscription charge"}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {p.method ? (
                        <span
                          className="row"
                          style={{ gap: 6, alignItems: "center" }}
                        >
                          <CreditCard size={12} />
                          {p.method}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      ₹{(p.amount / 100).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          p.status === "captured"
                            ? "badge-success"
                            : p.status === "failed"
                              ? "badge-error"
                              : "badge-muted"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.razorpayInvoiceId ? (
                        <a
                          href={`https://api.razorpay.com/v1/invoices/${p.razorpayInvoiceId}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--lp-accent)" }}
                          title="Open Razorpay invoice PDF"
                        >
                          <Download size={12} /> Invoice
                        </a>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
