// Server-side mirror of frontend/src/lib/modules.js — the authoritative
// copy for ENFORCING owner-configured module access. The frontend hides
// restricted modules in the UI; this is what actually blocks the API.
//
// Only MANAGER and AGENT are restrictable. OWNER/ADMIN/SUPER_ADMIN are
// unrestricted, and CHANNEL_PARTNER uses a separate access model
// (tenantMiddleware + its own endpoints), so it is never gated here.

const BASE_MODULES = {
  MANAGER: [
    "Leads",
    "Lead Assignment",
    "Reports",
    "Files",
    "Projects",
    "Tasks",
    "Follow Ups",
    "User Management",
    "Channel Partners",
    "Billing",
  ],
  AGENT: ["Leads", "Tasks", "Files"],
};

const MODULE_LABELS = {
  Leads: "Leads",
  "Lead Assignment": "Lead Assignment",
  Reports: "Reports",
  Files: "Files",
  Projects: "Projects",
  Tasks: "Tasks",
  "Follow Ups": "Follow Ups",
  "User Management": "User Management",
  "Channel Partners": "Channel Partners",
  Settings: "Settings",
  Billing: "Billing",
  "Audit Log": "Audit Log",
};

const RESTRICTABLE_ROLES = ["MANAGER", "AGENT"];

// Whether an owner has explicitly taken a module away from this user.
//
// We enforce only the *configurable* layer — company allow-lists and
// per-user overrides — for the two restrictable roles. Base-role access
// (e.g. agents can't reach admin-only endpoints) is still governed by the
// existing requireRole gates, so this never blocks anything those roles
// could already legitimately do by default.
function isModuleDenied(moduleKey, role, companyRestrictions, userOverrides) {
  const roleKey = String(role || "").toUpperCase();
  if (!RESTRICTABLE_ROLES.includes(roleKey)) return false;

  const moduleName = MODULE_LABELS[moduleKey] || moduleKey;
  const base = BASE_MODULES[roleKey] || [];

  // Company allow-list: when the owner has configured restrictions for this
  // role, a base module missing from the list is denied. (Mirrors the
  // frontend, where the company restriction is checked before overrides.)
  const allowed = companyRestrictions ? companyRestrictions[roleKey] : null;
  if (Array.isArray(allowed) && base.includes(moduleName) && !allowed.includes(moduleName)) {
    return true;
  }

  // Per-user override: an explicit `false` denies.
  if (
    userOverrides &&
    Object.prototype.hasOwnProperty.call(userOverrides, moduleName) &&
    userOverrides[moduleName] === false
  ) {
    return true;
  }

  return false;
}

module.exports = {
  BASE_MODULES,
  MODULE_LABELS,
  RESTRICTABLE_ROLES,
  isModuleDenied,
};
