import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check } from "lucide-react"
import { PLANS, PLAN_CODES } from "@/lib/planLimits"

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

export default function PricingSection({ showHeading = true, anchorId = "pricing" }) {
  const [annual, setAnnual] = useState(false)
  const nav = useNavigate()

  // We render plans in catalogue order: FREE, PRO, ENTERPRISE.
  const plans = PLAN_CODES.map((code) => PLANS[code])

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
                {plan.bullets.map((f) => (
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
