// Role-based PII redaction for lead contact details.
//
// Why a separate module:
// - The same masking has to be applied at EVERY return path that hands a
//   lead (or a lead-like row) back to the caller — list, detail, kanban
//   board, calendar, aging, dedup matches, create response, update
//   response, assign/transition response. Centralising the rules here
//   means a future change (e.g. unmask the last 4 digits instead of the
//   last 5) is a one-file edit.
// - Backend is the source of truth. Even if a future frontend forgets to
//   render the masked value, the API never leaks the raw number to an
//   AGENT — so a curl call from the agent's own browser tab still sees
//   the masked phone.
//
// Roles that see the FULL value: OWNER, ADMIN, MANAGER, SUPER_ADMIN,
// PLATFORM_ADMIN. Roles that get masked: AGENT, BROKER.

const RESTRICTED_ROLES = new Set(["AGENT", "CHANNEL_PARTNER", "BROKER"]);

function isPrivacyRestricted(role) {
  return RESTRICTED_ROLES.has(role);
}

// "+919876543210" -> "+91 98765 XXXXX"
// "9876543210"    -> "98765 XXXXX"
// Anything shorter than 6 chars is returned as-is (nothing meaningful to
// reveal anyway). The mask keeps the first 5 digits the user already
// glanced at, hides the last 5 — autodialer click-to-call is the only
// way for an AGENT to actually reach the customer.
function maskPhone(raw) {
  if (!raw) return raw;
  const s = String(raw);
  const digits = s.replace(/\D/g, "");
  if (digits.length < 6) return s;

  const country = s.startsWith("+") ? `+${digits.slice(0, digits.length - 10)} ` : "";
  const ten = digits.slice(-10);
  const visible = ten.slice(0, 5);
  return `${country}${visible} XXXXX`;
}

// "john.doe@example.com" -> "j******e@example.com"
// "ab@x.com"             -> "a*@x.com"
// Missing/short -> returned as-is.
function maskEmail(raw) {
  if (!raw) return raw;
  const s = String(raw);
  const at = s.indexOf("@");
  if (at < 1) return s;
  const local = s.slice(0, at);
  const domain = s.slice(at);
  if (local.length <= 2) return `${local[0]}*${domain}`;
  return `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}${domain}`;
}

// Returns a shallow copy of the lead with PII masked when:
//  - the lead was sourced by a CP and the viewer is NOT that CP (the
//    CP-controlled visibility level on the lead applies), OR
//  - the viewer's role is privacy-restricted (AGENT — legacy role mask).
//
// Idempotent — calling twice is safe. Adds `_masked: true` so the FE can
// swap a tel: link for a "Call" button without knowing the user's role.
function maskLeadForRole(lead, role, viewerUserId) {
  if (!lead) return lead;

  // CP-sourced lead. The CP picked the visibility level; the company
  // sees the masked version. The CP themselves always sees full.
  if (lead.channelPartnerId) {
    if (viewerUserId && lead.channelPartnerId === viewerUserId) {
      return lead;
    }
    return applyVisibility(lead, lead.visibility || "FULL");
  }

  // Company-sourced lead shared with a CP. When the viewer IS the CP,
  // apply the visibility level the company set on the lead. (The
  // company itself and its internal users see the raw lead.)
  if (role === "CHANNEL_PARTNER" || role === "BROKER") {
    return applyVisibility(lead, lead.visibility || "FULL");
  }

  // Pure internal lead. AGENT still has its role-based mask.
  if (!isPrivacyRestricted(role)) return lead;
  return {
    ...lead,
    phone: maskPhone(lead.phone),
    email: lead.email ? maskEmail(lead.email) : lead.email,
    _masked: true,
  };
}

// Per-lead visibility level applied when the consumer is a Channel Partner
// (or the company is viewing a lead a CP shared with them).
//
//   FULL       - return everything as-is
//   PARTIAL    - mask phone + email; name stays
//   ANONYMOUS  - mask phone + email AND replace name with "Anonymous Lead"
//
// Always idempotent and never mutates the original.
function applyVisibility(lead, level) {
  if (!lead) return lead;
  if (level === "FULL") return lead;
  const out = {
    ...lead,
    phone: maskPhone(lead.phone),
    email: lead.email ? maskEmail(lead.email) : lead.email,
    _masked: true,
    _visibility: level,
  };
  if (level === "ANONYMOUS") {
    out.name = "Anonymous Lead";
  }
  return out;
}

function maskLeadListForRole(items, role, viewerUserId) {
  if (!Array.isArray(items)) return items;
  return items.map((l) => maskLeadForRole(l, role, viewerUserId));
}

// Dedup-match responses include a `{ hard, soft }` shape with lead-shaped
// rows; mask both sides.
function maskDuplicateMatchesForRole({ hard, soft }, role) {
  if (!isPrivacyRestricted(role)) return { hard, soft };
  return {
    hard: maskLeadListForRole(hard, role),
    soft: maskLeadListForRole(soft, role),
  };
}

module.exports = {
  RESTRICTED_ROLES,
  isPrivacyRestricted,
  maskPhone,
  maskEmail,
  maskLeadForRole,
  maskLeadListForRole,
  maskDuplicateMatchesForRole,
  applyVisibility,
};
