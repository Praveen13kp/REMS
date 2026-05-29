import { useCallback, useEffect, useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { X } from "lucide-react"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import LeadCard from "./LeadCard"

const CAN_PICK_CLOSER = new Set(["OWNER", "ADMIN", "MANAGER"])

const reasonSchema = z.object({
  reason: z.string().min(3, "Please add a short reason"),
})

function Column({ stage, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.name,
    data: { stage, type: "column" },
  })

  return (
    <div
      style={{
        flex: "0 0 280px",
        display: "flex",
        flexDirection: "column",
        background: "var(--lp-surface-2)",
        border: "1px solid var(--lp-border)",
        borderRadius: "var(--lp-radius-card, 10px)",
        maxHeight: "100%",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--lp-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: "0.867rem" }}>{stage.name}</span>
          {stage.isWon && (
            <span className="badge badge-success" style={{ fontSize: "0.667rem" }}>
              Won
            </span>
          )}
          {stage.isLost && (
            <span className="badge badge-error" style={{ fontSize: "0.667rem" }}>
              Lost
            </span>
          )}
        </div>
        <span
          className="badge badge-muted"
          style={{ fontSize: "0.733rem", flexShrink: 0 }}
        >
          {stage.total ?? stage.leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          minHeight: 100,
          padding: 10,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: isOver ? "var(--lp-surface-3, rgba(0,0,0,0.04))" : "transparent",
          transition: "background 0.15s",
        }}
      >
        {children}
      </div>
    </div>
  )
}

