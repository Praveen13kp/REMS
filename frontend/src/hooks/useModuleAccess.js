import { useAuthStore } from "@/stores/authStore"
import { getBaseModules, MODULE_LABELS } from "@/lib/modules"

export function useModuleAccess() {
  const user = useAuthStore((s) => s.user)
  const companyRestrictions = useAuthStore((s) => s.moduleRestrictions)

  if (!user) return () => false

  const role = user.role
  const base = getBaseModules(role)
  const userOverrides = user.moduleOverrides || {}

  return (moduleKey) => {
    const mod = MODULE_LABELS[moduleKey] || moduleKey

    if (base === null) return true
    if (!base.includes(mod)) return false

    const roleKey = String(role).toUpperCase()
    if (companyRestrictions && typeof companyRestrictions === "object" && roleKey in companyRestrictions) {
      const allowed = companyRestrictions[roleKey]
      if (!Array.isArray(allowed)) return false
      if (!allowed.includes(mod)) return false
    }

    if (mod in userOverrides) return userOverrides[mod] === true

    return true
  }
}
