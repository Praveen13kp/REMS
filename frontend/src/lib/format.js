// Pure formatting helpers ported verbatim from the static reference build
// (_tmp_leadpro/leadpro-realty/src/store.jsx). No React, no state.

export const fmt = {
  inr: (n) => "₹" + Number(n).toLocaleString("en-IN"),
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
}

export const roleLabel = (r) =>
  ({
    super_admin: "Super Admin",
    admin: "Admin",
    manager: "Manager",
    agent: "Agent",
    viewer: "Viewer",
  }[r] || r)

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
