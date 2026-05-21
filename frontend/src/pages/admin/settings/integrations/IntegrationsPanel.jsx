import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, Globe, ListTree, Lock, Pencil, Plug, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { integrationsService } from "@/services/integrationsService"
import { useAuthStore } from "@/stores/authStore"
import { usePlan } from "@/hooks/usePlan"
import { hasFeature } from "@/lib/planLimits"
import ConnectMeta from "./ConnectMeta"
import ConnectGoogle from "./ConnectGoogle"
import ConnectWebsite from "./ConnectWebsite"
import ConnectJustDial from "./ConnectJustDial"
import ConnectIndiaMART from "./ConnectIndiaMART"
import EventsViewer from "./EventsViewer"

// Provider catalog rendered as connect cards. Phase 0 ships META as the
// only Connect target; the other four are placeholders to make the
// information architecture visible (and stable) before their drivers ship.
const CATALOG = [
  {
    provider: "META",
    label: "Facebook & Instagram Lead Ads",
    blurb: "Capture leads from your own Meta App. You stay in control of tokens; we never share credentials across tenants.",
    icon: Plug,
    available: true,
  },
  {
    provider: "GOOGLE_ADS",
    label: "Google Ads Lead Forms",
    blurb: "Webhook-based delivery from your Google Ads Lead Form extensions. Requires Developer Token approval (1–3 weeks).",
    icon: Globe,
    available: true,
  },
  {
    provider: "WEBSITE_FORM",
    label: "Website Form",
    blurb: "Drop a webhook URL into WordPress, Webflow, Elementor, Typeform, or your custom form. HMAC-signed.",
    icon: Globe,
    available: true,
  },
  {
    provider: "JUSTDIAL",
    label: "JustDial",
    blurb: "Push (JustDial calls our webhook) or Pull (we poll their endpoint every 5 min). Credentials come from your JustDial account manager.",
    icon: Globe,
    available: true,
  },
  {
    provider: "INDIAMART",
    label: "IndiaMART",
    blurb: "Polls your IndiaMART seller account every 5 minutes. One credential, fully self-serve, requires a paid IndiaMART plan.",
    icon: Globe,
    available: true,
  },
]

const PROVIDER_ICON = {
  META: Plug,
  GOOGLE_ADS: Globe,
  WEBSITE_FORM: Globe,
  JUSTDIAL: Globe,
  INDIAMART: Globe,
}

