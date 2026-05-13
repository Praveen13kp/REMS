import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { LEAD_SOURCES } from "@/lib/constants"

// Visual port of leadpro-realty/src/pages/AddLead.jsx — rendered as a full
// page at /leads/new with sectioned card layout.

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

export default function AddLead() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [dupWarning, setDupWarning] = useState(null)

  const {
    register,
    handleSubmit,
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
    Promise.all([
      api.get("/users").catch(() => null),
      api.get("/projects", { params: { pageSize: 100 } }).catch(() => null),
    ]).then(([uRes, pRes]) => {
      if (cancelled) return
      const uList =
        uRes?.data?.items ?? uRes?.data ?? uRes?.users ?? uRes ?? []
      const pList = pRes?.data?.items ?? pRes?.data ?? []
      setUsers(Array.isArray(uList) ? uList : [])
      setProjects(Array.isArray(pList) ? pList : [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (values) => {
    setSubmitting(true)
    setDupWarning(null)
    try {
      const payload = {
        ...values,
        budget: values.budget === "" ? null : Number(values.budget),
        assignedToId: values.assignedToId || null,
        interestedProjectId: values.interestedProjectId || null,
      }
      const res = await api.post("/leads", payload)
      const created = res?.data ?? res
      toast.success("Lead created")
      if (created?.id) navigate(`/leads/${created.id}`)
      else navigate("/leads")
    } catch (err) {
      if (err?.status === 409) {
        setDupWarning(
          err?.message ||
            "A lead with this phone or email already exists in your workspace.",
        )
      } else {
        toast.error(err?.message || "Failed to create lead")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="content-head">
        <div>
          <a
            onClick={() => navigate("/leads")}
            style={{
              color: "var(--lp-text-muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ← Back to Leads
          </a>
          <h1 style={{ marginTop: 6 }}>Add New Lead</h1>
          <p>
            Capture a new customer enquiry. Required fields are marked with *.
          </p>
        </div>
      </div>

      {dupWarning && (
        <div
          className="card"
          style={{
            maxWidth: 900,
            marginBottom: 16,
            borderColor: "var(--lp-warning, #d97706)",
            background: "var(--lp-surface-2)",
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle
              size={18}
              style={{ color: "var(--lp-warning, #d97706)", flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 600 }}>Possible duplicate</div>
              <div className="text-sm text-muted mt-2">{dupWarning}</div>
            </div>
          </div>
        </div>
      )}

      <form
        className="card"
        style={{ maxWidth: 900 }}
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Section: Lead Info */}
        <div>
          <div className="card-title">Lead Information</div>
          <p className="text-xs text-muted" style={{ marginBottom: 14 }}>
            Basic contact details for the new lead.
          </p>
          <div className="grid grid-2" style={{ gap: "0 16px" }}>
            <div className="field">
              <label>
                Customer Name <span className="req">*</span>
              </label>
              <input
                className="input"
                placeholder="Full name"
                {...register("name")}
              />
              {errors.name && (
                <span
                  className="text-xs"
                  style={{ color: "var(--lp-error)" }}
                >
                  {errors.name.message}
                </span>
              )}
            </div>
            <div className="field">
              <label>
                Phone <span className="req">*</span>
              </label>
              <input
                className="input"
                type="tel"
                placeholder="+91 98765 12345"
                {...register("phone")}
              />
              {errors.phone && (
                <span
                  className="text-xs"
                  style={{ color: "var(--lp-error)" }}
                >
                  {errors.phone.message}
                </span>
              )}
            </div>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="customer@email.com"
                {...register("email")}
              />
            </div>
            <div className="field">
              <label>City</label>
              <input
                className="input"
                placeholder="Bangalore"
                {...register("city")}
              />
            </div>
          </div>
        </div>

        {/* Section: Property Interest */}
        <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 18, marginTop: 6 }}>
          <div className="card-title">Property Interest</div>
          <p className="text-xs text-muted" style={{ marginBottom: 14 }}>
            What the customer is looking for.
          </p>
          <div className="grid grid-2" style={{ gap: "0 16px" }}>
            <div className="field">
              <label>Budget (INR)</label>
              <input
                className="input"
                type="number"
                placeholder="8500000"
                {...register("budget")}
              />
            </div>
            <div className="field">
              <label>Interested Project</label>
              <select className="select" {...register("interestedProjectId")}>
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.city ? ` — ${p.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section: Source & Priority */}
        <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 18, marginTop: 6 }}>
          <div className="card-title">Source & Priority</div>
          <p className="text-xs text-muted" style={{ marginBottom: 14 }}>
            Where the lead came from and how hot it is.
          </p>
          <div className="grid grid-2" style={{ gap: "0 16px" }}>
            <div className="field">
              <label>Lead Source</label>
              <select className="select" {...register("source")}>
                <option value="">Select source</option>
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
            <div className="field">
              <label>Initial Status</label>
              <select className="select" {...register("status")}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
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
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <textarea
                className="textarea"
                rows={4}
                placeholder="Any additional context about the customer's preferences, timing, or constraints…"
                {...register("notes")}
              />
            </div>
          </div>
        </div>

        <div
          className="row mt-4"
          style={{ justifyContent: "flex-end", gap: 10 }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/leads")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save Lead"}
          </button>
        </div>
      </form>
    </>
  )
}
