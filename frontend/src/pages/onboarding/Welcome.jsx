import { Link, useOutletContext } from "react-router-dom"

export default function Welcome() {
  const { company } = useOutletContext() ?? {}
  const name = company?.name || "your workspace"

  return (
    <div className="stack">
      <div>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>
          Let&apos;s set up {name} in 4 steps
        </h2>
        <p className="text-muted" style={{ fontSize: 14 }}>
          We&apos;ll walk you through branding, inviting your team, adding your
          first project, and confirming your pipeline. It takes about 5 minutes.
        </p>
      </div>

      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontSize: 14,
        }}
      >
        <li style={{ display: "flex", gap: 10 }}>
          <span style={{ fontWeight: 600, color: "var(--lp-text)" }}>1.</span>
          <span className="text-muted">
            Branding — logo, brand color, timezone, currency
          </span>
        </li>
        <li style={{ display: "flex", gap: 10 }}>
          <span style={{ fontWeight: 600, color: "var(--lp-text)" }}>2.</span>
          <span className="text-muted">
            Team — invite admins, managers and agents
          </span>
        </li>
        <li style={{ display: "flex", gap: 10 }}>
          <span style={{ fontWeight: 600, color: "var(--lp-text)" }}>3.</span>
          <span className="text-muted">
            Projects — add the properties you&apos;re selling
          </span>
        </li>
        <li style={{ display: "flex", gap: 10 }}>
          <span style={{ fontWeight: 600, color: "var(--lp-text)" }}>4.</span>
          <span className="text-muted">
            Pipeline — confirm your lead stages
          </span>
        </li>
      </ol>

      <div className="row row-between">
        <span />
        <Link to="/onboarding/branding" className="btn btn-primary">
          Get started
        </Link>
      </div>
    </div>
  )
}
