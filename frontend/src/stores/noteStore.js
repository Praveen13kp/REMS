// Notes store — manages notes for the lead detail page
// TODO(S4-BE-B-02): wire real API calls via noteService once backend endpoints land
import { create } from "zustand"
import { noteService } from "@/services/noteService"

const STUB_NOTES = [
  {
    id: "n1",
    content: "Client wants to see the property this weekend. Called and confirmed for Saturday 10 AM.",
    createdAt: Date.now() - 1000 * 60 * 25,
    updatedAt: Date.now() - 1000 * 60 * 25,
    author: { id: "u1", name: "Riya Mehta" },
  },
  {
    id: "n2",
    content: "Discussed budget options — interested in the 3BHK layout. Shared brochure via WhatsApp.",
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 3,
    author: { id: "u2", name: "Arjun Verma" },
  },
  {
    id: "n3",
    content: "Initial call — lead seems interested in the premium wing. Follow up with site visit offer.",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    author: { id: "u1", name: "Riya Mehta" },
  },
]

export const useNotesStore = create((set, get) => ({
  notes: [],
  loading: false,

  fetchNotes: async (leadId) => {
    set({ loading: true })
    try {
      const data = await noteService.list(leadId)
      set({ notes: data ?? STUB_NOTES, loading: false })
    } catch {
      set({ notes: STUB_NOTES, loading: false })
    }
  },

  addNote: async ({ leadId, content, author }) => {
    const optimistic = {
      id: `_opt_${Date.now()}`,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author,
    }
    set((s) => ({ notes: [optimistic, ...s.notes] }))
    try {
      const saved = await noteService.create({ leadId, content })
      set((s) => ({
        notes: s.notes.map((n) => (n.id === optimistic.id ? (saved ?? optimistic) : n)),
      }))
      return saved ?? optimistic
    } catch {
      set((s) => ({ notes: s.notes.filter((n) => n.id !== optimistic.id) }))
      throw new Error("Failed to add note")
    }
  },

  updateNote: async (id, { content }) => {
    const prev = get().notes
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, content } : n)),
    }))
    try {
      await noteService.update(id, { content })
    } catch {
      set({ notes: prev })
      throw new Error("Failed to update note")
    }
  },

  deleteNote: async (id) => {
    const prev = get().notes
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
    try {
      await noteService.delete(id)
    } catch {
      set({ notes: prev })
      throw new Error("Failed to delete note")
    }
  },
}))
