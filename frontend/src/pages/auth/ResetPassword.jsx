import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Building2, CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  })

const FEATURES = [
  "Pick a strong password — letters, numbers, 8+ characters.",
  "Your reset link is single-use and expires in 30 minutes.",
  "After reset, sign in with your new password.",
]

function AuthSide() {
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
        <h2>Set a new password</h2>
        <p>You&apos;re a few seconds away from getting back into your workspace.</p>
        <div className="auth-feats">
          {FEATURES.map((t) => (
            <div className="auth-feat" key={t}>
              <CheckCircle size={18} />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-side-inner text-muted text-sm">© 2026 LeadPro Realty</div>
    </div>
  )
}

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get("token") || ""
  const navigate = useNavigate()

  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  })

  if (!token) {
    return (
      <div className="auth-wrap">
        <AuthSide />
        <div className="auth-form-wrap">
          <div className="auth-form">
            <h1>Link invalid</h1>
            <p className="text-muted" style={{ marginBottom: 16 }}>
              This reset link is missing its token. Request a new one from the
              sign-in page.
            </p>
            <Link to="/forgot-password" className="btn btn-secondary">
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const onSubmit = async ({ password }) => {
    try {
      await api.post("/auth/reset-password", { newPassword: password, token })
      toast.success("Password updated — sign in with your new password")
      navigate("/login", { replace: true })
    } catch (err) {
      toast.error(
        err?.message ||
          "Couldn't reset password. The link may have expired — request a new one.",
      )
    }
  }

  return (
    <div className="auth-wrap">
      <AuthSide />
      <div className="auth-form-wrap">
        <div className="auth-form">
          <h1>Choose a new password</h1>
          <p>Enter your new password twice to confirm.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="field">
              <label>
                New password <span className="req">*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    color: "var(--lp-text-muted)",
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <div className="text-sm" style={{ color: "var(--lp-error)" }}>
                  {errors.password.message}
                </div>
              )}
            </div>

            <div className="field">
              <label>
                Confirm password <span className="req">*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  aria-invalid={!!errors.confirm}
                  {...register("confirm")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    color: "var(--lp-text-muted)",
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirm && (
                <div className="text-sm" style={{ color: "var(--lp-error)" }}>
                  {errors.confirm.message}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Update password
            </button>

            <div className="auth-foot">
              <Link to="/login">← Back to sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
