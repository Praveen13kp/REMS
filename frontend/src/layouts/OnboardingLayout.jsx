import { Navigate, Outlet, useLocation } from "react-router-dom"
import { Loader2Icon } from "lucide-react"

import { useCompany } from "@/hooks/useCompany"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const STEPS = [
  { path: "/onboarding/welcome", label: "Welcome" },
  { path: "/onboarding/branding", label: "Branding" },
  { path: "/onboarding/team", label: "Team" },
  { path: "/onboarding/projects", label: "Projects" },
]

function StepIndicator({ activeIndex }) {
  return (
    <ol className="flex w-full items-center gap-2" aria-label="Onboarding progress">
      {STEPS.map((step, i) => {
        const state =
          i < activeIndex ? "done" : i === activeIndex ? "current" : "todo"
        return (
          <li key={step.path} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                state === "current" &&
                  "border-primary bg-primary text-primary-foreground",
                state === "done" && "border-primary bg-primary/10 text-primary",
                state === "todo" &&
                  "border-input bg-background text-muted-foreground"
              )}
              aria-current={state === "current" ? "step" : undefined}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "hidden text-xs sm:inline",
                state === "current"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  state === "done" ? "bg-primary/60" : "bg-border"
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default function OnboardingLayout() {
  const location = useLocation()
  const { company, isLoading } = useCompany()

  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => location.pathname.startsWith(s.path))
  )

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/40">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (company?.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-svh items-start justify-center bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader className="gap-4">
          <StepIndicator activeIndex={activeIndex} />
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl">
              {STEPS[activeIndex]?.label === "Welcome"
                ? `Welcome${company?.name ? `, ${company.name}` : ""}`
                : `Step ${activeIndex + 1} of ${STEPS.length} — ${STEPS[activeIndex]?.label}`}
            </CardTitle>
            <CardDescription>
              Let&apos;s get your workspace set up. You can skip any step and come
              back later.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Outlet context={{ company }} />
        </CardContent>
      </Card>
    </div>
  )
}
