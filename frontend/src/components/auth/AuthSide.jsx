import { Link } from "react-router-dom"
import { Building2, CheckCircle2 } from "lucide-react"

const FEATURES = [
  "AI-powered lead scoring identifies hot prospects automatically",
  "Smart assignment routes leads to the right agent instantly",
  "Never miss a follow-up with automated reminders",
  "Built-in WhatsApp & call logging for full activity trail",
]

export default function AuthSide({ heading = "Welcome back!" }) {
  return (
    <div className="hidden md:flex md:w-1/2 flex-col justify-between bg-muted/60 border-r border-border p-10">
      <Link to="/" className="flex items-center gap-2 text-foreground">
        <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="size-4" />
        </span>
        <span className="font-semibold">LeadPro Realty</span>
      </Link>

      <div className="max-w-md">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        <p className="mt-3 text-muted-foreground">
          Manage your real estate leads smarter. From first call to final
          booking — all in one workspace.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 text-primary" />
              <span className="text-foreground/90">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">© 2026 LeadPro Realty</p>
    </div>
  )
}
