import { Link, useOutletContext } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function Welcome() {
  const { company } = useOutletContext() ?? {}
  const name = company?.name || "your workspace"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Let&apos;s set up {name} in 4 steps
        </h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll walk you through branding, inviting your team, adding your
          first project, and confirming your pipeline. It takes about 5 minutes.
        </p>
      </div>

      <ol className="flex flex-col gap-3 text-sm">
        <li className="flex gap-3">
          <span className="font-medium text-foreground">1.</span>
          <span className="text-muted-foreground">
            Branding — logo, brand color, timezone, currency
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-medium text-foreground">2.</span>
          <span className="text-muted-foreground">
            Team — invite admins, managers and agents
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-medium text-foreground">3.</span>
          <span className="text-muted-foreground">
            Projects — add the properties you&apos;re selling
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-medium text-foreground">4.</span>
          <span className="text-muted-foreground">
            Pipeline — confirm your lead stages
          </span>
        </li>
      </ol>

      <div className="flex items-center justify-end gap-3">
        <Button asChild>
          <Link to="/onboarding/branding">Get started</Link>
        </Button>
      </div>
    </div>
  )
}
