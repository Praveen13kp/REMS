import { useEffect, useMemo, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { Handshake, TrendingUp, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import Pagination from "@/components/common/Pagination"

// "Deals" = leads in terminal stages (Won / Booked / Lost).
// Pulled from /channel-partner/leads with both scopes merged then
// filtered client-side. Source of truth stays the existing leads BE.

export default function Deals() {
  const ctx = useOutletContext()
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [tab, setTab] = useState("won")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ctx?.activeCompanyId) return
    setLoading(true)
    Promise.all([
      api.get(`/channel-partner/leads?scope=shared&companyId=${ctx.activeCompanyId}`),
      api.get(`/channel-partner/leads?scope=own&companyId=${ctx.activeCompanyId}`),
    ])
      .then(([a, b]) => {
        const merged = [...(a?.data ?? []), ...(b?.data ?? [])]
        // dedup by id (CP could see the same lead in both scopes)
        const map = new Map(merged.map((l) => [l.id, l]))
        setLeads([...map.values()])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ctx?.activeCompanyId])

  const won = useMemo(() => leads.filter((l) => ["Won", "Booked"].includes(l.status)), [leads])
  const lost = useMemo(() => leads.filter((l) => l.status === "Lost"), [leads])
  const rows = tab === "won" ? won : lost

  // Client-side pagination over the active tab. Reset to page 1 when the
  // tab switches or the data reloads.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  useEffect(() => {
    setPage(1)
  }, [tab, leads])
  const paged = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  )

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Deals</h1>
          <p>Won and lost deals across the selected company.</p>
        </div>
      </div>

      <div className="cp-kpi-grid">
        <Kpi label="Closed Won" value={won.length} icon={TrendingUp} />
        <Kpi label="Closed Lost" value={lost.length} icon={X} />
        <Kpi label="Win rate" value={ratePct(won.length, lost.length)} icon={Handshake} />
      </div>

      <div className="cp-tabs">
        <button type="button" className={`cp-tab ${tab === "won" ? "is-active" : ""}`} onClick={() => setTab("won")}>Won ({won.length})</button>
        <button type="button" className={`cp-tab ${tab === "lost" ? "is-active" : ""}`} onClick={() => setTab("lost")}>Lost ({lost.length})</button>
      </div>

      <div className="cp-table-wrap">
        {loading ? (
          <div style={{ padding: 36, textAlign: "center", color: "var(--lp-text-muted)" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="cp-empty">
            <div className="icon"><Handshake size={28} /></div>
            <h3>No deals here yet</h3>
            <p>When a lead reaches {tab === "won" ? "Won/Booked" : "Lost"}, it'll appear in this list.</p>
          </div>
        ) : (
          <table className="cp-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Closed at</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((l) => (
                <tr key={l.id} onClick={() => navigate(`/cp/leads/${l.id}`)} style={{ cursor: "pointer" }}>
                  <td>{l.name}</td>
                  <td>{fmt.phone(l.phone)}</td>
                  <td><span className="badge">{l.status}</span></td>
                  <td>{new Date(l.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && rows.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
            itemLabel="deals"
          />
        )}
      </div>
    </>
  )
}

function Kpi({ label, value, icon: Icon }) {
  return (
    <div className="cp-kpi">
      <div className="cp-kpi-icon"><Icon size={16} /></div>
      <div className="cp-kpi-label">{label}</div>
      <div className="cp-kpi-value">{value}</div>
    </div>
  )
}
function ratePct(w, l) {
  if (w + l === 0) return "0%"
  return Math.round((w / (w + l)) * 100) + "%"
}
