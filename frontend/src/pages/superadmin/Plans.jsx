// SuperAdmin Plans catalogue.
//
// SOURCE OF TRUTH: the DB Plan table (via /api/admin/plans).
// SMART RAZORPAY SYNC: When the SuperAdmin changes priceMonthly OR
// priceAnnual, the backend creates a NEW Razorpay plan and stores its
// ID. Old plan IDs are archived; existing subscriptions keep renewing
// at their original price until cancelled or renewed manually. Any
// other field change (name / limits / features / bullets) only updates
// the DB, no Razorpay round-trip.

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  Check,
  Edit3,
  IndianRupee,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import { adminService } from "@/services/adminService"
import { billingService } from "@/services/billingService"
import { fmt } from "@/lib/format"

// ---------- helpers ----------

function paise(rupees) {
  return Math.round(Number(rupees || 0) * 100)
}

function rupees(paiseAmount) {
  return Math.round(Number(paiseAmount || 0)) / 100
}

const FEATURE_KEYS = [
  ["customPipelineStages", "Custom pipeline stages"],
  ["leadAging", "Lead aging alerts"],
  ["webhookIntake", "Webhook lead intake"],
  ["byoIntegrations", "BYO integrations (FB/IG/Google/JustDial/IndiaMART/Web)"],
  ["duplicateDetection", "Duplicate-lead detection"],
  ["agentPrivacy", "Agent privacy controls"],
  ["auditLog", "Audit log"],
]

const LIMIT_KEYS = [
  { key: "users", label: "Users", suffix: "" },
  { key: "leads", label: "Leads", suffix: "" },
  { key: "projects", label: "Projects", suffix: "" },
  { key: "storageBytes", label: "File storage", suffix: "bytes", isStorage: true },
  { key: "integrations", label: "Integrations", suffix: "" },
]

// MB → bytes for the storage field (UX). The DB stores bytes; the UI
// edits MB so non-engineers can think in human units. -1 in input means
// "unlimited" → maps to null on save.
function bytesToMb(bytes) {
  if (bytes == null) return ""
  return Math.round(bytes / (1024 * 1024))
}

function mbToBytes(mb) {
  if (mb === "" || mb == null) return null
  const n = Number(mb)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 1024 * 1024)
}

// ---------- main page ----------

