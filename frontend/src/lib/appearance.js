// Per-tenant appearance storage + CSS-var application.
// Shared by main.jsx/App.jsx (boot path), Navbar brand-color picker,
// and Settings → Appearance.
//
// Per-company values are keyed by companyId so users with multiple
// workspaces (e.g. Channel Partners) see each tenant's brand. The
// global keys (`lp-accent-hex`, `lp-text-size`) only seed the no-flash
// pre-auth boot path — once a companyId is known we read/write the
// per-company key exclusively, so one tenant's brand never leaks into
// another's UI.

export const DEFAULT_ACCENT = "#2563eb"
const DEFAULT_TEXT_SIZE = "default"

export const ACCENT_CHANGED_EVENT = "lp-accent-changed"

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
    // When we know the tenant, read ONLY the per-company key — never the
    // global mirror. The global mirror is last-write-wins across all
    // workspaces, so falling through to it would leak Company A's brand
    // into Company B until they pick their own.
    if (companyId) {
      return localStorage.getItem(accentKey(companyId)) || DEFAULT_ACCENT
    }
    return localStorage.getItem(GLOBAL_ACCENT_KEY) || DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

export const saveAccentForCompany = (companyId, hex) => {
  try {
    if (companyId) localStorage.setItem(accentKey(companyId), hex)
    // Keep the global mirror only so the pre-auth boot in main.jsx has
    // *something* to render before fetchSession resolves. Per-company
    // reads ignore it.
    localStorage.setItem(GLOBAL_ACCENT_KEY, hex)
  } catch {}
  applyAccent(hex)
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ACCENT_CHANGED_EVENT, { detail: { companyId, hex } }),
    )
  }
}

// Read the per-company accent and push it to the CSS vars. Call on
// login / company-switch so a freshly-loaded tenant gets its own brand
// (or the default) instead of inheriting whatever was last applied.
export const applyAccentForCompany = (companyId) => {
  applyAccent(getAccentForCompany(companyId))
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
