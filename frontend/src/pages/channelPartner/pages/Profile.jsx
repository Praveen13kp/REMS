import { useState } from "react"
import { Mail, Phone, Save, User } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  })
  const [saving, setSaving] = useState(false)
  const u = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/
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
      const res = await api.patch(`/users/${user.id}`, { name: form.name, phone: form.phone })
      const updated = res?.data ?? res
      setUser({ ...user, ...updated })
      toast.success("Profile updated")
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
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
      <form onSubmit={submit} className="cp-card" style={{ maxWidth: 560 }}>
        <div className="field"><label><User size={12} /> Name</label><input className="input" value={form.name} onChange={u("name")} /></div>
        <div className="field"><label><Mail size={12} /> Email</label><input className="input" value={form.email} disabled /></div>
        <div className="field"><label><Phone size={12} /> Phone</label><input className="input" value={form.phone} onChange={u("phone")} /></div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={14} /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </>
  )
}
