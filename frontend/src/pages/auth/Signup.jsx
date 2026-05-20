import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
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
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { COMPANY_TYPES, COMPANY_TYPE_VALUES } from "@/lib/constants"
import { useAuthStore } from "@/stores/authStore"

const signupSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required"),
    companyType: z.enum(COMPANY_TYPE_VALUES, {
      message: "Select a company type",
    }),
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
  "companyType",
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
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const setUser = useAuthStore((s) => s.setUser)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      companyName: "",
      companyType: "",
      ownerEmail: "",
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

  const onSubmit = async (data) => {
    const payload = {
      companyName: data.companyName,
      companyType: data.companyType,
      ownerEmail: data.ownerEmail,
      password: data.password,
    }

    try {
      const res = await api.post("/company/register", payload)
      setUser(res?.data?.user ?? null)
      toast.success("Account created! Let's set up your workspace.")
      navigate("/onboarding/welcome", { replace: true })
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
      <AuthSide heading="Start your 14-day free trial" />
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
                Company type <span className="req">*</span>
              </label>
              <select
                className="input"
                aria-invalid={!!errors.companyType}
                {...register("companyType")}
              >
                <option value="">Select a type</option>
                {COMPANY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.companyType?.message} />
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
              <a href="/terms" target="_blank" rel="noreferrer">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noreferrer">
                Privacy Policy
              </a>
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
    </div>
  )
}
