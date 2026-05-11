import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { COMPANY_TYPES, COMPANY_TYPE_VALUES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-xl">Create your RELMS workspace</CardTitle>
          <CardDescription>
            Tell us about your company and the workspace owner. You can invite
            teammates after onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <section className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Company
                </h2>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="companyName" className="text-sm font-medium">
                    Company name
                  </label>
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
                  <label htmlFor="companyType" className="text-sm font-medium">
                    Company type
                  </label>
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
                  <label htmlFor="city" className="text-sm font-medium">
                    City
                  </label>
                  <Input
                    id="city"
                    placeholder="Pune"
                    aria-invalid={!!errors.city}
                    {...register("city")}
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive">
                      {errors.city.message}
                    </p>
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Owner
                </h2>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ownerName" className="text-sm font-medium">
                    Full name
                  </label>
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

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ownerEmail" className="text-sm font-medium">
                    Work email
                  </label>
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
                  <label htmlFor="ownerPhone" className="text-sm font-medium">
                    Phone
                  </label>
                  <Input
                    id="ownerPhone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    aria-invalid={!!errors.ownerPhone}
                    {...register("ownerPhone")}
                  />
                  {errors.ownerPhone && (
                    <p className="text-xs text-destructive">
                      {errors.ownerPhone.message}
                    </p>
                  )}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
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
                {errors.password ? (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters with a letter and a number.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm password
                </label>
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
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-input accent-primary"
                  aria-invalid={!!errors.terms}
                  {...register("terms")}
                />
                <span>
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
              </label>
              {errors.terms && (
                <p className="text-xs text-destructive">{errors.terms.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              Create workspace
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
