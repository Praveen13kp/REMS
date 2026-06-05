import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { PLANS, normalisePlanCode } from "@/lib/planLimits"
import { billingService } from "@/services/billingService"
import { openRazorpayCheckout } from "@/lib/razorpayCheckout"
import { clearPlanCache } from "@/hooks/usePlan"
import { useTheme } from "next-themes"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  Sun,
  X,
} from "lucide-react"

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A23.01 23.01 0 0 0 1 24c0 3.73.89 7.26 2.34 10.36l7.35-5.18z"/>
      <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 3.69 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.18l7.35 5.18c1.73-5.2 6.58-9.07 12.31-9.07z"/>
    </svg>
  )
}
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

const signupSchema = z
  .object({
    companyName: z
      .string()
      .min(2, "Company name is required")
      .max(120, "Company name is too long")
      // Real-estate company names commonly contain digits and punctuation
      // ("ABC Realty Pvt Ltd", "Group 99", "K&K Builders", "Skyline-One").
      // Allow letters, digits, spaces, and a small set of safe punctuation.
      .regex(
        /^[A-Za-z0-9\s.,'&()\-]+$/,
        "Company name can contain letters, numbers, spaces, and . , ' & ( ) -",
      ),
    ownerEmail: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Must include a letter")
      .regex(/[0-9]/, "Must include a number"),
    confirmPassword: z.string(),
    terms: z.literal(true, { message: "You must accept the terms" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

const SERVER_FIELDS = new Set([
  "companyName",
  "ownerEmail",
  "password",
])

const STRENGTH_COLORS = [
  "var(--lp-error)",
  "var(--lp-warning)",
  "var(--lp-info)",
  "var(--lp-success)",
]
const STRENGTH_LABELS = ["Weak", "Fair", "Good", "Strong"]

const FEATURES = [
  "Capture leads from Facebook, Instagram, Google, IndiaMART, JustDial & your website",
  "Kanban pipeline with customisable stages and lead aging alerts",
  "Assign leads to agents with role-based privacy controls",
  "Notes, files, CSV import, and a full activity trail per lead",
]

function AuthSide({ heading }) {
  return (
    <div className="auth-side">
      <div className="auth-side-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Building2 size={18} />
          </span>
          <span>LeadPro Realty</span>
        </Link>
      </div>
      <div className="auth-side-inner auth-hero">
        <h2>{heading}</h2>
        <p>
          Manage your real estate leads smarter. From first call to final
          booking — all in one workspace.
        </p>
        <div className="auth-feats">
          {FEATURES.map((t) => (
            <div className="auth-feat" key={t}>
              <CheckCircle size={18} />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-side-inner text-muted text-sm">
        © 2026 LeadPro Realty
      </div>
    </div>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <div className="text-sm" style={{ color: "var(--lp-error)" }}>
      {message}
    </div>
  )
}

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  // null | "terms" | "privacy" — which legal modal is open. Opening these
  // in-page avoids two extra routes for content that almost never changes,
  // and matches the inline-panel pattern used by Stripe / Notion signup.
  const [legalModal, setLegalModal] = useState(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Plan picked from /pricing. The badge ONLY shows when the visitor
  // actually came in with ?plan=... — direct /signup hits get the default
  // (Basic) flow without the pre-selected banner.
  const rawPlanParam = searchParams.get("plan")
  const selectedPlanCode = normalisePlanCode(rawPlanParam)
  const selectedPlan = PLANS[selectedPlanCode]
  const billingCycle =
    searchParams.get("billing") === "annual" ? "annual" : "monthly"
  const showPlanBadge = !!rawPlanParam && !!selectedPlan
  const emailParam = searchParams.get("email") || ""
  // Pre-filled from the landing "Get Started" contact form so the visitor
  // doesn't retype what they already entered.
  const companyParam = searchParams.get("company") || ""
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const setUser = useAuthStore((s) => s.setUser)
  const fetchSession = useAuthStore((s) => s.fetchSession)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      companyName: companyParam,
      ownerEmail: emailParam,
      password: "",
      confirmPassword: "",
      terms: false,
    },
  })

  const passwordValue = watch("password") || ""
  const strength = useMemo(() => {
    let s = 0
    if (passwordValue.length >= 8) s++
    if (/[A-Z]/.test(passwordValue)) s++
    if (/[0-9]/.test(passwordValue)) s++
    if (/[^A-Za-z0-9]/.test(passwordValue)) s++
    return s
  }, [passwordValue])

  const [googleLoading, setGoogleLoading] = useState(false)

  const signInWithGoogle = () => {
    if (googleLoading) return
    setGoogleLoading(true)
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
    window.location.href = `${baseUrl}/auth/google`
  }

  const onSubmit = async (data) => {
    const payload = {
      companyName: data.companyName,
      ownerEmail: data.ownerEmail,
      password: data.password,
      plan: selectedPlanCode,
      billingCycle,
    }

    try {
      const res = await api.post("/company/register", payload)
      setUser(res?.data?.user ?? null)
      // Re-pull the session from /auth/session so the auth-store status
      // is authoritative before ProtectedRoute renders /signup/welcome —
      // closes the race where App.jsx's mount-time fetchSession finishes
      // AFTER setUser and clobbers it back to "unauthenticated".
      await fetchSession()

      // Every plan in the catalogue (BASIC ₹499, PRO ₹2499, ENTERPRISE)
      // is paid — if the visitor picked one from the landing /pricing
      // section, open Razorpay checkout immediately. Direct /signup hits
      // (no plan param) still get the chooser so we don't surprise-charge
      // someone who hadn't picked anything.
      if (rawPlanParam) {
        toast.success("Account created — opening checkout…")
        try {
          const config = await billingService.getConfig()
          if (!config?.configured) {
            // Razorpay isn't wired in this env — fall back to the
            // billing page so the owner can configure or retry later.
            toast.error("Razorpay isn't configured yet — you can pay from Billing later.")
            navigate("/admin/billing", { replace: true })
            return
          }
          const { razorpaySubscriptionId } =
            await billingService.createSubscription({
              plan: selectedPlanCode,
              billingCycle,
            })
          await openRazorpayCheckout({
            keyId: config.razorpayKeyId,
            subscriptionId: razorpaySubscriptionId,
            description: `${selectedPlan.name} plan · ${billingCycle}`,
            prefill: {
              name: data.companyName,
              email: data.ownerEmail,
            },
            onSuccess: async (response) => {
              toast.success("Payment received! Activating your plan…")
              try {
                await billingService.verifySubscription(response)
              } catch {
                // Webhook will reconcile; reload anyway.
              }
              clearPlanCache()
              // Onboarding picks up the activated plan via /api/plan.
              window.location.assign("/onboarding/welcome")
            },
            onDismiss: () => {
              // User closed the modal — account is created but unpaid.
              // Park them on Billing so they can retry without re-signing up.
              toast.info("Checkout closed — you can finish payment from Billing.")
              navigate("/admin/billing", { replace: true })
            },
          })
        } catch (e) {
          toast.error(e?.message || "Couldn't start checkout")
          navigate("/admin/billing", { replace: true })
        }
        return
      }

      // No plan picked from landing — show the chooser.
      toast.success("Account created! Pick how you'd like to start.")
      navigate("/signup/welcome", { replace: true })
    } catch (err) {
      if (err?.status === 409) {
        setError("ownerEmail", {
          type: "server",
          message: err?.message || "An account with this email already exists",
        })
        return
      }
      if (err?.fields && typeof err.fields === "object") {
        let mapped = false
        for (const [field, message] of Object.entries(err.fields)) {
          if (SERVER_FIELDS.has(field)) {
            setError(field, { type: "server", message })
            mapped = true
          }
        }
        if (mapped) return
      }
      toast.error(err?.message || "Failed to create your workspace")
    }
  }

  return (
    <div className="auth-wrap">
      <AuthSide heading="Start your 7-day free trial" />
      <div className="auth-form-wrap">
        <div className="auth-page-top flex items-center justify-between">
          <Link to="/" className="auth-back-btn">
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
          <button
            type="button"
            className="btn-icon btn-ghost auth-theme-toggle"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="auth-form">
          <h1>Create your company account</h1>
          <p>
            Already on LeadPro? <Link to="/login">Sign in</Link>
          </p>

          <div className="oauth-btns">
            <button
              type="button"
              className="oauth-btn"
              onClick={signInWithGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <GoogleIcon size={18} />
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="auth-divider">or sign up with email</div>

          {showPlanBadge && (
            <div
              className="card"
              style={{
                marginBottom: 16,
                padding: 12,
                background: "var(--lp-surface-2, rgba(139,92,246,0.08))",
                border: "1px solid var(--lp-accent)",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.933rem" }}>
                    {selectedPlan.name} plan selected
                  </div>
                  <div className="text-xs text-muted">
                    ₹
                    {(billingCycle === "annual"
                      ? selectedPlan.price.annual
                      : selectedPlan.price.monthly
                    ).toLocaleString("en-IN")}
                    /mo · billed {billingCycle}
                  </div>
                </div>
                <Link
                  to="/pricing"
                  className="text-xs"
                  style={{ color: "var(--lp-accent)" }}
                >
                  Change plan
                </Link>
              </div>
              <p
                className="text-xs text-muted"
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                You&apos;ll start on Basic with a 7-day free trial. After
                signup, complete payment from your billing page to activate{" "}
                {selectedPlan.name}.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="field">
              <label>
                Company name <span className="req">*</span>
              </label>
              <input
                className="input"
                placeholder="Acme Realty Pvt Ltd"
                aria-invalid={!!errors.companyName}
                {...register("companyName")}
              />
              <FieldError message={errors.companyName?.message} />
            </div>

            <div className="field">
              <label>
                Email <span className="req">*</span>
              </label>
              <input
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                aria-invalid={!!errors.ownerEmail}
                {...register("ownerEmail")}
              />
              <FieldError message={errors.ownerEmail?.message} />
            </div>

            <div className="field">
              <label>
                Password <span className="req">*</span>
              </label>
              <div className="input-group">
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="********"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="pw-strength">
                <div
                  style={{
                    width: strength * 25 + "%",
                    background:
                      STRENGTH_COLORS[Math.max(0, strength - 1)] ||
                      "var(--lp-error)",
                  }}
                />
              </div>
              {errors.password ? (
                <FieldError message={errors.password.message} />
              ) : (
                <span className="text-xs text-muted">
                  {passwordValue
                    ? `Strength: ${
                        STRENGTH_LABELS[Math.max(0, strength - 1)] || "Weak"
                      }`
                    : "Use 8+ characters with mixed case, numbers, symbols"}
                </span>
              )}
            </div>

            <div className="field">
              <label>
                Confirm password <span className="req">*</span>
              </label>
              <div className="input-group">
                <input
                  className="input"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="********"
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <FieldError message={errors.confirmPassword?.message} />
            </div>

            <label className="checkbox mb-4">
              <input
                type="checkbox"
                aria-invalid={!!errors.terms}
                {...register("terms")}
              />{" "}
              I agree to the{" "}
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  color: "var(--lp-accent)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  font: "inherit",
                }}
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  color: "var(--lp-accent)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  font: "inherit",
                }}
              >
                Privacy Policy
              </button>
              .
            </label>
            <FieldError message={errors.terms?.message} />

            <button
              className="btn btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Create Account
            </button>
          </form>
        </div>
      </div>

      {legalModal && (
        <LegalModal kind={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  )
}

// Inline ToS / Privacy panel. Placeholder copy lives here for now —
// replace with the legally-reviewed text when ops provides it.
function LegalModal({ kind, onClose }) {
  const isTerms = kind === "terms"
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        style={{ maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-head" style={{ flexShrink: 0 }}>
          <h3 id="legal-modal-title" style={{ margin: 0 }}>
            {isTerms ? "Terms of Service" : "Privacy Policy"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--lp-text-muted)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            overflowY: "auto",
            flex: 1,
            lineHeight: 1.6,
            fontSize: "0.9rem",
            color: "var(--lp-text)",
          }}
        >
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </div>

        <div className="modal-foot" style={{ flexShrink: 0 }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            I understand
          </button>
        </div>
      </div>
    </div>
  )
}

function TermsContent() {
  return (
    <>
      <p className="text-xs text-muted" style={{ marginTop: 0 }}>
        Last updated: 20 May 2026 · Placeholder text — final version will be reviewed by legal.
      </p>

      <h4>1. Acceptance of Terms</h4>
      <p>
        By signing up for LeadPro, you agree to be bound by these Terms of Service
        and our Privacy Policy. If you do not agree, do not create an account.
      </p>

      <h4>2. Your Account</h4>
      <p>
        You are responsible for keeping your account credentials confidential and
        for all activity that occurs under your account. Notify us immediately of
        any unauthorised use. You must be at least 18 years old to use this
        service.
      </p>

      <h4>3. Acceptable Use</h4>
      <p>
        You agree to use LeadPro only to manage genuine business leads. You will
        not use the platform to send unsolicited bulk messages, harvest data
        unlawfully, impersonate others, or attempt to disrupt the service.
        Contact details captured through LeadPro must have been obtained with
        the lead&apos;s consent.
      </p>

      <h4>4. Data &amp; Tenancy</h4>
      <p>
        Each organisation&apos;s data is isolated. We process data on your behalf
        as a data processor — you remain the data controller for the personal
        information of your leads, customers, and team members. You are
        responsible for complying with applicable laws (DPDP Act, GDPR, etc.) in
        your jurisdiction.
      </p>

      <h4>5. Subscription &amp; Fees</h4>
      <p>
        Some features require a paid subscription. Plan details and pricing are
        shown at sign-up. You may cancel at any time; refunds are governed by
        the plan you selected.
      </p>

      <h4>6. Termination</h4>
      <p>
        We may suspend or terminate your access if you breach these terms,
        misuse the platform, or fail to pay applicable fees. On termination you
        may export your data within 30 days, after which it will be deleted.
      </p>

      <h4>7. Limitation of Liability</h4>
      <p>
        LeadPro is provided &quot;as is&quot;. To the maximum extent permitted by
        law, we are not liable for indirect, incidental, or consequential
        damages, or for loss of profits or data. Our total liability in any
        12-month period is capped at the amount you paid us in that period.
      </p>

      <h4>8. Changes</h4>
      <p>
        We may update these terms occasionally. Continued use of LeadPro after
        an update means you accept the revised terms.
      </p>

      <h4>9. Contact</h4>
      <p>
        Questions about these terms? Email{" "}
        <a href="mailto:legal@bizzfly.com">legal@bizzfly.com</a>.
      </p>
    </>
  )
}

function PrivacyContent() {
  return (
    <>
      <p className="text-xs text-muted" style={{ marginTop: 0 }}>
        Last updated: 20 May 2026 · Placeholder text — final version will be reviewed by legal.
      </p>

      <h4>1. What we collect</h4>
      <p>
        When you create an account we collect your name, email, phone, company
        name, and the role you hold within your organisation. When you use
        LeadPro, we store the lead, customer, and project data you enter, plus
        activity logs (calls, messages, status changes) so the platform can
        function.
      </p>

      <h4>2. How we use it</h4>
      <p>
        We use your data to operate LeadPro, send you product notifications and
        receipts, prevent fraud, debug issues, and improve the service. We do
        not sell your data or your leads&apos; data to third parties.
      </p>

      <h4>3. Third-party services</h4>
      <p>
        LeadPro integrates with services you choose to connect — Meta Lead Ads,
        Google Ads, IndiaMART, your SMTP provider, payment gateways. Data you
        send through these integrations is governed by their privacy policies
        in addition to ours.
      </p>

      <h4>4. Data storage &amp; security</h4>
      <p>
        Data is stored encrypted at rest and in transit (TLS 1.3, AES-256).
        Integration credentials are encrypted with AES-256-GCM before being
        written to the database. We follow OWASP best practices and run regular
        security reviews.
      </p>

      <h4>5. Your rights</h4>
      <p>
        You may access, correct, export, or delete your personal data at any
        time from Settings → Profile, or by emailing{" "}
        <a href="mailto:privacy@bizzfly.com">privacy@bizzfly.com</a>. Under DPDP
        Act 2023 (India) and GDPR (EU), you also have the right to lodge a
        complaint with the relevant data protection authority.
      </p>

      <h4>6. Cookies</h4>
      <p>
        We use a small number of essential cookies for authentication and
        session management. We do not use third-party advertising cookies on
        the platform.
      </p>

      <h4>7. Retention</h4>
      <p>
        We keep your data for as long as your account is active. On cancellation
        you have 30 days to export, after which we delete it (with a small
        retention window for legal / accounting backups, typically 90 days).
      </p>

      <h4>8. Children</h4>
      <p>
        LeadPro is not directed to children under 18. We do not knowingly
        collect data from anyone under 18.
      </p>

      <h4>9. Contact</h4>
      <p>
        Questions about your data?{" "}
        <a href="mailto:privacy@bizzfly.com">privacy@bizzfly.com</a>.
      </p>
    </>
  )
}
