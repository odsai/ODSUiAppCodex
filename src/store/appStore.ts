import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Route = '/dashboard' | '/ai' | '/penpot' | '/flowise' | '/excalidraw' | '/comfyui' | '/groups' | '/settings' | '/login'

export type User = {
  id: string
  name: string
  email: string
  roles: string[]
}

export type Project = {
  id: string
  name: string
  description?: string
  updatedAt: string
}

export type Course = {
  id: string
  title: string
  description?: string
  updatedAt: string
}

export type AppSettings = {
  links: { owuiUrl: string; penpotUrl: string; flowiseUrl: string; excalidrawUrl: string; comfyuiUrl: string }
  routes: { defaultAfterLogin: Route; defaultApp: Route }
  appearance: { theme: 'light' | 'dark' | 'system'; brandColor: string }
  courses: { allowSelfEnroll: boolean }
  misc?: Record<string, unknown>
  updatedAt: string
  updatedBy?: string
}

type AppState = {
  // Preferences
  theme: 'light' | 'dark' | 'system'

  // Routing/UI
  route: Route
  activeProjectId?: string
  activeCourseId?: string
  loginOpen: boolean

  // Auth
  signedIn: boolean
  user: User | null
  token?: string

  // Data
  projects: Project[]
  courses: Course[]
  appSettings: AppSettings

  // Actions
  setTheme: (t: AppState['theme']) => void
  setRoute: (r: Route) => void
  setLoginOpen: (v: boolean) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  createProject: (p: { name: string; description?: string }) => Project
  selectProject: (id: string) => void
  selectCourse: (id: string) => void
  updateSettings: (patch: Partial<AppSettings>) => void
}

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Defaults
      theme: 'system',
      route: '/dashboard',
      activeProjectId: undefined,
      activeCourseId: undefined,
      loginOpen: false,
      signedIn: false,
      user: null,
      token: undefined,
      projects: [
        { id: 'proj-sample', name: 'Sample Project', description: 'Example project', updatedAt: now() },
        { id: 'proj-design', name: 'Design Studio 2025', description: 'Semester studio workbench', updatedAt: now() },
      ],
      courses: [
        { id: 'course-101', title: 'Intro to ODSAi', description: 'Onboarding course', updatedAt: now() },
        { id: 'course-201', title: 'RAG Fundamentals', description: 'Retrieval-Augmented Generation basics', updatedAt: now() },
        { id: 'course-305', title: 'Prompt Engineering', description: 'Patterns and practices', updatedAt: now() },
      ],
      appSettings: {
        links: { owuiUrl: '', penpotUrl: '', flowiseUrl: '', excalidrawUrl: '', comfyuiUrl: '' },
        routes: { defaultAfterLogin: '/dashboard', defaultApp: '/ai' },
        appearance: { theme: 'system', brandColor: '#B13634' },
        courses: { allowSelfEnroll: false },
        updatedAt: now(),
      },

      // Actions
      setTheme: (t) => set({ theme: t }),
      setRoute: (r) => set({ route: r }),
      setLoginOpen: (v) => set({ loginOpen: v }),

      login: async (email: string, password: string) => {
        // Mock provider: small delay and simple branching
        await new Promise((res) => setTimeout(res, 500))
        if (!email || !password) throw new Error('Please enter email and password')
        // Very simple mock: if email starts with 'admin', grant admin role
        const isAdmin = /^admin/i.test(email)
        const user: User = {
          id: `user_${uid()}`,
          name: isAdmin ? 'Admin User' : 'ODSAi User',
          email,
          roles: isAdmin ? ['admin'] : ['user'],
        }
        set({ signedIn: true, user, token: 'mock', loginOpen: false })
      },

      logout: () => {
        set({ signedIn: false, user: null, token: undefined, activeProjectId: undefined, activeCourseId: undefined })
      },

      createProject: ({ name, description }) => {
        const project: Project = { id: `proj_${uid()}`, name, description, updatedAt: now() }
        set({ projects: [project, ...get().projects], activeProjectId: project.id })
        return project
      },

      selectProject: (id) => set({ activeProjectId: id, activeCourseId: undefined }),
      selectCourse: (id) => set({ activeCourseId: id, activeProjectId: undefined }),

      updateSettings: (patch) => set({ appSettings: { ...get().appSettings, ...patch, updatedAt: now() } }),
    }),
    {
      name: 'odsui-app',
      partialize: (state) => ({
        // Persist non-sensitive parts
        theme: state.theme,
        route: state.route,
        signedIn: state.signedIn,
        user: state.user, // acceptable for local-first; can be removed if needed
        projects: state.projects,
        courses: state.courses,
        appSettings: state.appSettings,
        activeProjectId: state.activeProjectId,
        activeCourseId: state.activeCourseId,
      }),
    }
  )
)
