// Frontend mirror of backend/src/modules/lead/leadPrivacy.js role logic.
//
// The backend is the source of truth for PII masking — it already masks
// phone/email in every response for AGENT and BROKER roles. This module
// is only used to make the UI consistent: hide raw tel:/wa.me links
// (which would attempt to dial "+91 98765 XXXXX" — broken anyway),
// disable text selection on phone fields so the masked value can't be
// copied as if it were real, and surface a Call button that routes
// through the auto-dialer endpoint instead.
//
// Never use this for an authoritative "is the user allowed to..." check.
// Always confirm on the backend.

const RESTRICTED_ROLES = new Set(["AGENT", "BROKER"])

export function isPrivacyRestricted(role) {
  return RESTRICTED_ROLES.has(role)
}

// `lead._masked` is set by the backend when it masked the phone/email
// — prefer that when present, fall back to role inference.
export function leadPiiMasked(lead, role) {
  if (lead && lead._masked) return true
  return isPrivacyRestricted(role)
}

// CSS to discourage selecting/copying a masked contact field.
export const NON_SELECTABLE_STYLE = {
  userSelect: "none",
  WebkitUserSelect: "none",
  MozUserSelect: "none",
  msUserSelect: "none",
}