function LostReasonModal({ onSubmit, onClose }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <form onSubmit={handleSubmit((d) => onSubmit(d.reason))} noValidate>
          <div className="modal-head">
            <h3>Why is this lead lost?</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancel"
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "var(--lp-text-muted)",
                padding: 4,
                display: "inline-flex",
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="modal-body">
            <textarea
              className="input"
              rows={4}
              placeholder="e.g. Budget too low, went with competitor…"
              aria-invalid={!!errors.reason}
              {...register("reason")}
            />
            {errors.reason && (
              <div style={{ fontSize: "0.8rem", color: "var(--lp-error)", marginTop: 6 }}>
                {errors.reason.message}
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving…" : "Mark as lost"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WonCloserModal({ lead, agents, loading, onSubmit, onClose }) {
  const [closedById, setClosedById] = useState(lead?.assignedToId || "")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!closedById) return
    setSubmitting(true)
    try { await onSubmit(closedById) } finally { setSubmitting(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-head">
            <h3>Who closed this deal?</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancel"
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "var(--lp-text-muted)",
                padding: 4,
                display: "inline-flex",
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="modal-body">
            <p style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)", marginTop: 0 }}>
              "{lead?.name}" is moving to Won. Pick the agent who booked it —
              they'll get credit on the Top Performing Agents widget.
            </p>
            <label className="field" style={{ display: "block" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>Closing agent</span>
              <select
                className="input"
                value={closedById}
                onChange={(e) => setClosedById(e.target.value)}
                disabled={loading || submitting}
                required
                style={{ marginTop: 6 }}
              >
                <option value="">{loading ? "Loading agents…" : "Select an agent"}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.email}{a.role && a.role !== "AGENT" ? ` (${a.role})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="modal-foot">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !closedById}
            >
              {submitting ? "Saving…" : "Mark as Won"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function KanbanBoard({ filters }) {
  const role = useAuthStore((s) => s.user?.role)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [stages, setStages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeLead, setActiveLead] = useState(null)
  const [pendingLost, setPendingLost] = useState(null) // { lead, fromStage, toStage }
  const [pendingWon, setPendingWon] = useState(null) // { lead, fromStage, toStage }
  const [agents, setAgents] = useState([])
  const [agentsLoading, setAgentsLoading] = useState(false)

  // Lazy-load the agent list on the first drop-to-Won so the picker
  // populates without doing the network roundtrip on every Kanban mount.
  const ensureAgents = useCallback(async () => {
    if (agents.length || agentsLoading) return
    setAgentsLoading(true)
    try {
      const res = await api.get("/users")
      const list = res?.users ?? res?.data?.users ?? res?.data ?? []
      // Owners can credit any sales-side teammate. Filter out non-sales
      // roles (super admin, channel partner, etc.) and pending invites.
      const eligible = list.filter(
        (u) => ["OWNER", "ADMIN", "MANAGER", "AGENT"].includes(u.role) && u.status !== "PENDING",
      )
      setAgents(eligible)
    } catch {
      setAgents([])
    } finally {
      setAgentsLoading(false)
    }
  }, [agents.length, agentsLoading])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  // Layered collision detection so EMPTY columns are still valid drop
  // targets. closestCorners (the previous strategy) compares distance to
  // each droppable's corners — when a column has no cards, its own rect
  // often loses to a neighbouring filled column whose cards sit closer
  // to the dragged item. pointerWithin / rectIntersection hit-test the
  // column's actual area first, so dropping on the empty drop zone works
  // even when the column has zero leads.
  const collisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args)
    if (pointerHits.length > 0) return pointerHits
    const rectHits = rectIntersection(args)
    if (rectHits.length > 0) return rectHits
    return closestCorners(args)
  }, [])

  const fetchBoard = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get("/pipeline/board", { params: filters })
      const data = res?.data ?? res ?? {}
      setStages(Array.isArray(data.stages) ? data.stages : [])
    } catch (err) {
      setError(err?.message || "Failed to load board")
      setStages([])
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const stageByName = useMemo(() => {
    const map = new Map()
    for (const s of stages) map.set(s.name, s)
    return map
  }, [stages])

  const findLeadStage = useCallback(
    (leadId) => stages.find((s) => s.leads.some((l) => l.id === leadId)),
    [stages],
  )

  const performTransition = async ({ lead, fromStage, toStage, reason, closedById }) => {
    // Optimistic move
    setStages((prev) =>
      prev.map((s) => {
        if (s.name === fromStage.name) {
          return {
            ...s,
            leads: s.leads.filter((l) => l.id !== lead.id),
            total: Math.max(0, (s.total ?? s.leads.length) - 1),
          }
        }
        if (s.name === toStage.name) {
          return {
            ...s,
            leads: [{ ...lead, status: toStage.name }, ...s.leads],
            total: (s.total ?? s.leads.length) + 1,
          }
        }
        return s
      }),
    )

    try {
      await api.post(`/leads/${lead.id}/transition`, {
        toStatus: toStage.name,
        ...(reason ? { reason } : {}),
        ...(closedById ? { closedById } : {}),
      })
      toast.success(`Moved to ${toStage.name}`)
    } catch (err) {
      toast.error(err?.message || "Failed to move lead")
      // Revert by refetch — safest given totals + ordering
      fetchBoard()
    }
  }

  const onDragStart = (event) => {
    const lead = event.active?.data?.current?.lead
    if (lead) setActiveLead(lead)
  }

  const onDragEnd = (event) => {
    setActiveLead(null)
    const { active, over } = event
    if (!over) return

    const lead = active.data?.current?.lead
    if (!lead) return

    // Resolve target stage: drop target may be a column id (stage name) or another card id.
    let toStageName = over.id
    if (over.data?.current?.type === "lead") {
      const overLead = over.data.current.lead
      toStageName = overLead.status
    } else if (over.data?.current?.type === "column") {
      toStageName = over.data.current.stage.name
    }

    const toStage = stageByName.get(toStageName)
    const fromStage = findLeadStage(lead.id)
    if (!toStage || !fromStage) return
    if (toStage.name === fromStage.name) return

    if (toStage.isLost) {
      setPendingLost({ lead, fromStage, toStage })
      return
    }
    if (toStage.isWon) {
      // Agents (and channel partners) are auto-credited server-side. Only
      // owners/managers/admins need to pick who closed the deal.
      if (CAN_PICK_CLOSER.has(role)) {
        ensureAgents()
        setPendingWon({ lead, fromStage, toStage })
        return
      }
      // Agent moving their own lead: pass their id explicitly so the BE
      // doesn't need to second-guess who the closer is.
      performTransition({ lead, fromStage, toStage, closedById: currentUserId })
      return
    }
    performTransition({ lead, fromStage, toStage })
  }

  if (isLoading) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--lp-text-muted)",
          fontSize: "0.933rem",
        }}
      >
        Loading board…
      </div>
    )
  }

  if (error) {
    return (
      <div className="stack" style={{ padding: 24, alignItems: "center" }}>
        <p style={{ color: "var(--lp-error)" }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={fetchBoard}>
          Retry
        </button>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="empty-state">
        <h3>No pipeline stages</h3>
        <p>Set up your pipeline in Settings to use the Kanban view.</p>
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveLead(null)}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            padding: "4px 4px 12px",
            alignItems: "stretch",
            minHeight: 400,
          }}
        >
          {stages.map((stage) => (
            <Column key={stage.id} stage={stage}>
              <SortableContext
                items={stage.leads.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {stage.leads.length === 0 ? (
                  <div
                    style={{
                      padding: "20px 8px",
                      textAlign: "center",
                      color: "var(--lp-text-muted)",
                      fontSize: "0.8rem",
                    }}
                  >
                    No leads
                  </div>
                ) : (
                  stage.leads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))
                )}
              </SortableContext>
            </Column>
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {pendingLost && (
        <LostReasonModal
          onClose={() => setPendingLost(null)}
          onSubmit={async (reason) => {
            const payload = pendingLost
            setPendingLost(null)
            await performTransition({ ...payload, reason })
          }}
        />
      )}

      {pendingWon && (
        <WonCloserModal
          lead={pendingWon.lead}
          agents={agents}
          loading={agentsLoading}
          onClose={() => setPendingWon(null)}
          onSubmit={async (closedById) => {
            const payload = pendingWon
            setPendingWon(null)
            await performTransition({ ...payload, closedById })
          }}
        />
      )}
    </>
  )
}
