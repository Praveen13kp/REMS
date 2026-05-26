import { useEffect, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { Activity, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function Activities() {
  const ctx = useOutletContext()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ctx?.activeCompanyId) return
    setLoading(true)
    api
      .get(`/channel-partner/dashboard?companyId=${encodeURIComponent(ctx.activeCompanyId)}`)
      .then((res) => setItems(res?.data?.recentActivity ?? []))
      .catch((err) => toast.error(err?.message || "Failed"))
      .finally(() => setLoading(false))
  }, [ctx?.activeCompanyId])

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Activity Timeline</h1>
          <p>Status changes, notes, shares, and deal updates in chronological order.</p>
        </div>
      </div>

      <div className="cp-card">
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <div className="cp-empty">
            <div className="icon"><Activity size={28} /></div>
            <h3>No activity yet</h3>
            <p>As you work leads in this company, every change shows up here.</p>
          </div>
        ) : (
          <div className="cp-timeline">
            {items.map((a) => (
              <div key={a.id} className="cp-timeline-item">
                <div className="cp-timeline-dot" />
                <div className="cp-timeline-time">{new Date(a.createdAt).toLocaleString()}</div>
                <div className="cp-timeline-body">
                  <span className="badge" style={{ marginRight: 8 }}>{a.type}</span>
                  {a.content || "—"}
                  {a.leadId && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ marginLeft: 8 }}
                      onClick={() => navigate(`/cp/leads/${a.leadId}`)}
                    >
                      View lead <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
