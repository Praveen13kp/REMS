import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2Icon, MailIcon, MessageCircleIcon, PhoneIcon } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  message: z.string().min(10, "Tell us a bit more (at least 10 characters)"),
})

export default function Contact() {
  useEffect(() => {
    document.title = "Contact — LeadPro Realty"
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  })

  const onSubmit = async (data) => {
    try {
      // TODO(BE): wire to /api/public/contact when S1-BE-A-03 lands.
      await api.post("/public/contact", data).catch(() => null)
      toast.success("Thanks — we'll get back to you within one business day.")
      reset()
    } catch (err) {
      toast.error(err?.message || "Failed to send — please try again.")
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Get in touch
        </h1>
        <p className="mt-4 text-muted-foreground">
          Have a question, a custom requirement, or want a walkthrough? Drop
          us a message — a human will reply.
        </p>
      </div>

      <div className="mt-16 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="message">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="message"
                  rows={5}
                  placeholder="Tell us how we can help…"
                  aria-invalid={!!errors.message}
                  {...register("message")}
                />
                {errors.message && (
                  <p className="text-xs text-destructive">
                    {errors.message.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="mt-2">
                {isSubmitting && <Loader2Icon className="animate-spin" />}
                Send message
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MailIcon className="size-4" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Email</span>
                <a
                  href="mailto:hello@leadprorealty.io"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  hello@leadprorealty.io
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PhoneIcon className="size-4" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Phone</span>
                <a
                  href="tel:+919876543210"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  +91 98765 43210
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageCircleIcon className="size-4" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Support</span>
                <span className="text-sm text-muted-foreground">
                  Mon–Fri, 9am–6pm IST
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
