import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { USER_ROLES, USER_ROLE_VALUES } from "@/lib/constants"

const inviteSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(USER_ROLE_VALUES, { message: "Select a role" }),
})

const errStyle = { color: "var(--lp-error)", fontSize: 12, marginTop: 4 }

function CopyInviteLink({ url }) {
  const [copied, setCopied] = useState(false)

  if (!url) return <span className="text-dim" style={{ fontSize: 12 }}>—</span>

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy. Select and copy manually.")
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        readOnly
        value={url}
        className="input"
        style={{ fontSize: 12, padding: "6px 10px" }}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onCopy}
        aria-label="Copy invite link"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
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
    defaultValues: { email: "", role: "AGENT" },
  })

  const onInvite = async (data) => {
    try {
      await api.post("/users/invite", data)
      toast.success(`Invite sent to ${data.email}`)
      reset({ email: "", role: data.role })
      fetchMembers()
    } catch (err) {
      if (err?.status === 409) {
        setError("email", {
          type: "server",
          message: err?.message || "This email is already invited or active",
        })
        return
      }
      toast.error(err?.message || "Failed to send invite")
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
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Invite a teammate</h3>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            They&apos;ll get a one-time link to set their password and join.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 180px auto",
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
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Team</h3>
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
                            <span style={{ fontSize: 14 }}>
                              {m.name || "—"}
                            </span>
                            <span
                              className="text-muted"
                              style={{ fontSize: 12 }}
                            >
                              {m.email}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{m.role}</td>
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
                            <CopyInviteLink
                              url={m.inviteUrl || m.inviteLink}
                            />
                          ) : (
                            <span
                              className="text-dim"
                              style={{ fontSize: 12 }}
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
