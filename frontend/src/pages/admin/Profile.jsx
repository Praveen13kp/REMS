import { useEffect, useMemo, useState, useRef } from "react"
import { Upload, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt, roleLabel } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import { COMPANY_TYPES } from "@/lib/constants"
import PhoneInput from "@/components/forms/PhoneInput"
import DepartmentSelect from "@/components/forms/DepartmentSelect"
import UserAvatar from "@/components/common/UserAvatar"

// Profile page. Two sections:
//   1. Personal — every role can edit their own name/phone/dept/photo.
//   2. Company  — OWNER/ADMIN can edit (name, type, etc.). Other roles see
//      it read-only as informational context.
// Profile completeness banner up top scores both sections so a partial
// profile (e.g. missing phone or company type) is visible at a glance.

const PROFILE_FIELDS = [
  { key: "name", label: "Full name" },
  { key: "phone", label: "Phone number" },
  { key: "dept", label: "Department" },
  { key: "avatar", label: "Profile photo" },
]

const COMPANY_FIELDS_OWNER = [
  { key: "name", label: "Company name" },
  { key: "type", label: "Company type" },
]

function CompletenessBadge({ percent, missing }) {
  const tone =
    percent >= 90
      ? { bg: "rgba(16,185,129,0.10)", border: "var(--lp-success, #10B981)", icon: CheckCircle2 }
      : percent >= 60
        ? { bg: "rgba(245,158,11,0.10)", border: "var(--lp-warning, #f59e0b)", icon: AlertCircle }
        : { bg: "rgba(220,38,38,0.10)", border: "var(--lp-error)", icon: AlertCircle }
  const Icon = tone.icon

  return (
    <div
      className="card mb-4"
      style={{
        background: tone.bg,
        borderColor: tone.border,
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <div className="row" style={{ gap: 14, alignItems: "center" }}>
        <Icon size={20} style={{ color: tone.border, flex: "none" }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 700 }}>
              Profile {percent}% complete
            </div>
            {missing.length > 0 && (
              <div className="text-xs text-muted">
                Update your profile to unlock the full experience
              </div>
            )}
          </div>
          <div
            style={{
              marginTop: 8,
              height: 6,
              background: "var(--lp-surface-2)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: percent + "%",
                height: "100%",
                background: tone.border,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          {missing.length > 0 && (
            <div className="text-xs text-muted" style={{ marginTop: 8 }}>
              Missing: {missing.join(" · ")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Profile() {
  const currentUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const fileInputRef = useRef(null)
  const canEditCompany =
    currentUser?.role === "OWNER" || currentUser?.role === "ADMIN"

  const [form, setForm] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    dept: currentUser?.dept || "",
    avatar: currentUser?.avatar || "",
  })
  const [companyForm, setCompanyForm] = useState({
    name: "",
    type: "",
  })
  const [companyLoaded, setCompanyLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!currentUser?.companyId) {
      setCompanyLoaded(true)
      return
    }

    let cancelled = false
    api
      .get("/company/me")
      .then((res) => {
        if (cancelled) return
        const c = res?.data ?? res ?? {}
        setCompanyForm({
          name: c.name || "",
          type: c.type || c.industry || "",
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCompanyLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [currentUser?.companyId])

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))
  const setCF = (k, v) => setCompanyForm((prev) => ({ ...prev, [k]: v }))

  // Compute % complete + which fields are missing for the banner.
  const { percent, missing } = useMemo(() => {
    // Owners don't have a department concept on this page (Department is a
    // team-management field for staff under them), so drop it from the
    // completeness scoring — otherwise an owner can never reach 100%.
    const isOwner = currentUser?.role === "OWNER"
    const personalFields = PROFILE_FIELDS.filter(
      (f) => !(isOwner && f.key === "dept"),
    )
    const checks = personalFields.map((f) => ({ ...f, value: form[f.key] }))
    // Only include company fields if the user actually has a company account.
    // Platform-wide roles (Super Admin, Broker) score 100% on personal info.
    if (currentUser?.companyId && canEditCompany && companyLoaded) {
      for (const f of COMPANY_FIELDS_OWNER) {
        checks.push({
          key: `company.${f.key}`,
          label: f.label,
          value: companyForm[f.key],
        })
      }
    }
    const filled = checks.filter((c) => !!(c.value && String(c.value).trim()))
    const pct = checks.length
      ? Math.round((filled.length / checks.length) * 100)
      : 100
    return {
      percent: pct,
      missing: checks.filter((c) => !filled.includes(c)).map((c) => c.label),
    }
  }, [form, companyForm, canEditCompany, companyLoaded, currentUser?.role])

  if (!currentUser) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>Not signed in</h3>
          <p>You need to sign in to view your profile.</p>
        </div>
      </div>
    )
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "avatars")

    try {
      const res = await api.post("/files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const fileData = res?.data ?? res
      const avatarPath = `/files/${fileData.id}/download`

      await api.patch("/users/me", { image: avatarPath })

      setUser({
        ...currentUser,
        image: avatarPath,
        avatar: avatarPath,
      })
      setF("avatar", avatarPath)
      toast.success("Photo updated")
    } catch (err) {
      toast.error(err?.message || "Failed to upload photo")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/

  const save = async () => {
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
      await api.patch("/users/me", {
        name: form.name,
        phone: form.phone,
        dept: form.dept,
      })

      if (canEditCompany) {
        await api.patch("/company/me", {
          name: companyForm.name,
          type: companyForm.type || null,
        })
      }

      setUser({
        ...currentUser,
        name: form.name,
        email: form.email,
        phone: form.phone,
        dept: form.dept,
      })
      toast.success("Profile updated")
    } catch (err) {
      toast.error(err?.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <CompletenessBadge percent={percent} missing={missing} />

      <div className="card">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept="image/*"
        />
        <div className="row" style={{ gap: 18, marginBottom: 24 }}>
          <UserAvatar user={currentUser} size="lg" />
          <div>
            <h3 style={{ fontSize: "1.333rem" }}>{currentUser.name}</h3>
            <p className="text-muted">{currentUser.email}</p>
            <span className="badge badge-info mt-2">
              {roleLabel(currentUser.role)}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: "auto" }}
            onClick={handlePhotoClick}
            disabled={uploading}
          >
            <Upload size={14} /> {uploading ? "Uploading…" : "Change Photo"}
          </button>
        </div>

        <div className="card-title" style={{ marginBottom: 12 }}>
          Personal information
        </div>
        <div className="grid grid-2" style={{ gap: "0 14px" }}>
          <div className="field">
            <label>Full name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setF("name", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              value={form.email}
              disabled
            />
          </div>
          <div className="field">
            <label>Phone</label>
            <PhoneInput
              value={form.phone}
              onChange={(v) => setF("phone", v)}
            />
          </div>
          {(currentUser?.role === "AGENT" || currentUser?.role === "MANAGER") && (
            <div className="field">
              <label>Department</label>
              <DepartmentSelect
                value={form.dept}
                onChange={(v) => setF("dept", v)}
              />
            </div>
          )}
        </div>

        <div className="card-title" style={{ margin: "24px 0 12px" }}>
          Company details{" "}
          {!canEditCompany && (
            <span className="text-xs text-muted" style={{ fontWeight: 400 }}>
              · read-only · only Owner / Admin can edit
            </span>
          )}
        </div>
        <div className="grid grid-2" style={{ gap: "0 14px" }}>
          <div className="field">
            <label>Company name</label>
            <input
              className="input"
              value={companyForm.name}
              disabled={!canEditCompany}
              onChange={(e) => setCF("name", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Company type</label>
            <select
              className="input"
              value={companyForm.type}
              disabled={!canEditCompany}
              onChange={(e) => setCF("type", e.target.value)}
            >
              <option value="">— Not set —</option>
              {COMPANY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {canEditCompany && !companyForm.type && (
              <div
                className="text-xs"
                style={{ color: "var(--lp-warning, #f59e0b)", marginTop: 4 }}
              >
                Add your company type to help us tailor LeadPro for you.
              </div>
            )}
          </div>
        </div>

        <div className="row mt-4" style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  )
}
