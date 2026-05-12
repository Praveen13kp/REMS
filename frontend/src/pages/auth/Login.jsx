import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowRightIcon,
  ChromeIcon,
  EyeIcon,
  EyeOffIcon,
  GithubIcon,
  Loader2Icon,
  SquareIcon,
} from "lucide-react"
import { toast } from "sonner"

import AuthShell from "@/components/auth/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuthStore } from "@/stores/authStore"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().optional(),
})

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  })

  const remember = watch("remember")

  const onSubmit = async (data) => {
    try {
      await signIn({ email: data.email, password: data.password })
      const from = new URLSearchParams(location.search).get("from")
      navigate(from || "/dashboard", { replace: true })
    } catch (err) {
      toast.error(err?.message || "Failed to sign in")
    }
  }

  const oauthDemo = (provider) =>
    toast.info(`${provider} sign-in (demo only)`)

  return (
    <AuthShell heading="Welcome back!">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Don&apos;t have one?{" "}
          <Link
            to="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create account
          </Link>
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => oauthDemo("Google")}
          aria-label="Sign in with Google"
        >
          <ChromeIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => oauthDemo("Microsoft")}
          aria-label="Sign in with Microsoft"
        >
          <SquareIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => oauthDemo("GitHub")}
          aria-label="Sign in with GitHub"
        >
          <GithubIcon className="size-4" />
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or sign in with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Label className="cursor-pointer">
          <Checkbox
            checked={!!remember}
            onCheckedChange={(v) => setValue("remember", !!v)}
          />
          <span className="font-normal">Remember me</span>
        </Label>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <>
              Sign In <ArrowRightIcon className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  )
}
