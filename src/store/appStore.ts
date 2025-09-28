import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { azureLogin, azureLogout, acquireAzureToken } from '../utils/authClient'

export type Route =
  | '/dashboard'
  | '/ai'
  | '/penpot'
  | '/flowise'
  | '/excalidraw'
  | '/comfyui'
  | '/groups'
  | '/settings'
  | '/login'
  | '/app'

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

export type ColorPalette = {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
}

export type AppConfig = {
  id: string
  label: string
  description?: string
  icon: string
  iconImage?: string | null
  enabled: boolean
  adminOnly?: boolean
  url: string
}

export type AuthConfig = {
  provider: 'azure-ad'
  enabled: boolean
  tenantId: string
  authority: string
  clientId: string
  redirectUri: string
  postLogoutRedirectUri: string
  scopes: string[]
  audience?: string
}

export type AppSettings = {
  apps: AppConfig[]
  appearance: {
    theme: 'light' | 'dark' | 'system'
    brandColor: string
    title: string
    intro: string
    introAlignment: 'left' | 'center'
    logoDataUrl?: string
    iconDataUrl?: string
    palettes: ColorPalette[]
    selectedPaletteId: string
  }
  courses: { allowSelfEnroll: boolean }
  auth: AuthConfig
  misc?: Record<string, unknown>
  updatedAt: string
  updatedBy?: string
}

const BASE_APPS: AppConfig[] = []
const LEGACY_PLACEHOLDER_IDS = new Set([
  'app-dashboard',
  'app-owui',
  'app-penpot',
  'app-flowise',
  'app-excalidraw',
  'app-comfyui',
  'app-groups',
  'app-settings',
])

const BASE_PALETTES: ColorPalette[] = [
  { id: 'palette-classic', name: 'Classic Red', primary: '#B13634', secondary: '#1F2937', accent: '#F59E0B' },
  { id: 'palette-ocean', name: 'Ocean', primary: '#2563EB', secondary: '#0F172A', accent: '#38BDF8' },
  { id: 'palette-forest', name: 'Forest', primary: '#15803D', secondary: '#0B3A25', accent: '#65A30D' },
]

const DEFAULT_AUTH: AuthConfig = {
  provider: 'azure-ad',
  enabled: false,
  tenantId: '',
  authority: 'https://login.microsoftonline.com/common',
  clientId: '',
  redirectUri: '',
  postLogoutRedirectUri: '',
  scopes: ['openid', 'profile', 'email'],
  audience: '',
}

const cloneBaseApps = () => BASE_APPS.map((app) => ({ ...app }))
const cloneBasePalettes = () => BASE_PALETTES.map((palette) => ({ ...palette }))

const generateAppId = () => `app_${Math.random().toString(36).slice(2, 10)}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizePalette = (palette: unknown, fallback: ColorPalette, index: number): ColorPalette => {
  const record: Record<string, unknown> = isRecord(palette) ? palette : {}
  const id = typeof record.id === 'string' && record.id ? record.id : fallback?.id || `palette_${index}`
  const name = typeof record.name === 'string' && record.name ? record.name : fallback?.name || `Scheme ${index + 1}`
  const primary =
    typeof record.primary === 'string' && record.primary ? record.primary : fallback?.primary || '#2563EB'
  const secondary =
    typeof record.secondary === 'string' && record.secondary ? record.secondary : fallback?.secondary || '#1E293B'
  const accent =
    typeof record.accent === 'string' && record.accent ? record.accent : fallback?.accent || '#38BDF8'

  return { id, name, primary, secondary, accent }
}

const normalizeAppConfig = (input: unknown): AppConfig => {
  const data: Record<string, unknown> = isRecord(input) ? input : {}
  const id = typeof data.id === 'string' && data.id ? data.id : generateAppId()
  const label = typeof data.label === 'string' && data.label ? data.label : 'App'
  const icon = typeof data.icon === 'string' && data.icon ? data.icon : 'FiGrid'
  const iconImage = typeof data.iconImage === 'string' ? data.iconImage : undefined
  const description = typeof data.description === 'string' ? (data.description as string) : undefined
  const enabled = data.enabled !== undefined ? !!data.enabled : true
  const adminOnly = data.adminOnly !== undefined ? !!data.adminOnly : false
  const url = typeof data.url === 'string' ? data.url : ''

  return { id, label, description, icon, iconImage, enabled, adminOnly, url }
}

const normalizeAuthConfig = (input: unknown): AuthConfig => {
  const data: Record<string, unknown> = isRecord(input) ? input : {}
  const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : DEFAULT_AUTH.tenantId
  const authorityCandidate = typeof data.authority === 'string' ? data.authority.trim() : ''
  const authority = authorityCandidate || (tenantId ? `https://login.microsoftonline.com/${tenantId}` : DEFAULT_AUTH.authority)
  const clientId = typeof data.clientId === 'string' ? data.clientId.trim() : DEFAULT_AUTH.clientId
  const redirectUri = typeof data.redirectUri === 'string' ? data.redirectUri.trim() : DEFAULT_AUTH.redirectUri
  const postLogoutRedirectUri =
    typeof data.postLogoutRedirectUri === 'string'
      ? data.postLogoutRedirectUri.trim()
      : DEFAULT_AUTH.postLogoutRedirectUri
  const enabled = data.enabled !== undefined ? !!data.enabled : DEFAULT_AUTH.enabled
  const audience = typeof data.audience === 'string' ? data.audience.trim() : DEFAULT_AUTH.audience

  let scopes: string[] = DEFAULT_AUTH.scopes
  if (Array.isArray(data.scopes)) {
    scopes = (data.scopes as unknown[])
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean)
  } else if (typeof data.scopes === 'string') {
    scopes = data.scopes
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (scopes.length === 0) scopes = [...DEFAULT_AUTH.scopes]

  return {
    provider: 'azure-ad',
    enabled,
    tenantId,
    authority,
    clientId,
    redirectUri,
    postLogoutRedirectUri,
    scopes,
    audience,
  }
}

