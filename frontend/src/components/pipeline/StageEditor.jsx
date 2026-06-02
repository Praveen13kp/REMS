import { useEffect, useState } from "react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus, Save, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useFormDraft } from "@/hooks/useFormDraft"

const NEW_STAGE_INITIAL = { name: "", probability: 0, isWon: false, isLost: false }

// Drag-drop pipeline stage editor.
// - Rename + edit probability inline
// - Reorder by drag (commits via PATCH /pipeline/stages/reorder)
// - Add new stage (POST /pipeline/stages)
// - Delete stage (DELETE /pipeline/stages/:id) — backend blocks delete
//   if leads still reference the stage, surface that error to the user

function SortableRow({ stage, onChange, onSave, onDelete, isDirty, isSaving }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    display: "grid",
    gridTemplateColumns: "32px 1fr 120px auto auto auto",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    background: "var(--lp-surface)",
    border: "1px solid var(--lp-border)",
    borderRadius: 8,
    marginBottom: 8,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        style={{
          background: "transparent",
          border: 0,
          cursor: "grab",
          color: "var(--lp-text-muted)",
          display: "inline-flex",
          padding: 4,
        }}
      >
        <GripVertical size={16} />
      </button>

      <input
        className="input"
        value={stage.name}
        onChange={(e) => onChange({ ...stage, name: e.target.value })}
        placeholder="Stage name"
      />
      <input
        className="input"
        type="number"
        min={0}
        max={100}
        value={stage.probability ?? 0}
        onChange={(e) =>
          onChange({ ...stage, probability: parseInt(e.target.value) || 0 })
        }
        placeholder="% prob."
      />
      <div className="row" style={{ gap: 4 }}>
        {stage.isWon && <span className="badge badge-success">Won</span>}
        {stage.isLost && <span className="badge badge-error">Lost</span>}
        {stage.isDefault && <span className="badge badge-info">Default</span>}
      </div>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        disabled={!isDirty || isSaving}
        onClick={() => onSave(stage)}
        title="Save name/probability"
      >
        <Save size={14} /> Save
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        disabled={stage.isDefault || isSaving}
        onClick={() => onDelete(stage)}
        title={
          stage.isDefault
            ? "The default stage cannot be deleted"
            : "Delete stage"
        }
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function StageEditor() {
  const [stages, setStages] = useState([])
  const [original, setOriginal] = useState(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  // Draft-backed: closing via backdrop/X keeps what was typed; reopening
  // restores it. Cleared only on Cancel or a successful create.
  const [newStage, setNewStage, clearNewStageDraft] = useFormDraft(
    "pipeline:new-stage",
    NEW_STAGE_INITIAL,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await api.get("/pipeline/stages")
      const list = res?.data ?? []
      setStages(list)
      setOriginal(
        new Map(list.map((s) => [s.id, { name: s.name, probability: s.probability }])),
      )
    } catch (err) {
      toast.error(err?.message || "Failed to load stages")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const isDirty = (s) => {
    const o = original.get(s.id)
    if (!o) return false
    return o.name !== s.name || o.probability !== s.probability
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = stages.findIndex((s) => s.id === active.id)
    const newIndex = stages.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(stages, oldIndex, newIndex)
    setStages(next)
    setIsSaving(true)
    try {
      const res = await api.patch("/pipeline/stages/reorder", {
        stageIds: next.map((s) => s.id),
      })
      const list = res?.data ?? []
      setStages(list)
      setOriginal(
        new Map(list.map((s) => [s.id, { name: s.name, probability: s.probability }])),
      )
      toast.success("Order saved")
    } catch (err) {
      toast.error(err?.message || "Failed to reorder")
      load()
    } finally {
      setIsSaving(false)
    }
  }

  const onChange = (next) => {
    setStages((prev) => prev.map((s) => (s.id === next.id ? next : s)))
  }

  const onSave = async (stage) => {
    if (!stage.name.trim()) {
      toast.error("Stage name is required")
      return
    }
    setIsSaving(true)
    try {
      await api.patch(`/pipeline/stages/${stage.id}`, {
        name: stage.name.trim(),
        probability: stage.probability,
      })
      setOriginal((prev) => {
        const next = new Map(prev)
        next.set(stage.id, { name: stage.name, probability: stage.probability })
        return next
      })
      toast.success(`Saved "${stage.name}"`)
    } catch (err) {
      toast.error(err?.message || "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const onDelete = async (stage) => {
    if (!window.confirm(`Delete stage "${stage.name}"?`)) return
    setIsSaving(true)
    try {
      await api.delete(`/pipeline/stages/${stage.id}`)
      toast.success(`Deleted "${stage.name}"`)
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to delete")
    } finally {
      setIsSaving(false)
    }
  }

  const onCreate = async () => {
    const name = newStage.name.trim()
    if (!name) {
      toast.error("Stage name is required")
      return
    }
    setIsSaving(true)
    try {
      await api.post("/pipeline/stages", {
        name,
        probability: newStage.probability,
        isWon: newStage.isWon,
        isLost: newStage.isLost,
      })
      toast.success(`Added "${name}"`)
      clearNewStageDraft() // successful create → drop the draft
      setAddOpen(false)
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to add stage")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="card">
      <div
        className="card-title"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Pipeline Stages</span>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => setAddOpen(true)}
          disabled={isSaving}
        >
          <Plus size={14} /> Add stage
        </button>
      </div>
      <p className="text-muted text-sm" style={{ marginTop: -8, marginBottom: 12 }}>
        Drag to reorder. Edit the name or probability and click Save to commit.
        Stages that still hold leads cannot be deleted.
      </p>

      {isLoading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 120px auto auto auto",
              gap: 10,
              alignItems: "center",
              padding: "0 12px 6px",
              fontSize: "0.8rem",
              color: "var(--lp-text-muted)",
              fontWeight: 600,
            }}
          >
            <div />
            <div>Name</div>
            <div>Probability %</div>
            <div>Flags</div>
            <div />
            <div />
          </div>
          <SortableContext
            items={stages.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {stages.map((s) => (
              <SortableRow
                key={s.id}
                stage={s}
                onChange={onChange}
                onSave={onSave}
                onDelete={onDelete}
                isDirty={isDirty(s)}
                isSaving={isSaving}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {addOpen && (
        <div className="modal-backdrop" onClick={() => !isSaving && setAddOpen(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-head">
              <h3>Add pipeline stage</h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                disabled={isSaving}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "var(--lp-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Name</label>
                <input
                  className="input"
                  value={newStage.name}
                  onChange={(e) =>
                    setNewStage({ ...newStage, name: e.target.value })
                  }
                  placeholder="e.g. Site Visit Scheduled"
                  autoFocus
                />
              </div>
              <div className="field">
                <label className="label">Probability %</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={newStage.probability}
                  onChange={(e) =>
                    setNewStage({
                      ...newStage,
                      probability: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="field">
                <label className="label">Flags</label>
                <div className="row" style={{ gap: 14 }}>
                  <label
                    style={{
                      display: "inline-flex",
                      gap: 6,
                      alignItems: "center",
                      fontSize: "0.867rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newStage.isWon}
                      onChange={(e) =>
                        setNewStage({
                          ...newStage,
                          isWon: e.target.checked,
                          isLost: e.target.checked ? false : newStage.isLost,
                        })
                      }
                    />
                    Won
                  </label>
                  <label
                    style={{
                      display: "inline-flex",
                      gap: 6,
                      alignItems: "center",
                      fontSize: "0.867rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newStage.isLost}
                      onChange={(e) =>
                        setNewStage({
                          ...newStage,
                          isLost: e.target.checked,
                          isWon: e.target.checked ? false : newStage.isWon,
                        })
                      }
                    />
                    Lost
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  clearNewStageDraft() // explicit cancel → discard the draft
                  setAddOpen(false)
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSaving}
                onClick={onCreate}
              >
                {isSaving ? "Adding…" : "Add stage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
