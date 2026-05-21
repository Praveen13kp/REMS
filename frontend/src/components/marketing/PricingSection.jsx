import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { useAuthStore } from "@/stores/authStore"
import { subscriptionService } from "@/services/subscriptionService"

const PLANS = [
  {
    key: "BASIC",
    name: "Basic",
    price: 500,
    desc: "For solo owners getting their CRM live.",
    icon: ShieldCheck,
    feats: ["Up to 50 leads", "1 user only", "Basic reports", "Email support"],
  },
  {
    key: "PRO",
    name: "Pro",
    price: 1000,
    desc: "For real estate teams scaling lead operations.",
    icon: Sparkles,
    featured: true,
    feats: [
      "Unlimited leads",
      "Up to 25 users",
      "AI lead scoring",
      "Advanced analytics",
      "Lead assignment rules",
      "Priority support",
      "API access",
    ],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: 1500,
    desc: "For brokerages and builders needing full control.",
    icon: Crown,
    feats: [
      "Unlimited everything",
      "Unlimited users",
      "Team analytics",
      "Integrations",
      "Webhooks",
      "Custom branding",
      "Dedicated support",
    ],
  },
]

export default function PricingSection({ showHeading = true, anchorId = "pricing" }) {
  const nav = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [subscription, setSubscription] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!user?.companyId) return
    subscriptionService
      .getMe()
      .then((res) => {
        if (!cancelled) setSubscription(res?.company ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user?.companyId])

  const currentPlan = subscription?.subscriptionPlan || null

  const handlePlan = async (plan) => {
    if (!user) {
      nav("/signup")
      return
    }
    if (currentPlan === plan.key) {
      nav("/dashboard")
      return
    }
    setLoadingPlan(plan.key)
    try {
      const checkout = await subscriptionService.checkout(plan.key)
      await subscriptionService.confirm({
        plan: plan.key,
        transactionId: checkout?.checkoutId,
        paymentProvider: checkout?.provider || "MANUAL",
      })
      toast.success(`${plan.name} plan activated`)
      setSubscription((prev) => ({
        ...(prev || {}),
        subscriptionPlan: plan.key,
        subscriptionStatus: "ACTIVE",
      }))
      nav("/dashboard")
    } catch (err) {
      toast.error(err?.message || "Could not update subscription")
    } finally {
      setLoadingPlan(null)
    }
  }

  const usageText = useMemo(() => {
    if (!subscription?.usage) return null
    return `${subscription.usage.leads} leads · ${subscription.usage.users} users`
  }, [subscription])

  return (
    <section id={anchorId} className="public-page landing-section" style={{ textAlign: "center" }}>
      {showHeading && (
        <div className="section-title">
          <h2>Simple SaaS Pricing</h2>
          <p>Monthly plans for real estate CRM teams. Upgrade when your pipeline grows.</p>
          {usageText && <p className="text-xs text-muted">Current usage: {usageText}</p>}
        </div>
      )}

      <div className="pricing-grid">
        {PLANS.map((p) => {
          const Icon = p.icon
          const isCurrent = currentPlan === p.key
          const isLoading = loadingPlan === p.key
          return (
            <div key={p.key} className={`price-card ${p.featured ? "featured" : ""}`}>
              <div className="row row-between" style={{ alignItems: "center", marginBottom: 10 }}>
                <div className="kpi-icon kpi-icon-amber" style={{ width: 38, height: 38 }}>
                  <Icon size={18} />
                </div>
                {isCurrent && <span className="badge badge-success">Current plan</span>}
              </div>
              <div className="price-name">{p.name}</div>
              <div className="price-amount">
                {"₹" + p.price.toLocaleString("en-IN")}
                <span>/month</span>
              </div>
              <p className="text-muted text-sm mt-2">{p.desc}</p>
              <ul className="price-feats">
                {p.feats.map((f) => (
                  <li key={f}>
                    <Check size={16} /> {f}
                  </li>
                ))}
              </ul>
              <button
                className={`btn ${p.featured ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => handlePlan(p)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isCurrent ? (
                  "Go to dashboard"
                ) : user ? (
                  `Upgrade to ${p.name}`
                ) : (
                  "Start with Basic"
                )}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
