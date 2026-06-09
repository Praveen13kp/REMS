const BASE_MODULES = {
  OWNER: null, // null = all modules
  ADMIN: null,
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
  ],
  AGENT: [
    "Leads",
    "Tasks",
    "Files",
  ],
}

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
  Departments: "Departments",
  Settings: "Settings",
  Billing: "Billing",
  "Audit Log": "Audit Log",
}

function getBaseModules(role) {
  const r = String(role).toUpperCase()
  if (r === "OWNER" || r === "ADMIN" || r === "SUPER_ADMIN" || r === "PLATFORM_ADMIN" || r === "CHANNEL_PARTNER" || r === "BROKER") return null
  return BASE_MODULES[r] || []
}

function isModuleAllowed(moduleKey, role, companyRestrictions, userOverrides) {
  const base = getBaseModules(role)
  if (base === null) return true

  const moduleName = MODULE_LABELS[moduleKey] || moduleKey

  if (!base.includes(moduleName)) return false

  const restrictions = companyRestrictions?.[role] || null
  if (restrictions && !restrictions.includes(moduleName)) return false

  if (userOverrides && moduleName in userOverrides) {
    return userOverrides[moduleName] === true
  }

  return true
}

function getEffectiveModules(role, companyRestrictions, userOverrides) {
  const base = getBaseModules(role)
  if (base === null) return Object.keys(MODULE_LABELS)

  const restrictions = companyRestrictions?.[role] || null
  const restricted = restrictions || base

  let modules = base.filter((m) => restricted.includes(m))

  if (userOverrides) {
    modules = modules.filter((m) => {
      if (m in userOverrides) return userOverrides[m] === true
      return true
    })
    for (const [mod, allowed] of Object.entries(userOverrides)) {
      if (allowed && base.includes(mod) && !modules.includes(mod)) {
        modules.push(mod)
      }
    }
  }

  return modules
}

const RESTRICTABLE_ROLES = ["MANAGER", "AGENT"]
const ALL_MODULES = Object.keys(MODULE_LABELS)

export {
  BASE_MODULES,
  MODULE_LABELS,
  ALL_MODULES,
  RESTRICTABLE_ROLES,
  getBaseModules,
  isModuleAllowed,
  getEffectiveModules,
}
