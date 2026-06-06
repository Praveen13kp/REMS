import { useMemo, useState } from "react"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { roleLabel } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import UserAvatar from "@/components/common/UserAvatar"
import PhoneInput from "@/components/forms/PhoneInput"

// Channel Partner profile — mirrors the admin Profile "policy": avatar header,
// completeness banner, sectioned card, shared PhoneInput, save via /users/me.
// A CP has companyId=null, so there's no company section and no tenant-scoped
// avatar upload (file storage is tenant-scoped) — avatar shows initials/photo.

const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/

function CompletenessBadge({ percent, missing }) {
  const tone =
    percent >= 100
      ? { bg: "rgba(16,185,129,0.10)", border: "var(--lp-success, #10B981)", icon: CheckCircle2 }
      : { bg: "rgba(245,158,11,0.10)", border: "var(--lp-warning, #f59e0b)", icon: AlertCircle }
  const Icon = tone.icon
  return (
    <div className="cp-card" style={{ background: tone.bg, borderColor: tone.border, marginBottom: 16 }}>
      <div className="row" style={{ gap: 14, alignItems: "center" }}>
        <Icon size={20} style={{ color: tone.border, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row row-between" style={{ alignItems: "baseline", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Profile {percent}% complete</div>
            {missing.length > 0 && (
              <div className="text-xs text-muted">Finish your profile so companies recognise you</div>
            )}
          </div>
          <div style={{ marginTop: 8, height: 6, background: "var(--lp-surface-2)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: percent + "%", height: "100%", background: tone.border, transition: "width .3s ease" }} />
          </div>
          {missing.length > 0 && (
            <div className="text-xs text-muted" style={{ marginTop: 8 }}>Missing: {missing.join(" · ")}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  })
  const [saving, setSaving] = useState(false)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const { percent, missing } = useMemo(() => {
    const checks = [
      { label: "Full name", value: form.name },
      { label: "Phone number", value: form.phone },
    ]
    const filled = checks.filter((c) => !!(c.value && String(c.value).trim()))
    return {
      percent: Math.round((filled.length / checks.length) * 100),
      missing: checks.filter((c) => !filled.includes(c)).map((c) => c.label),
    }
  }, [form.name, form.phone])

  const save = async (e) => {
    e?.preventDefault?.()
    if (!NAME_REGEX.test(form.name)) {
      toast.error("Name cannot contain numbers")
      return
    }
    if (form.phone && !/^\+\d{1,4}\d{8,15}$/.test(form.phone)) {
      toast.error("Enter a valid phone number")
      return
    }
    setSaving(true)
    try {
      const res = await api.patch("/users/me", { name: form.name, phone: form.phone })
      const updated = res?.data ?? res
      setUser({ ...user, ...updated, name: form.name, phone: form.phone })
      toast.success("Profile updated")
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Profile</h1>
          <p>Your channel partner profile, visible to the companies you collaborate with.</p>
        </div>
      </div>

      <div style={{ maxWidth: 620 }}>
        <CompletenessBadge percent={percent} missing={missing} />

        <form onSubmit={save} className="cp-card">
          {/* Avatar header */}
          <div className="row" style={{ gap: 16, alignItems: "center", marginBottom: 22 }}>
            <UserAvatar user={user} size="lg" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>
                {user?.name || "—"}
              </div>
              <div className="text-sm text-muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.email}
              </div>
              <span className="badge badge-info" style={{ marginTop: 8, display: "inline-flex" }}>
                {roleLabel(user?.role) || "Channel Partner"}
              </span>
            </div>
          </div>

          <div className="cp-card-title" style={{ marginBottom: 14 }}>Personal information</div>

          <div className="field">
            <label>Full name</label>
            <input className="input" value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="Your name" />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" value={form.email} disabled />
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              Email can&apos;t be changed — it&apos;s your sign-in identity across every workspace.
            </div>
          </div>
          <div className="field">
            <label>Phone</label>
            <PhoneInput value={form.phone} onChange={(v) => setF("phone", v)} />
          </div>

          <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
