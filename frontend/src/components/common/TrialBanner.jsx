import { useNavigate } from "react-router-dom"
import { Clock, AlertTriangle } from "lucide-react"
import { usePlan } from "@/hooks/usePlan"

// Compact strip shown at the top of the dashboard for tenants on BASIC.
// Renders three states:
//   - active trial with days remaining → neutral nudge with upgrade CTA
//   - last 2 days of trial → orange urgency
//   - trial expired → red block (all write endpoints already 402 by then)
//
// Hidden entirely for paid plans (PRO / ENTERPRISE) and while the plan
// data is still loading so it doesn't flash on every page nav.

export default function TrialBanner() {
  const navigate = useNavigate()
  const { plan, loading } = usePlan()

  if (loading || !plan) return null
  // Show the trial banner for any plan in its 7-day trial window. The BE
  // returns `trial.endsAt: null` once the company has an active paid sub,
  // which keeps the banner hidden for paying customers regardless of plan.
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
        fontSize: 13,
      }}
    >
      <Icon size={16} style={{ color: tone.border, flex: "none" }} />
      <div style={{ flex: 1 }}>
        {expired ? (
          <>
            <b>Your 7-day free trial has ended.</b>{" "}
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
            You're on a 7-day free trial — <b>{daysLeft} days</b>{" "}
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
