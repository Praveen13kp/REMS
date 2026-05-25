import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, Lock, X, Zap } from "lucide-react"
import { PLAN_LIMIT_EVENT } from "@/lib/api"
import { PLANS, normalisePlanCode } from "@/lib/planLimits"

// Global upgrade prompt. Listens for the relms:plan-limit event dispatched
// by lib/api.js whenever the BE returns 402, and renders a modal with the
// resource that hit its cap (or the locked feature) plus a CTA to /admin/billing.
//
// Mounted once at the App root so every page benefits without each caller
// reimplementing the flow.

const RESOURCE_LABEL = {
  users: "users",
  leads: "leads",
  projects: "projects",
  integrations: "integrations",
  storageBytes: "file storage",
}

const FEATURE_LABEL = {
  customPipelineStages: "Custom pipeline stages",
  leadAging: "Lead aging alerts",
  webhookIntake: "Webhook lead intake",
  byoIntegrations: "Facebook / Instagram / Google / IndiaMART / JustDial / Website integrations",
  duplicateDetection: "Duplicate-lead detection",
  agentPrivacy: "Agent privacy controls",
  auditLog: "Audit log",
}

export default function PlanLimitModal() {
  const [event, setEvent] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => setEvent(e.detail)
    window.addEventListener(PLAN_LIMIT_EVENT, handler)
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, handler)
  }, [])

  if (!event) return null

  const { code, message, details } = event
  const isFeature = code === "PLAN_FEATURE_LOCKED"
  const isTrialExpired = code === "TRIAL_EXPIRED"
  const planCode = normalisePlanCode(details?.plan)
  const plan = PLANS[planCode]

  // Pick the right upgrade target. For feature locks (e.g. audit log only
  // exists on Enterprise), find the cheapest plan that ACTUALLY has the
  // feature — otherwise we'd tell a BASIC user "Upgrade to Pro" even when
  // Pro doesn't have the feature either. For cap violations we keep the
  // "one tier up" default since limits scale with every paid tier.
  const findMinPlanWithFeature = (feature) => {
    const order = ["BASIC", "PRO", "ENTERPRISE"]
    for (const code of order) {
      if (code === planCode) continue
      if (PLANS[code]?.features?.[feature]) return PLANS[code]
    }
    return null
  }

  let nextPlan = null
  if (isFeature && details?.feature) {
    nextPlan = findMinPlanWithFeature(details.feature)
  }
  if (!nextPlan) {
    nextPlan =
      planCode === "BASIC" ? PLANS.PRO : planCode === "PRO" ? PLANS.ENTERPRISE : null
  }

  const close = () => setEvent(null)
  const goUpgrade = () => {
    close()
    navigate(details?.upgradeUrl || "/admin/billing")
  }

  return (
    // z-index: 200 to sit above any business modal (the underlying create-X
    // modal stays open when the BE rejects with 402, so we need to be on
    // top, not stack-tied with the form modal underneath).
    <div
      className="modal-backdrop"
      onClick={close}
      role="presentation"
      style={{ zIndex: 200 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-limit-title"
        style={{ maxWidth: 480 }}
      >
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className="kpi-icon kpi-icon-purple"
              style={{ width: 36, height: 36 }}
            >
              {isTrialExpired ? <Clock size={16} /> : isFeature ? <Lock size={16} /> : <Zap size={16} />}
            </span>
            <h3 id="plan-limit-title" style={{ margin: 0 }}>
              {isTrialExpired
                ? "Your trial has ended"
                : isFeature
                  ? "Feature locked"
                  : "Plan limit reached"}
            </h3>
          </div>
          <button
            className="btn-icon btn-ghost"
            type="button"
            onClick={close}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0 }}>{message}</p>

          {!isFeature && details?.resource && (
            <div
              className="card"
              style={{
                padding: 12,
                background: "var(--lp-surface-2, rgba(255,255,255,0.03))",
              }}
            >
              <div className="text-xs text-muted">Current usage</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: 2 }}>
                {Number(details.current).toLocaleString("en-IN")} /{" "}
                {Number(details.limit).toLocaleString("en-IN")}{" "}
                <span className="text-xs text-muted" style={{ fontWeight: 400 }}>
                  {RESOURCE_LABEL[details.resource] || details.resource}
                </span>
              </div>
            </div>
          )}

          {isFeature && details?.feature && (
            <div
              className="card"
              style={{
                padding: 12,
                background: "var(--lp-surface-2, rgba(255,255,255,0.03))",
              }}
            >
              <div className="text-xs text-muted">Locked feature</div>
              <div style={{ fontSize: "0.933rem", fontWeight: 600, marginTop: 2 }}>
                {FEATURE_LABEL[details.feature] || details.feature}
              </div>
            </div>
          )}

          {nextPlan && (
            <div className="text-sm text-muted">
              Upgrade to <b style={{ color: "var(--lp-text)" }}>{nextPlan.name}</b>{" "}
              (₹{nextPlan.price.monthly.toLocaleString("en-IN")}/mo) to{" "}
              {isFeature ? "unlock this feature" : "raise your limits"}.
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              close()
            }}
          >
            Not now
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goUpgrade()
            }}
          >
            {nextPlan ? `Upgrade to ${nextPlan.name}` : "View billing"}
          </button>
        </div>
      </div>
    </div>
  )
}
