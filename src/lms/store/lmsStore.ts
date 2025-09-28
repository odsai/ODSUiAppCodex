import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LmsCourseSummary = {
  id: string
  title: string
  description?: string
  progress: number
  thumbnailUrl?: string
  updatedAt: string
}

export type LmsSettingsState = {
  recentCoursesLimit: number
}

export type LmsState = {
  courses: LmsCourseSummary[]
  settings: LmsSettingsState
  setCourses: (courses: LmsCourseSummary[]) => void
  setSettings: (patch: Partial<LmsSettingsState>) => void
}

const useLmsStoreBase = create<LmsState>((set) => ({
  courses: [],
  settings: {
    recentCoursesLimit: 6,
  },
  setCourses: (courses) => set({ courses }),
  setSettings: (patch) =>
    set((state) => ({
      settings: { ...state.settings, ...patch },
    })),
}))

export const useLmsStore = persist(useLmsStoreBase, {
  name: 'odsui-lms',
  partialize: (state) => ({ settings: state.settings }),
})
