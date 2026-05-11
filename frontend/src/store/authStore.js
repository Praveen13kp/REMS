import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: {
    id: '1',
    name: 'Jane Doe',
    email: 'jane@realestate.dev',
    role: 'ADMIN',
    company: 'Acme Realty',
    avatar: null,
  },
  isAuthenticated: true,
  signOut: () => set({ user: null, isAuthenticated: false }),
  setUser: (user) => set({ user, isAuthenticated: true }),
}))

export default useAuthStore
