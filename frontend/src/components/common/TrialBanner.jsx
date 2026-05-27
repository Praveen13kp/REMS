import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, AlertTriangle } from "lucide-react"
import { usePlan, clearPlanCache } from "@/hooks/usePlan"
import { billingService } from "@/services/billingService"

// Compact strip shown at the top of the dashboard for tenants on BASIC.
// Renders three states:
//   - active trial with days remaining → neutral nudge with upgrade CTA
//   - last 2 days of trial → orange urgency
//   - trial expired → red block (all write endpoints already 402 by then)
//
// Hidden entirely for paid plans (PRO / ENTERPRISE) and while the plan
// data is still loading so it doesn't flash on every page nav.
//
// Self-healing: if the user actually paid but the Razorpay webhook never
// reached us (localhost, tunnel down), we silently reconcile against the
// Razorpay API once per session. If a completed payment is found the row
// flips to ACTIVE and the banner disappears — no "Already paid?" button
// for the user to figure out.

// Module-level guard so we only reconcile once across navigations within
// the same SPA session — not every page render.
let reconciledThisSession = false

export default function TrialBanner() {
  const navigate = useNavigate()
  const { plan, loading } = usePlan()
  const triedRef = useRef(false)

  useEffect(() => {
    if (loading || !plan) return
    if (plan.hasActiveSubscription) return
    if (reconciledThisSession || triedRef.current) return
    triedRef.current = true
    reconciledThisSession = true
    billingService
      .reconcileSubscriptions()
      .then((result) => {
        if (result?.activated > 0) {
          clearPlanCache()
          // soft reload — usePlan refetches and the banner unmounts on its own
          window.location.reload()
        }
      })
      .catch(() => {
        // Silent — webhook is the primary path, this is just a fallback.
      })
  }, [loading, plan])

  if (loading || !plan) return null
  // Hard-stop for paid tenants — never show the trial banner once they
  // have an active subscription, even if a stale trial.endsAt is still
  // in the cache. The BE also nulls trial.endsAt for paid tenants, so
  // the check below is a secondary guard.
  if (plan.hasActiveSubscription) return null
  const trial = plan.trial
  if (!trial || !trial.endsAt) return null

  const { daysLeft, expired } = trial
  const urgent = !expired && daysLeft <= 2

  const tone = expired
    ? { bg: "rgba(220,38,38,0.12)", border: "var(--lp-error)", icon: AlertTriangle }
    : urgent
      ? { bg: "rgba(245,158,11,0.10)", border: "var(--lp-warning, #f59e0b)", icon: Clock }
      : { bg: "rgba(139,92,246,0.10)", border: "var(--lp-accent)", icon: Clock }

  const Icon = tone.icon

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        margin: "0 0 14px",
        borderRadius: 8,
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        fontSize: "0.867rem",
      }}
    >
      <Icon size={16} style={{ color: tone.border, flex: "none" }} />
      <div style={{ flex: 1 }}>
        {expired ? (
          <>
            <b>Your free trial has ended.</b>{" "}
            New leads, projects, invites, and integrations are blocked until
            you subscribe.
          </>
        ) : urgent ? (
          <>
            <b>{daysLeft} day{daysLeft === 1 ? "" : "s"} left in your free trial.</b>{" "}
            Subscribe before it ends to keep using LeadPro without interruption.
          </>
        ) : (
          <>
            You're on a free trial — <b>{daysLeft} day{daysLeft === 1 ? "" : "s"}</b>{" "}
            remaining. Subscribe any time from the Billing page.
          </>
        )}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => navigate("/admin/billing")}
        style={{ flex: "none" }}
      >
        {expired ? "Subscribe" : "View plans"}
      </button>
    </div>
  )
}
