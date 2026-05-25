import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { PLANS } from "@/lib/planLimits"

// Plan picker shown when the user clicks "Subscribe" from SignupWelcome.
// Each card highlights the 7-day free trial; clicking it calls
// POST /billing/start-trial to lock the chosen plan onto the company,
// then routes to onboarding. No payment is collected here — that happens
// later from the Billing page once the trial ends.

const PLAN_ORDER = ["BASIC", "PRO", "ENTERPRISE"]

function inr(amount) {
  if (amount === 0) return "Free"
  return "₹" + Number(amount).toLocaleString("en-IN")
}

export default function ChoosePlan() {
  const navigate = useNavigate()
  const [cycle, setCycle] = useState("monthly")
  const [submitting, setSubmitting] = useState(null)

  const pickPlan = async (code) => {
    if (submitting) return
    setSubmitting(code)
    try {
      await api.post("/billing/start-trial", { plan: code })
      toast.success(`${PLANS[code].name} trial started. 7 days free.`)
      navigate("/onboarding/welcome", { replace: true })
    } catch (err) {
      toast.error(err?.message || "Couldn't start your trial. Please try again.")
      setSubmitting(null)
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 24px",
        background: "var(--lp-bg)",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ marginBottom: 14 }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <h1 style={{ fontSize: "1.867rem", marginBottom: 8 }}>Pick your plan</h1>
          <p className="text-muted">
            All plans include a <b>7-day free trial</b>. No card needed today
            — we'll prompt you to subscribe before the trial ends.
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

        <div
          className="grid grid-3"
          style={{ gap: 16 }}
        >
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

                <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{plan.name}</div>
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

                <div
                  style={{
                    marginTop: 12,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "rgba(16,185,129,0.10)",
                    color: "var(--lp-success, #10B981)",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    display: "inline-block",
                  }}
                >
                  7-day free trial included
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
                      <Loader2 size={14} className="animate-spin" /> Starting trial…
                    </>
                  ) : (
                    <>Start 7-day trial</>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <p
          className="text-xs text-muted"
          style={{ marginTop: 18, textAlign: "center" }}
        >
          You won't be charged today. We'll send reminders before the trial
          ends so you can subscribe without interruption.
        </p>
      </div>
    </div>
  )
}
