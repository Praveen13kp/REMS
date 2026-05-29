import { forwardRef, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"

import { ALL_CITIES, POPULAR_CITIES, normalizeCityName } from "@/lib/cities"

// Searchable combobox for city. Permissive: agents can type a city outside
// the predefined list and we'll keep it (normalized to Title Case). Use
// instead of a plain <input> wherever city is entered, so casing stays
// consistent ("Pune" not "pune"/"PUNE") and filters/dedup keep working.

const MAX_RESULTS = 10

const CityInput = forwardRef(function CityInput(
  { value, onChange, onBlur, name, disabled, placeholder, hasError, cityData, ...rest },
  ref,
) {
  // Internal display state — what's actually shown in the input. We don't
  // bind the input directly to `value` because we want the user to be able
  // to type freely (and not be stuck with the normalized form mid-typing).
  const [draft, setDraft] = useState(value || "")
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef(null)

  // Use provided cityData or fall back to global defaults.
  const popular = cityData?.popular || POPULAR_CITIES
  const all = cityData?.all || ALL_CITIES

  // Sync external value → internal draft when the form resets / loads a row.
  useEffect(() => {
    setDraft(value || "")
  }, [value])

  // Close the menu when clicking outside.
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const matches = useMemo(() => {
    const q = draft.trim().toLowerCase()
    // Empty input → show popular metros so the dropdown isn't a wall of
    // obscure tier-3 towns. As soon as the user types, search the full
    // dataset (~4k cities).
    if (!q) return popular.slice(0, MAX_RESULTS)
    // startsWith first, then contains — feels natural to the typist.
    // We stop early once we have enough candidates so scanning 4k strings
    // doesn't block the keystroke.
    const starts = []
    const contains = []
    for (const c of all) {
      const lc = c.toLowerCase()
      if (lc.startsWith(q)) {
        starts.push(c)
        if (starts.length >= MAX_RESULTS) break
      } else if (lc.includes(q) && contains.length < MAX_RESULTS) {
        contains.push(c)
      }
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS)
  }, [draft, popular, all])

  const commit = (raw) => {
    const normalized = normalizeCityName(raw)
    setDraft(normalized)
    onChange?.(normalized)
    setOpen(false)
  }

  const handleInputChange = (e) => {
    setDraft(e.target.value)
    setOpen(true)
    setHighlight(0)
    // Don't normalize while typing — only when the user lands on a value.
    // But also bubble the raw value up so the form sees something. We'll
    // re-normalize on blur / selection.
    onChange?.(e.target.value)
  }

  const handleBlur = (e) => {
    // Defer so a click on a menu item still fires before the input commits.
    setTimeout(() => {
      if (wrapRef.current && wrapRef.current.contains(document.activeElement)) return
      commit(draft)
      onBlur?.(e)
    }, 120)
  }

  const handleKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
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
    }
  }

  const clear = () => {
    setDraft("")
    onChange?.("")
    setOpen(false)
  }

  return (
    <div
      ref={wrapRef}
      className="city-input"
      style={{ position: "relative", width: "100%" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          border: `1px solid ${hasError ? "var(--lp-error)" : "var(--lp-border)"}`,
          borderRadius: "var(--lp-radius-input, 8px)",
          background: "var(--lp-surface)",
          overflow: "hidden",
        }}
      >
        <input
          ref={ref}
          type="text"
          name={name}
          value={draft}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || "Search or type a city…"}
          autoComplete="off"
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
        {draft && !disabled && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear city"
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
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          aria-label="Toggle city list"
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
          <ChevronDown size={14} />
        </button>
      </div>

      {open && matches.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--lp-surface)",
            border: "1px solid var(--lp-border)",
            borderRadius: 8,
            boxShadow: "var(--lp-shadow, 0 8px 24px rgba(0,0,0,.18))",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {matches.map((c, i) => (
            <li
              key={c}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault()
                commit(c)
              }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.933rem",
                color: "var(--lp-text)",
                background: i === highlight ? "var(--lp-surface-2)" : "transparent",
              }}
            >
              {c}
            </li>
          ))}
          {draft.trim() && !all.some((c) => c.toLowerCase() === draft.trim().toLowerCase()) && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault()
                commit(draft)
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.867rem",
                color: "var(--lp-text-muted)",
                borderTop: "1px solid var(--lp-border)",
                marginTop: 2,
              }}
            >
              Use “{normalizeCityName(draft)}”
            </li>
          )}
        </ul>
      )}
    </div>
  )
})

export default CityInput
