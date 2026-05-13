import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Building2, CheckCircle, Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
})

const FEATURES = [
  "AI-powered lead scoring identifies hot prospects automatically",
  "Smart assignment routes leads to the right agent instantly",
  "Never miss a follow-up with automated reminders",
  "Built-in WhatsApp & call logging for full activity trail",
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

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (_data) => {
    // TODO(BE): wire to better-auth password-reset request when endpoint is live.
    await new Promise((r) => setTimeout(r, 400))
    setSent(true)
    toast.success("If that email exists, a reset link was sent")
  }

  return (
    <div className="auth-wrap">
      <AuthSide heading="Reset your password" />
      <div className="auth-form-wrap">
        <div className="auth-form">
          <h1>Forgot password?</h1>
          <p>Enter your email and we'll send a reset link.</p>

          {sent ? (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 8,
                background: "var(--surface-2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <MailCheck size={18} />
                <strong>Check your inbox</strong>
              </div>
              <p className="text-sm text-muted">
                We sent a reset link to your email if an account exists for it.
                The link expires in 30 minutes.
              </p>
              <div className="auth-foot">
                <Link to="/login">← Back to sign in</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="field">
                <label>
                  Email <span className="req">*</span>
                </label>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <div
                    className="text-sm"
                    style={{ color: "var(--lp-error)" }}
                  >
                    {errors.email.message}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Send Reset Link
              </button>

              <div className="auth-foot">
                <Link to="/login">← Back to sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
