import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useOutletContext } from "react-router-dom"
import { useForm } from "react-hook-form"
import { ImageOff, Upload } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { CURRENCIES, TIMEZONES, TIMEZONE_TO_CURRENCY } from "@/lib/constants"

const MAX_LOGO_BYTES = 5 * 1024 * 1024 // 5 MB

const brandingSchema = z.object({
  logoUrl: z
    .union([z.string().url("Enter a valid URL"), z.literal("")])
    .optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
})

const errStyle = { color: "var(--lp-error)", fontSize: "0.8rem", marginTop: 4 }
const hintStyle = { color: "var(--lp-text-muted)", fontSize: "0.8rem", marginTop: 4 }

export default function Branding() {
  const navigate = useNavigate()
  const { company, setCompany } = useOutletContext() ?? {}

  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logoUrl: company?.logoUrl ?? "",
      timezone: company?.timezone ?? "Asia/Kolkata",
      currency: company?.currency ?? "INR",
    },
  })

  // Auto-switch currency whenever the timezone changes (Asia/Dubai → AED,
  // Europe/London → GBP, etc.). The user can still override it manually
  // after — once they touch the currency dropdown themselves we honor
  // that choice on subsequent timezone tweaks.
  const watchedTimezone = watch("timezone")
  const [currencyTouched, setCurrencyTouched] = useState(false)
  useEffect(() => {
    if (currencyTouched) return
    const mapped = TIMEZONE_TO_CURRENCY[watchedTimezone]
    if (mapped) setValue("currency", mapped, { shouldDirty: true })
  }, [watchedTimezone, currencyTouched, setValue])

  const logoUrl = watch("logoUrl")
  const [logoLoadError, setLogoLoadError] = useState(false)
  const [previewSrc, setPreviewSrc] = useState("")
  useEffect(() => {
    setLogoLoadError(false)
    if (!logoUrl) {
      setPreviewSrc("")
      return
    }
    const apiBase = api.defaults.baseURL || ""
    if (logoUrl.startsWith(apiBase)) {
      // Authed download — fetch as blob so the cookie goes through and CORS
      // / Cross-Origin-Resource-Policy don't block <img>.
      let revoked = false
      let blobUrl = ""
      ;(async () => {
        try {
          const res = await fetch(logoUrl, { credentials: "include" })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const blob = await res.blob()
          if (revoked) return
          blobUrl = URL.createObjectURL(blob)
          setPreviewSrc(blobUrl)
        } catch {
          setLogoLoadError(true)
        }
      })()
      return () => {
        revoked = true
        if (blobUrl) URL.revokeObjectURL(blobUrl)
      }
    }
    setPreviewSrc(logoUrl)
  }, [logoUrl])

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, SVG)")
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Image too large (max 5 MB)")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "branding")
      const res = await api.post("/files", fd)
      const id = res?.data?.id
      if (!id) throw new Error("Upload did not return a file id")
      const url = `${api.defaults.baseURL}/files/${id}/download`
      setValue("logoUrl", url, { shouldValidate: true, shouldDirty: true })
      toast.success("Logo uploaded")
    } catch (err) {
      toast.error(err?.message || "Failed to upload logo")
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      const res = await api.patch("/company/me", {
        logoUrl: data.logoUrl || null,
        timezone: data.timezone || null,
        currency: data.currency || null,
      })
      const updated = res?.data ?? res?.company ?? null
      if (updated && setCompany) setCompany(updated)
      navigate("/onboarding/team")
    } catch (err) {
      toast.error(err?.message || "Failed to save branding")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="stack" noValidate>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        <div className="field">
          <label htmlFor="logoFile">Logo</label>
          <input
            ref={fileInputRef}
            id="logoFile"
            type="file"
            accept="image/*"
            onChange={handleLogoFile}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Upload size={16} />
            {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
          </button>
          <input
            id="logoUrl"
            type="url"
            className="input"
            placeholder="…or paste an image URL"
            aria-invalid={!!errors.logoUrl}
            style={{ marginTop: 8 }}
            {...register("logoUrl")}
          />
          {errors.logoUrl ? (
            <div style={errStyle}>{errors.logoUrl.message}</div>
          ) : (
            <div style={hintStyle}>
              PNG, JPG, or SVG, max 5 MB. You can also paste a link.
            </div>
          )}
          {logoUrl && !errors.logoUrl && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 8,
                border: `1px solid ${
                  logoLoadError ? "var(--lp-error)" : "var(--lp-border)"
                }`,
                borderRadius: "var(--lp-radius-input)",
              }}
            >
              {logoLoadError ? (
                <>
                  <ImageOff
                    size={20}
                    style={{ color: "var(--lp-error)", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--lp-error)" }}>
                    Couldn&apos;t load image. Make sure the URL points directly
                    to a PNG, JPG, or SVG file.
                  </span>
                </>
              ) : (
                <>
                  <a
                    href={previewSrc || logoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Click to view full size"
                    style={{ lineHeight: 0 }}
                  >
                    <img
                      src={previewSrc || logoUrl}
                      alt="Logo preview"
                      style={{
                        height: 40,
                        width: 40,
                        borderRadius: 4,
                        objectFit: "contain",
                        cursor: "zoom-in",
                      }}
                      onError={() => setLogoLoadError(true)}
                    />
                  </a>
                  <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                    Preview
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="timezone">Timezone</label>
          <select id="timezone" className="select" {...register("timezone")}>
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="currency">Currency</label>
          <select
            id="currency"
            className="select"
            {...register("currency", { onChange: () => setCurrencyTouched(true) })}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <div style={hintStyle}>
            Auto-set from your timezone — change it any time.
          </div>
        </div>
      </div>

      <div className="row row-between">
        <Link to="/onboarding/team" className="btn btn-ghost">
          Skip for now
        </Link>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving…" : "Save and continue"}
        </button>
      </div>
    </form>
  )
}
