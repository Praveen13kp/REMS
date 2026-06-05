import { api } from "./api"

// Canonical department list — used as fallback when API is unavailable.
export const DEPARTMENTS = [
  "Sales North",
  "Sales South",
  "Marketing",
  "Support",
]

// Fetch departments from the backend (returns { id, name }[])
export async function fetchDepartments() {
  try {
    const res = await api.get("/departments")
    return Array.isArray(res) ? res : res?.data ?? []
  } catch {
    return null
  }
}
