import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertTriangle, Info } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import { fmt } from "@/lib/format"
import PhoneInput from "@/components/forms/PhoneInput"
import CityInput from "@/components/forms/CityInput"
import SourceIcon from "@/components/leads/SourceIcon"
import { detectCountryCode, getCityDataForCode } from "@/lib/cities"

// Visual port of leadpro-realty/src/pages/AddLead.jsx — rendered as a full
// page at /leads/new with sectioned card layout. Wired to:
//   POST /api/leads
//   POST /api/leads/check-duplicates   (dedup-on-blur)
//   POST /api/leads?force=true         (Create Anyway after a hard dup)

const BUDGET_RANGES = [
  "Under ₹25 L",
  "₹25 L - ₹50 L",
  "₹50 L - ₹1 Cr",
  "₹1 Cr - ₹2 Cr",
  "₹2 Cr - ₹5 Cr",
  "₹5 Cr - ₹10 Cr",
  "Above ₹10 Cr",
]

const PROPERTY_TYPES = [
  "2 BHK Apartment",
  "3 BHK Apartment",
  "4 BHK Apartment",
  "Villa",
  "Plot",
  "Commercial",
]

const POSSESSION_TIMELINES = [
  "Immediate",
  "Within 3 months",
  "3-6 months",
  "6-12 months",
  "Just exploring",
]

const LEAD_SOURCES = [
  "MagicBricks",
  "99Acres",
  "Walk-In",
  "Referral",
  "Facebook Ads",
  "Instagram",
  "Google Ads",
  "Website",
]

// Keep aligned with DEFAULT_STAGES in backend/src/modules/pipeline/pipeline.constants.js.
// Only show genuinely-initial stages — later stages (Qualified, Proposal Sent,
// Negotiation, Won, Lost, …) should be reached via the /transition flow,
// not picked at create time.
const STATUSES = ["New", "Contacted"]
const PRIORITIES = ["Hot", "Warm", "Cold"]

const ASSIGN_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"])

const DEFAULTS = {
  name: "",
  phone: "",
  email: "",
  city: "",
  interestedProjectId: "",
  budget: "",
  requirementType: "",
  possessionTimeline: "",
  source: "",
  priority: "Warm",
  status: "New",
  assignedToId: "",
  notes: "",
}

const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/

const schema = z.object({
  name: z
    .string()
    .min(1, "Customer name is required")
    .regex(NAME_REGEX, "Name cannot contain numbers"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+(91|1|44|971|61|49|33|65)\d{8,15}$/, "Enter a valid phone number"),
  email: z
    .string()
    .email("Invalid email")
    .or(z.literal(""))
    .optional(),
  city: z.string().optional(),
  interestedProjectId: z.string().min(1, "Interested project is required"),
  budget: z.string().min(1, "Budget range is required"),
  requirementType: z.string().optional(),
  possessionTimeline: z.string().optional(),
  source: z.string().min(1, "Lead source is required"),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(STATUSES).optional(),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
})

