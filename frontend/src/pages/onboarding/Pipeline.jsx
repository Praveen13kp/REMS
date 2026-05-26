import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants"

function StageMark({ stage }) {
  if (stage.isWon)
    return (
      <span className="badge badge-success" style={{ padding: "2px 8px" }}>
        Won
      </span>
    )
  if (stage.isLost)
    return (
      <span className="badge badge-muted" style={{ padding: "2px 8px" }}>
        Closed
      </span>
    )
  return (
    <span className="badge badge-purple" style={{ padding: "2px 8px" }}>
      Active
    </span>
  )
}

export default function OnboardingPipeline() {
  const navigate = useNavigate()
  const [isFinishing, setIsFinishing] = useState(false)

  const onFinish = async () => {
    setIsFinishing(true)
    try {
      await api.post("/company/me/complete-onboarding")
      toast.success("You're all set — welcome aboard!")
      navigate("/dashboard", { replace: true })
    } catch (err) {
      toast.error(err?.message || "Failed to finish onboarding")
      setIsFinishing(false)
    }
  }

  return (
    <div className="stack">
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: 6 }}>Your lead pipeline</h2>
        <p className="text-muted" style={{ fontSize: "0.933rem" }}>
          These are the default stages every new lead will move through. You can
          rename, reorder, or add stages later in{" "}
          <span style={{ fontWeight: 600, color: "var(--lp-text)" }}>
            Settings → Pipeline
          </span>
          .
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {DEFAULT_PIPELINE_STAGES.map((stage, i) => (
          <div
            key={stage.name}
            style={{
              background: "var(--lp-surface-2)",
              border: "1px solid var(--lp-border)",
              borderRadius: "var(--lp-radius-card)",
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--lp-surface-3)",
                color: "var(--lp-text-muted)",
                fontSize: "0.8rem",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.933rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stage.name}
              </div>
              <div
                className="text-muted"
                style={{ fontSize: "0.8rem", marginTop: 2 }}
              >
                {stage.probability}% probability
              </div>
            </div>
            <StageMark stage={stage} />
          </div>
        ))}
      </div>

      <div className="row row-between">
        <span />
        <button
          type="button"
          className="btn btn-primary"
          onClick={onFinish}
          disabled={isFinishing}
        >
          {isFinishing ? "Finishing…" : "Finish setup"}
        </button>
      </div>
    </div>
  )
}
