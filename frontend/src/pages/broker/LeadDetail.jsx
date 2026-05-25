import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Mail, Phone, Tag } from "lucide-react"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"

export default function BrokerLeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get(`/broker/leads/${id}`)
      .then((res) => {
        if (!cancelled) setLead(res?.data ?? null)
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.message || "Lead not found")
          navigate("/broker", { replace: true })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  if (loading) {
    return (
      <div style={{ padding: 24, color: "var(--lp-text-muted)" }}>Loading…</div>
    )
  }
  if (!lead) return null

  return (
    <div style={{ minHeight: "100vh", background: "var(--lp-bg)" }}>
      <header
        style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--lp-border)",
          background: "var(--lp-surface)",
        }}
      >
        <Link
          to="/broker"
          className="btn btn-ghost"
          style={{ display: "inline-flex", gap: 6 }}
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
      </header>
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h1 style={{ marginTop: 0 }}>{lead.name}</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            {lead.company?.name}
          </p>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <Row icon={Phone} label="Phone" value={fmt.phone(lead.phone)} />
          <Row icon={Mail} label="Email" value={lead.email || "—"} />
          <Row icon={Tag} label="Status" value={lead.status} />
          <Row icon={Tag} label="Priority" value={lead.priority || "—"} />
          <Row icon={Tag} label="Source" value={lead.source || "—"} />
          <Row
            icon={Tag}
            label="Assigned to"
            value={lead.assignedTo?.name || "Unassigned"}
          />
        </div>
      </main>
    </div>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--lp-border)",
      }}
    >
      <Icon size={16} style={{ color: "var(--lp-text-muted)" }} />
      <span
        style={{
          color: "var(--lp-text-muted)",
          minWidth: 100,
          fontSize: "0.867rem",
        }}
      >
        {label}
      </span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}
