import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Check,
  ArrowLeft,
  Loader2,
  Zap,
  ShieldCheck,
  Building2,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { PLANS } from "@/lib/planLimits"
import { useAuthStore } from "@/stores/authStore"
import { billingService } from "@/services/billingService"
import { openRazorpayCheckout } from "@/lib/razorpayCheckout"
import { clearPlanCache } from "@/hooks/usePlan"

// Plan picker shown when the user clicks "Choose a Plan" from SignupWelcome.
// Per the new billing model the trial is a separate concept — these cards
// are pure paid-subscription CTAs. "Choose Plan" opens Razorpay checkout
// straight away; on success the webhook flips the company onto the paid
// plan and we route to onboarding. If the user dismisses checkout they
// stay on this page so they can pick a different plan or back out.

const PLAN_ORDER = ["BASIC", "PRO", "ENTERPRISE"]

function inr(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN")
}

export default function ChoosePlan() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [cycle, setCycle] = useState("monthly")
  const [submitting, setSubmitting] = useState(null)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    let cancelled = false
    billingService
      .getConfig()
      .then((c) => !cancelled && setConfig(c))
      .catch(() => !cancelled && setConfig({ configured: false }))
    return () => {
      cancelled = true
    }
  }, [])

  const pickPlan = async (code) => {
    if (submitting) return
    if (!config?.configured) {
      toast.error(
        "Online payments aren't set up on this environment yet. Continue on your trial and subscribe later from Billing.",
      )
      return
    }
    setSubmitting(code)
    try {
      const { razorpaySubscriptionId } = await billingService.createSubscription({
        plan: code,
        billingCycle: cycle,
      })
      await openRazorpayCheckout({
        keyId: config.razorpayKeyId,
        subscriptionId: razorpaySubscriptionId,
        description: `${PLANS[code].name} plan · ${cycle}`,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        onSuccess: async (response) => {
          toast.success("Payment received! Activating your plan…")
          try {
            await billingService.verifySubscription(response)
          } catch {
            // Fall through — webhook will reconcile eventually.
          }
          clearPlanCache()
          navigate("/onboarding/welcome", { replace: true })
        },
        onDismiss: () => {
          setSubmitting(null)
        },
      })
    } catch (err) {
      toast.error(err?.message || "Couldn't start checkout. Please try again.")
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
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <h1 style={{ fontSize: "1.867rem", marginBottom: 8 }}>
            Choose your plan
          </h1>
          <p className="text-muted" style={{ maxWidth: 560, margin: "0 auto" }}>
            Pick a plan to subscribe right now. You can also{" "}
            <a
              onClick={() => navigate("/onboarding/welcome")}
              style={{ cursor: "pointer", color: "var(--lp-accent)" }}
            >
              continue on your free trial
            </a>{" "}
            and upgrade later — no card needed for that.
          </p>
        </div>

        <div
          className="row"
          style={{ justifyContent: "center", marginBottom: 22, gap: 0 }}
        >
          <div
            className="tabs"
            style={{ display: "inline-flex", background: "var(--lp-surface)" }}
          >
            <button
              type="button"
              className={`tab ${cycle === "monthly" ? "active" : ""}`}
              onClick={() => setCycle("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`tab ${cycle === "annual" ? "active" : ""}`}
              onClick={() => setCycle("annual")}
            >
              Annual <span className="text-xs">(save 20%)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-3" style={{ gap: 16 }}>
          {PLAN_ORDER.map((code) => {
            const plan = PLANS[code]
            if (!plan) return null
            const monthly = plan.price.monthly
            const annual = plan.price.annual
            const price = cycle === "annual" ? annual : monthly
            const annualTotal = annual * 12
            const isFeatured = plan.featured
            const busy = submitting === code

            return (
              <div
                key={code}
                className="card"
                style={{
                  padding: 24,
                  border: isFeatured
                    ? "2px solid var(--lp-accent)"
                    : "1px solid var(--lp-border)",
                  position: "relative",
                  background: isFeatured
                    ? "linear-gradient(135deg, rgba(139,92,246,0.06), transparent)"
                    : "var(--lp-surface)",
                }}
              >
                {isFeatured && (
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
                    {cycle === "annual" ? inr(annualTotal) : inr(price)}
                    <span
                      className="text-muted"
                      style={{ fontSize: "0.933rem", fontWeight: 400 }}
                    >
                      {cycle === "annual" ? "/yr" : "/mo"}
                    </span>
                  </div>
                  {cycle === "annual" && (
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      {inr(annual)}/mo equivalent · billed yearly
                    </div>
                  )}
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
                  className={`btn ${isFeatured ? "btn-primary" : "btn-secondary"}`}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => pickPlan(code)}
                  disabled={!!submitting}
                >
                  {busy ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Opening
                      checkout…
                    </>
                  ) : (
                    <>
                      <Zap size={14} /> Choose {plan.name}
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 22,
            marginTop: 22,
            color: "var(--lp-text-muted)",
            fontSize: "0.8rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={14} /> Secured by Razorpay
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> Cancel anytime
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> GST invoice on every charge
          </span>
        </div>
      </div>
    </div>
  )
}
