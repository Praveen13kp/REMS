import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { USER_ROLES, USER_ROLE_VALUES } from "@/lib/constants"
import DepartmentSelect from "@/components/forms/DepartmentSelect"

const inviteSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    role: z.enum(USER_ROLE_VALUES, { message: "Select a role" }),
    dept: z.string().optional().or(z.literal("")),
  })
  // Department is required for staff invites; channel partners have no
  // company/department so it's skipped for them.
  .refine((d) => d.role === "CHANNEL_PARTNER" || !!d.dept?.trim(), {
    path: ["dept"],
    message: "Select a department",
  })

const errStyle = { color: "var(--lp-error)", fontSize: "0.8rem", marginTop: 4 }

function PendingInviteActions({ inviteId, onResend }) {
  const [resending, setResending] = useState(false)

  const onClickResend = async () => {
    if (!inviteId) return
    setResending(true)
    try {
      await onResend(inviteId)
    } finally {
      setResending(false)
    }
  }

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={onClickResend}
      disabled={resending}
      aria-label="Resend invite and copy link"
    >
      {resending ? "Resending…" : "Resend & copy link"}
    </button>
  )
}

export default function OnboardingTeam() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get("/users")
      const list = res?.users ?? res?.data?.users ?? res?.data ?? []
      setMembers(Array.isArray(list) ? list : [])
    } catch {
      setMembers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "AGENT", dept: "" },
  })

  // Watch role so we can hide the Department field for channel partners.
  const watchedRole = useWatch({ control, name: "role" })

  const onInvite = async (data) => {
    try {
      // Channel partners use a dedicated endpoint — they're cross-tenant
      // users (no companyId on the User row), invited via a different flow
      // than internal staff (manager/agent).
      const endpoint =
        data.role === "CHANNEL_PARTNER" ? "/users/invite-broker" : "/users/invite"
      const body =
        data.role === "CHANNEL_PARTNER"
          ? { email: data.email }
          : { email: data.email, role: data.role, dept: data.dept }
      const res = await api.post(endpoint, body)
      const payload = res?.data?.data ?? res?.data ?? res
      if (payload?.inviteLink && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(payload.inviteLink)
        } catch {
          /* clipboard may be unavailable */
        }
      }
      if (payload?.emailSent) {
        toast.success(`Invite emailed to ${data.email} — link also copied`)
      } else {
        toast.success(
          `Invite created for ${data.email} — link copied (email not configured)`,
        )
      }
      reset({ email: "", role: data.role, dept: "" })
      fetchMembers()
    } catch (err) {
      if (err?.status === 409) {
        setError("email", {
          type: "server",
          message:
            err?.message ||
            "Already invited — use Resend on the row below to send again",
        })
        return
      }
      toast.error(err?.message || "Failed to send invite")
    }
  }

  const onResend = async (inviteId) => {
    try {
      const res = await api.post(`/users/invite/${inviteId}/resend`)
      const payload = res?.data?.data ?? res?.data ?? res
      if (payload?.inviteLink && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(payload.inviteLink)
        } catch {
          /* ignore */
        }
      }
      toast.success("Invite resent — link copied")
      fetchMembers()
    } catch (err) {
      toast.error(err?.message || "Failed to resend invite")
    }
  }

  return (
    <div className="stack">
      <form
        onSubmit={handleSubmit(onInvite)}
        style={{
          padding: 16,
          border: "1px solid var(--lp-border)",
          borderRadius: "var(--lp-radius-card)",
          background: "var(--lp-surface-2)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: "0.933rem", fontWeight: 600 }}>Invite a teammate</h3>
          <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>
            They&apos;ll get a one-time link to set their password and join.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              watchedRole === "CHANNEL_PARTNER"
                ? "1fr 160px auto"
                : "1fr 150px 180px auto",
            gap: 10,
            alignItems: "start",
          }}
        >
          <div>
            <input
              type="email"
              className="input"
              placeholder="teammate@company.com"
              aria-label="Email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <div style={errStyle}>{errors.email.message}</div>}
          </div>
          <div>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <select
                  className="select"
                  aria-label="Role"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  {USER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.role && <div style={errStyle}>{errors.role.message}</div>}
          </div>
          {watchedRole !== "CHANNEL_PARTNER" && (
            <div>
              <Controller
                name="dept"
                control={control}
                render={({ field }) => (
                  <DepartmentSelect
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    hasError={!!errors.dept}
                    required
                    placeholder="Department…"
                  />
                )}
              />
              {errors.dept && <div style={errStyle}>{errors.dept.message}</div>}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending…" : "Send invite"}
          </button>
        </div>
      </form>

      <div className="stack" style={{ gap: 8 }}>
        <h3 style={{ fontSize: "0.933rem", fontWeight: 600 }}>Team</h3>
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Name / Email</th>
                  <th style={{ width: 110 }}>Role</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th>Invite link</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: "var(--lp-text-muted)",
                      }}
                    >
                      Loading…
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: "var(--lp-text-muted)",
                      }}
                    >
                      No teammates yet. Invite your first one above.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => {
                    const isPending = m.status === "PENDING"
                    return (
                      <tr key={m.id ?? m.email}>
                        <td>
                          <div
                            style={{ display: "flex", flexDirection: "column" }}
                          >
                            <span style={{ fontSize: "0.933rem" }}>
                              {m.name || "—"}
                            </span>
                            <span
                              className="text-muted"
                              style={{ fontSize: "0.8rem" }}
                            >
                              {m.email}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: "0.867rem" }}>{m.role}</td>
                        <td>
                          <span
                            className={
                              isPending ? "badge badge-warning" : "badge badge-success"
                            }
                          >
                            {isPending ? "Pending" : "Active"}
                          </span>
                        </td>
                        <td>
                          {isPending ? (
                            <PendingInviteActions
                              inviteId={m.id}
                              onResend={onResend}
                            />
                          ) : (
                            <span
                              className="text-dim"
                              style={{ fontSize: "0.8rem" }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="row row-between">
        <Link to="/onboarding/projects" className="btn btn-ghost">
          Skip for now
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/onboarding/projects")}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
