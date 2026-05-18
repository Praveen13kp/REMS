import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  UserCircle2,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
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

const PERKS = [
  "Your account is ready — just pick a password.",
  "You'll keep the role your manager assigned.",
  "Access to leads, follow-ups and dashboards is instant.",
]

function AuthSide({ companyName }) {
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
        <h2>
          You&apos;re invited to join{" "}
          <span style={{ color: "var(--accent)" }}>
            {companyName || "your team"}
          </span>
          .
        </h2>
        <p>
          Finish setting up your account and you&apos;ll be working leads with
          your team in under a minute.
        </p>
        <div className="auth-feats">
          {PERKS.map((t) => (
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

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get("token") || ""
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const signOut = useAuthStore((s) => s.signOut)

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", password: "", confirm: "" },
  })

  useEffect(() => {
    if (!token) {
      setLoadError("Missing invite token in URL.")
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get(`/users/invite/${token}`)
        const data = res?.data?.data ?? res?.data ?? res
        if (!cancelled) setInvite(data)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message || "This invite is invalid or has expired.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const onSubmit = async ({ name, password }) => {
    try {
      try {
        await signOut()
      } catch {
        /* no session — fine */
      }
      await api.post(`/users/invite/${token}/accept`, { name, password })
      // Multi-tenant: pass companyId so /auth/sign-in finds the right
      // (companyId, email) row. Brokers are tenant-less (companyId = null on
      // the User row), so leave it off for them and rely on password-match.
      await signIn({
        email: invite.email,
        password,
        ...(invite.role === "BROKER" ? {} : { companyId: invite.companyId }),
      })
      toast.success("Welcome aboard!")
      navigate("/dashboard", { replace: true })
    } catch (err) {
      toast.error(err?.message || "Failed to accept invite")
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="auth-wrap">
        <AuthSide companyName="" />
        <div className="auth-form-wrap">
          <div
            className="auth-form"
            style={{ alignItems: "center", justifyContent: "center", display: "flex", flexDirection: "column", gap: 12 }}
          >
            <Loader2 size={24} className="animate-spin" />
            <p className="text-muted">Checking your invite…</p>
          </div>
        </div>
      </div>
    )
  }

  // --- Bad / expired token ---
  if (loadError) {
    return (
      <div className="auth-wrap">
        <AuthSide companyName="" />
        <div className="auth-form-wrap">
          <div className="auth-form">
            <h1>Invite unavailable</h1>
            <p className="text-muted" style={{ marginBottom: 16 }}>
              {loadError}
            </p>
            <Link to="/login" className="btn btn-secondary">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // --- Main form ---
  return (
    <div className="auth-wrap">
      <AuthSide companyName={invite?.companyName} />
      <div className="auth-form-wrap">
        <div className="auth-form">
          <h1>Accept your invite</h1>
          <p>
            Joining <strong>{invite?.companyName}</strong> as{" "}
            <strong>{invite?.role}</strong>. Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>

          <div className="invite-info-card">
            <div className="invite-info-row">
              <Mail size={14} />
              <span className="text-muted">Email</span>
              <span className="invite-info-value">{invite?.email}</span>
            </div>
            <div className="invite-info-row">
              <ShieldCheck size={14} />
              <span className="text-muted">Role</span>
              <span className="invite-info-value">{invite?.role}</span>
            </div>
            <div className="invite-info-row">
              <UserCircle2 size={14} />
              <span className="text-muted">Company</span>
              <span className="invite-info-value">{invite?.companyName}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="field">
              <label>
                Your name <span className="req">*</span>
              </label>
              <input
                className="input"
                placeholder="Jane Smith"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <div className="text-sm" style={{ color: "var(--lp-error)" }}>
                  {errors.name.message}
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
                  type={showPw ? "text" : "password"}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
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
              <div className="input-group">
                <input
                  className="input"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-type password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirm}
                  {...register("confirm")}
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
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Accept invite & sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