const createDefaultAppSettings = (): AppSettings => {
  const palettes = cloneBasePalettes()
  return {
    apps: cloneBaseApps(),
    appearance: {
      theme: 'system',
      brandColor: palettes[0]?.primary ?? '#B13634',
      title: 'Welcome to ODSAiStudio!',
      intro: 'Unified interface for OpenSource AI tools in Design Pedagogy.',
      introAlignment: 'center',
      palettes,
      selectedPaletteId: palettes[0]?.id ?? 'palette-classic',
    },
    courses: { allowSelfEnroll: false },
    auth: { ...DEFAULT_AUTH },
    updatedAt: new Date().toISOString(),
  }
}

const normalizeAppSettings = (incoming: unknown): AppSettings => {
  const record: Record<string, unknown> = isRecord(incoming) ? incoming : {}
  const defaults = createDefaultAppSettings()

  let apps: AppConfig[]
  if (Array.isArray(record.apps) && record.apps.length) {
    apps = (record.apps as unknown[]).map((app) => normalizeAppConfig(app))
  } else if (isRecord(record.links)) {
    const links = record.links as Record<string, unknown>
    apps = cloneBaseApps().map((app) => {
      const getLink = (key: string) => (typeof links[key] === 'string' ? (links[key] as string) : '')
      if (app.id === 'app-owui') return { ...app, url: getLink('owuiUrl') }
      if (app.id === 'app-penpot') return { ...app, url: getLink('penpotUrl') }
      if (app.id === 'app-flowise') return { ...app, url: getLink('flowiseUrl') }
      if (app.id === 'app-excalidraw') return { ...app, url: getLink('excalidrawUrl') }
      if (app.id === 'app-comfyui') return { ...app, url: getLink('comfyuiUrl') }
      return app
    })
  } else {
    apps = cloneBaseApps()
  }

  const unique = new Map<string, AppConfig>()
  apps.forEach((app) => {
    const id = app.id || generateAppId()
    if (!unique.has(id)) unique.set(id, { ...app, id })
  })
  apps = Array.from(unique.values()).filter((app) => app.url || !LEGACY_PLACEHOLDER_IDS.has(app.id))

  const appearanceRecord: Record<string, unknown> = isRecord(record.appearance) ? record.appearance : {}
  const rawPalettes = appearanceRecord.palettes
  const palettes = Array.isArray(rawPalettes) && rawPalettes.length
    ? (rawPalettes as unknown[]).map((palette, index: number) =>
        normalizePalette(palette, BASE_PALETTES[index % BASE_PALETTES.length], index),
      )
    : cloneBasePalettes()

  const selectedPaletteId =
    typeof appearanceRecord.selectedPaletteId === 'string' &&
    palettes.some((palette) => palette.id === appearanceRecord.selectedPaletteId)
      ? (appearanceRecord.selectedPaletteId as string)
      : palettes[0]?.id ?? defaults.appearance.selectedPaletteId

  const brandColor =
    typeof appearanceRecord.brandColor === 'string' && appearanceRecord.brandColor
      ? (appearanceRecord.brandColor as string)
      : palettes[0]?.primary ?? defaults.appearance.brandColor

  const introAlignment =
    appearanceRecord.introAlignment === 'left' || appearanceRecord.introAlignment === 'center'
      ? (appearanceRecord.introAlignment as 'left' | 'center')
      : defaults.appearance.introAlignment

  const theme =
    appearanceRecord.theme === 'light' ||
    appearanceRecord.theme === 'dark' ||
    appearanceRecord.theme === 'system'
      ? (appearanceRecord.theme as 'light' | 'dark' | 'system')
      : defaults.appearance.theme

  return {
    apps,
    appearance: {
      theme,
      brandColor,
      title:
        typeof appearanceRecord.title === 'string'
          ? (appearanceRecord.title as string)
          : defaults.appearance.title,
      intro:
        typeof appearanceRecord.intro === 'string'
          ? (appearanceRecord.intro as string)
          : defaults.appearance.intro,
      introAlignment,
      logoDataUrl:
        typeof appearanceRecord.logoDataUrl === 'string'
          ? (appearanceRecord.logoDataUrl as string)
          : undefined,
      iconDataUrl:
        typeof appearanceRecord.iconDataUrl === 'string'
          ? (appearanceRecord.iconDataUrl as string)
          : undefined,
      palettes,
      selectedPaletteId,
    },
    courses: {
      allowSelfEnroll:
        isRecord(record.courses) && record.courses.allowSelfEnroll !== undefined
          ? !!record.courses.allowSelfEnroll
          : defaults.courses.allowSelfEnroll,
    },
    auth: normalizeAuthConfig(record.auth),
    misc: record.misc ?? defaults.misc,
    updatedAt: typeof record.updatedAt === 'string' ? (record.updatedAt as string) : defaults.updatedAt,
    updatedBy: typeof record.updatedBy === 'string' ? (record.updatedBy as string) : defaults.updatedBy,
  }
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
      appSettings: createDefaultAppSettings(),

      // Actions
      setTheme: (t) => set({ theme: t }),
      setRoute: (r) => set({ route: r }),
      setLoginOpen: (v) => set({ loginOpen: v }),

      login: async (email: string, password: string) => {
        const auth = get().appSettings.auth
        const useAzure = auth.enabled && auth.clientId && auth.authority && typeof window !== 'undefined'

        if (useAzure) {
          try {
            const loginResult = await azureLogin(auth)
            const silentToken = await acquireAzureToken(auth)
            const account = loginResult.account ?? silentToken?.account ?? null
            if (!account) throw new Error('Azure AD did not return an account')

            const claims = (loginResult.idTokenClaims || silentToken?.idTokenClaims) as
              | Record<string, unknown>
              | undefined

            const nameClaim = typeof claims?.name === 'string' ? (claims.name as string) : undefined
            const preferredUsername =
              typeof claims?.preferred_username === 'string'
                ? (claims.preferred_username as string)
                : undefined
            const rolesClaim = Array.isArray(claims?.roles)
              ? (claims?.roles as unknown[]).filter((r): r is string => typeof r === 'string')
              : []

            const user: User = {
              id: account.homeAccountId,
              name: nameClaim || account.name || account.username,
              email: preferredUsername || account.username,
              roles: rolesClaim,
            }

            const token = loginResult.accessToken || silentToken?.accessToken || loginResult.idToken || undefined

            set({ signedIn: true, user, token, loginOpen: false, route: '/dashboard' })
            return
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Azure SSO login failed'
            throw new Error(message)
          }
        }

        // Fallback mock provider: small delay and simple branching
        await new Promise((res) => setTimeout(res, 500))
        if (!email || !password) throw new Error('Please enter email and password')
        const normalizedEmail = email.trim().toLowerCase()
        const adminEmails = new Set(['odsai.iitb@gmail.com'])
        const isAdmin = /^admin/i.test(email) || adminEmails.has(normalizedEmail)
        const fallbackUser: User = {
          id: `user_${uid()}`,
          name: isAdmin ? 'Admin User' : 'ODSAi User',
          email,
          roles: isAdmin ? ['admin'] : ['user'],
        }
        set({ signedIn: true, user: fallbackUser, token: 'mock', loginOpen: false, route: '/dashboard' })
      },

      logout: () => {
        const auth = get().appSettings.auth
        if (auth.enabled && auth.clientId && auth.authority && typeof window !== 'undefined') {
          azureLogout(auth).catch(() => {
            // swallow logout errors to avoid blocking UI
          })
        }
        set({ signedIn: false, user: null, token: undefined, activeProjectId: undefined, activeCourseId: undefined })
      },

      createProject: ({ name, description }) => {
        const project: Project = { id: `proj_${uid()}`, name, description, updatedAt: now() }
        set({ projects: [project, ...get().projects], activeProjectId: project.id })
        return project
      },

      selectProject: (id) => set({ activeProjectId: id, activeCourseId: undefined }),
      selectCourse: (id) => set({ activeCourseId: id, activeProjectId: undefined }),

      updateSettings: (patch) => {
        const current = get().appSettings
        const merged = {
          ...current,
          ...patch,
          appearance: { ...current.appearance, ...patch?.appearance },
          courses: { ...current.courses, ...patch?.courses },
          apps: patch?.apps ?? current.apps,
          auth: { ...current.auth, ...patch?.auth },
          updatedAt: now(),
        }
        set({ appSettings: normalizeAppSettings(merged) })
      },
    }),
    {
      name: 'odsui-app',
      version: 2,
      migrate: (state) => {
        if (!state || typeof state !== 'object') return state
        const next: Record<string, unknown> = { ...(state as Record<string, unknown>) }
        if ('appSettings' in next) {
          next.appSettings = normalizeAppSettings(next.appSettings)
        }
        return next
      },
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
