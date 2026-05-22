import { useEffect, useState } from "react"
import { billingService } from "@/services/billingService"
import { PLAN_LIMIT_EVENT } from "@/lib/api"
import { PLANS } from "@/lib/planLimits"

// Fire the same PlanLimitModal the BE triggers, but from the FE pre-flight
// check — so the user sees the upgrade prompt the moment they click
// "Invite" / "Create" instead of after a form submit + 402 round-trip.
// Shape mirrors what lib/api.js dispatches for real 402s so the modal
// renders identically.
export function dispatchPlanLimitFE({ resource, current, limit, planCode }) {
  const plan = PLANS[planCode] || PLANS.BASIC
  const message = `${plan.name} plan is limited to ${Number(limit).toLocaleString("en-IN")} ${resource}. You're at ${current}.`
  window.dispatchEvent(
    new CustomEvent(PLAN_LIMIT_EVENT, {
      detail: {
        code: "PLAN_LIMIT_EXCEEDED",
        message,
        details: {
          resource,
          current,
          limit,
          plan: planCode,
          upgradeUrl: "/admin/billing",
        },
        isPlanLimit: true,
      },
    }),
  )
}

export function dispatchFeatureLockFE({ feature, planCode }) {
  const plan = PLANS[planCode] || PLANS.BASIC
  const message = `${plan.name} plan doesn't include ${feature}. Upgrade to enable it.`
  window.dispatchEvent(
    new CustomEvent(PLAN_LIMIT_EVENT, {
      detail: {
        code: "PLAN_FEATURE_LOCKED",
        message,
        details: { feature, plan: planCode, upgradeUrl: "/admin/billing" },
        isPlanLimit: true,
      },
    }),
  )
}

// Loads the current tenant's plan + usage from /api/billing/plan.
// Cached on first call; force=true bypasses the cache after a successful
// upgrade so the UI reflects the new plan immediately.
let _cache = null
let _inflight = null

export function clearPlanCache() {
  _cache = null
  _inflight = null
}

export function usePlan() {
  const [plan, setPlan] = useState(_cache)
  const [loading, setLoading] = useState(_cache == null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (_cache) {
      setPlan(_cache)
      setLoading(false)
      return
    }
    if (!_inflight) {
      _inflight = billingService.getPlan()
    }
    setLoading(true)
    _inflight
      .then((data) => {
        _cache = data
        if (!cancelled) {
          setPlan(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        _inflight = null
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { plan, loading, error }
}
