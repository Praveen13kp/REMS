import { useNavigate } from "react-router-dom"
import { Rocket, Sparkles, ArrowRight } from "lucide-react"

import { useAuthStore } from "@/stores/authStore"

// Choice screen shown right after /signup succeeds. Two paths:
//   1. Start Free Trial → keep the default plan, go straight to onboarding.
//   2. Subscribe         → go to /signup/choose-plan to pick a plan first.
// Both ultimately end in onboarding; difference is whether the user has
// already committed to a plan when they land in the dashboard.

export default function SignupWelcome() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const firstName = (user?.name || "there").split(" ")[0]

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--lp-bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 880 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.867rem", marginBottom: 8 }}>
            Welcome to LeadPro, {firstName} 👋
          </h1>
          <p className="text-muted">
            Every plan ships with a <b>7-day free trial</b>. Pick how you'd
            like to start.
          </p>
        </div>

        <div
          className="grid grid-2"
          style={{ gap: 16 }}
        >
          <button
            type="button"
            onClick={() => navigate("/onboarding/welcome")}
            className="card"
            style={{
              textAlign: "left",
              padding: 24,
              cursor: "pointer",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--lp-border)",
              background: "var(--lp-surface)",
            }}
          >
            <div
              className="kpi-icon kpi-icon-blue"
              style={{ width: 44, height: 44, marginBottom: 14 }}
            >
              <Sparkles size={20} />
            </div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: 6 }}>Start Free Trial</h3>
            <p
              className="text-muted text-sm"
              style={{ marginBottom: 14, minHeight: 60 }}
            >
              Jump straight in on the Basic plan. Get 7 days to explore lead
              capture, pipeline, agents, and reports. You can switch plans any
              time before the trial ends.
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--lp-accent)",
                fontWeight: 600,
              }}
            >
              Continue to onboarding <ArrowRight size={14} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/signup/choose-plan")}
            className="card"
            style={{
              textAlign: "left",
              padding: 24,
              cursor: "pointer",
              borderWidth: 2,
              borderStyle: "solid",
              borderColor: "var(--lp-accent)",
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.10), rgba(139,92,246,0.02))",
              boxShadow: "0 0 0 1px var(--lp-accent)",
            }}
          >
            <div
              className="kpi-icon kpi-icon-purple"
              style={{ width: 44, height: 44, marginBottom: 14 }}
            >
              <Rocket size={20} />
            </div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: 6 }}>Subscribe</h3>
            <p
              className="text-muted text-sm"
              style={{ marginBottom: 14, minHeight: 60 }}
            >
              Pick the plan that fits — Basic, Pro, or Enterprise. You'll get
              your 7-day free trial on the chosen plan, then we'll bill you
              after. No card needed today.
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--lp-accent)",
                fontWeight: 600,
              }}
            >
              See plans <ArrowRight size={14} />
            </span>
          </button>
        </div>

        <p
          className="text-xs text-muted"
          style={{ marginTop: 18, textAlign: "center" }}
        >
          You won't be charged today. Your trial begins now and lasts 7 days.
        </p>
      </div>
    </div>
  )
}
