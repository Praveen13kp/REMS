import { useEffect, useMemo, useRef, useState } from "react"
import { Building, Check, ChevronDown, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { fetchDepartments } from "@/lib/departments"

// Multi-department picker — rendered as a popover with checkboxes, styled
// after the Columns selector in the Leads table. Accepts `value` (array of
// department IDs) and `onChange(newIds)`. Fetches the department list from
// the API on mount.
export default function MultiDepartmentSelect({
  value = [],
  onChange,
  disabled,
  placeholder = "Select departments…",
  hasError,
}) {
  const [open, setOpen] = useState(false)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchDepartments().then((data) => {
      if (cancelled) return
      if (data) {
        setDepartments(data)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const selected = useMemo(() => {
    const set = new Set(value || [])
    return departments.filter((d) => set.has(d.id))
  }, [value, departments])

  const toggle = (id) => {
    const next = new Set(value || [])
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange?.([...next])
  }

  const clearAll = () => onChange?.([])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`dept-trigger ${hasError ? "error" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${hasError ? "var(--lp-error)" : "var(--lp-border)"}`,
            borderRadius: "var(--lp-radius-input, 8px)",
            background: "var(--lp-surface)",
            color: "var(--lp-text)",
            fontSize: "0.933rem",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            transition: "border-color .12s",
          }}
        >
          <Building size={15} style={{ flex: "none", color: "var(--lp-text-muted)" }} />
          <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {loading
              ? "Loading…"
              : selected.length === 0
                ? <span style={{ color: "var(--lp-text-muted)" }}>{placeholder}</span>
                : selected.map((d) => d.name).join(", ")}
          </span>
          {selected.length > 0 && !disabled && (
            <span
              style={{
                background: "var(--lp-surface-2)",
                borderRadius: 999,
                padding: "0 7px",
                fontSize: "0.8rem",
                fontWeight: 600,
                lineHeight: "20px",
                color: "var(--lp-text-muted)",
              }}
            >
              {selected.length}
            </span>
          )}
          <ChevronDown size={14} style={{ flex: "none", color: "var(--lp-text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="min-w-[240px] p-2">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                borderRadius: 6,
                fontSize: "0.833rem",
                color: "var(--lp-text-muted)",
                width: "100%",
                textAlign: "left",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--lp-surface-2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <X size={14} /> Clear all
            </button>
          )}
          {departments.map((dept) => {
            const isSelected = (value || []).includes(dept.id)
            return (
              <label
                key={dept.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  color: "var(--lp-text)",
                  background: isSelected ? "rgba(139,92,246,0.08)" : "transparent",
                  fontWeight: isSelected ? 600 : 400,
                }}
                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = "var(--lp-surface-2)")}
                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = "transparent")}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(dept.id)}
                  style={{ accentColor: "var(--lp-accent)" }}
                />
                <Check
                  size={14}
                  style={{
                    visibility: isSelected ? "visible" : "hidden",
                    color: "var(--lp-accent)",
                    flex: "none",
                  }}
                />
                <span>{dept.name}</span>
              </label>
            )
          })}
          {!loading && departments.length === 0 && (
            <div className="text-muted text-sm" style={{ padding: "12px 10px", textAlign: "center" }}>
              No departments yet
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
