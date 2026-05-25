import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  Award,
  Briefcase,
  CheckCircle,
  Mail,
  Percent,
  Phone,
  ShieldOff,
  ShieldCheck,
  TrendingUp,
  Users2,
} from "lucide-react"

import { api } from "@/lib/api"
import KpiCard from "@/components/common/KpiCard"
import { fmt } from "@/lib/format"

// Owner / Manager view of every Channel Partner connected to this company,
// with quick performance stats and revoke / reactivate actions.

const STATUS_BADGE = {
  ACTIVE: "badge-success",
  INVITED: "badge-info",
  REVOKED: "badge-error",
}

export default function ChannelPartners() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api
      .get("/channel-partners")
      .then((res) => setPartners(res?.data ?? []))
      .catch((err) => toast.error(err?.message || "Failed to load channel partners"))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const totals = partners.reduce(
    (acc, p) => {
      acc.active += p.status === "ACTIVE" ? 1 : 0
      acc.sharedLeads += p.stats.sharedLeads
      acc.dealsWon += p.stats.dealsWon
      const denom = p.stats.dealsWon + p.stats.dealsLost
      acc.convDenom += denom
      acc.convNum += p.stats.dealsWon
      return acc
    },
    { active: 0, sharedLeads: 0, dealsWon: 0, convNum: 0, convDenom: 0 },
  )
  const avgConversion =
    totals.convDenom > 0 ? +((totals.convNum / totals.convDenom) * 100).toFixed(1) : 0

  const best = [...partners].sort(
    (a, b) => b.stats.dealsWon - a.stats.dealsWon,
  )[0]

  const revoke = async (cp) => {
    if (!window.confirm(`Revoke access for ${cp.name || cp.email}? Active leads they share will be hidden.`)) return
    try {
      await api.post(`/channel-partners/${cp.id}/revoke`)
      toast.success("Access revoked")
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    }
  }
  const reactivate = async (cp) => {
    try {
      await api.post(`/channel-partners/${cp.id}/reactivate`)
      toast.success("Reactivated")
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    }
  }

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Channel Partners</h1>
          <p>
            {partners.length} partner{partners.length === 1 ? "" : "s"} connected to your workspace.
          </p>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Active partners" value={totals.active} icon={Users2} color="purple" />
        <KpiCard label="Shared leads" value={totals.sharedLeads} icon={Briefcase} color="amber" />
        <KpiCard label="Deals closed" value={totals.dealsWon} icon={CheckCircle} color="green" />
        <KpiCard label="Avg. conversion" value={`${avgConversion}%`} icon={Percent} color="blue" />
      </div>

      {best && best.stats.dealsWon > 0 && (
        <div
          className="card mb-4"
          style={{
            background: "linear-gradient(135deg,rgba(139,92,246,.10),rgba(139,92,246,.02))",
            borderColor: "rgba(139,92,246,.3)",
          }}
        >
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <div className="kpi-icon kpi-icon-purple" style={{ width: 44, height: 44 }}>
              <Award size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Top performer: {best.name || best.email}</div>
              <div className="text-muted text-sm">
                {best.stats.dealsWon} deal{best.stats.dealsWon === 1 ? "" : "s"} closed •{" "}
                {best.stats.sharedLeads} active share{best.stats.sharedLeads === 1 ? "" : "s"} •{" "}
                {best.stats.conversionRate}% conversion
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-toolbar">
          <span style={{ fontWeight: 600 }}>{partners.length} channel partners</span>
        </div>
        <div className="table-scroll">
          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lp-text-muted)" }}>
              Loading…
            </div>
          ) : partners.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <Users2 size={28} />
              </div>
              <h3>No channel partners yet</h3>
              <p>Invite a partner from User Management to start collaborating on leads.</p>
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Shared</th>
                  <th>Won</th>
                  <th>Lost</th>
                  <th>Conversion</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <div className="avatar sm">{initials(p.name || p.email || "?")}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name || "—"}</div>
                          <div className="text-xs text-muted">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs">
                        <Mail size={11} /> {p.email}
                      </div>
                      {p.phone && (
                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                          <Phone size={11} /> {p.phone}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] || ""}`}>{p.status}</span>
                    </td>
                    <td>{p.stats.sharedLeads}</td>
                    <td style={{ color: "var(--lp-success)" }}>{p.stats.dealsWon}</td>
                    <td style={{ color: "var(--lp-text-muted)" }}>{p.stats.dealsLost}</td>
                    <td>
                      <div className="row" style={{ gap: 6, alignItems: "center" }}>
                        <TrendingUp size={12} />
                        <span style={{ fontWeight: 600 }}>{p.stats.conversionRate}%</span>
                      </div>
                    </td>
                    <td>
                      {p.joinedAt
                        ? new Date(p.joinedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      {p.status === "REVOKED" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => reactivate(p)}
                        >
                          <ShieldCheck size={12} /> Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => revoke(p)}
                        >
                          <ShieldOff size={12} /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function initials(name) {
  return (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
