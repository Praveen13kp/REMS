import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useNavigate } from "react-router-dom"

import { fmt } from "@/lib/format"
import SourceIcon from "@/components/leads/SourceIcon"

const SOURCE_BADGE = {
  Website: "badge-info",
  WhatsApp: "badge-success",
  Referral: "badge-warning",
  "Walk-in": "badge-muted",
  Facebook: "badge-info",
  Instagram: "badge-info",
  Google: "badge-info",
}

function sourceBadgeCls(s) {
  return SOURCE_BADGE[s] || "badge-muted"
}

export default function LeadCard({ lead, isOverlay = false }) {
  const navigate = useNavigate()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { lead, type: "lead" },
    disabled: isOverlay,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: "grab",
    userSelect: "none",
  }

  const assignee = lead.assignedTo

  const onClick = (e) => {
    // suppress click after drag
    if (e.defaultPrevented) return
    navigate(`/leads/${lead.id}`)
  }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      onClick={onClick}
      className="card"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.933rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lead.name || "—"}
          </div>
          {lead.phone && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--lp-text-muted)",
                marginTop: 2,
              }}
            >
              {fmt.phone(lead.phone)}
            </div>
          )}
        </div>
        {lead.score != null && (
          <span
            className="badge badge-muted"
            style={{ fontSize: "0.733rem", flexShrink: 0 }}
            title="Lead score"
          >
            {lead.score}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        {lead.source && (
          <span
            className={`badge ${sourceBadgeCls(lead.source)}`}
            style={{ fontSize: "0.733rem", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <SourceIcon source={lead.source} size={11} />
            {lead.source}
          </span>
        )}
        {lead.priority && (
          <span
            className="badge badge-warning"
            style={{ fontSize: "0.733rem" }}
            title="Priority"
          >
            {lead.priority}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          paddingTop: 8,
          borderTop: "1px solid var(--lp-border)",
        }}
      >
        <span style={{ fontSize: "0.733rem", color: "var(--lp-text-muted)" }}>
          {fmt.ago(lead.createdAt)}
        </span>
        {assignee ? (
          <div
            className="avatar sm"
            title={assignee.name || assignee.email}
            style={{ fontSize: "0.733rem" }}
          >
            {assignee.image || assignee.avatar ? (
              <img src={fmt.avatarUrl(assignee.image || assignee.avatar)} alt="" />
            ) : (
              fmt.initials(assignee.name || assignee.email || "?")
            )}
          </div>
        ) : (
          <span style={{ fontSize: "0.733rem", color: "var(--lp-text-muted)" }}>
            Unassigned
          </span>
        )}
      </div>
    </div>
  )
}
