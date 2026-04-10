import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Auth store
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      session: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      logout: () => set({ user: null, session: null }),
    }),
    { name: 'bibliogestion-auth' }
  )
)

// UI store: toasts, sidebar
let toastId = 0

export const useUIStore = create((set, get) => ({
  sidebarOpen: true,
  toasts: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  addToast: (message, type = 'default', duration = 3500) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
