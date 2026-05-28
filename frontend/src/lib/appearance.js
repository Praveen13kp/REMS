// Per-tenant appearance persistence. Theme + accent + text-size are
// stored in localStorage under company-scoped keys so a Channel Partner
// (or anyone who logs into multiple companies from the same browser)
// sees each company's brand instead of the last one they touched.
//
// Storage shape:
//   lp-accent-hex:<companyId>    -> "#8B5CF6"
//   lp-text-size:<companyId>     -> "small" | "default" | "large"
//   lp-sidebar-collapsed:<companyId> -> "true" | "false"
//
// next-themes' "theme" key (light/dark) is left as a personal device
// preference — most apps treat that as the user's choice, not the
// tenant's. Only brand-color / sizing get namespaced.

export const DEFAULT_ACCENT = "#8B5CF6"

const ACCENT_KEY = "lp-accent-hex"
const TEXT_SIZE_KEY = "lp-text-size"
const COLLAPSED_KEY = "lp-sidebar-collapsed"

function scopedKey(base, companyId) {
  return companyId ? `${base}:${companyId}` : base
}

function hexToRgb(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (...cs) =>
  "#" + cs.map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0")).join("")
export function lighten(hex, amt) {
  const [r, g, b] = hexToRgb(hex)
  return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt)
}
export function darken(hex, amt) {
  const [r, g, b] = hexToRgb(hex)
  return toHex(r * (1 - amt), g * (1 - amt), b * (1 - amt))
}

function setAccentVars(hex) {
  const root = document.documentElement
  root.style.setProperty("--lp-accent", hex)
  root.style.setProperty("--lp-accent-2", lighten(hex, 0.2))
  root.style.setProperty("--lp-accent-strong", darken(hex, 0.1))
  root.style.setProperty("--lp-accent-deep", darken(hex, 0.2))
}

function clearAccentVars() {
  const root = document.documentElement
  root.style.removeProperty("--lp-accent")
  root.style.removeProperty("--lp-accent-2")
  root.style.removeProperty("--lp-accent-strong")
  root.style.removeProperty("--lp-accent-deep")
}

// Read the stored accent for this company. Returns null if nothing saved.
export function getAccentForCompany(companyId) {
  try {
    return localStorage.getItem(scopedKey(ACCENT_KEY, companyId))
  } catch {
    return null
  }
}

// Save + apply the accent for this company.
export function saveAccentForCompany(companyId, hex) {
  try {
    localStorage.setItem(scopedKey(ACCENT_KEY, companyId), hex)
  } catch {
    /* localStorage might be blocked — apply anyway */
  }
  setAccentVars(hex)
}

// Apply the accent for the current company. Falls back to the CSS
// default (clears the inline overrides) when nothing is saved or when
// companyId is missing.
export function applyAccentForCompany(companyId) {
  const stored = getAccentForCompany(companyId)
  if (stored) setAccentVars(stored)
  else clearAccentVars()
}

// Text size + sidebar collapse — same per-company isolation.
export function getTextSizeForCompany(companyId) {
  try {
    return localStorage.getItem(scopedKey(TEXT_SIZE_KEY, companyId)) || "default"
  } catch {
    return "default"
  }
}
export function saveTextSizeForCompany(companyId, size) {
  try {
    localStorage.setItem(scopedKey(TEXT_SIZE_KEY, companyId), size)
  } catch {
    /* swallow */
  }
  document.documentElement.setAttribute("data-text-size", size)
}
export function applyTextSizeForCompany(companyId) {
  const size = getTextSizeForCompany(companyId)
  if (size && size !== "default") {
    document.documentElement.setAttribute("data-text-size", size)
  } else {
    document.documentElement.removeAttribute("data-text-size")
  }
}

export function getCollapsedForCompany(companyId) {
  try {
    return localStorage.getItem(scopedKey(COLLAPSED_KEY, companyId)) === "true"
  } catch {
    return false
  }
}
export function saveCollapsedForCompany(companyId, collapsed) {
  try {
    localStorage.setItem(scopedKey(COLLAPSED_KEY, companyId), String(collapsed))
  } catch {
    /* swallow */
  }
}
