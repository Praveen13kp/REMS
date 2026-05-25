import { create } from "zustand"
import { api } from "@/lib/api"
import { toast } from "sonner"

const toUser = (raw) => {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    companyId: raw.companyId,
    phone: raw.phone,
    dept: raw.dept,
    avatar: raw.image ?? raw.avatar ?? null,
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  status: "idle",
  error: null,

  setUser: (raw) => {
    const user = toUser(raw)
    set({ user, status: user ? "authenticated" : "unauthenticated", error: null })
  },

  fetchSession: async () => {
    set({ status: "loading", error: null })
    try {
      const data = await api.get("/auth/session")
      const user = toUser(data?.user ?? data?.data?.user ?? null)
      if (user) {
        set({ user, status: "authenticated" })
      } else {
        set({ user: null, status: "unauthenticated" })
      }
    } catch {
      set({ user: null, status: "unauthenticated" })
    }
  },

  signIn: async ({ email, password, companyId }) => {
    set({ status: "loading", error: null })
    try {
      // Always hit the new tenant-scoped /auth/sign-in. companyId is
      // optional — when omitted, BE auto-resolves the company if the email
      // belongs to exactly one tenant, or returns 409 COMPANY_PICK_REQUIRED
      // with a list when it's ambiguous (multi-company brokers).
      const body = companyId
        ? { email, password, companyId }
        : { email, password }
      const data = await api.post("/auth/sign-in", body)
      const user = toUser(data?.user ?? data?.data?.user ?? null)
      set({ user, status: user ? "authenticated" : "unauthenticated" })
      if (!user) throw { message: "Sign-in did not return a user" }
      toast.success(`Welcome back, ${user.name}!`)
    } catch (err) {
      set({ status: "unauthenticated", error: err })
      throw err
    }
  },

  signUp: async ({ name, email, password }) => {
    set({ status: "loading", error: null })
    try {
      const data = await api.post("/auth/sign-up/email", { name, email, password })
      const user = toUser(data?.user ?? data?.data?.user ?? null)
      set({ user, status: user ? "authenticated" : "unauthenticated" })
      if (!user) throw { message: "Sign-up did not return a user" }
      toast.success("Account created successfully!")
    } catch (err) {
      set({ status: "unauthenticated", error: err })
      throw err
    }
  },

  signOut: async () => {
    try {
      await api.post("/auth/sign-out")
      toast.info("Signed out successfully")
    } catch {
      toast.info("Signed out successfully")
    }
    set({ user: null, status: "unauthenticated", error: null })
  },
}))
