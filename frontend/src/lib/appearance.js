// Per-tenant appearance storage + CSS-var application.
// Shared by main.jsx/App.jsx (boot path) and Settings → Appearance.
//
// Per-company values are keyed by companyId so users with multiple
// workspaces (e.g. Channel Partners) see each tenant's brand. The
// global keys (`lp-accent-hex`, `lp-text-size`) mirror the active
// company so the no-flash boot path in main.jsx works without auth.

export const DEFAULT_ACCENT = "#2563eb"
const DEFAULT_TEXT_SIZE = "default"

const GLOBAL_ACCENT_KEY = "lp-accent-hex"
const GLOBAL_TEXT_SIZE_KEY = "lp-text-size"

const k = (base, companyId) => (companyId ? `${base}:${companyId}` : base)

const accentKey    = (id) => k("lp-accent-hex", id)
const textSizeKey  = (id) => k("lp-text-size", id)
const collapsedKey = (id) => k("lp-sidebar-collapsed", id)

// ---- color math ----------------------------------------------------------

const clamp = (n) => Math.max(0, Math.min(255, n))

const parseHex = (hex) => {
  const s = (hex || DEFAULT_ACCENT).replace("#", "")
  const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const toHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => clamp(Math.round(v)).toString(16).padStart(2, "0")).join("")

export const lighten = (hex, amt) => {
  const { r, g, b } = parseHex(hex)
  return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt)
}

export const darken = (hex, amt) => {
  const { r, g, b } = parseHex(hex)
  return toHex(r * (1 - amt), g * (1 - amt), b * (1 - amt))
}

// ---- CSS-var application -------------------------------------------------

const applyAccent = (hex) => {
  if (typeof document === "undefined") return
  document.documentElement.style.setProperty("--lp-accent", hex)
  document.documentElement.style.setProperty("--lp-accent-2", lighten(hex, 0.2))
  document.documentElement.style.setProperty("--lp-accent-strong", darken(hex, 0.1))
  document.documentElement.style.setProperty("--lp-accent-deep", darken(hex, 0.2))
}

const applyTextSize = (size) => {
  if (typeof document === "undefined") return
  document.documentElement.setAttribute("data-text-size", size || DEFAULT_TEXT_SIZE)
}

// ---- accent --------------------------------------------------------------

export const getAccentForCompany = (companyId) => {
  try {
    return (
      localStorage.getItem(accentKey(companyId)) ||
      localStorage.getItem(GLOBAL_ACCENT_KEY) ||
      DEFAULT_ACCENT
    )
  } catch {
    return DEFAULT_ACCENT
  }
}

export const saveAccentForCompany = (companyId, hex) => {
  try {
    localStorage.setItem(accentKey(companyId), hex)
    localStorage.setItem(GLOBAL_ACCENT_KEY, hex)
  } catch {}
  applyAccent(hex)
}

// ---- text size -----------------------------------------------------------

export const getTextSizeForCompany = (companyId) => {
  try {
    return (
      localStorage.getItem(textSizeKey(companyId)) ||
      localStorage.getItem(GLOBAL_TEXT_SIZE_KEY) ||
      DEFAULT_TEXT_SIZE
    )
  } catch {
    return DEFAULT_TEXT_SIZE
  }
}

export const saveTextSizeForCompany = (companyId, size) => {
  try {
    localStorage.setItem(textSizeKey(companyId), size)
    localStorage.setItem(GLOBAL_TEXT_SIZE_KEY, size)
  } catch {}
  applyTextSize(size)
}

// ---- sidebar collapsed ---------------------------------------------------

export const getCollapsedForCompany = (companyId) => {
  try {
    return localStorage.getItem(collapsedKey(companyId)) === "1"
  } catch {
    return false
  }
}

export const saveCollapsedForCompany = (companyId, val) => {
  try {
    localStorage.setItem(collapsedKey(companyId), val ? "1" : "0")
  } catch {}
}
