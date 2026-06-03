import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Building2,
  BadgeCheck,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { PLANS } from "@/lib/planLimits"
import { clearPlanCache } from "@/hooks/usePlan"

// "Start Free Trial" plan picker. The user lands here from /signup/welcome.
// Unlike ChoosePlan (which opens Razorpay immediately), this page starts a
// 7-day free trial for the SELECTED plan via POST /billing/start-trial — no
// payment is taken. During the trial the tenant only gets the features of
// the plan they pick here (enforced by the backend planGate). The chosen
// plan then renders as "Current Plan" and the user continues to onboarding.

const PLAN_ORDER = ["BASIC", "PRO", "ENTERPRISE"]

function inr(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN")
}

export default function StartTrial() {
  const navigate = useNavigate()
  const [livePlans, setLivePlans] = useState(null)
  // The plan whose trial is currently active (set after start-trial succeeds).
  const [current, setCurrent] = useState(null)
  const [submitting, setSubmitting] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}/billing/plans`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled) setLivePlans(j?.data || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const planName = (code) => PLANS[code]?.name || code

  const choose = async (code) => {
    if (submitting || current === code) return
    setSubmitting(code)
    try {
      await api.post("/billing/start-trial", { plan: code })
      clearPlanCache()
      setCurrent(code)
      toast.success(
        `7-day free trial started on ${planName(code)} — its features are unlocked.`,
      )
    } catch (err) {
      toast.error(err?.message || "Couldn't start your trial. Please try again.")
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "28px 24px 48px",
        background:
          "radial-gradient(circle at 50% -10%, rgba(139,92,246,0.10), transparent 60%), var(--lp-bg)",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div
          className="row row-between"
          style={{ alignItems: "center", marginBottom: 24 }}
        >
          <a
            className="brand"
            href="/"
            style={{ textDecoration: "none", color: "var(--lp-text)" }}
          >
            <span className="brand-mark">
              <Building2 size={18} />
            </span>
            <span style={{ fontWeight: 700 }}>LeadPro Realty</span>
          </a>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/signup/welcome")}
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h1 style={{ fontSize: "1.867rem", marginBottom: 8 }}>
            Start your 7-day free trial
          </h1>
        </div>

        {/* Required intro message above the plans. */}
        <div
          className="card"
          style={{
            maxWidth: 720,
            margin: "0 auto 24px",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: "1px solid var(--lp-accent)",
            background: "var(--lp-surface-2, rgba(139,92,246,0.08))",
          }}
        >
          <Sparkles size={18} style={{ color: "var(--lp-accent)", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: "0.933rem", lineHeight: 1.5 }}>
            Start your 7-day free trial. Choose a plan below to unlock its
            features during the trial period. <strong>No payment required
            until the trial ends.</strong>
          </p>
        </div>

        <div className="grid grid-3" style={{ gap: 16 }}>
          {PLAN_ORDER.map((code) => {
            const liveMatch = livePlans?.find((p) => p.code === code)
            const plan = liveMatch
              ? { ...PLANS[code], ...liveMatch, price: liveMatch.price || PLANS[code]?.price }
              : PLANS[code]
            if (!plan) return null
            const monthly = plan.price?.monthly
            const isFeatured = plan.featured
            const isCurrent = current === code
            const busy = submitting === code

            return (
              <div
                key={code}
                className="card"
                style={{
                  padding: 24,
                  border: isCurrent
                    ? "2px solid var(--lp-success, #16a34a)"
                    : isFeatured
                      ? "2px solid var(--lp-accent)"
                      : "1px solid var(--lp-border)",
                  position: "relative",
                  background: isFeatured
                    ? "linear-gradient(135deg, rgba(139,92,246,0.06), transparent)"
                    : "var(--lp-surface)",
                }}
              >
                {isFeatured && !isCurrent && (
                  <span
                    style={{
                      position: "absolute",
                      top: -10,
                      left: 24,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "var(--lp-accent)",
                      color: "#fff",
                      fontSize: "0.733rem",
                      fontWeight: 700,
                      letterSpacing: 0.4,
                    }}
                  >
                    POPULAR
                  </span>
                )}
                {isCurrent && (
                  <span
                    style={{
                      position: "absolute",
                      top: -10,
                      left: 24,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "var(--lp-success, #16a34a)",
                      color: "#fff",
                      fontSize: "0.733rem",
                      fontWeight: 700,
                      letterSpacing: 0.4,
                    }}
                  >
                    CURRENT PLAN
                  </span>
                )}

                <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>
                  {plan.name}
                </div>
                <p
                  className="text-muted text-sm"
                  style={{ marginTop: 4, minHeight: 38 }}
                >
                  {plan.tagline}
                </p>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: "1.867rem", fontWeight: 700 }}>
                    {inr(monthly)}
                    <span
                      className="text-muted"
                      style={{ fontSize: "0.933rem", fontWeight: 400 }}
                    >
                      /mo
                    </span>
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                    Free for 7 days · billed after the trial ends
                  </div>
                </div>

                <ul
                  className="price-feats"
                  style={{ marginTop: 16, marginBottom: 16 }}
                >
                  {(plan.bullets || []).slice(0, 7).map((b) => (
                    <li key={b}>
                      <Check size={14} /> {b}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`btn ${isCurrent ? "" : isFeatured ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    ...(isCurrent
                      ? {
                          background: "var(--lp-success, #10B981)",
                          borderColor: "var(--lp-success, #10B981)",
                          color: "#fff",
                          opacity: 1,
                          cursor: "default",
                        }
                      : {}),
                  }}
                  onClick={() => choose(code)}
                  disabled={busy || isCurrent || !!submitting}
                >
                  {isCurrent ? (
                    <>
                      <BadgeCheck size={15} /> Current Plan
                    </>
                  ) : busy ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Starting
                      trial…
                    </>
                  ) : (
                    <>Choose Plan</>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Once a plan's trial is active, let them move on to onboarding.
            They can still switch plans above during the trial. */}
        {current && (
          <div style={{ textAlign: "center", marginTop: 26 }}>
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              <strong>{planName(current)}</strong> is now your current plan for
              the free trial. You can switch plans any time during the trial or
              from Billing later.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/onboarding/welcome", { replace: true })}
            >
              Continue to setup <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
