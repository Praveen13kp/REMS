import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, AlertTriangle } from "lucide-react"
import { usePlan, clearPlanCache } from "@/hooks/usePlan"
import { billingService } from "@/services/billingService"
import { useAuthStore } from "@/stores/authStore"

// Compact strip shown at the top of the dashboard for tenants on BASIC.
// Renders three states:
//   - active trial with days remaining → neutral nudge
//   - last 2 days of trial → orange urgency
//   - trial/subscription expired → red block (all write endpoints 402 by then)
//
// Access control: the expiry notice is shown to EVERY company role, but only
// the Company Owner sees billing actions (Subscribe / View plans → /subscription).
// Managers / Agents see a read-only "contact your owner" message —
// they have no access to pricing, billing, or subscription management.
//
// Hidden entirely for paid plans (PRO / ENTERPRISE) and while the plan data
// is still loading so it doesn't flash on every page nav.
//
// Self-healing: if the owner actually paid but the Razorpay webhook never
// reached us (localhost, tunnel down), we silently reconcile against the
// Razorpay API once per session. Only the owner can reconcile (BE 403s
// everyone else), so the fallback is gated to them.

// Module-level guard so we only reconcile once across navigations within
// the same SPA session — not every page render.
let reconciledThisSession = false

export default function TrialBanner() {
  const navigate = useNavigate()
  const { plan, loading } = usePlan()
  const role = useAuthStore((s) => s.user?.role)
  const isOwner = role === "OWNER"
  const triedRef = useRef(false)

  useEffect(() => {
    if (loading || !plan) return
    if (plan.hasActiveSubscription) return
    // Only the owner can reconcile subscriptions (the billing endpoints are
    // owner-only); skip the self-heal for everyone else.
    if (!isOwner) return
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
  }, [loading, plan, isOwner])

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
  const dayWord = daysLeft === 1 ? "day" : "days"

  // Non-owners: read-only notice, no billing CTA, no "you can subscribe" copy.
  const body = expired ? (
    isOwner ? (
      <>
        <b>Your free trial has ended.</b>{" "}
        New leads, projects, invites, and integrations are blocked until you
        subscribe.
      </>
    ) : (
      <>
        <b>Your company&apos;s subscription has expired.</b>{" "}
        Please contact your company owner to renew it.
      </>
    )
  ) : urgent ? (
    isOwner ? (
      <>
        <b>{daysLeft} {dayWord} left in your free trial.</b>{" "}
        Subscribe before it ends to keep using LeadPro without interruption.
      </>
    ) : (
      <>
        <b>{daysLeft} {dayWord} left</b> in your company&apos;s free trial.
      </>
    )
  ) : isOwner ? (
    <>
      You&apos;re on a free trial — <b>{daysLeft} {dayWord}</b> remaining.
      Subscribe any time from the Billing page.
    </>
  ) : (
    <>
      Your company is on a free trial — <b>{daysLeft} {dayWord}</b> remaining.
    </>
  )

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
      <div style={{ flex: 1 }}>{body}</div>
      {isOwner && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => navigate("/subscription")}
          style={{ flex: "none" }}
        >
          {expired ? "Subscribe" : "View plans"}
        </button>
      )}
    </div>
  )
}
