import { useNavigate } from "react-router-dom"
import { Clock } from "lucide-react"
import { usePlan } from "@/hooks/usePlan"
import { useAuthStore } from "@/stores/authStore"

// Compact pill that lives in the topbar for BASIC tenants. Surfaces
// trial-days-remaining at all times so the team doesn't need to scroll to
// the trial banner to know where they stand. Auto-rerenders every minute
// so a session left open across midnight rolls the day count forward
// without a page refresh.
//
// Access control: every role sees the status, but only the Company Owner can
// click through to /admin/billing. For Managers / Agents the pill is a plain,
// non-interactive status badge (no link to billing).
//
// Hidden on PRO / ENTERPRISE and on plans loading.

export default function TrialPill() {
  const navigate = useNavigate()
  const { plan, loading } = usePlan()
  const isOwner = useAuthStore((s) => s.user?.role) === "OWNER"

  if (loading || !plan) return null
  // Belt-and-suspenders: hide as soon as the tenant has a paid sub,
  // even if a stale trial.endsAt is still hanging around in the cache.
  if (plan.hasActiveSubscription) return null
  // Pill shows whenever the tenant is mid-trial on any plan. BE also
  // returns trial.endsAt=null for tenants with an active paid sub, so
  // this check is the secondary "no trial set" exit.
  const trial = plan.trial
  if (!trial || !trial.endsAt) return null

  const { daysLeft, expired } = trial
  const tone = expired
    ? { bg: "rgba(220,38,38,0.12)", color: "var(--lp-error)", border: "var(--lp-error)" }
    : daysLeft <= 2
      ? { bg: "rgba(245,158,11,0.14)", color: "var(--lp-warning, #f59e0b)", border: "var(--lp-warning, #f59e0b)" }
      : { bg: "rgba(139,92,246,0.12)", color: "var(--lp-accent)", border: "var(--lp-accent)" }

  const label = expired ? "Trial expired" : `Free trial · ${daysLeft}d left`
  const ownerTitle = expired
    ? "Trial expired — click to upgrade"
    : `Free trial: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
  const nonOwnerTitle = expired
    ? "Trial expired — contact your company owner to renew"
    : `Free trial: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`

  const sharedStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    background: tone.bg,
    color: tone.color,
    border: `1px solid ${tone.border}`,
    fontSize: "0.8rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  }

  // Non-owners: read-only status badge, no navigation to billing.
  if (!isOwner) {
    return (
      <span title={nonOwnerTitle} style={sharedStyle}>
        <Clock size={12} />
        {label}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate("/admin/billing")}
      title={ownerTitle}
      style={{ ...sharedStyle, cursor: "pointer" }}
    >
      <Clock size={12} />
      {label}
    </button>
  )
}