export default function AddLead() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const canAssign = ASSIGN_ROLES.has(String(currentUser?.role || "").toUpperCase())

  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [dupResult, setDupResult] = useState(null)
  const [forceMode, setForceMode] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState(null)
  // Surfaces on actual 409 submit (not just the live check-duplicates banner).
  // Shape: { matches: [...], pendingValues } — re-submit needs the form values.
  const [dupModal, setDupModal] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  const phone = watch("phone")
  const email = watch("email")
  const name = watch("name")
  const city = watch("city")

  const countryCode = useMemo(() => detectCountryCode(phone), [phone])
  const cityData = useMemo(() => getCityDataForCode(countryCode), [countryCode])

  useEffect(() => {
    let cancelled = false
    const tasks = [
      api.get("/projects", { params: { pageSize: 100 } }).catch(() => null),
    ]
    if (canAssign) tasks.push(api.get("/users").catch(() => null))
    else tasks.push(Promise.resolve(null))

    Promise.all(tasks).then(([pRes, uRes]) => {
      if (cancelled) return
      const pList = pRes?.data?.items ?? pRes?.data ?? []
      const uList = uRes?.data ?? uRes?.users ?? []
      setProjects(Array.isArray(pList) ? pList : [])
      setUsers(Array.isArray(uList) ? uList : [])
    })
    return () => {
      cancelled = true
    }
  }, [canAssign])

  const dupTimer = useRef(null)
  useEffect(() => {
    const phoneOk = phone && phone.length >= 10
    const emailOk = email && /.+@.+\..+/.test(email)
    if (!phoneOk && !emailOk) {
      setDupResult(null)
      setForceMode(false)
      return
    }
    if (dupTimer.current) clearTimeout(dupTimer.current)
    dupTimer.current = setTimeout(async () => {
      try {
        const res = await api.post("/leads/check-duplicates", {
          phone: phoneOk ? phone : undefined,
          email: emailOk ? email : undefined,
          name: name || undefined,
          city: city || undefined,
        })
        const data = res?.data ?? res
        setDupResult(data)
        if (!data?.hard?.length) setForceMode(false)
      } catch {
        // intermittent network/validation noise is harmless here
      }
    }, 500)
    return () => clearTimeout(dupTimer.current)
  }, [phone, email, name, city])

  const dupBanner = useMemo(() => {
    if (!dupResult) return null
    const hard = dupResult.hard || []
    const soft = dupResult.soft || []
    if (hard.length === 0 && soft.length === 0) return null
    const isHard = hard.length > 0
    return { isHard, matches: isHard ? hard : soft }
  }, [dupResult])

  // Single create path used by both initial submit and "Create anyway" from
  // the duplicate modal. `force` skips the BE dedup check; matches come back
  // through the 409 catch so we can surface them in the modal.
  const submitCreate = async (values, { force = false } = {}) => {
    setSubmitting(true)
    try {
      const payload = {
        ...values,
        email: values.email || null,
        budget: values.budget || null,
        assignedToId: values.assignedToId || null,
        interestedProjectId: values.interestedProjectId || null,
      }
      const url = force ? "/leads?force=true" : "/leads"
      const res = await api.post(url, payload)
      const created = res?.data ?? res
      setDupModal(null)
      toast.success("Lead created")
      if (created?.id) navigate(`/leads/${created.id}`)
      else navigate("/leads")
    } catch (err) {
      if (err?.status === 409) {
        const matches = err?.details?.matches ?? []
        // Sync the inline banner so the form stays consistent if the user
        // closes the modal and edits, then mark forceMode in case they
        // submit again without going through the modal.
        setDupResult({ hard: matches, soft: [] })
        setForceMode(true)
        setDupModal({ matches, pendingValues: values })
      } else if (err?.status === 402 || err?.code === "PLAN_LIMIT_EXCEEDED") {
        setUpgradeModal(err)
      } else {
        toast.error(err?.message || "Failed to create lead")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmit = (values) => submitCreate(values, { force: forceMode })

  const onReset = () => {
    reset(DEFAULTS)
    setDupResult(null)
    setForceMode(false)
  }

  return (
    <>
      <div className="content-head">
        <div>
          <Link
            to="/leads"
            style={{ color: "var(--lp-text-muted)", fontSize: "0.867rem" }}
          >
            ← Back to Leads
          </Link>
          <h1 style={{ marginTop: 6 }}>Add New Lead</h1>
          <p>
            Capture a new customer enquiry. Required fields are marked with *.
          </p>
        </div>
      </div>

      {dupBanner && (
        <div
          className="card"
          style={{
            maxWidth: 900,
            marginBottom: 16,
            borderColor: dupBanner.isHard
              ? "var(--lp-error, #dc2626)"
              : "var(--lp-warning, #d97706)",
            background: "var(--lp-surface-2)",
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            {dupBanner.isHard ? (
              <AlertTriangle
                size={18}
                style={{ color: "var(--lp-error, #dc2626)", flexShrink: 0 }}
              />
            ) : (
              <Info
                size={18}
                style={{ color: "var(--lp-warning, #d97706)", flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {dupBanner.isHard
                  ? `Found ${dupBanner.matches.length} existing lead${dupBanner.matches.length > 1 ? "s" : ""} — click to view`
                  : "Possible duplicates found — review before creating"}
              </div>
              <ul className="text-sm" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {dupBanner.matches.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <Link to={`/leads/${m.id}`} style={{ color: "var(--lp-primary)" }}>
                      {m.name}
                    </Link>
                    {" — "}
                    {m.phone}
                    {m.email ? ` · ${m.email}` : ""}
                    {" · "}
                    <span className="badge">{m.status}</span>
                    {m.assignedTo?.name ? ` · ${m.assignedTo.name}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form
        className="card"
        style={{ maxWidth: 900 }}
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Customer Information */}
        <div>
          <div className="card-title">Customer Information</div>
          <p className="text-xs text-muted" style={{ marginBottom: 14 }}>
            Basic contact details for the new lead.
          </p>
          <div className="grid grid-2" style={{ gap: "0 16px" }}>
            <div className="field">
              <label className="label">
                Customer Name <span className="req">*</span>
              </label>
              <input
                className="input"
                placeholder="Full name"
                {...register("name")}
              />
              {errors.name && (
                <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                  {errors.name.message}
                </span>
              )}
            </div>
            <div className="field">
              <label className="label">
                Phone Number <span className="req">*</span>
              </label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    {...field}
                    hasError={!!errors.phone}
                  />
                )}
              />
              {errors.phone && (
                <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                  {errors.phone.message}
                </span>
              )}
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="customer@email.com"
                {...register("email")}
              />
              {errors.email && (
                <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                  {errors.email.message}
                </span>
              )}
            </div>
            <div className="field">
              <label className="label">City</label>
              <Controller
                name="city"
                control={control}
                render={({ field }) => <CityInput {...field} cityData={cityData} />}
              />
            </div>
          </div>
        </div>

        {/* Property & Budget */}
        <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 18, marginTop: 6 }}>
          <div className="card-title">Property & Budget</div>
          <p className="text-xs text-muted" style={{ marginBottom: 14 }}>
            What the customer is looking for.
          </p>
          <div className="grid grid-2" style={{ gap: "0 16px" }}>
            <div className="field">
              <label className="label">
                Budget Range <span className="req">*</span>
              </label>
              <input
                className="input"
                list="budget-options"
                placeholder="Pick a range or type your own"
                {...register("budget")}
              />
              <datalist id="budget-options">
                {BUDGET_RANGES.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              {errors.budget && (
                <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                  {errors.budget.message}
                </span>
              )}
            </div>
            <div className="field">
              <label className="label">
                Interested Project <span className="req">*</span>
              </label>
              <select className="select" {...register("interestedProjectId")}>
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.city ? ` — ${p.city}` : ""}
                  </option>
                ))}
              </select>
              {errors.interestedProjectId && (
                <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                  {errors.interestedProjectId.message}
                </span>
              )}
            </div>
            <div className="field">
              <label className="label">Property Type</label>
              <select className="select" {...register("requirementType")}>
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Possession Timeline</label>
              <select className="select" {...register("possessionTimeline")}>
                <option value="">Select timeline</option>
                {POSSESSION_TIMELINES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Source & Notes */}
        <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 18, marginTop: 6 }}>
          <div className="card-title">Source & Notes</div>
          <p className="text-xs text-muted" style={{ marginBottom: 14 }}>
            Where the lead came from and any context.
          </p>
          <div className="grid grid-2" style={{ gap: "0 16px" }}>
            <div className="field">
              <label className="label">
                Lead Source <span className="req">*</span>
              </label>
              <select className="select" {...register("source")}>
                <option value="">Select source</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.source && (
                <span className="text-xs" style={{ color: "var(--lp-error)" }}>
                  {errors.source.message}
                </span>
              )}
            </div>
            <div className="field">
              <label className="label">Initial Status</label>
              <select className="select" {...register("status")}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Priority</label>
              <select className="select" {...register("priority")}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {canAssign && (
              <div className="field">
                <label className="label">Assign to agent</label>
                <select className="select" {...register("assignedToId")}>
                  <option value="">— Unassigned —</option>
                  {users
                    .filter((u) => u.status !== "PENDING")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label">Notes</label>
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
            onClick={onReset}
          >
            Reset
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting
              ? "Saving…"
              : forceMode
                ? "Create Anyway"
                : "Save Lead"}
          </button>
        </div>
      </form>

      {dupModal && (
        <div
          className="modal-backdrop"
          onClick={() => !submitting && setDupModal(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 560 }}
          >
            <div className="modal-head">
              <h3>
                {dupModal.matches.length === 1
                  ? "This lead already exists"
                  : `Found ${dupModal.matches.length} existing leads`}
              </h3>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                A lead with the same phone or email is already in your pipeline.
                Open the existing record, or create a new one anyway if these
                are different people.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {dupModal.matches.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="card"
                    style={{
                      padding: 12,
                      background: "var(--lp-surface-2)",
                      borderColor: "var(--lp-border)",
                    }}
                  >
                    <div className="row row-between" style={{ alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.933rem" }}>{m.name}</div>
                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                          {fmt.phone(m.phone)}
                          {m.email ? ` · ${m.email}` : ""}
                        </div>
                        <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          {m.status && (
                            <span className="badge badge-muted" style={{ fontSize: "0.733rem" }}>
                              {m.status}
                            </span>
                          )}
                          {m.source && (
                            <span
                              className="badge badge-muted"
                              style={{ fontSize: "0.733rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <SourceIcon source={m.source} size={11} />
                              {m.source}
                            </span>
                          )}
                          {m.assignedTo?.name && (
                            <span className="badge badge-muted" style={{ fontSize: "0.733rem" }}>
                              Assigned: {m.assignedTo.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        to={`/leads/${m.id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDupModal(null)}
                        style={{ flexShrink: 0 }}
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDupModal(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={() => submitCreate(dupModal.pendingValues, { force: true })}
              >
                {submitting ? "Creating…" : "Create anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      {upgradeModal && (
        <div className="modal-backdrop" onClick={() => setUpgradeModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <h3>Upgrade required</h3>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted">
                {upgradeModal?.message || "Your current plan limit has been reached."}
              </p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setUpgradeModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => navigate("/pricing")}>
                View pricing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
