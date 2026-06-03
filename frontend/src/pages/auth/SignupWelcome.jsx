import { Link, useNavigate } from "react-router-dom"
import {
  Building2,
  Rocket,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Clock,
  Check,
} from "lucide-react"

import { useAuthStore } from "@/stores/authStore"

// Post-signup landing — the user has an account but hasn't picked between
// "just try it" and "commit to a paid plan." Two large choice cards with
// clear differentiation (Recommended pill on the trial; gradient ring on
// the paid path), supported by stat strip + onboarding preview so the
// page doesn't feel empty.

const TRIAL_PERKS = [
  "Pick a plan and try its features free for 7 days",
  "No credit card, no charge until the trial ends",
  "Switch plans any time during the trial",
]

const PLAN_PERKS = [
  "Compare Basic, Pro & Enterprise side-by-side",
  "Save up to 20% with annual billing",
  "Activate instantly with a one-time Razorpay payment",
]

export default function SignupWelcome() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const firstName = (user?.name || "there").split(" ")[0]

  return (
    <div className="signup-welcome">
      {/* Brand header — matches Signup.jsx so the post-signup screen
          feels continuous. */}
      <header className="signup-welcome-header">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Building2 size={18} />
          </span>
          <span style={{ fontWeight: 700 }}>LeadPro Realty</span>
        </Link>
        <Link to="/" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} /> Back
        </Link>
      </header>

      <main className="signup-welcome-main">
        {/* Hero — confirms account creation, sets the question */}
        <section className="signup-welcome-hero">
          <span className="signup-welcome-badge">
            <Sparkles size={12} />
            Your account is ready
          </span>
          <h1>
            Welcome to LeadPro, <span className="hero-accent">{firstName}</span>{" "}
            <span aria-hidden>👋</span>
          </h1>
          <p>
            Two ways to start — try everything <b>free for 7 days</b> with no
            card, or pick a paid plan now and skip the trial. You can switch
            any time from Billing.
          </p>
        </section>

        {/* Two choice cards */}
        <section className="signup-welcome-choices">
          <ChoiceCard
            recommended
            tone="trial"
            icon={<Sparkles size={22} />}
            title="Start Free Trial"
            subtitle="Recommended · fastest way in"
            description="Pick a plan and try its features free for 7 days. Add leads, run your pipeline, invite your team. No card today."
            perks={TRIAL_PERKS}
            ctaLabel="Choose a plan to trial"
            onClick={() => navigate("/signup/start-trial")}
          />
          <ChoiceCard
            tone="paid"
            icon={<Rocket size={22} />}
            title="Subscribe Now"
            subtitle="Skip the trial · pay now"
            description="Pick Basic, Pro or Enterprise and activate your workspace immediately via Razorpay. Best for teams that already know what they need."
            perks={PLAN_PERKS}
            ctaLabel="Subscribe now"
            onClick={() => navigate("/signup/choose-plan")}
          />
        </section>

        {/* Trust row — applies regardless of which path the user picks. */}
        <section className="signup-welcome-trust">
          <TrustItem icon={<ShieldCheck size={14} />} label="Razorpay-secured payments" />
          <TrustItem icon={<Clock size={14} />} label="Cancel any time" />
          <TrustItem icon={<CreditCard size={14} />} label="GST invoice on every charge" />
        </section>

      </main>
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`signup-welcome-choice ${tone === "paid" ? "is-paid" : "is-trial"} ${recommended ? "is-recommended" : ""}`}
    >
      {recommended && (
        <span className="signup-welcome-choice-badge">RECOMMENDED</span>
      )}
      <span className="signup-welcome-choice-icon">{icon}</span>
      <div>
        <h3>{title}</h3>
        <div className="signup-welcome-choice-subtitle">{subtitle}</div>
      </div>
      <p className="signup-welcome-choice-desc">{description}</p>
      <ul className="signup-welcome-choice-perks">
        {perks.map((p) => (
          <li key={p}>
            <Check size={14} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <span className="signup-welcome-choice-cta">
        {ctaLabel} <ArrowRight size={14} />
      </span>
    </button>
  )
}

function TrustItem({ icon, label }) {
  return (
    <span className="signup-welcome-trust-item">
      {icon}
      {label}
    </span>
  )
}
