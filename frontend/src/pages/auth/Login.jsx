import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Globe,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Moon,
  ShieldAlert,
  Sun,
} from "lucide-react"
import { toast } from "sonner"

import { useAuthStore } from "@/stores/authStore"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().optional(),
})

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

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const signIn = useAuthStore((s) => s.signIn)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  })

  // When the email matches multiple companies the BE returns 409 with the
  // list. We re-submit the sign-in once the user picks one.
  const [pickerCompanies, setPickerCompanies] = useState(null)
  const [pickerCreds, setPickerCreds] = useState(null)
  // Suspended / deleted company message — shown as a persistent banner so
  // the reason is impossible to miss. Cleared when the user retypes.
  const [suspendedBanner, setSuspendedBanner] = useState(null)

  const finishSignIn = async ({ email, password, companyId }) => {
    await signIn({ email, password, companyId })
    const from = new URLSearchParams(location.search).get("from")
    navigate(from || "/dashboard", { replace: true })
  }

  const onSubmit = async (data) => {
    setSuspendedBanner(null)
    try {
      await finishSignIn({
        email: data.email,
        password: data.password,
      })
    } catch (err) {
      // 409 with COMPANY_PICK_REQUIRED → show the company picker.
      const companies = err?.details?.companies
      if (err?.code === "COMPANY_PICK_REQUIRED" && Array.isArray(companies)) {
        setPickerCompanies(companies)
        setPickerCreds({ email: data.email, password: data.password })
        return
      }
      // 403 COMPANY_SUSPENDED / COMPANY_DELETED → show a persistent inline
      // banner with the BE-supplied reason and what to do next.
      if (err?.code === "COMPANY_SUSPENDED" || err?.code === "COMPANY_DELETED") {
        setSuspendedBanner({
          deleted: err.code === "COMPANY_DELETED",
          message:
            err.message ||
            (err.code === "COMPANY_DELETED"
              ? "This account has been removed."
              : "This account has been suspended."),
        })
        return
      }
      // 401 → keep the message generic (don't let attackers enumerate
      // which emails exist) but human-friendlier than "Invalid credentials".
      const is401 = err?.status === 401 || /invalid credentials/i.test(err?.message || "")
      toast.error(
        is401
          ? "The email or password you entered is incorrect. Please try again."
          : err?.message || "We couldn't sign you in. Please try again.",
      )
    }
  }

  const pickCompany = async (id) => {
    try {
      await finishSignIn({ ...pickerCreds, companyId: id })
    } catch (err) {
      toast.error(err?.message || "Failed to sign in")
      setPickerCompanies(null)
      setPickerCreds(null)
    }
  }

  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("error") === "google_config") {
      toast.error("Google login is not configured yet. Add Google OAuth credentials in backend/.env.")
      return
    }
    if (params.get("error") === "google") {
      toast.error("Google sign-in failed. Please try again or continue with email.")
    }
    if (params.get("suspended") === "1") {
      const msg = params.get("msg")
      toast.error(
        msg ? decodeURIComponent(msg) : "This account has been suspended. Contact support.",
      )
    }
  }, [location.search])

  const signInWithGoogle = async () => {
    if (googleLoading) return
    setGoogleLoading(true)
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api"
    window.location.href = `${baseUrl}/auth/google`
  }

  return (
    <div className="auth-wrap">
      <AuthSide heading="Welcome back!" />
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
          <h1>Sign in to your account</h1>
          <p>
            Don't have one?{" "}
            <Link to="/signup">Create account</Link>
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
                <Globe size={18} />
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="auth-divider">or sign in with email</div>

          {suspendedBanner && (
            <div
              role="alert"
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--lp-error)",
                background: "rgba(220,38,38,0.10)",
                color: "var(--lp-text)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 700,
                  marginBottom: 4,
                  color: "var(--lp-error)",
                }}
              >
                <ShieldAlert size={16} />
                {suspendedBanner.deleted
                  ? "Account removed"
                  : "Account suspended"}
              </div>
              <div className="text-sm" style={{ marginBottom: 8 }}>
                {suspendedBanner.message}
              </div>
              <div className="text-xs text-muted">
                {suspendedBanner.deleted
                  ? "This workspace has been permanently removed by the platform team. If this is unexpected, please reach out to support."
                  : "Your workspace has been temporarily blocked. This usually happens due to a billing issue or a policy review. Contact your platform admin or support to restore access."}
              </div>
            </div>
          )}

          {pickerCompanies && (
            <div
              className="invite-info-card"
              style={{ marginBottom: 16 }}
            >
              <strong>Pick a company to sign in to</strong>
              <p className="text-muted text-sm">
                This email is on more than one team.
              </p>
              <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                {pickerCompanies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="btn btn-secondary"
                    style={{ justifyContent: "flex-start" }}
                    onClick={() => pickCompany(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setPickerCompanies(null)
                    setPickerCreds(null)
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

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

            <div className="field">
              <label>
                Password <span className="req">*</span>
              </label>
              <div className="input-group">
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
              {errors.password && (
                <div
                  className="text-sm"
                  style={{ color: "var(--lp-error)" }}
                >
                  {errors.password.message}
                </div>
              )}
            </div>

            <div className="row row-between mb-4">
              <label className="checkbox">
                <input type="checkbox" defaultChecked {...register("remember")} />{" "}
                Remember me
              </label>
              <Link
                to="/forgot-password"
                style={{ color: "var(--accent)", fontSize: 14 }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
