// Pure formatting helpers ported verbatim from the static reference build
// (_tmp_leadpro/leadpro-realty/src/store.jsx). No React, no state.

// Currency lookup. Kept inline so format.js stays self-contained — adding
// a new currency means editing constants.js + this table together.
const CURRENCY_META = {
  INR: { symbol: "₹",   locale: "en-IN" },
  USD: { symbol: "$",   locale: "en-US" },
  AED: { symbol: "د.إ", locale: "en-AE" },
  GBP: { symbol: "£",   locale: "en-GB" },
  EUR: { symbol: "€",   locale: "en-IE" },
  SGD: { symbol: "S$",  locale: "en-SG" },
}

export const fmt = {
  inr: (n) => "₹" + Number(n).toLocaleString("en-IN"),
  // Currency-aware. Falls back to INR formatting when an unknown code
  // (or no code) is passed, so existing call sites that drop `code` keep
  // working exactly as before.
  currency: (n, code) => {
    const meta = CURRENCY_META[code] || CURRENCY_META.INR
    return meta.symbol + Number(n || 0).toLocaleString(meta.locale)
  },
  date: (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  dateShort: (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    }),
  ago: (d) => {
    const diff = (Date.now() - new Date(d)) / 1000
    if (diff < 60) return "just now"
    if (diff < 3600) return Math.floor(diff / 60) + "m ago"
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago"
    if (diff < 604800) return Math.floor(diff / 86400) + "d ago"
    return fmt.dateShort(d)
  },
  initials: (n) =>
    n
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
  avatarUrl: (path) => {
    if (!path) return null
    if (path.startsWith("http")) return path
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
    return `${base}${path}`
  },
  // Display formatter for Indian phone numbers stored as +91XXXXXXXXXX.
  // Legacy rows without a country code are tolerated — bare 10-digit
  // strings render as +91 XXXXX XXXXX too. Don't use this for tel:/wa.me
  // hrefs: those need the raw, undecorated number.
  phone: (raw) => {
    if (!raw) return ""
    const digits = String(raw).replace(/\D/g, "")
    const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2)
      : digits.length === 10 ? digits
      : null
    if (!ten) return String(raw) // unrecognized shape — show as-is rather than mangle
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`
  },
}

export const roleLabel = (r) => {
  if (!r) return ""
  const key = String(r).toLowerCase()
  return (
    {
      super_admin: "Super Admin",
      owner: "Owner",
      admin: "Admin",
      manager: "Manager",
      agent: "Agent",
      broker: "Broker",
      channel_partner: "Channel Partner",
      viewer: "Viewer",
    }[key] || r
  )
}

// Maps lead priority to a shadcn <Badge> variant.
// See docs/STATIC-UI-MAP.md "Class → component map".
export const priorityCls = (p) =>
  ({
    Hot: "destructive",
    Warm: "secondary",
    Cold: "outline",
  }[p] || "outline")

// Maps lead status to a shadcn <Badge> variant.
export const statusCls = (s) =>
  ({
    New: "secondary",
    Contacted: "secondary",
    Interested: "default",
    "Site Visit": "default",
    Negotiation: "default",
    Booked: "default",
    Lost: "destructive",
  }[s] || "outline")
