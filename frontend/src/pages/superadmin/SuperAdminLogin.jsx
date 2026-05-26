import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const fetchSession = useAuthStore((s) => s.fetchSession)
  const [showPw, setShowPw] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (data) => {
    try {
      await api.post("/auth/superadmin/login", data)
      await fetchSession()
      navigate("/admin", { replace: true })
    } catch (err) {
      // 401 from the BE — never differentiate "wrong email" from "wrong
      // password" (that would let an attacker enumerate valid admin
      // accounts). Show the same generic message either way, but make
      // it loud: toast + inline error.
      const is401 = err?.status === 401 || /invalid credentials/i.test(err?.message || "")
      const message = is401
        ? "The email or password you entered is incorrect. Please try again."
        : err?.message || "We couldn't sign you in. Please try again."
      toast.error(message)
      setError("password", { type: "server", message })
    }
  }

  return (
    <div
      data-theme="dark"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--lp-bg)",
        color: "var(--lp-text)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--lp-surface)",
          border: "1px solid var(--lp-border)",
          borderRadius: "var(--lp-radius-card)",
          padding: 32,
          boxShadow: "var(--lp-shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--lp-surface-2)",
              border: "1px solid var(--lp-border)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--lp-accent)",
            }}
          >
            <ShieldCheck size={18} />
          </span>
          <h1 style={{ fontSize: "1.333rem", margin: 0 }}>Platform Admin</h1>
        </div>
        <p
          style={{
            color: "var(--lp-text-muted)",
            fontSize: "0.867rem",
            marginBottom: 22,
          }}
        >
          Restricted access. Sign in with your platform credentials.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="admin@platform.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <div className="text-sm" style={{ color: "var(--lp-error)" }}>
                {errors.email.message}
              </div>
            )}
          </div>

          <div className="field">
            <label>Password</label>
            <div className="input-group">
              <input
                className="input"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="********"
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

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
            style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
