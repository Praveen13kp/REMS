import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2Icon, MailCheckIcon } from "lucide-react"
import { toast } from "sonner"

import AuthShell from "@/components/auth/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
})

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (_data) => {
    // TODO(BE): wire to better-auth password-reset request when endpoint is live.
    await new Promise((r) => setTimeout(r, 400))
    setSent(true)
    toast.success("If that account exists, a reset link is on its way.")
  }

  return (
    <AuthShell heading="Reset your password">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot password?
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send a reset link.
        </p>
      </div>

      {sent ? (
        <div className="mt-8 flex flex-col items-start gap-4 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-foreground">
            <MailCheckIcon className="size-5 text-primary" />
            <span className="font-medium">Check your inbox</span>
          </div>
          <p className="text-sm text-muted-foreground">
            We sent a reset link to your email if an account exists for it.
            The link expires in 30 minutes.
          </p>
          <Link
            to="/login"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 flex flex-col gap-4"
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
              <p className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            Send Reset Link
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              ← Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
