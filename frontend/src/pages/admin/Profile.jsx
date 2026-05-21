import { useState, useRef } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt, roleLabel } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import PhoneInput from "@/components/forms/PhoneInput"

// Visual port of leadpro-realty/src/pages/Profile.jsx.
// Two-column-ish layout: header card (avatar + identity) and editable fields.

export default function Profile() {
  const currentUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    dept: currentUser?.dept || "",
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

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

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

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
        avatar: avatarPath,
      })
      toast.success("Photo updated")
    } catch (err) {
      toast.error(err?.message || "Failed to upload photo")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.patch("/users/me", {
        name: form.name,
        phone: form.phone,
        dept: form.dept,
      })
      const updated = res?.data ?? res ?? null
      setUser({
        ...currentUser,
        ...(updated && typeof updated === "object" ? updated : {
          name: form.name,
          phone: form.phone,
          dept: form.dept,
        }),
      })
      toast.success("Profile updated")
    } catch (err) {
      toast.error(err?.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const avatarUrl = fmt.avatarUrl(currentUser.avatar)

  return (
    <div className="card">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept="image/*"
      />
      <div className="row" style={{ gap: 18, marginBottom: 24 }}>
        <div
          className="avatar lg"
          style={{ width: 80, height: 80, fontSize: 24 }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={currentUser.name} />
          ) : (
            fmt.initials(currentUser.name || "?")
          )}
        </div>
        <div>
          <h3 style={{ fontSize: 20 }}>{currentUser.name}</h3>
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
        <div className="field">
          <label>Department</label>
          <input
            className="input"
            value={form.dept}
            onChange={(e) => setF("dept", e.target.value)}
          />
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
  )
}
