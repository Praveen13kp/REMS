import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useCompany } from "@/hooks/useCompany"

const STEPS = [
  { path: "/onboarding/welcome", label: "Welcome" },
  { path: "/onboarding/branding", label: "Branding" },
  { path: "/onboarding/team", label: "Team" },
  { path: "/onboarding/projects", label: "Projects" },
  { path: "/onboarding/pipeline", label: "Pipeline" },
]

function StepIndicator({ activeIndex }) {
  return (
    <ol
      aria-label="Onboarding progress"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        listStyle: "none",
        padding: 0,
        margin: 0,
        width: "100%",
      }}
    >
      {STEPS.map((step, i) => {
        const state =
          i < activeIndex ? "done" : i === activeIndex ? "current" : "todo"
        const circleBg =
          state === "current"
            ? "var(--lp-accent)"
            : state === "done"
            ? "rgba(139,92,246,.18)"
            : "var(--lp-surface-2)"
        const circleColor =
          state === "current"
            ? "#0A0A0F"
            : state === "done"
            ? "var(--lp-accent-deep)"
            : "var(--lp-text-muted)"
        const labelColor =
          state === "current" ? "var(--lp-text)" : "var(--lp-text-muted)"
        const connectorBg =
          state === "done" ? "var(--lp-accent)" : "var(--lp-border)"
        return (
          <li
            key={step.path}
            style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}
          >
            <span
              aria-current={state === "current" ? "step" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: circleBg,
                color: circleColor,
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
                border: "1px solid var(--lp-border)",
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                fontSize: 12,
                color: labelColor,
                fontWeight: state === "current" ? 600 : 500,
              }}
              className="hidden-on-mobile"
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                style={{
                  height: 1,
                  flex: 1,
                  background: connectorBg,
                }}
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
      <div
        className="leadpro-scope"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--lp-bg)",
          color: "var(--lp-text-muted)",
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    )
  }

  if (company?.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />
  }

  const activeLabel = STEPS[activeIndex]?.label
  const title =
    activeLabel === "Welcome"
      ? `Welcome${company?.name ? `, ${company.name}` : ""}`
      : `Step ${activeIndex + 1} of ${STEPS.length} — ${activeLabel}`

  return (
    <div
      className="leadpro-scope"
      style={{
        minHeight: "100vh",
        background: "var(--lp-bg)",
        padding: "40px 16px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <StepIndicator activeIndex={activeIndex} />
        </div>
        <div className="card">
          <div className="card-title">
            <span>{title}</span>
          </div>
          <p
            className="text-muted"
            style={{ fontSize: 13, marginTop: -6, marginBottom: 18 }}
          >
            Let&apos;s get your workspace set up. You can skip any step and come
            back later.
          </p>
          <Outlet context={{ company }} />
        </div>
      </div>
    </div>
  )
}
