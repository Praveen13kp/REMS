import { useEffect, useState } from "react"
import { Link, useNavigate, useOutletContext } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { ImageOff } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { CURRENCIES, TIMEZONES } from "@/lib/constants"

const brandingSchema = z.object({
  logoUrl: z
    .union([z.string().url("Enter a valid URL"), z.literal("")])
    .optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #4f46e5")
    .optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
})

const errStyle = { color: "var(--lp-error)", fontSize: 12, marginTop: 4 }
const hintStyle = { color: "var(--lp-text-muted)", fontSize: 12, marginTop: 4 }

export default function Branding() {
  const navigate = useNavigate()
  const { company } = useOutletContext() ?? {}

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logoUrl: company?.logoUrl ?? "",
      brandColor: company?.brandColor ?? "#4f46e5",
      timezone: company?.timezone ?? "Asia/Kolkata",
      currency: company?.currency ?? "INR",
    },
  })

  const logoUrl = watch("logoUrl")
  const [logoLoadError, setLogoLoadError] = useState(false)
  useEffect(() => {
    setLogoLoadError(false)
  }, [logoUrl])

  const onSubmit = async (data) => {
    try {
      await api.patch("/company/me", {
        logoUrl: data.logoUrl || null,
        brandColor: data.brandColor || null,
        timezone: data.timezone || null,
        currency: data.currency || null,
      })
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
          <label htmlFor="logoUrl">Logo URL</label>
          <input
            id="logoUrl"
            type="url"
            className="input"
            placeholder="https://..."
            aria-invalid={!!errors.logoUrl}
            {...register("logoUrl")}
          />
          {errors.logoUrl ? (
            <div style={errStyle}>{errors.logoUrl.message}</div>
          ) : (
            <div style={hintStyle}>
              Paste a link to your logo. You can upload later.
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
                  <span style={{ fontSize: 12, color: "var(--lp-error)" }}>
                    Couldn&apos;t load image. Make sure the URL points directly
                    to a PNG, JPG, or SVG file.
                  </span>
                </>
              ) : (
                <>
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    style={{
                      height: 40,
                      width: 40,
                      borderRadius: 4,
                      objectFit: "contain",
                    }}
                    onError={() => setLogoLoadError(true)}
                  />
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    Preview
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="brandColor">Brand color</label>
          <Controller
            name="brandColor"
            control={control}
            render={({ field }) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  id="brandColor"
                  type="color"
                  value={field.value || "#4f46e5"}
                  onChange={(e) => field.onChange(e.target.value)}
                  aria-label="Pick brand color"
                  style={{
                    height: 38,
                    width: 48,
                    cursor: "pointer",
                    borderRadius: "var(--lp-radius-input)",
                    border: "1px solid var(--lp-border)",
                    background: "transparent",
                    padding: 2,
                  }}
                />
                <input
                  className="input"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="#4f46e5"
                  aria-invalid={!!errors.brandColor}
                  style={{ flex: 1 }}
                />
              </div>
            )}
          />
          {errors.brandColor && (
            <div style={errStyle}>{errors.brandColor.message}</div>
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
          <select id="currency" className="select" {...register("currency")}>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
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
