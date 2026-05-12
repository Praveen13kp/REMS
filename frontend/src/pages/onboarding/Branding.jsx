import { Link, useNavigate, useOutletContext } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import {
  CURRENCIES,
  TIMEZONES,
} from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="logoUrl" className="text-sm font-medium">
            Logo URL
          </label>
          <Input
            id="logoUrl"
            type="url"
            placeholder="https://..."
            aria-invalid={!!errors.logoUrl}
            {...register("logoUrl")}
          />
          {errors.logoUrl ? (
            <p className="text-xs text-destructive">{errors.logoUrl.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Paste a link to your logo. You can upload later.
            </p>
          )}
          {logoUrl && !errors.logoUrl && (
            <div className="mt-2 flex items-center gap-3 rounded-md border border-input p-2">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-10 w-10 rounded object-contain"
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden"
                }}
              />
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="brandColor" className="text-sm font-medium">
            Brand color
          </label>
          <Controller
            name="brandColor"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <input
                  id="brandColor"
                  type="color"
                  value={field.value || "#4f46e5"}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent"
                  aria-label="Pick brand color"
                />
                <Input
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="#4f46e5"
                  aria-invalid={!!errors.brandColor}
                  className="flex-1"
                />
              </div>
            )}
          />
          {errors.brandColor && (
            <p className="text-xs text-destructive">
              {errors.brandColor.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="timezone" className="text-sm font-medium">
            Timezone
          </label>
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="currency" className="text-sm font-medium">
            Currency
          </label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link
          to="/onboarding/team"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Skip for now
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          Save and continue
        </Button>
      </div>
    </form>
  )
}
