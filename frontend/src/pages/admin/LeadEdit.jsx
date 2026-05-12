import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { LEAD_SOURCES, LEAD_STATUS_VALUES } from "@/lib/constants"

// Visual port of leadpro-realty/src/pages/LeadForm.jsx (edit mode).

const PRIORITIES = ["HOT", "WARM", "COLD"]
const STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "SITE_VISIT",
  "NEGOTIATION",
  "BOOKED",
  "LOST",
]

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().or(z.literal("")).optional(),
  city: z.string().optional(),
  interestedProjectId: z.string().optional(),
  budget: z.union([z.string(), z.number()]).optional(),
  source: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(STATUSES).optional(),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
})

export default function LeadEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      city: "",
      interestedProjectId: "",
      budget: "",
      source: "",
      priority: "WARM",
      status: "NEW",
      assignedToId: "",
      notes: "",
    },
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.get(`/leads/${id}`),
      api.get("/users").catch(() => null),
      api.get("/projects", { params: { pageSize: 100 } }).catch(() => null),
    ])
      .then(([leadRes, uRes, pRes]) => {
        if (cancelled) return
        const lead = leadRes?.data ?? leadRes
        const uList =
          uRes?.data?.items ?? uRes?.data ?? uRes?.users ?? uRes ?? []
        const pList = pRes?.data?.items ?? pRes?.data ?? []
        setUsers(Array.isArray(uList) ? uList : [])
        setProjects(Array.isArray(pList) ? pList : [])
        reset({
          name: lead?.name ?? "",
          phone: lead?.phone ?? "",
          email: lead?.email ?? "",
          city: lead?.city ?? "",
          interestedProjectId:
            lead?.interestedProjectId || lead?.interestedProject?.id || "",
          budget: lead?.budget ?? "",
          source: lead?.source ?? "",
          priority: lead?.priority ?? "WARM",
          status: lead?.status ?? "NEW",
          assignedToId:
            lead?.assignedToId || lead?.assignedTo?.id || "",
          notes: lead?.notes ?? "",
        })
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load lead")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, reset])

  const onSubmit = async (values) => {
    setSubmitting(true)
    try {
      const payload = {
        ...values,
        budget: values.budget === "" ? null : Number(values.budget),
        assignedToId: values.assignedToId || null,
        interestedProjectId: values.interestedProjectId || null,
      }
      await api.patch(`/leads/${id}`, payload)
      toast.success("Lead updated")
      navigate(`/leads/${id}`)
    } catch (err) {
      toast.error(err?.message || "Failed to update lead")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--lp-text-muted)",
          fontSize: 14,
        }}
      >
        Loading lead…
      </div>
    )
  }

  return (
    <>
      <div className="content-head">
        <div>
          <a
            onClick={() => navigate(`/leads/${id}`)}
            style={{
              color: "var(--lp-text-muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ← Back
          </a>
          <h1 style={{ marginTop: 6 }}>Edit Lead</h1>
        </div>
      </div>

      <form
        className="card"
        style={{ maxWidth: 760 }}
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid grid-2" style={{ gap: "0 16px" }}>
          <div className="field">
            <label>
              Customer name <span className="req">*</span>
            </label>
            <input className="input" {...register("name")} />
            {errors.name && (
              <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                {errors.name.message}
              </span>
            )}
          </div>
          <div className="field">
            <label>
              Phone <span className="req">*</span>
            </label>
            <input className="input" {...register("phone")} />
            {errors.phone && (
              <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                {errors.phone.message}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-2" style={{ gap: "0 16px" }}>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" {...register("email")} />
          </div>
          <div className="field">
            <label>City</label>
            <input className="input" {...register("city")} />
          </div>
        </div>
        <div className="grid grid-2" style={{ gap: "0 16px" }}>
          <div className="field">
            <label>Interested project</label>
            <select className="select" {...register("interestedProjectId")}>
              <option value="">— None —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.city ? ` — ${p.city}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Budget (INR)</label>
            <input
              className="input"
              type="number"
              {...register("budget")}
            />
          </div>
        </div>
        <div className="grid grid-2" style={{ gap: "0 16px" }}>
          <div className="field">
            <label>Source</label>
            <select className="select" {...register("source")}>
              <option value="">— Select —</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            {/* TODO: requires Lead.priority field */}
            <label>Priority</label>
            <select className="select" {...register("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-2" style={{ gap: "0 16px" }}>
          <div className="field">
            <label>Status</label>
            <select className="select" {...register("status")}>
              {/* zod enum keeps canonical pipeline names */}
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {/* Allow already-stored free-text statuses from the seed too */}
              {LEAD_STATUS_VALUES.filter((s) => !STATUSES.includes(s)).map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="field">
            <label>Assign to agent</label>
            <select className="select" {...register("assignedToId")}>
              <option value="">— Unassigned —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea
            className="textarea"
            rows={4}
            placeholder="Customer requirements, preferences, special asks…"
            {...register("notes")}
          />
        </div>
        <div
          className="row mt-4"
          style={{ justifyContent: "flex-end", gap: 10 }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/leads/${id}`)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </>
  )
}
