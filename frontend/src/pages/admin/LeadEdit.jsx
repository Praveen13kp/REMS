import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { LEAD_SOURCES } from "@/lib/constants"
import PhoneInput from "@/components/forms/PhoneInput"
import CityInput from "@/components/forms/CityInput"
import { useAuthStore } from "@/stores/authStore"
import { isPrivacyRestricted } from "@/lib/privacy"

import { COUNTRY_CITIES } from "@/lib/cities"

// Visual port of leadpro-realty/src/pages/LeadForm.jsx (edit mode).
//
// Intentionally omitted from this form:
//   - Status: PATCH /leads/:id silently drops the status field server-side
//     because status changes must go through /leads/:id/transition (writes
//     a STATUS_CHANGE activity, fires the assignee notification, enforces
//     reason capture for "Lost"). Status changes live on LeadDetail.
//   - Notes: also not in the BE update whitelist. Notes are managed via
//     the Notes panel on LeadDetail.

const PRIORITIES = ["Hot", "Warm", "Cold"]

// Accept international format with supported country codes.
const PHONE_REGEX = /^\+(91|1|44|971|61|49|33|65)\d{8,11}$/

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .regex(PHONE_REGEX, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  city: z.string().optional(),
  interestedProjectId: z.string().optional(),
  budget: z.union([z.string(), z.number()]).optional(),
  source: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedToId: z.string().optional(),
})

// Bring legacy "9876543210" into the canonical "+919876543210" form.
function normalisePhoneForInput(raw) {
  if (!raw) return ""
  const digits = String(raw).replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  if (raw.startsWith("+")) return raw
  return raw
}

export default function LeadEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const role = useAuthStore((s) => s.user?.role)
  const piiLocked = isPrivacyRestricted(role)

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
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
      priority: "Warm",
      assignedToId: "",
    },
  })

  const phone = watch("phone")
  const countryCode = useMemo(() => {
    if (!phone) return "+91"
    const match = phone.match(/^\+(91|1|44|971|61|49|33|65)/)
    return match ? match[0] : "+91"
  }, [phone])

  const cityData = useMemo(() => COUNTRY_CITIES[countryCode], [countryCode])

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
          phone: normalisePhoneForInput(lead?.phone),
          email: lead?.email ?? "",
          city: lead?.city ?? "",
          interestedProjectId:
            lead?.interestedProjectId || lead?.interestedProject?.id || "",
          budget: lead?.budget ?? "",
          source: lead?.source ?? "",
          priority: lead?.priority ?? "Warm",
          assignedToId:
            lead?.assignedToId || lead?.assignedTo?.id || "",
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
      // Budget is stored as free-text on the BE ("₹50L - ₹1Cr",
      // "Under ₹50L", etc.) — DON'T Number() it, or those labels become
      // NaN and the BE coerces them to null, silently wiping the field.
      // The BE schema (lead.validation.js) accepts both string & number.
      const payload = {
        ...values,
        budget: values.budget === "" ? null : values.budget,
        assignedToId: values.assignedToId || null,
        interestedProjectId: values.interestedProjectId || null,
      }
      // Never let a restricted role POST the masked phone/email string
      // back to the backend — strip them client-side too. The backend
      // also drops these on the server side as a defence-in-depth.
      if (piiLocked) {
        delete payload.phone
        delete payload.email
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
          fontSize: "0.933rem",
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
              fontSize: "0.867rem",
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
            {piiLocked ? (
              <input
                className="input"
                value="Hidden — contact your manager to edit"
                disabled
                readOnly
              />
            ) : (
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput {...field} hasError={!!errors.phone} />
                )}
              />
            )}
            {errors.phone && !piiLocked && (
              <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                {errors.phone.message}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-2" style={{ gap: "0 16px" }}>
          <div className="field">
            <label>Email</label>
            {piiLocked ? (
              <input
                className="input"
                value="Hidden — contact your manager to edit"
                disabled
                readOnly
              />
            ) : (
              <input className="input" type="email" {...register("email")} />
            )}
            {errors.email && !piiLocked && (
              <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                {errors.email.message}
              </span>
            )}
          </div>
          <div className="field">
            <label>City</label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => <CityInput {...field} cityData={cityData} />}
            />
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
        {["OWNER", "ADMIN", "MANAGER"].includes(role) && (
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
        )}

        {/* Status + Notes intentionally not on this form. Status changes
            fire a STATUS_CHANGE activity + assignee notification + reason
            capture for Lost — all handled by LeadDetail's transition flow.
            Notes are persisted via the Notes panel on LeadDetail, not
            through PATCH /leads/:id (BE drops `notes` on update). */}
        <div
          style={{
            padding: "12px 14px",
            border: "1px dashed var(--lp-border)",
            borderRadius: "var(--lp-radius-input, 8px)",
            background: "var(--lp-surface-2)",
            color: "var(--lp-text-muted)",
            fontSize: "0.867rem",
            marginTop: 8,
          }}
        >
          To change the pipeline status or add notes, open the{" "}
          <a
            onClick={() => navigate(`/leads/${id}`)}
            style={{ color: "var(--lp-accent)", cursor: "pointer", fontWeight: 600 }}
          >
            lead detail page
          </a>
          .
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
