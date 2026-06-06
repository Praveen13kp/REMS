import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown } from "lucide-react"

import { DEPARTMENTS } from "@/lib/departments"

const MENU_MAX_HEIGHT = 240

export default function MultiDepartmentSelect({
  value = [],
  onChange,
  disabled,
  placeholder = "Select departments…",
  hasError,
  options = DEPARTMENTS,
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [menuPos, setMenuPos] = useState(null)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)

  const selected = useMemo(() => new Set(value || []), [value])

  const displayText = useMemo(() => {
    if (!value || value.length === 0) return ""
    return value.join(", ")
  }, [value])

  const showBadge = value.length > 1

  const matches = options

  const computePosition = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    const flipUp = spaceBelow < 180 && spaceAbove > spaceBelow
    const maxHeight = Math.min(
      MENU_MAX_HEIGHT,
      Math.max(120, (flipUp ? spaceAbove : spaceBelow) - 12),
    )
    setMenuPos({
      left: r.left,
      width: r.width,
      maxHeight,
      ...(flipUp
        ? { bottom: window.innerHeight - r.top + 4 }
        : { top: r.bottom + 4 }),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    computePosition()
    const onMove = () => computePosition()
    window.addEventListener("scroll", onMove, true)
    window.addEventListener("resize", onMove)
    return () => {
      window.removeEventListener("scroll", onMove, true)
      window.removeEventListener("resize", onMove)
    }
  }, [open, computePosition])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const toggle = (val) => {
    const next = new Set(value || [])
    if (next.has(val)) {
      next.delete(val)
    } else {
      next.add(val)
    }
    onChange?.([...next])
  }

  const handleKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => Math.min(matches.length - 1, h + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === "Enter") {
      if (open && matches[highlight]) {
        e.preventDefault()
        toggle(matches[highlight])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const menu =
    open && menuPos
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: "fixed",
              left: menuPos.left,
              width: menuPos.width,
              ...(menuPos.top != null ? { top: menuPos.top } : {}),
              ...(menuPos.bottom != null ? { bottom: menuPos.bottom } : {}),
              zIndex: 1000,
              margin: 0,
              padding: 6,
              listStyle: "none",
              background: "var(--lp-surface)",
              border: "1px solid var(--lp-border)",
              borderRadius: 10,
              boxShadow:
                "0 12px 32px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.18)",
              maxHeight: menuPos.maxHeight,
              overflowY: "auto",
            }}
          >
            {matches.map((d, i) => {
              const isSel = selected.has(d)
              const isHi = i === highlight
              return (
                <li
                  key={d}
                  role="option"
                  aria-selected={isSel}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    toggle(d)
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 11px",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "var(--lp-text)",
                    background: isHi
                      ? "var(--lp-surface-2)"
                      : isSel
                        ? "rgba(139,92,246,0.10)"
                        : "transparent",
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `2px solid ${isSel ? "var(--lp-accent)" : "var(--lp-border)"}`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                      background: isSel ? "var(--lp-accent)" : "transparent",
                      transition: "all .12s",
                    }}
                  >
                    {isSel && <Check size={11} style={{ color: "#fff" }} />}
                  </span>
                  <span>{d}</span>
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <div ref={wrapRef} className="multi-dept-select" style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          border: `1px solid ${hasError ? "var(--lp-error)" : open ? "var(--lp-accent)" : "var(--lp-border)"}`,
          borderRadius: "var(--lp-radius-input, 8px)",
          background: "var(--lp-surface)",
          overflow: "hidden",
          boxShadow: open ? "0 0 0 3px rgba(139,92,246,0.18)" : "none",
          transition: "border-color .12s, box-shadow .12s",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
        onClick={() => {
          if (disabled) return
          setOpen((o) => !o)
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 12px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              flex: 1,
              textAlign: "left",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: value.length > 0 ? "var(--lp-text)" : "var(--lp-text-muted)",
              fontSize: "0.933rem",
            }}
          >
            {displayText || placeholder}
          </span>
          {showBadge && (
            <span
              style={{
                background: "var(--lp-surface-2)",
                borderRadius: 999,
                padding: "0 7px",
                fontSize: "0.8rem",
                fontWeight: 600,
                lineHeight: "20px",
                color: "var(--lp-text-muted)",
                flex: "none",
              }}
            >
              {value.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (disabled) return
            setOpen((o) => !o)
          }}
          disabled={disabled}
          aria-label="Toggle department list"
          tabIndex={-1}
          style={{
            background: "var(--lp-surface-2)",
            border: 0,
            borderLeft: "1px solid var(--lp-border)",
            padding: "0 10px",
            cursor: disabled ? "not-allowed" : "pointer",
            color: "var(--lp-text-muted)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <ChevronDown
            size={14}
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform .15s",
            }}
          />
        </button>
      </div>
      {menu}
    </div>
  )
}
