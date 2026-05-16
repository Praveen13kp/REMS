import { create } from "zustand"
import { api } from "@/lib/api"

const toUser = (raw) => {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    companyId: raw.companyId,
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
      const data = await api.get("/auth/get-session")
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

  signIn: async ({ email, password, companySlug }) => {
    set({ status: "loading", error: null })
    try {
      // Multi-tenant: User.email is no longer globally unique. The new
      // /auth/sign-in endpoint scopes by companySlug. Fall back to the
      // legacy /auth/sign-in/email path only if no companySlug was supplied
      // (e.g. older callers we haven't touched yet).
      const url = companySlug ? "/auth/sign-in" : "/auth/sign-in/email"
      const body = companySlug
        ? { email, password, companySlug }
        : { email, password }
      const data = await api.post(url, body)
      const user = toUser(data?.user ?? data?.data?.user ?? null)
      set({ user, status: user ? "authenticated" : "unauthenticated" })
      if (!user) throw { message: "Sign-in did not return a user" }
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
    } catch (err) {
      set({ status: "unauthenticated", error: err })
      throw err
    }
  },

  signOut: async () => {
    try {
      await api.post("/auth/sign-out")
    } catch {
      // ignore — clear local state regardless
    }
    set({ user: null, status: "unauthenticated", error: null })
  },
}))
