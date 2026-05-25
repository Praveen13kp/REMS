import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { Building2, CalendarDays, Check, Clock, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function Companies() {
  const ctx = useOutletContext()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get("/channel-partner/companies")
      .then((res) => setCompanies(res?.data ?? []))
      .catch((err) => toast.error(err?.message || "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Companies</h1>
          <p>Every company you've been invited to. Switch between them from the top-left.</p>
        </div>
      </div>

      {loading ? (
        <div className="cp-empty"><p>Loading…</p></div>
      ) : companies.length === 0 ? (
        <div className="cp-empty">
          <div className="icon"><Building2 size={28} /></div>
          <h3>No companies linked yet</h3>
          <p>When a company invites you and you accept, this list populates.</p>
        </div>
      ) : (
        <div className="grid grid-3" style={{ gap: 14 }}>
          {companies.map((c) => (
            <div key={c.id} className="cp-card" style={{ borderColor: c.id === ctx?.activeCompanyId ? "var(--lp-accent)" : undefined }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: c.brandColor || "var(--lp-accent)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt="" style={{ width: 42, height: 42, borderRadius: 10 }} />
                  ) : (
                    initials(c.name)
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div className="text-xs text-muted">{c.city || "—"}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="text-xs text-muted" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span><CalendarDays size={11} /> Invited {new Date(c.invitedAt).toLocaleDateString()}</span>
                {c.joinedAt && <span><Check size={11} /> Joined {new Date(c.joinedAt).toLocaleDateString()}</span>}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
                onClick={() => ctx?.setActiveCompanyId?.(c.id)}
                disabled={c.status !== "ACTIVE" || c.id === ctx?.activeCompanyId}
              >
                {c.id === ctx?.activeCompanyId ? "Active workspace" : "Switch to this company"}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: { bg: "rgba(16,185,129,.15)", color: "#047857", icon: Check },
    INVITED: { bg: "rgba(59,130,246,.15)", color: "#1D4ED8", icon: Clock },
    REVOKED: { bg: "rgba(239,68,68,.15)", color: "#B91C1C", icon: ShieldOff },
  }
  const s = styles[status] || styles.INVITED
  const I = s.icon
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      <I size={11} /> {status}
    </span>
  )
}

function initials(name) {
  return (name || "").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
}
