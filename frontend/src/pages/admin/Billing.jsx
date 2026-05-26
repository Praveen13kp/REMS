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
  Mail,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"

import { useAuthStore } from "@/stores/authStore"
import { billingService } from "@/services/billingService"
import { clearPlanCache, usePlan } from "@/hooks/usePlan"
import { openRazorpayCheckout } from "@/lib/razorpayCheckout"
import {
  PLANS,
  PLAN_CODES,
  formatStorage,
  planChangeKind,
} from "@/lib/planLimits"
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

// Human-friendly percent for the row caption. Avoids the misleading "0% used"
// when there's real-but-tiny usage (e.g. 27 / 25,000 → 0.108% → "<1%").
function pctLabel(used, limit) {
  if (limit == null) return "Unlimited"
  if (limit === 0) return "100%"
  if (used === 0) return "0%"
  const raw = (used / limit) * 100
  if (raw < 1) return "<1%"
  if (raw < 10) return `${raw.toFixed(1)}%`
  return `${Math.round(raw)}%`
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
            width: 32,
            height: 32,
            borderRadius: 8,
            background: c.bg,
            color: c.fg,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span
          className="text-xs text-muted"
          style={{ textTransform: "uppercase", letterSpacing: 0.6 }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: valueSize,
          fontWeight: 700,
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      <div className="text-xs text-muted" style={{ marginTop: 4 }}>
        {sub}
      </div>
    </div>
  )
}

// ----- atom components ---------------------------------------------------

