import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LmsCourse, LmsCourseSummary } from '../types'
import { SAMPLE_COURSE_MAP, SAMPLE_COURSE_SUMMARIES } from '../sampleData'

export type LmsSettingsState = {
  recentCoursesLimit: number
}

export type LmsState = {
  courses: LmsCourseSummary[]
  courseMap: Record<string, LmsCourse>
  settings: LmsSettingsState
  setCourses: (courses: LmsCourseSummary[]) => void
  setCourse: (course: LmsCourse, aliasId?: string) => void
  setSettings: (patch: Partial<LmsSettingsState>) => void
}

export const useLmsStore = create<LmsState>()(
  persist(
    (set) => ({
      courses: SAMPLE_COURSE_SUMMARIES,
      courseMap: { ...SAMPLE_COURSE_MAP },
      settings: {
        recentCoursesLimit: 6,
      },
      setCourses: (courses) => set({ courses }),
      setCourse: (course, aliasId) =>
        set((state) => ({
          courseMap: aliasId && aliasId !== course.id
            ? { ...state.courseMap, [course.id]: course, [aliasId]: course }
            : { ...state.courseMap, [course.id]: course },
        })),
      setSettings: (patch) =>
        set((state) => ({
          settings: { ...state.settings, ...patch },
        })),
    }),
    {
      name: 'odsui-lms',
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
)
