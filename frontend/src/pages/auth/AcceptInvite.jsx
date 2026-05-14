import { useEffect, useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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

const errStyle = { color: "var(--lp-error)", fontSize: 12, marginTop: 4 }

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get("token") || ""
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const signOut = useAuthStore((s) => s.signOut)

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState(null)
  const [loadError, setLoadError] = useState(null)

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
      // Clear any existing session in this browser so the new invitee
      // becomes the active user. Errors here are harmless.
      try {
        await signOut()
      } catch {
        /* no session — fine */
      }

      await api.post(`/users/invite/${token}/accept`, { name, password })
      // The accept endpoint doesn't issue a session — sign in immediately
      // with the password the user just set so the cookie is established
      // via the standard better-auth flow.
      await signIn({ email: invite.email, password })
      toast.success("Welcome aboard!")
      navigate("/dashboard", { replace: true })
    } catch (err) {
      toast.error(err?.message || "Failed to accept invite")
    }
  }

  if (loading) {
    return (
      <div className="auth-card">
        <p className="text-muted">Checking your invite…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="auth-card">
        <h2>Invite unavailable</h2>
        <p className="text-muted" style={{ marginTop: 8 }}>{loadError}</p>
        <div style={{ marginTop: 16 }}>
          <Link to="/login" className="btn btn-secondary">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h2>Accept your invite</h2>
      <p className="text-muted" style={{ marginTop: 4 }}>
        You&apos;ve been invited to join <strong>{invite?.companyName}</strong> as a{" "}
        <strong>{invite?.role}</strong>. Pick a password to finish setting up your account.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}
      >
        <div>
          <label className="text-sm">Email</label>
          <input className="input" value={invite?.email || ""} readOnly />
        </div>

        <div>
          <label className="text-sm">Your name</label>
          <input
            className="input"
            placeholder="Jane Smith"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <div style={errStyle}>{errors.name.message}</div>}
        </div>

        <div>
          <label className="text-sm">Password</label>
          <input
            type="password"
            className="input"
            placeholder="At least 8 characters"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && <div style={errStyle}>{errors.password.message}</div>}
        </div>

        <div>
          <label className="text-sm">Confirm password</label>
          <input
            type="password"
            className="input"
            aria-invalid={!!errors.confirm}
            {...register("confirm")}
          />
          {errors.confirm && <div style={errStyle}>{errors.confirm.message}</div>}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          style={{ marginTop: 8 }}
        >
          {isSubmitting ? "Accepting…" : "Accept invite & sign in"}
        </button>
      </form>
    </div>
  )
}
