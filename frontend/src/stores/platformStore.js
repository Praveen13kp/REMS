// Platform Admin store — manages super-admin dashboard + orgs state
// TODO(S4-BE-A-03): wire real API calls via adminService once backend endpoints land
import { create } from "zustand"
import { adminService } from "@/services/adminService"

const STUB_STATS = {
  totalOrgs: 128,
  mau: 1842,
  mrr: 639872,
  healthScore: 98.6,
}

const STUB_HEALTH = [
  { label: "API Uptime", value: 99.97, suffix: "%", max: 100 },
  { label: "Database", value: 18, suffix: "ms", max: 200 },
  { label: "Email Service", value: 100, suffix: "%", max: 100 },
  { label: "Background Jobs", value: 0, suffix: " queued" },
  { label: "Storage", value: 64, suffix: "%", max: 100 },
]

const STUB_ORGS = [
  { id: "o1", name: "Aurum Realty Group", plan: "Pro", userCount: 14, leadCount: 412, status: "active", lastActive: Date.now() - 1000 * 60 * 8, timezone: "Asia/Kolkata", industry: "Real Estate", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90 },
  { id: "o2", name: "Skyline Estates", plan: "Starter", userCount: 6, leadCount: 88, status: "trial", lastActive: Date.now() - 1000 * 60 * 35, timezone: "Asia/Kolkata", industry: "Real Estate", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 },
  { id: "o3", name: "Pinecrest Properties", plan: "Enterprise", userCount: 22, leadCount: 1207, status: "active", lastActive: Date.now() - 1000 * 60 * 60 * 2, timezone: "Asia/Kolkata", industry: "Property Management", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 180 },
  { id: "o4", name: "Marina Homes", plan: "Pro", userCount: 9, leadCount: 256, status: "active", lastActive: Date.now() - 1000 * 60 * 60 * 9, timezone: "Asia/Kolkata", industry: "Real Estate", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60 },
  { id: "o5", name: "Lotus Builders", plan: "Starter", userCount: 3, leadCount: 42, status: "suspended", lastActive: Date.now() - 1000 * 60 * 60 * 24 * 6, timezone: "Asia/Kolkata", industry: "Construction", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14 },
]

const STUB_SIGNUPS = [
  { id: "o1", name: "Aurum Realty Group", userCount: 14, plan: "Pro", createdAt: Date.now() - 1000 * 60 * 32 },
  { id: "o2", name: "Skyline Estates", userCount: 6, plan: "Starter", createdAt: Date.now() - 1000 * 60 * 60 * 4 },
  { id: "o3", name: "Pinecrest Properties", userCount: 22, plan: "Enterprise", createdAt: Date.now() - 1000 * 60 * 60 * 26 },
  { id: "o4", name: "Marina Homes", userCount: 9, plan: "Pro", createdAt: Date.now() - 1000 * 60 * 60 * 50 },
]

const STUB_ACTIVITY = [
  { id: "a1", actor: "system", action: "Nightly backup completed", ts: Date.now() - 1000 * 60 * 12, ip: "10.0.0.4" },
  { id: "a2", actor: "Riya Mehta", action: "Suspended org 'Lotus Builders'", ts: Date.now() - 1000 * 60 * 47, ip: "203.0.113.21" },
  { id: "a3", actor: "Arjun Verma", action: "Promoted user to admin", ts: Date.now() - 1000 * 60 * 90, ip: "203.0.113.7" },
  { id: "a4", actor: "system", action: "Plan auto-renewed for Aurum Realty", ts: Date.now() - 1000 * 60 * 60 * 3, ip: "10.0.0.4" },
  { id: "a5", actor: "Priya Shah", action: "Reset password for support@skylineestates.com", ts: Date.now() - 1000 * 60 * 60 * 8, ip: "203.0.113.55" },
]

export const usePlatformStore = create((set, get) => ({
  // --- Stats ---
  stats: STUB_STATS,
  statsLoading: false,
  fetchStats: async () => {
    set({ statsLoading: true })
    try {
      const data = await adminService.getStats()
      set({ stats: data, statsLoading: false })
    } catch {
      set({ statsLoading: false })
    }
  },

  // --- Health ---
  health: STUB_HEALTH,
  healthLoading: false,
  fetchHealth: async () => {
    set({ healthLoading: true })
    try {
      const data = await adminService.getHealth()
      set({ health: data, healthLoading: false })
    } catch {
      set({ healthLoading: false })
    }
  },

  // --- Organisations ---
  orgs: STUB_ORGS,
  orgsLoading: false,
  fetchOrgs: async () => {
    set({ orgsLoading: true })
    try {
      const data = await adminService.getCompanies()
      set({ orgs: data, orgsLoading: false })
    } catch {
      set({ orgsLoading: false })
    }
  },
  patchOrg: async (id, body) => {
    const prev = get().orgs
    set((s) => ({
      orgs: s.orgs.map((o) => (o.id === id ? { ...o, ...body } : o)),
    }))
    try {
      await adminService.patchCompany(id, body)
    } catch {
      set({ orgs: prev })
      throw new Error("Failed to update organisation")
    }
  },

  // --- Recent Sign-Ups ---
  signups: STUB_SIGNUPS,
  signupsLoading: false,
  fetchSignups: async () => {
    set({ signupsLoading: true })
    try {
      const data = await adminService.getRecentSignups()
      set({ signups: data, signupsLoading: false })
    } catch {
      set({ signupsLoading: false })
    }
  },

  // --- Activity ---
  activity: STUB_ACTIVITY,
  activityLoading: false,
  fetchActivity: async () => {
    set({ activityLoading: true })
    try {
      const data = await adminService.getActivity()
      set({ activity: data, activityLoading: false })
    } catch {
      set({ activityLoading: false })
    }
  },
}))
