import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { COMPANY_TYPES, COMPANY_TYPE_VALUES } from "@/lib/constants"
import AuthShell from "@/components/auth/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuthStore } from "@/stores/authStore"

const signupSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required"),
    companyType: z.enum(COMPANY_TYPE_VALUES, {
      message: "Select a company type",
    }),
    city: z.string().min(2, "City is required"),
    ownerName: z.string().min(2, "Full name is required"),
    ownerEmail: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email"),
    ownerPhone: z
      .string()
      .min(10, "Enter a valid phone number")
      .regex(/^[0-9+\-\s]+$/, "Only digits, +, - and spaces are allowed"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Must include a letter")
      .regex(/[0-9]/, "Must include a number"),
    confirmPassword: z.string(),
    terms: z.literal(true, { message: "You must accept the terms" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

const SERVER_FIELDS = new Set([
  "companyName",
  "companyType",
  "city",
  "ownerName",
  "ownerEmail",
  "ownerPhone",
  "password",
])

const Req = () => <span className="text-destructive">*</span>

const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-amber-500",
  "bg-blue-500",
  "bg-emerald-500",
]
const STRENGTH_LABELS = ["Weak", "Fair", "Good", "Strong"]

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      companyName: "",
      companyType: "",
      city: "",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  })

  const passwordValue = watch("password") || ""
  const strength = useMemo(() => {
    let s = 0
    if (passwordValue.length >= 8) s++
    if (/[A-Z]/.test(passwordValue)) s++
    if (/[0-9]/.test(passwordValue)) s++
    if (/[^A-Za-z0-9]/.test(passwordValue)) s++
    return s
  }, [passwordValue])

  const onSubmit = async (data) => {
    const payload = {
      companyName: data.companyName,
      companyType: data.companyType,
      city: data.city,
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      ownerPhone: data.ownerPhone,
      password: data.password,
    }

    try {
      const res = await api.post("/company/register", payload)
      const rawUser = res?.user ?? res?.data?.user ?? null
      setUser(rawUser)
      if (!rawUser) {
        toast.error("Registration succeeded but session did not start. Please sign in.")
        navigate("/login", { replace: true })
        return
      }
      navigate("/onboarding/welcome", { replace: true })
    } catch (err) {
      if (err?.status === 409) {
        setError("ownerEmail", {
          type: "server",
          message: err?.message || "An account with this email already exists",
        })
        return
      }
      if (err?.fields && typeof err.fields === "object") {
        let mapped = false
        for (const [field, message] of Object.entries(err.fields)) {
          if (SERVER_FIELDS.has(field)) {
            setError(field, { type: "server", message })
            mapped = true
          }
        }
        if (mapped) return
      }
      toast.error(err?.message || "Failed to create your workspace")
    }
  }

  return (
    <AuthShell heading="Start your 14-day free trial">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your company account
        </h1>
        <p className="text-sm text-muted-foreground">
          Already on LeadPro?{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 flex flex-col gap-4"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">
              Company name <Req />
            </Label>
            <Input
              id="companyName"
              placeholder="Acme Realty Pvt Ltd"
              aria-invalid={!!errors.companyName}
              {...register("companyName")}
            />
            {errors.companyName && (
              <p className="text-xs text-destructive">
                {errors.companyName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ownerName">
              Owner name <Req />
            </Label>
            <Input
              id="ownerName"
              autoComplete="name"
              placeholder="Jane Doe"
              aria-invalid={!!errors.ownerName}
              {...register("ownerName")}
            />
            {errors.ownerName && (
              <p className="text-xs text-destructive">
                {errors.ownerName.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyType">
              Company type <Req />
            </Label>
            <Controller
              name="companyType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="companyType"
                    className="w-full"
                    aria-invalid={!!errors.companyType}
                  >
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.companyType && (
              <p className="text-xs text-destructive">
                {errors.companyType.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">
              City <Req />
            </Label>
            <Input
              id="city"
              placeholder="Pune"
              aria-invalid={!!errors.city}
              {...register("city")}
            />
            {errors.city && (
              <p className="text-xs text-destructive">{errors.city.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ownerEmail">
            Email <Req />
          </Label>
          <Input
            id="ownerEmail"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={!!errors.ownerEmail}
            {...register("ownerEmail")}
          />
          {errors.ownerEmail && (
            <p className="text-xs text-destructive">
              {errors.ownerEmail.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ownerPhone">
            Phone <Req />
          </Label>
          <Input
            id="ownerPhone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98xxxxxxxx"
            aria-invalid={!!errors.ownerPhone}
            {...register("ownerPhone")}
          />
          {errors.ownerPhone && (
            <p className="text-xs text-destructive">
              {errors.ownerPhone.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">
            Password <Req />
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="********"
              aria-invalid={!!errors.password}
              className="pr-9"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded bg-muted">
            <div
              className={`h-full transition-all ${
                STRENGTH_COLORS[Math.max(0, strength - 1)] || "bg-destructive"
              }`}
              style={{ width: `${strength * 25}%` }}
            />
          </div>
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {passwordValue
                ? `Strength: ${
                    STRENGTH_LABELS[Math.max(0, strength - 1)] || "Weak"
                  }`
                : "Use 8+ characters with mixed case, numbers, symbols"}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">
            Confirm password <Req />
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="********"
              aria-invalid={!!errors.confirmPassword}
              className="pr-9"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Controller
            name="terms"
            control={control}
            render={({ field }) => (
              <Label className="items-start cursor-pointer">
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={(v) => field.onChange(!!v)}
                  aria-invalid={!!errors.terms}
                  className="mt-0.5"
                />
                <span className="text-sm font-normal">
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </Label>
            )}
          />
          {errors.terms && (
            <p className="text-xs text-destructive">{errors.terms.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          Create Account
        </Button>
      </form>
    </AuthShell>
  )
}
