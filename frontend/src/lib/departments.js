import { api } from "./api"

// Canonical department list — used as fallback when API is unavailable.
export const DEPARTMENTS = [
  "Sales",
  "CRM",
  "Marketing",
  "Support",
]

// Fetch departments from the backend (returns { id, name }[])
export async function fetchDepartments() {
  try {
    const res = await api.get("/departments")
    if (Array.isArray(res)) return res
    const data = res?.data ?? res ?? {}
    return data.items ?? []
  } catch {
    return null
  }
}
