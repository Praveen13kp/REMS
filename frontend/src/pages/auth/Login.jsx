import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Building2,
  CheckCircle,
  Globe,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

const loginSchema = z.object({
  companySlug: z
    .string()
    .min(1, "Company is required")
    .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and hyphens only"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().optional(),
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

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { companySlug: "", email: "", password: "", remember: true },
  })

  const onSubmit = async (data) => {
    try {
      await signIn({
        email: data.email,
        password: data.password,
        companySlug: data.companySlug.trim().toLowerCase(),
      })
      const from = new URLSearchParams(location.search).get("from")
      navigate(from || "/dashboard", { replace: true })
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to sign in")
    }
  }

  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("error") === "google") {
      toast.error(
        "Google sign-in failed. Your email isn't linked to a company — ask your admin to invite you first.",
      )
    }
  }, [location.search])

  const signInWithGoogle = async () => {
    if (googleLoading) return
    setGoogleLoading(true)
    try {
      const from = new URLSearchParams(location.search).get("from")
      const callbackURL =
        (window.location.origin) + (from || "/dashboard")
      const errorCallbackURL =
        window.location.origin + "/login?error=google"
      const res = await api.post("/auth/sign-in/social", {
        provider: "google",
        callbackURL,
        errorCallbackURL,
      })
      const url = res?.url || res?.data?.url
      if (url) {
        window.location.href = url
        return
      }
      toast.error("Google sign-in is not configured on the server yet.")
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Could not start Google sign-in",
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <AuthSide heading="Welcome back!" />
      <div className="auth-form-wrap">
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

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="field">
              <label>
                Company <span className="req">*</span>
              </label>
              <input
                className="input"
                type="text"
                autoComplete="organization"
                placeholder="your-company-slug"
                aria-invalid={!!errors.companySlug}
                {...register("companySlug")}
              />
              {errors.companySlug ? (
                <div
                  className="text-sm"
                  style={{ color: "var(--lp-error)" }}
                >
                  {errors.companySlug.message}
                </div>
              ) : (
                <span className="text-xs text-muted">
                  The short identifier for your company (e.g. acme-realty).
                </span>
              )}
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
