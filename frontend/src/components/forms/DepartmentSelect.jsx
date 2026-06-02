import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, X } from "lucide-react"

import { DEPARTMENTS } from "@/lib/departments"

// Searchable department picker — type to filter, click/Enter to select.
// Selection is restricted to the shared DEPARTMENTS list so options stay
// consistent across the app. An existing off-list value (legacy data) is
// still shown as the current selection. Controlled: pass `value` (string)
// and `onChange(value)`.
//
// The option list is rendered in a portal with fixed positioning so it
// escapes the `overflow:hidden` of modal dialogs (which would otherwise clip
// it) and is never trapped behind the modal footer. It flips above the field
// when there isn't enough room below.

const MENU_MAX_HEIGHT = 240

const DepartmentSelect = forwardRef(function DepartmentSelect(
  {
    value,
    onChange,
    onBlur,
    name,
    id,
    disabled,
    placeholder = "Select department…",
    hasError,
    required,
    options = DEPARTMENTS,
    ...rest
  },
  ref,
) {
  const [draft, setDraft] = useState(value || "")
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [typing, setTyping] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    setDraft(value || "")
  }, [value])

  const matches = useMemo(() => {
    const q = typing ? draft.trim().toLowerCase() : ""
    if (!q) return options
    return options.filter((d) => d.toLowerCase().includes(q))
  }, [draft, typing, options])

  // Position the portal menu against the field, flipping up when the space
  // below is too tight.
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
    if (!open) return undefined
    computePosition()
    const onMove = () => computePosition()
    // capture:true so we also react to scrolling inside the modal body.
    window.addEventListener("scroll", onMove, true)
    window.addEventListener("resize", onMove)
    return () => {
      window.removeEventListener("scroll", onMove, true)
      window.removeEventListener("resize", onMove)
    }
  }, [open, computePosition])

  // Close on outside click — account for the portalled menu living outside
  // the wrapper in the DOM tree.
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
      setDraft(value || "")
      setTyping(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open, value])

  const commit = (val) => {
    setDraft(val)
    setTyping(false)
    onChange?.(val)
    setOpen(false)
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
        commit(matches[highlight])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      setDraft(value || "")
      setTyping(false)
    }
  }

  const handleBlur = (e) => {
    setTimeout(() => {
      if (wrapRef.current?.contains(document.activeElement)) return
      if (menuRef.current?.contains(document.activeElement)) return
      setDraft(value || "")
      setTyping(false)
      onBlur?.(e)
    }, 120)
  }

  const menu =
    open && menuPos && matches.length > 0
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
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
              const isSel = d === value
              const isHi = i === highlight
              return (
                <li
                  key={d}
                  role="option"
                  aria-selected={isSel}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    commit(d)
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
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
                  <span>{d}</span>
                  {isSel && <Check size={15} style={{ color: "var(--lp-accent)" }} />}
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <div ref={wrapRef} className="dept-select" style={{ position: "relative", width: "100%" }}>
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
        }}
      >
        <input
          ref={ref}
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-required={required || undefined}
          autoComplete="off"
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value)
            setTyping(true)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            flex: 1,
            border: 0,
            outline: "none",
            background: "transparent",
            padding: "10px 12px",
            color: "var(--lp-text)",
            fontSize: "0.933rem",
            minWidth: 0,
          }}
          {...rest}
        />
        {value && !disabled && !required && (
          <button
            type="button"
            onClick={() => commit("")}
            aria-label="Clear department"
            tabIndex={-1}
            style={{
              background: "transparent",
              border: 0,
              padding: "0 8px",
              cursor: "pointer",
              color: "var(--lp-text-muted)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
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
})

export default DepartmentSelect
