import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2Icon, Loader2Icon, TrophyIcon, XCircleIcon } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function StageIcon({ stage }) {
  if (stage.isWon) return <TrophyIcon className="size-4 text-emerald-500" />
  if (stage.isLost) return <XCircleIcon className="size-4 text-muted-foreground" />
  return <CheckCircle2Icon className="size-4 text-primary" />
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Your lead pipeline</h2>
        <p className="text-sm text-muted-foreground">
          These are the default stages every new lead will move through. You
          can rename, reorder, or add stages later in{" "}
          <span className="font-medium text-foreground">Settings → Pipeline</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEFAULT_PIPELINE_STAGES.map((stage, i) => (
          <Card key={stage.name}>
            <CardContent className="flex items-center gap-3 p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {i + 1}
              </span>
              <StageIcon stage={stage} />
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="truncate text-sm font-medium">
                  {stage.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stage.probability}% probability
                </span>
              </div>
              {stage.isWon && (
                <Badge variant="secondary" className="text-xs">
                  Won
                </Badge>
              )}
              {stage.isLost && (
                <Badge variant="outline" className="text-xs">
                  Closed
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button onClick={onFinish} disabled={isFinishing}>
          {isFinishing && <Loader2Icon className="animate-spin" />}
          Finish setup
        </Button>
      </div>
    </div>
  )
}
