import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Building2, Eye, Share2 } from "lucide-react"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"

const STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Site Visit",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
  "Follow Up",
]

const VISIBILITY_OPTIONS = [
  { value: "FULL", label: "Full Visible" },
  { value: "PARTIAL", label: "Partial (hide phone & email)" },
  { value: "ANONYMOUS", label: "Anonymous (hide name too)" },
]

export default function ChannelPartnerLeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .get(`/channel-partner/leads/${id}`)
      .then((res) => setLead(res?.data ?? null))
      .catch((err) => {
        toast.error(err?.message || "Lead not found")
        navigate("/cp", { replace: true })
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (status) => {
    setSavingStatus(true)
    try {
      await api.patch(`/channel-partner/leads/${id}/status`, { status })
      toast.success(`Status → ${status}`)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    } finally {
      setSavingStatus(false)
    }
  }

  const updateVisibility = async (shareId, companyId, visibility) => {
    try {
      await api.patch(`/channel-partner/leads/${id}/visibility`, { companyId, visibility })
      toast.success("Visibility updated")
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>Loading…</div>
    )
  }
  if (!lead) return null

  return (
    <div style={{ minHeight: "100vh", background: "var(--lp-bg)" }}>
      <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        <Link to="/cp" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to workspace
        </Link>

        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0 }}>{lead.name}</h2>
            <div className="text-muted text-sm" style={{ marginTop: 4 }}>
              {lead.company?.name} • {fmt.phone(lead.phone)} • {lead.email || "—"}
            </div>
          </div>
          <span className="badge" style={{ fontSize: 12 }}>
            <Eye size={12} /> {lead.visibility || "FULL"}
          </span>
        </div>

        <div className="grid grid-2" style={{ gap: 20 }}>
          <div className="card">
            <div className="card-title">Status</div>
            <select
              className="select"
              defaultValue={lead.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={savingStatus}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="text-xs text-muted" style={{ marginTop: 8 }}>
              Changing status notifies the company's owner + manager in real time.
            </p>
          </div>

          <div className="card">
            <div className="card-title">Lead details</div>
            <DetailRow k="Priority" v={lead.priority || "—"} />
            <DetailRow k="Source" v={lead.source || "—"} />
            <DetailRow k="City" v={lead.city || "—"} />
            <DetailRow k="Requirement" v={lead.requirementType || "—"} />
            <DetailRow k="Budget" v={lead.budget || "—"} />
            <DetailRow k="Created" v={new Date(lead.createdAt).toLocaleDateString()} />
          </div>
        </div>

        {lead.channelPartnerShares?.length > 0 && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-title">Sharing</div>
            <table className="data">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th>Shared at</th>
                </tr>
              </thead>
              <tbody>
                {lead.channelPartnerShares.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Building2 size={12} style={{ marginRight: 6, opacity: 0.6 }} />
                      {s.company.name}
                    </td>
                    <td>
                      <span className="badge">{s.status}</span>
                    </td>
                    <td>
                      <select
                        className="select"
                        defaultValue={s.visibility}
                        onChange={(e) => updateVisibility(s.id, s.companyId, e.target.value)}
                        disabled={s.status !== "ACTIVE"}
                      >
                        {VISIBILITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function DetailRow({ k, v }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--lp-border)" }}>
      <span className="text-muted text-sm">{k}</span>
      <span style={{ fontWeight: 500, fontSize: 14 }}>{v}</span>
    </div>
  )
}
