import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check } from "lucide-react"
import { PLANS, PLAN_CODES } from "@/lib/planLimits"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api"

// Price label for a plan. Annual displays the per-month equivalent so the
// monthly/annual comparison stays apples-to-apples — the "billed yearly"
// micro-copy underneath clarifies what they actually pay up front.
function priceFor(plan, annual) {
  const amount = annual ? plan.price.annual : plan.price.monthly
  if (!amount) return { big: "Free", small: "" }
  return {
    big: "₹" + amount.toLocaleString("en-IN"),
    small: "/mo",
  }
}

function ctaLabel(plan) {
  if (plan.price.monthly === 0) return "Start 7-day free trial"
  return "Choose " + plan.name
}

// Merge DB-fetched plan into the hardcoded fallback so any field the
// super admin hasn't touched still has a sensible default (bullets,
// features, etc.).
function mergePlans(hardcoded, fetched) {
  const byCode = new Map(fetched.map((p) => [p.code, p]))
  return hardcoded.map((code) => {
    const base = PLANS[code] || {}
    const live = byCode.get(code)
    if (!live) return base
    return {
      ...base,
      ...live,
      price: live.price || base.price,
      limits: live.limits || base.limits,
      features: live.features || base.features,
      bullets: live.bullets?.length ? live.bullets : base.bullets,
    }
  })
}

export default function PricingSection({ showHeading = true, anchorId = "pricing" }) {
  const [annual, setAnnual] = useState(false)
  const [livePlans, setLivePlans] = useState(null)
  const nav = useNavigate()

  // Fetch DB-driven prices on mount so super admin edits reflect
  // instantly without a frontend redeploy.
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/billing/plans`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.data) return
        setLivePlans(json.data)
      })
      .catch(() => {
        // Fall back to hardcoded — non-fatal.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const plans = livePlans
    ? mergePlans(PLAN_CODES, livePlans)
    : PLAN_CODES.map((code) => PLANS[code])

  const goToSignup = (plan) => {
    const params = new URLSearchParams({
      plan: plan.code,
      billing: annual ? "annual" : "monthly",
    })
    nav(`/signup?${params.toString()}`)
  }

  return (
    <section
      id={anchorId}
      className="public-page landing-section"
      style={{ textAlign: "center" }}
    >
      {showHeading && (
        <div className="section-title">
          <h2>Simple, Honest Pricing</h2>
          <p>Pick a plan that fits your team. Switch anytime, no contracts.</p>
        </div>
      )}

      <div className="billing-toggle">
        <button
          className={!annual ? "active" : ""}
          onClick={() => setAnnual(false)}
        >
          Monthly
        </button>
        <button
          className={annual ? "active" : ""}
          onClick={() => setAnnual(true)}
        >
          Annual{" "}
          <span style={{ opacity: 0.7, marginLeft: 4 }}>−20%</span>
        </button>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => {
          const { big, small } = priceFor(plan, annual)
          return (
            <div
              key={plan.code}
              className={`price-card ${plan.featured ? "featured" : ""}`}
            >
              <div className="price-name">{plan.name}</div>
              <div className="price-amount">
                {big}
                <span>{small}</span>
              </div>
              {annual && plan.price.annual > 0 && (
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  billed yearly · ₹{(plan.price.annual * 12).toLocaleString("en-IN")}/yr
                </div>
              )}
              <p className="text-muted text-sm mt-2">{plan.tagline}</p>
              <ul className="price-feats">
                {(plan.bullets || []).map((f) => (
                  <li key={f}>
                    <Check size={16} /> {f}
                  </li>
                ))}
              </ul>
              <button
                className={`btn ${plan.featured ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => goToSignup(plan)}
              >
                {ctaLabel(plan)}
              </button>
            </div>
          )
        })}
      </div>

      <p
        className="text-xs text-muted"
        style={{ marginTop: 24, textAlign: "center" }}
      >
        All prices in INR. GST extra where applicable. Cancel anytime from
        your billing page.
      </p>
    </section>
  )
}
