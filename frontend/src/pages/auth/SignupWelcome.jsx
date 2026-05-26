import { Link, useNavigate } from "react-router-dom"
import {
  Building2,
  Rocket,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Clock,
  Check,
} from "lucide-react"

import { useAuthStore } from "@/stores/authStore"

const TRIAL_PERKS = [
  "Full access to every feature for 7 days",
  "No credit card required to start",
  "Switch or cancel any time",
]

const PLAN_PERKS = [
  "Compare Basic, Pro & Enterprise side-by-side",
  "Lock in annual pricing for up to 20% off",
  "Still get the same 7-day free trial",
]

export default function SignupWelcome() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const firstName = (user?.name || "there").split(" ")[0]

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 24px 48px",
        background:
          "radial-gradient(circle at 50% -10%, rgba(139,92,246,0.10), transparent 60%), var(--lp-bg)",
      }}
    >
      {/* Brand header — links back to the marketing site, matches Signup.jsx
          so the post-signup screen feels like part of the same flow. */}
      <Link
        to="/"
        className="brand"
        style={{
          alignSelf: "flex-start",
          marginBottom: 32,
          textDecoration: "none",
          color: "var(--lp-text)",
        }}
      >
        <span className="brand-mark">
          <Building2 size={18} />
        </span>
        <span style={{ fontWeight: 700 }}>LeadPro Realty</span>
      </Link>

      <div
        style={{
          width: "100%",
          maxWidth: 960,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              margin: "0 auto 18px",
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, var(--lp-accent), var(--lp-accent-deep, #6D28D9))",
              color: "#fff",
              boxShadow: "0 10px 30px rgba(139,92,246,0.35)",
            }}
          >
            <Building2 size={28} />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(139,92,246,0.10)",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "var(--lp-accent)",
              fontSize: "0.75rem",
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            <Sparkles size={12} />
            Your account is ready
          </div>
          <h1 style={{ fontSize: "2rem", marginBottom: 10, lineHeight: 1.2 }}>
            Welcome to LeadPro, {firstName} 👋
          </h1>
          <p className="text-muted" style={{ maxWidth: 520, margin: "0 auto" }}>
            Every plan ships with a <b>7-day free trial</b>. Pick how you&apos;d
            like to start — you can change your mind any time.
          </p>
        </div>

        <div className="grid grid-2" style={{ gap: 18 }}>
          <ChoiceCard
            tone="blue"
            icon={<Sparkles size={20} />}
            title="Start Free Trial"
            subtitle="Recommended · fastest path in"
            description="Jump straight in on the Basic plan and explore lead capture, the pipeline, agents, and reports."
            perks={TRIAL_PERKS}
            ctaLabel="Continue to onboarding"
            onClick={() => navigate("/onboarding/welcome")}
            recommended
          />

          <ChoiceCard
            tone="purple"
            icon={<Rocket size={20} />}
            title="Choose a Plan"
            subtitle="Pick Basic, Pro, or Enterprise"
            description="Pre-select the plan that fits your team. You&apos;ll still get the 7-day trial — we only bill after it ends."
            perks={PLAN_PERKS}
            ctaLabel="See plans"
            onClick={() => navigate("/signup/choose-plan")}
          />
        </div>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 18,
            color: "var(--lp-text-muted)",
            fontSize: "0.8rem",
          }}
        >
          <TrustItem icon={<CreditCard size={14} />} label="No card today" />
          <TrustItem icon={<Clock size={14} />} label="7-day free trial" />
          <TrustItem icon={<ShieldCheck size={14} />} label="Cancel anytime" />
        </div>
      </div>
    </div>
  )
}

function ChoiceCard({
  tone,
  icon,
  title,
  subtitle,
  description,
  perks,
  ctaLabel,
  onClick,
  recommended = false,
}) {
  const accent = tone === "purple" ? "var(--lp-accent)" : "var(--lp-info, #3b82f6)"
  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{
        position: "relative",
        textAlign: "left",
        padding: 24,
        cursor: "pointer",
        borderWidth: recommended ? 2 : 1,
        borderStyle: "solid",
        borderColor: recommended ? accent : "var(--lp-border)",
        background: recommended
          ? "linear-gradient(160deg, rgba(59,130,246,0.10), rgba(59,130,246,0.02))"
          : "var(--lp-surface)",
        boxShadow: recommended ? `0 0 0 1px ${accent}` : "none",
        transition: "transform .15s ease, box-shadow .15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      {recommended && (
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            padding: "3px 8px",
            borderRadius: 999,
            background: accent,
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          RECOMMENDED
        </span>
      )}

      <div
        className={`kpi-icon ${tone === "purple" ? "kpi-icon-purple" : "kpi-icon-blue"}`}
        style={{ width: 44, height: 44, marginBottom: 14 }}
      >
        {icon}
      </div>

      <h3 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{title}</h3>
      <div
        className="text-xs"
        style={{ color: accent, fontWeight: 600, marginBottom: 10 }}
      >
        {subtitle}
      </div>
      <p
        className="text-muted text-sm"
        style={{ marginBottom: 14, lineHeight: 1.55 }}
      >
        {description}
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 18px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {perks.map((p) => (
          <li
            key={p}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: "0.85rem",
              color: "var(--lp-text)",
            }}
          >
            <Check
              size={14}
              style={{ color: accent, flexShrink: 0, marginTop: 3 }}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: accent,
          fontWeight: 600,
          fontSize: "0.9rem",
        }}
      >
        {ctaLabel} <ArrowRight size={14} />
      </span>
    </button>
  )
}

function TrustItem({ icon, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {icon}
      {label}
    </span>
  )
}