export default function Plans() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // plan row being edited
  // Razorpay status — pulled from /api/billing/config. Drives the
  // top-of-page indicator banner so admins know whether price edits
  // will actually create Razorpay plans.
  const [rzpConfig, setRzpConfig] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [data, cfg] = await Promise.all([
        adminService.getPlans(),
        billingService.getConfig().catch(() => ({ configured: false })),
      ])
      setPlans(data || [])
      setRzpConfig(cfg)
    } catch (err) {
      toast.error(err?.message || "Failed to load plans")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Plans</h1>
          <p>
            Edit pricing, limits, and features. Price changes auto-create a
            new Razorpay plan and archive the old ID; other edits only touch
            the database.
          </p>
        </div>
        <div className="row">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/admin")}
          >
            Back to overview
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={load}
            disabled={loading}
            title="Reload"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Razorpay status banner — shows mode + warns when not configured */}
      {rzpConfig && (
        <div
          className="card"
          style={{
            marginBottom: 14,
            borderColor: rzpConfig.configured
              ? rzpConfig.mode === "live"
                ? "var(--lp-error)"
                : "var(--lp-accent)"
              : "var(--lp-warning, #f59e0b)",
            background: rzpConfig.configured
              ? rzpConfig.mode === "live"
                ? "rgba(220,38,38,0.06)"
                : "rgba(139,92,246,0.06)"
              : "rgba(245,158,11,0.06)",
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {rzpConfig.configured ? (
              <>
                <span
                  className="badge"
                  style={{
                    background: rzpConfig.mode === "live" ? "var(--lp-error)" : "var(--lp-accent)",
                    color: "#fff",
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  RAZORPAY · {rzpConfig.mode === "live" ? "LIVE MODE" : "TEST MODE"}
                </span>
                <span className="text-sm" style={{ flex: 1 }}>
                  Connected to{" "}
                  <code style={{ fontSize: 12 }}>{rzpConfig.razorpayKeyId}</code>.
                  Price edits below will create real Razorpay plans
                  {rzpConfig.mode === "test" ? " in test mode" : " — be careful, this is live!"}.
                </span>
              </>
            ) : (
              <>
                <AlertTriangle
                  size={16}
                  style={{ color: "var(--lp-warning, #f59e0b)", flex: "none" }}
                />
                <span className="text-sm" style={{ flex: 1 }}>
                  <b>Razorpay isn&apos;t configured yet.</b> Price edits will
                  save to the database, but no Razorpay plan will be created
                  until <code>RAZORPAY_KEY_ID</code> and{" "}
                  <code>RAZORPAY_KEY_SECRET</code> are set on the server.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
          <AlertTriangle
            size={16}
            style={{ color: "var(--lp-warning, #f59e0b)", flex: "none", marginTop: 2 }}
          />
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--lp-text-muted)" }}>
            <b style={{ color: "var(--lp-text)" }}>How price changes work:</b>{" "}
            Razorpay doesn&apos;t allow editing the price on an existing plan,
            so a price update here triggers <b>creation of a new Razorpay
            plan</b>. The old plan ID is archived — existing subscriptions
            still renew at the old price until cancelled. New signups use
            the new plan automatically.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p className="text-muted text-sm">Loading plans…</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="card">
          <p className="text-muted text-sm">No plans configured.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 14,
          }}
        >
          {plans.map((p) => (
            <PlanCard key={p.code} plan={p} onEdit={() => setEditing(p)} />
          ))}
        </div>
      )}

      {editing && (
        <PlanEditModal
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPlans((cur) =>
              cur.map((p) => (p.code === updated.code ? updated : p)),
            )
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

// ---------- plan card ----------

function PlanCard({ plan, onEdit }) {
  const featureCount = Object.values(plan.features || {}).filter(Boolean).length
  const archivedCount = Array.isArray(plan.archivedRazorpayPlanIds)
    ? plan.archivedRazorpayPlanIds.length
    : 0

  return (
    <div
      className="card"
      style={{
        borderColor: plan.featured ? "var(--lp-accent)" : "var(--lp-border)",
        position: "relative",
      }}
    >
      {plan.featured && (
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            padding: "3px 8px",
            borderRadius: 999,
            background: "var(--lp-accent)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          FEATURED
        </span>
      )}

      <div style={{ marginBottom: 10 }}>
        <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
          {plan.code}
        </div>
        <h3 style={{ margin: "4px 0 4px", fontSize: 20 }}>{plan.name}</h3>
        <p
          className="text-muted text-sm"
          style={{ margin: 0, lineHeight: 1.45 }}
        >
          {plan.tagline}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid var(--lp-border)",
        }}
      >
        <div>
          <div className="text-xs text-muted">Monthly</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {plan.priceMonthly === 0 ? (
              "Free"
            ) : (
              <>
                <IndianRupee size={13} style={{ verticalAlign: "middle" }} />
                {(plan.priceMonthly / 100).toLocaleString("en-IN")}
              </>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted">Annual (per month)</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {plan.priceAnnual === 0 ? (
              "Free"
            ) : (
              <>
                <IndianRupee size={13} style={{ verticalAlign: "middle" }} />
                {(plan.priceAnnual / 100).toLocaleString("en-IN")}
              </>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid var(--lp-border)",
          fontSize: 13,
        }}
      >
        <div className="row" style={{ gap: 14, marginBottom: 6, flexWrap: "wrap" }}>
          <span>
            <b>{featureCount}</b> <span className="text-muted text-xs">features on</span>
          </span>
          <span>
            <b>{plan.bullets?.length || 0}</b> <span className="text-muted text-xs">bullets</span>
          </span>
          {plan.trialDays > 0 && (
            <span>
              <b>{plan.trialDays}</b> <span className="text-muted text-xs">day trial</span>
            </span>
          )}
        </div>
        {plan.code !== "BASIC" && (
          <div className="text-xs text-muted" style={{ marginTop: 8 }}>
            Razorpay:{" "}
            {plan.razorpayPlanIdMonthly || plan.razorpayPlanIdAnnual ? (
              <code style={{ fontSize: 11 }}>
                {plan.razorpayPlanIdMonthly || "—"} (M) ·{" "}
                {plan.razorpayPlanIdAnnual || "—"} (A)
              </code>
            ) : (
              <span style={{ color: "var(--lp-warning, #f59e0b)" }}>
                Not synced yet — edit price to create
              </span>
            )}
            {archivedCount > 0 && (
              <span style={{ marginLeft: 6 }}>
                · <b>{archivedCount}</b> archived
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 14 }}
        onClick={onEdit}
      >
        <Edit3 size={14} /> Edit plan
      </button>
    </div>
  )
}

// ---------- edit modal ----------

function PlanEditModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: plan.name,
    tagline: plan.tagline,
    featured: plan.featured,
    sortOrder: plan.sortOrder,
    priceMonthly: rupees(plan.priceMonthly),
    priceAnnual: rupees(plan.priceAnnual),
    trialDays: plan.trialDays || 0,
    limits: {
      ...plan.limits,
      storageBytesMb: bytesToMb(plan.limits?.storageBytes),
    },
    features: { ...plan.features },
    bullets: [...(plan.bullets || [])],
    support: plan.support || "",
    onboarding: plan.onboarding || "",
  }))
  const [submitting, setSubmitting] = useState(false)

  // Detect whether the price changed — surface a banner so the admin
  // knows we're about to mint a new Razorpay plan.
  const priceChanged = useMemo(() => {
    return (
      paise(form.priceMonthly) !== plan.priceMonthly ||
      paise(form.priceAnnual) !== plan.priceAnnual
    )
  }, [form.priceMonthly, form.priceAnnual, plan])

  const isBasic = plan.code === "BASIC"

  const setLimit = (key, value) => {
    setForm((f) => ({
      ...f,
      limits: { ...f.limits, [key]: value === "" ? null : Number(value) },
    }))
  }

  const setFeature = (key, value) => {
    setForm((f) => ({ ...f, features: { ...f.features, [key]: value } }))
  }

  const setBullet = (idx, value) => {
    setForm((f) => {
      const next = [...f.bullets]
      next[idx] = value
      return { ...f, bullets: next }
    })
  }
  const addBullet = () =>
    setForm((f) => ({ ...f, bullets: [...f.bullets, ""] }))
  const removeBullet = (idx) =>
    setForm((f) => ({ ...f, bullets: f.bullets.filter((_, i) => i !== idx) }))

  const onSave = async () => {
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        featured: form.featured,
        sortOrder: Number(form.sortOrder) || 100,
        priceMonthly: paise(form.priceMonthly),
        priceAnnual: paise(form.priceAnnual),
        trialDays: Number(form.trialDays) || 0,
        limits: {
          users: form.limits.users === "" ? null : form.limits.users,
          leads: form.limits.leads === "" ? null : form.limits.leads,
          projects: form.limits.projects === "" ? null : form.limits.projects,
          storageBytes: mbToBytes(form.limits.storageBytesMb),
          integrations:
            form.limits.integrations === "" ? null : form.limits.integrations,
        },
        features: form.features,
        bullets: form.bullets.map((b) => b.trim()).filter(Boolean),
        support: form.support.trim() || null,
        onboarding: form.onboarding.trim() || null,
      }
      const updated = await adminService.updatePlan(plan.code, payload)
      toast.success(
        priceChanged && !isBasic
          ? `${plan.name} updated · new Razorpay plan created`
          : `${plan.name} updated`,
      )
      onSaved?.(updated)
    } catch (err) {
      toast.error(err?.message || "Failed to update plan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => !submitting && onClose()}
      role="presentation"
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 720, maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-head" style={{ flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0 }}>Edit {plan.name} plan</h3>
            <p
              className="text-xs text-muted"
              style={{ margin: "4px 0 0", fontWeight: 400 }}
            >
              Code: <code>{plan.code}</code> · changes apply immediately to
              new signups
            </p>
          </div>
          <button
            className="btn-icon btn-ghost"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="modal-body"
          style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}
        >
          {priceChanged && !isBasic && (
            <div
              className="card"
              style={{
                borderColor: "var(--lp-accent)",
                background: "rgba(139,92,246,0.06)",
                padding: 12,
              }}
            >
              <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                <Sparkles
                  size={14}
                  style={{ color: "var(--lp-accent)", marginTop: 2, flex: "none" }}
                />
                <div className="text-sm" style={{ lineHeight: 1.5 }}>
                  <b>Price changed.</b> Saving will create a new Razorpay
                  plan and archive the old IDs. Existing subscriptions stay
                  at their original price until they cancel + re-subscribe.
                </div>
              </div>
            </div>
          )}

          {/* Identity */}
          <section>
            <SectionTitle icon={Layers}>Identity</SectionTitle>
            <Grid2>
              <Field label="Name">
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <Field label="Sort order (lower shows first)">
                <input
                  type="number"
                  className="input"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </Field>
              <Field label="Tagline" span={2}>
                <input
                  className="input"
                  value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                />
              </Field>
              <Field label="Featured (highlighted on pricing page)">
                <label className="row" style={{ gap: 8, marginTop: 6 }}>
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  />
                  <span className="text-sm">Mark as most popular</span>
                </label>
              </Field>
              {isBasic && (
                <Field label="Trial days (Basic only)">
                  <input
                    type="number"
                    className="input"
                    value={form.trialDays}
                    onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
                    min={0}
                  />
                </Field>
              )}
            </Grid2>
          </section>

          {/* Pricing */}
          <section>
            <SectionTitle icon={IndianRupee}>
              Pricing (in ₹ — backend stores paise)
            </SectionTitle>
            <Grid2>
              <Field label="Monthly price (₹/mo)">
                <input
                  type="number"
                  className="input"
                  value={form.priceMonthly}
                  onChange={(e) => setForm((f) => ({ ...f, priceMonthly: e.target.value }))}
                  min={0}
                  disabled={isBasic}
                />
                {isBasic && (
                  <span className="text-xs text-muted">Basic is always free.</span>
                )}
              </Field>
              <Field label="Annual price (₹/mo equivalent)">
                <input
                  type="number"
                  className="input"
                  value={form.priceAnnual}
                  onChange={(e) => setForm((f) => ({ ...f, priceAnnual: e.target.value }))}
                  min={0}
                  disabled={isBasic}
                />
                {!isBasic && (
                  <span className="text-xs text-muted">
                    Billed yearly · ₹{(Number(form.priceAnnual || 0) * 12).toLocaleString("en-IN")}/yr
                  </span>
                )}
              </Field>
            </Grid2>
          </section>

          {/* Limits */}
          <section>
            <SectionTitle>Limits (empty = unlimited)</SectionTitle>
            <Grid2>
              {LIMIT_KEYS.map(({ key, label, isStorage }) => (
                <Field key={key} label={isStorage ? `${label} (MB)` : label}>
                  <input
                    type="number"
                    className="input"
                    value={
                      isStorage
                        ? form.limits.storageBytesMb ?? ""
                        : form.limits[key] ?? ""
                    }
                    onChange={(e) =>
                      isStorage
                        ? setForm((f) => ({
                            ...f,
                            limits: { ...f.limits, storageBytesMb: e.target.value },
                          }))
                        : setLimit(key, e.target.value)
                    }
                    placeholder="Unlimited"
                    min={0}
                  />
                </Field>
              ))}
            </Grid2>
          </section>

          {/* Features */}
          <section>
            <SectionTitle>Feature toggles</SectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {FEATURE_KEYS.map(([key, label]) => (
                <label
                  key={key}
                  className="row"
                  style={{
                    gap: 8,
                    padding: "8px 10px",
                    border: "1px solid var(--lp-border)",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!form.features[key]}
                    onChange={(e) => setFeature(key, e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Bullets */}
          <section>
            <SectionTitle>
              Pricing card bullets (shown on /pricing and /admin/billing)
            </SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {form.bullets.map((b, i) => (
                <div
                  key={i}
                  className="row"
                  style={{ gap: 6, alignItems: "center" }}
                >
                  <Check
                    size={14}
                    style={{ color: "var(--lp-accent)", flex: "none" }}
                  />
                  <input
                    className="input"
                    value={b}
                    onChange={(e) => setBullet(i, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-icon btn-ghost"
                    onClick={() => removeBullet(i)}
                    aria-label="Remove bullet"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={addBullet}
                style={{ alignSelf: "flex-start", marginTop: 4 }}
              >
                <Plus size={12} /> Add bullet
              </button>
            </div>
          </section>

          {/* Support / Onboarding */}
          <section>
            <SectionTitle>Support & onboarding (display strings)</SectionTitle>
            <Grid2>
              <Field label="Support level">
                <input
                  className="input"
                  value={form.support}
                  onChange={(e) => setForm((f) => ({ ...f, support: e.target.value }))}
                  placeholder="e.g. Email · Priority"
                />
              </Field>
              <Field label="Onboarding">
                <input
                  className="input"
                  value={form.onboarding}
                  onChange={(e) => setForm((f) => ({ ...f, onboarding: e.target.value }))}
                  placeholder="e.g. Self-serve · Guided"
                />
              </Field>
            </Grid2>
          </section>
        </div>

        <div className="modal-foot" style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSave}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- tiny layout atoms ----------

function SectionTitle({ children, icon: Icon }) {
  return (
    <div
      className="text-xs text-muted"
      style={{
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 10,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {Icon && <Icon size={12} />}
      {children}
    </div>
  )
}

function Grid2({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      }}
    >
      {children}
    </div>
  )
}

function Field({ label, children, span = 1 }) {
  return (
    <div className="field" style={{ gridColumn: `span ${span}` }}>
      <label className="label text-xs">{label}</label>
      {children}
    </div>
  )
}