function PlanStatusBadge({ trial, hasActiveSub }) {
  // While on trial, no plan is "active" — the badge just communicates the
  // trial state. Once subscribed, we show "Active" beside the plan name.
  if (trial && !hasActiveSub) {
    if (trial.expired) {
      return <span className="badge badge-error">Trial expired</span>
    }
    return <span className="badge badge-info">Free Trial · {trial.daysLeft}d left</span>
  }
  return <span className="badge badge-success">Active</span>
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
  // Show at least a 4% sliver when there's any usage, so "27 / 25,000" is
  // still visible. Empty (used = 0) stays empty.
  const visualWidth =
    limit == null ? 100 : used > 0 && p < 4 ? 4 : p
  return (
    <div style={{ marginBottom: 18, minWidth: 0 }}>
      <div
        className="row row-between"
        style={{ fontSize: "0.867rem", marginBottom: 8, gap: 8 }}
      >
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span
          className="text-muted"
          style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(148,163,184,0.18)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${visualWidth}%`,
            height: "100%",
            background:
              limit == null
                ? "linear-gradient(90deg, var(--lp-accent), #06b6d4)"
                : `linear-gradient(90deg, ${tone}, ${tone})`,
            boxShadow: used > 0 ? `0 0 8px ${tone}55` : "none",
            transition: "width .3s ease",
            borderRadius: 999,
          }}
        />
      </div>
      {limit != null && (
        <div
          className="text-xs text-muted"
          style={{ marginTop: 4, fontSize: "0.7rem" }}
        >
          {pctLabel(used, limit)} used
        </div>
      )}
    </div>
  )
}

// Plan comparison card. The CTA shape depends on the user's *current* plan:
//   - trial user (no active sub) → every card shows "Choose Plan"
//   - same plan as active sub    → "Current plan" (disabled)
//   - higher rank than current   → "Upgrade"
//   - lower rank than current    → "Downgrade"
function PlanCard({
  plan,
  annual,
  changeKind,
  busy,
  canUpgrade,
  onSelect,
}) {
  const price = annual ? plan.price.annual : plan.price.monthly
  const isCurrent = changeKind === "current"
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
        {inr(annual ? price * 12 : price)}
        <span>{annual ? "/yr" : "/mo"}</span>
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
      <PlanCardCta
        changeKind={changeKind}
        plan={plan}
        busy={busy}
        canUpgrade={canUpgrade}
        onSelect={onSelect}
      />
    </div>
  )
}

function PlanCardCta({ changeKind, plan, busy, canUpgrade, onSelect }) {
  if (changeKind === "current") {
    return (
      <button
        type="button"
        className="btn btn-ghost"
        disabled
        style={{ width: "100%", justifyContent: "center" }}
      >
        <CheckCircle2 size={14} /> Current plan
      </button>
    )
  }
  const baseClass = "btn"
  // Choose / Upgrade are primary CTAs; downgrade is intentionally muted so
  // users don't accidentally drop their plan with one wrong click.
  const variant =
    changeKind === "downgrade"
      ? "btn-ghost"
      : plan.featured
        ? "btn-primary"
        : "btn-secondary"
  const label =
    changeKind === "choose"
      ? "Choose Plan"
      : changeKind === "upgrade"
        ? `Upgrade to ${plan.name}`
        : `Downgrade to ${plan.name}`
  const Icon = changeKind === "downgrade" ? ArrowRight : Zap
  return (
    <button
      type="button"
      className={`${baseClass} ${variant}`}
      style={{ width: "100%", justifyContent: "center" }}
      disabled={busy || !canUpgrade}
      onClick={onSelect}
    >
      <Icon size={14} />
      {busy ? "Loading…" : label}
    </button>
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
        onSuccess: async (response) => {
          toast.success("Payment received! Activating your plan…")
          try {
            // Verify locally so the trial pill / banner clear right away
            // without waiting on the Razorpay webhook (which can't reach
            // localhost). On production the webhook re-asserts the same
            // state idempotently.
            await billingService.verifySubscription(response)
          } catch {
            // Even if verify fails (e.g. signature mismatch), the webhook
            // will eventually flip the row. Reload anyway so the user sees
            // the freshest state on screen.
          }
          clearPlanCache()
          window.location.reload()
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

  // Single entry point for every plan-card CTA. Adds an extra confirm step
  // on downgrade so a user on Enterprise can't silently slip down to Basic
  // and lose limits/features mid-cycle.
  const handlePlanSelect = async (targetPlan, changeKind) => {
    if (changeKind === "current") return
    if (changeKind === "downgrade") {
      const target = PLANS[targetPlan]?.name || targetPlan
      const ok = window.confirm(
        `Downgrade to ${target}? You'll be charged for the new plan and your current plan will be cancelled. Lower-tier limits will apply immediately after activation.`,
      )
      if (!ok) return
    }
    await handleUpgrade(targetPlan)
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

  // "Current plan" only exists when the tenant actually has an ACTIVE
  // Razorpay subscription. During trial we treat the company as plan-less —
  // they get full feature access without any plan being highlighted.
  const trial = plan?.trial
  const trialExpired = trial?.expired
  const onTrial = !activeSubscription && trial?.active && !trialExpired
  const currentPlanCode = activeSubscription ? activeSubscription.plan : null
  const currentPlanObj = currentPlanCode ? PLANS[currentPlanCode] : null

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

      {/* ===== HERO: current plan / trial card ============================== */}
      <div
        className="card"
        style={{
          marginBottom: 14,
          background: onTrial
            ? "linear-gradient(135deg, rgba(139,92,246,0.10), transparent 60%)"
            : activeSubscription
              ? "linear-gradient(135deg, rgba(16,185,129,0.06), transparent 60%)"
              : "linear-gradient(135deg, rgba(245,158,11,0.08), transparent 60%)",
          borderColor: activeSubscription
            ? "var(--lp-accent)"
            : onTrial
              ? "rgba(139,92,246,0.5)"
              : "var(--lp-warning, #f59e0b)",
        }}
      >
        <div
          className="row row-between"
          style={{ alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}
        >
          {/* Left: status + plan-or-trial heading */}
          <div style={{ flex: "1 1 280px", minWidth: 240 }}>
            <div
              className="row"
              style={{ alignItems: "center", gap: 10, marginBottom: 6 }}
            >
              <div
                className="text-xs text-muted"
                style={{ textTransform: "uppercase", letterSpacing: 0.6 }}
              >
                {activeSubscription ? "Current plan" : "Account status"}
              </div>
              <PlanStatusBadge trial={trial} hasActiveSub={!!activeSubscription} />
            </div>

            {activeSubscription ? (
              <>
                <div
                  style={{
                    fontSize: "2.133rem",
                    fontWeight: 700,
                    letterSpacing: -0.5,
                    lineHeight: 1.1,
                  }}
                >
                  {currentPlanObj?.name || activeSubscription.plan}
                </div>
                <p
                  className="text-muted"
                  style={{ marginTop: 6, marginBottom: 0, fontSize: "0.9rem" }}
                >
                  {currentPlanObj?.tagline}
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: "2.133rem",
                    fontWeight: 700,
                    letterSpacing: -0.5,
                    lineHeight: 1.1,
                  }}
                >
                  Free Trial
                </div>
                <p
                  className="text-muted"
                  style={{ marginTop: 6, marginBottom: 0, fontSize: "0.9rem" }}
                >
                  {trialExpired
                    ? "Your trial has ended. Choose a plan below to keep going."
                    : "Full access to every feature while your trial is active."}
                </p>
                {!trialExpired && trial?.endsAt && (
                  <div
                    className="row"
                    style={{
                      gap: 8,
                      marginTop: 14,
                      alignItems: "center",
                      fontSize: "0.867rem",
                      color:
                        trial.daysLeft <= 2
                          ? "var(--lp-warning, #f59e0b)"
                          : "var(--lp-text)",
                    }}
                  >
                    <Clock size={14} />
                    Trial ends <b>{fmt.date(trial.endsAt)}</b>{" "}
                    <span className="text-muted">
                      ({trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} remaining)
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
                    Trial expired — pick a plan to restore access.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: price + renewal OR Choose-a-Plan CTA */}
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
                    style={{
                      fontSize: "0.933rem",
                      fontWeight: 500,
                      color: "var(--lp-text-muted)",
                    }}
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
                    style={{
                      marginTop: 6,
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 4,
                      alignItems: "center",
                    }}
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
                  ₹0
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  while on trial
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
                    <Sparkles size={14} /> Choose a plan
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Usage gauges — only meaningful once the tenant is on a paid plan.
            On trial every cap is lifted, so showing "27 / 25,000" is both
            inaccurate and pushes the user toward a plan they haven't chosen
            yet. We show a softer "everything unlocked" block instead. */}
        {activeSubscription ? (
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid var(--lp-border)",
            }}
          >
            <div
              className="text-xs text-muted"
              style={{
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 12,
              }}
            >
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
              <UsageRow
                label="Users"
                used={plan?.usage?.users ?? 0}
                limit={plan?.limits?.users}
              />
              <UsageRow
                label="Leads"
                used={plan?.usage?.leads ?? 0}
                limit={plan?.limits?.leads}
              />
              <UsageRow
                label="Projects"
                used={plan?.usage?.projects ?? 0}
                limit={plan?.limits?.projects}
              />
              <UsageRow
                label="File storage"
                used={plan?.usage?.storageBytes ?? 0}
                limit={plan?.limits?.storageBytes}
                formatter={formatStorage}
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid var(--lp-border)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {[
              { label: "Users", value: plan?.usage?.users ?? 0 },
              { label: "Leads", value: plan?.usage?.leads ?? 0 },
              { label: "Projects", value: plan?.usage?.projects ?? 0 },
              {
                label: "File storage",
                value: formatStorage(plan?.usage?.storageBytes ?? 0),
              },
            ].map((it) => (
              <div key={it.label}>
                <div
                  className="text-xs text-muted"
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginBottom: 4,
                  }}
                >
                  {it.label}
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                  {typeof it.value === "number"
                    ? it.value.toLocaleString("en-IN")
                    : it.value}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--lp-accent)", marginTop: 2 }}
                >
                  Unlimited during trial
                </div>
              </div>
            ))}
          </div>
        )}
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
        <MiniStatCard
          icon={<IndianRupee size={16} />}
          tone="green"
          label="Total spent"
          value={`₹${(totalSpend / 100).toLocaleString("en-IN")}`}
          sub={`${payments.filter((p) => p.status === "captured").length} successful payment${payments.filter((p) => p.status === "captured").length === 1 ? "" : "s"}`}
        />
        <MiniStatCard
          icon={<Receipt size={16} />}
          tone="blue"
          label="Last payment"
          value={
            lastPayment
              ? `₹${(lastPayment.amount / 100).toLocaleString("en-IN")}`
              : "—"
          }
          sub={lastPayment?.paidAt ? fmt.date(lastPayment.paidAt) : "No payments yet"}
        />
        <MiniStatCard
          icon={<Mail size={16} />}
          tone="purple"
          label="Billing email"
          value={user?.email || "—"}
          valueSize="0.933rem"
          sub="Invoices sent here"
        />
        <MiniStatCard
          icon={<CreditCard size={16} />}
          tone="amber"
          label="Payment method"
          value={activeSubscription ? "Saved with Razorpay" : "Not added"}
          valueSize="0.933rem"
          sub="Card · UPI · Netbanking"
        />
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
            const changeKind = planChangeKind(currentPlanCode, code)
            return (
              <PlanCard
                key={code}
                plan={p}
                annual={annual}
                changeKind={changeKind}
                busy={busy}
                canUpgrade={canManage && config?.configured}
                onSelect={() => handlePlanSelect(code, changeKind)}
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