export default function IntegrationsPanel() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const canEdit = user?.role === "OWNER" || user?.role === "ADMIN"
  const { plan } = usePlan()
  // BYO integrations require Pro+. We still render the catalog so users
  // can see what's available, but disable the Connect buttons and surface
  // an upgrade banner above so the lock state is obvious before clicking.
  const integrationsUnlocked = plan ? hasFeature(plan.plan, "byoIntegrations") : true

  const [items, setItems] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(null) // provider key or null
  const [editing, setEditing] = useState(null) // integration row or null
  const [viewingEvents, setViewingEvents] = useState(null) // integration row or null

  const load = async () => {
    setLoading(true)
    try {
      const [list, s] = await Promise.all([
        integrationsService.list(),
        integrationsService.stats().catch(() => null),
      ])
      setItems(list)
      setStats(s)
    } catch (err) {
      toast.error(err?.message || "Failed to load integrations")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onDelete = async (row) => {
    if (!window.confirm(`Disconnect "${row.label}"? Inbound leads will stop arriving immediately.`)) return
    try {
      await integrationsService.delete(row.id)
      toast.success("Integration removed")
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to remove")
    }
  }

  const onTest = async (row) => {
    try {
      const result = await integrationsService.test(row.id)
      if (result?.ok) {
        toast.success(result?.info || "Connection OK")
      } else {
        toast.error(result?.error || "Connection failed")
      }
      load()
    } catch (err) {
      toast.error(err?.message || "Test failed")
    }
  }

  if (loading && items === null) {
    return (
      <div className="card">
        <div className="card-title">Lead source integrations</div>
        <p className="text-muted text-sm">Loading…</p>
      </div>
    )
  }

  // Group connected items by provider so the catalog cards can show the
  // existing connections inline.
  const byProvider = (items || []).reduce((acc, row) => {
    acc[row.provider] = acc[row.provider] || []
    acc[row.provider].push(row)
    return acc
  }, {})

  const brokenCount = stats?.totals?.brokenConnections || 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card">
        <div className="card-title">Lead source integrations</div>
        <p className="text-muted text-sm" style={{ marginBottom: 0 }}>
          Connect your own Meta, Google, JustDial, or IndiaMART accounts using your own API credentials.
          Leads land directly in your inbox with the right source tag.
          {!canEdit && " Read-only — only OWNER or ADMIN can add or remove integrations."}
        </p>
      </div>

      {!integrationsUnlocked && (
        <div
          className="card"
          style={{
            borderColor: "var(--lp-accent)",
            background: "var(--lp-surface-2, rgba(139,92,246,0.08))",
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <Lock size={16} style={{ color: "var(--lp-accent)" }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Integrations are a Pro feature
            </div>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4, marginBottom: 10 }}>
            On the {plan?.planName || "Free"} plan you can preview the catalog,
            but Connect is disabled. Upgrade to Pro (₹2,499/mo) to capture
            leads from Facebook, Instagram, Google, IndiaMART, JustDial, and
            your website.
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate("/admin/billing")}
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {stats && <StatsStrip stats={stats} />}

      {brokenCount > 0 && (
        <div
          className="card"
          style={{
            borderColor: "var(--lp-danger, #dc2626)",
            background: "var(--lp-danger-bg, rgba(220,38,38,0.06))",
          }}
        >
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <AlertTriangle size={16} style={{ color: "var(--lp-danger, #dc2626)" }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {brokenCount} integration{brokenCount > 1 ? "s" : ""} need attention
            </div>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            Look for the "Reconnect" buttons below — leads are not being captured from broken sources.
          </div>
        </div>
      )}

      {CATALOG.map((entry) => {
        const Icon = entry.icon
        const connections = byProvider[entry.provider] || []
        return (
          <div key={entry.provider} className="card">
            <div className="row row-between" style={{ alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "var(--lp-surface-2, rgba(120,120,160,0.10))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{entry.label}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>{entry.blurb}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {entry.available ? (
                  !integrationsUnlocked ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => navigate("/admin/billing")}
                      title="Upgrade to Pro to connect this source"
                    >
                      <Lock size={14} /> Pro
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!canEdit}
                      onClick={() => setConnecting(entry.provider)}
                    >
                      <Plug size={14} /> Connect
                    </button>
                  )
                ) : (
                  <span className="badge badge-muted">Coming soon</span>
                )}
              </div>
            </div>

            {connections.length > 0 && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--lp-border)", paddingTop: 12 }}>
                {connections.map((row) => (
                  <ConnectionRow
                    key={row.id}
                    row={row}
                    canEdit={canEdit}
                    onTest={() => onTest(row)}
                    onEdit={() => setEditing(row)}
                    onDelete={() => onDelete(row)}
                    onViewEvents={() => setViewingEvents(row)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {connecting === "META" && (
        <ConnectMeta
          onClose={() => setConnecting(null)}
          onSaved={() => {
            setConnecting(null)
            load()
          }}
        />
      )}
      {connecting === "GOOGLE_ADS" && (
        <ConnectGoogle
          onClose={() => setConnecting(null)}
          onSaved={() => {
            setConnecting(null)
            load()
          }}
        />
      )}
      {connecting === "WEBSITE_FORM" && (
        <ConnectWebsite
          onClose={() => setConnecting(null)}
          onSaved={() => {
            setConnecting(null)
            load()
          }}
        />
      )}
      {connecting === "JUSTDIAL" && (
        <ConnectJustDial
          onClose={() => setConnecting(null)}
          onSaved={() => {
            setConnecting(null)
            load()
          }}
        />
      )}
      {connecting === "INDIAMART" && (
        <ConnectIndiaMART
          onClose={() => setConnecting(null)}
          onSaved={() => {
            setConnecting(null)
            load()
          }}
        />
      )}

      {editing && editing.provider === "META" && (
        <ConnectMeta
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
      {editing && editing.provider === "GOOGLE_ADS" && (
        <ConnectGoogle
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
      {editing && editing.provider === "WEBSITE_FORM" && (
        <ConnectWebsite
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
      {editing && editing.provider === "JUSTDIAL" && (
        <ConnectJustDial
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
      {editing && editing.provider === "INDIAMART" && (
        <ConnectIndiaMART
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}

      {viewingEvents && (
        <EventsViewer
          row={viewingEvents}
          onClose={() => setViewingEvents(null)}
        />
      )}
    </div>
  )
}

function StatsStrip({ stats }) {
  const t = stats.totals
  const cards = [
    { label: "Connections", value: t.connections, sub: t.brokenConnections ? `${t.brokenConnections} broken` : "all healthy" },
    { label: "Leads · last 24h", value: t.leads24h, sub: t.lastLeadAt ? `last ${timeAgo(t.lastLeadAt)}` : "no leads yet" },
    { label: "Errors · last 24h", value: t.errors24h, sub: t.errors24h ? "see view events" : "none" },
  ]
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {cards.map((c) => (
        <div key={c.label} className="card" style={{ padding: 12 }}>
          <div className="text-xs text-muted">{c.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{c.value}</div>
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

function timeAgo(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

function ConnectionRow({ row, canEdit, onTest, onEdit, onDelete, onViewEvents }) {
  const Icon = PROVIDER_ICON[row.provider] || Plug
  const status = row.status
  const isBroken = status !== "ACTIVE"
  const statusBadge =
    status === "ACTIVE" ? "badge-success" :
    status === "INVALID" ? "badge-danger" :
    status === "EXPIRED" ? "badge-warning" :
    "badge-muted"

  return (
    <div
      className="row row-between"
      style={{
        padding: "8px 0",
        gap: 8,
        ...(isBroken
          ? {
              background: "var(--lp-danger-bg, rgba(220,38,38,0.04))",
              borderRadius: 6,
              paddingLeft: 8,
              paddingRight: 8,
            }
          : {}),
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
        {isBroken
          ? <AlertTriangle size={14} style={{ color: "var(--lp-danger, #dc2626)" }} />
          : <Icon size={14} className="text-muted" />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{row.label}</div>
          <div className="text-xs text-muted" style={{ marginTop: 1 }}>
            {row.externalIds?.[0] ? `ID ${row.externalIds[0]} · ` : ""}
            {row.lastVerifiedAt
              ? `Last verified ${new Date(row.lastVerifiedAt).toLocaleString()}`
              : "Not yet verified"}
            {row.lastError ? ` · ${row.lastError}` : ""}
          </div>
        </div>
      </div>
      <div className="row" style={{ gap: 6, flex: "none" }}>
        <span className={`badge ${statusBadge}`}>{status.toLowerCase()}</span>
        {isBroken && canEdit && (
          <button className="btn btn-primary btn-sm" onClick={onEdit} title="Reconnect">
            Reconnect
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={onTest}>Test</button>
        <button className="btn btn-ghost btn-sm" onClick={onViewEvents} title="View recent events">
          <ListTree size={14} />
        </button>
        {canEdit && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Edit credentials">
              <Pencil size={14} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onDelete} title="Disconnect">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
