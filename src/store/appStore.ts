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
  | '/lms/dashboard'
  | '/lms/courses'
  | '/lms/course'
  | '/lms/lesson'
  | '/lms/admin'

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
  lms: LmsSettings
  auth: AuthConfig
  header?: HeaderSettings
  misc?: Record<string, unknown>
  updatedAt: string
  updatedBy?: string
}

export type HeaderSettings = {
  enabled: boolean
  autoHide: boolean
  height: number // expanded height in px
  rounded: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  showLogo: boolean
  showSearch: boolean
  menuFromApps: boolean
  compact: boolean
  hideOnAppIds: string[]
  edgeReveal: boolean
  railHeight: number // collapsed rail height in px
  menuItems: HeaderMenuItem[]
  sectionOrder: HeaderSectionKey[]
  minWidth: number
  maxWidth: number
  railColor: string
  shadowOpacity: number
  collapsedOpacity: number
}

export type HeaderSectionKey = 'logo' | 'apps' | 'site' | 'search' | 'auth' | 'settings' | 'home' | 'spacer'

export type HeaderMenuItem = {
  id: string
  label: string
  icon: string
  url: string
  enabled?: boolean
  group?: 'site'
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
  { id: 'palette-classic', name: 'KTM Orange', primary: '#FF6F00', secondary: '#1F2937', accent: '#F59E0B' },
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

export type LmsSettings = {
  enabled: boolean
  apiBaseUrl?: string
  assetCdnUrl?: string
  owuiWorkflowBaseUrl?: string
  autoEnrollNewUsers: boolean
  features: {
    quizzes: boolean
    discussions: boolean
    certificates: boolean
    requireQuizPass?: boolean
    sequential?: boolean
    modulePrereqs?: boolean
  }
  rules?: {
    passThreshold: number
    maxQuizAttempts: number
  }
  recentCoursesLimit: number
}

const DEFAULT_LMS: LmsSettings = {
  enabled: false,
  apiBaseUrl: '',
  assetCdnUrl: '',
  owuiWorkflowBaseUrl: '',
  autoEnrollNewUsers: false,
  features: {
    quizzes: true,
    discussions: true,
    certificates: false,
    requireQuizPass: false,
    sequential: false,
    modulePrereqs: true,
  },
  rules: {
    passThreshold: 0.7,
    maxQuizAttempts: 3,
  },
  recentCoursesLimit: 6,
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
    lms: { ...DEFAULT_LMS },
    auth: { ...DEFAULT_AUTH },
    header: {
      enabled: true,
      autoHide: true,
      height: 56,
      rounded: 'xl',
      showLogo: true,
      showSearch: true,
      menuFromApps: true,
      compact: true,
      hideOnAppIds: [],
      edgeReveal: true,
      railHeight: 10,
      menuItems: [],
      sectionOrder: ['logo', 'apps', 'site', 'search', 'auth'],
      minWidth: 0,
      maxWidth: 960,
      railColor: '',
      shadowOpacity: 0.08,
      collapsedOpacity: 0,
    },
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
    lms: {
      enabled: record.lms?.enabled === true,
      apiBaseUrl: typeof record.lms?.apiBaseUrl === 'string' ? record.lms.apiBaseUrl : DEFAULT_LMS.apiBaseUrl,
      assetCdnUrl: typeof record.lms?.assetCdnUrl === 'string' ? record.lms.assetCdnUrl : DEFAULT_LMS.assetCdnUrl,
      owuiWorkflowBaseUrl:
        typeof record.lms?.owuiWorkflowBaseUrl === 'string' ? record.lms.owuiWorkflowBaseUrl : DEFAULT_LMS.owuiWorkflowBaseUrl,
      autoEnrollNewUsers:
        record.lms?.autoEnrollNewUsers !== undefined
          ? !!record.lms.autoEnrollNewUsers
          : DEFAULT_LMS.autoEnrollNewUsers,
      features: {
        quizzes:
          record.lms?.features?.quizzes !== undefined
            ? !!record.lms.features.quizzes
            : DEFAULT_LMS.features.quizzes,
        discussions:
          record.lms?.features?.discussions !== undefined
            ? !!record.lms.features.discussions
            : DEFAULT_LMS.features.discussions,
        certificates:
          record.lms?.features?.certificates !== undefined
            ? !!record.lms.features.certificates
            : DEFAULT_LMS.features.certificates,
        requireQuizPass:
          record.lms?.features?.requireQuizPass !== undefined
            ? !!record.lms.features.requireQuizPass
            : DEFAULT_LMS.features.requireQuizPass,
        sequential:
          record.lms?.features?.sequential !== undefined
            ? !!record.lms.features.sequential
            : DEFAULT_LMS.features.sequential,
        modulePrereqs:
          record.lms?.features?.modulePrereqs !== undefined
            ? !!record.lms.features.modulePrereqs
            : DEFAULT_LMS.features.modulePrereqs,
      },
      rules: {
        passThreshold:
          isRecord(record.lms) && isRecord((record.lms as Record<string, unknown>).rules) &&
          typeof ((record.lms as Record<string, unknown>).rules as Record<string, unknown>).passThreshold === 'number'
            ? (((record.lms as Record<string, unknown>).rules as Record<string, unknown>).passThreshold as number)
            : DEFAULT_LMS.rules!.passThreshold,
        maxQuizAttempts:
          isRecord(record.lms) && isRecord((record.lms as Record<string, unknown>).rules) &&
          typeof ((record.lms as Record<string, unknown>).rules as Record<string, unknown>).maxQuizAttempts === 'number'
            ? (((record.lms as Record<string, unknown>).rules as Record<string, unknown>).maxQuizAttempts as number)
            : DEFAULT_LMS.rules!.maxQuizAttempts,
      },
      recentCoursesLimit:
        typeof record.lms?.recentCoursesLimit === 'number'
          ? record.lms.recentCoursesLimit
          : DEFAULT_LMS.recentCoursesLimit,
    },
    auth: normalizeAuthConfig(record.auth),
    header: {
      enabled:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).enabled === 'boolean'
          ? Boolean((record.header as Record<string, unknown>).enabled)
          : defaults.header?.enabled ?? true,
      autoHide:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).autoHide === 'boolean'
          ? Boolean((record.header as Record<string, unknown>).autoHide)
          : defaults.header?.autoHide ?? true,
      height:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).height === 'number'
          ? ((record.header as Record<string, unknown>).height as number)
          : defaults.header?.height ?? 56,
      rounded:
        isRecord(record.header) &&
        ((record.header as Record<string, unknown>).rounded === 'none' ||
          (record.header as Record<string, unknown>).rounded === 'sm' ||
          (record.header as Record<string, unknown>).rounded === 'md' ||
          (record.header as Record<string, unknown>).rounded === 'lg' ||
          (record.header as Record<string, unknown>).rounded === 'xl')
          ? ((record.header as Record<string, unknown>).rounded as HeaderSettings['rounded'])
          : defaults.header?.rounded ?? 'xl',
      showLogo:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).showLogo === 'boolean'
          ? Boolean((record.header as Record<string, unknown>).showLogo)
          : defaults.header?.showLogo ?? true,
      showSearch:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).showSearch === 'boolean'
          ? Boolean((record.header as Record<string, unknown>).showSearch)
          : defaults.header?.showSearch ?? true,
      menuFromApps:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).menuFromApps === 'boolean'
          ? Boolean((record.header as Record<string, unknown>).menuFromApps)
          : defaults.header?.menuFromApps ?? true,
      compact:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).compact === 'boolean'
          ? Boolean((record.header as Record<string, unknown>).compact)
          : defaults.header?.compact ?? true,
      hideOnAppIds: (() => {
        if (!isRecord(record.header)) return defaults.header?.hideOnAppIds ?? []
        const h = record.header as Record<string, unknown>
        const raw = h['hideOnAppIds']
        return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : defaults.header?.hideOnAppIds ?? []
      })(),
      edgeReveal:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).edgeReveal === 'boolean'
          ? Boolean((record.header as Record<string, unknown>).edgeReveal)
          : defaults.header?.edgeReveal ?? true,
      railHeight:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).railHeight === 'number'
          ? Math.max(4, Math.min(40, (record.header as Record<string, unknown>).railHeight as number))
          : defaults.header?.railHeight ?? 10,
      menuItems: (() => {
        if (!isRecord(record.header)) return defaults.header?.menuItems ?? []
        const raw = (record.header as Record<string, unknown>).menuItems
        if (!Array.isArray(raw)) return defaults.header?.menuItems ?? []
        return raw
          .map((item, idx) => {
            const r = isRecord(item) ? (item as Record<string, unknown>) : {}
            const id = typeof r.id === 'string' && r.id ? r.id : `hm_${Math.random().toString(36).slice(2, 8)}_${idx}`
            const label = typeof r.label === 'string' ? r.label : 'Link'
            const icon = typeof r.icon === 'string' ? r.icon : 'FiLink'
            const url = typeof r.url === 'string' ? r.url : ''
            const enabled = r.enabled !== undefined ? !!r.enabled : true
            const group = 'site' as const
            return { id, label, icon, url, enabled, group }
          })
          .filter((m) => m.url)
      })(),
      sectionOrder: (() => {
        const allowed: HeaderSectionKey[] = ['logo', 'apps', 'site', 'search', 'auth', 'settings', 'home', 'spacer']
        if (!isRecord(record.header)) return defaults.header?.sectionOrder ?? ['logo', 'apps', 'site', 'search', 'auth']
        const raw = (record.header as Record<string, unknown>).sectionOrder
        if (!Array.isArray(raw)) return defaults.header?.sectionOrder ?? ['logo', 'apps', 'site', 'search', 'auth']
        const filtered = (raw as unknown[]).filter((x): x is HeaderSectionKey => typeof x === 'string' && (allowed as ReadonlyArray<string>).includes(x))
        // ensure no duplicates and preserve order
        const seen = new Set<string>()
        const unique = filtered.filter((x) => (seen.has(x) ? false : (seen.add(x), true)))
        return unique.length ? unique : (defaults.header?.sectionOrder ?? ['logo', 'apps', 'site', 'search', 'auth'])
      })(),
      minWidth: (() => {
        if (!isRecord(record.header)) return defaults.header?.minWidth ?? 0
        const value = (record.header as Record<string, unknown>).minWidth
        if (typeof value !== 'number' || Number.isNaN(value)) return defaults.header?.minWidth ?? 0
        if (value <= 0) return 0
        return Math.max(320, Math.min(1600, value))
      })(),
      maxWidth:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).maxWidth === 'number'
          ? Math.max(600, Math.min(2000, (record.header as Record<string, unknown>).maxWidth as number))
          : defaults.header?.maxWidth ?? 960,
      railColor:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).railColor === 'string'
          ? ((record.header as Record<string, unknown>).railColor as string)
          : defaults.header?.railColor ?? '',
      shadowOpacity:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).shadowOpacity === 'number'
          ? Math.max(0, Math.min(0.3, (record.header as Record<string, unknown>).shadowOpacity as number))
          : defaults.header?.shadowOpacity ?? 0.08,
      collapsedOpacity:
        isRecord(record.header) && typeof (record.header as Record<string, unknown>).collapsedOpacity === 'number'
          ? Math.max(0, Math.min(1, (record.header as Record<string, unknown>).collapsedOpacity as number))
          : defaults.header?.collapsedOpacity ?? 0,
    },
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
  settingsVersion: number | null

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
  hydrateSettings: (settings: AppSettings, version?: number | null) => void
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
      settingsVersion: null,

      // Actions
      setTheme: (t) => set({ theme: t }),
      setRoute: (r) => set({ route: r }),
      setLoginOpen: (v) => set({ loginOpen: v }),

      login: async (email: string, password: string) => {
        const settings = get().appSettings
        const auth = settings.auth
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

            const nextRoute: Route = settings.lms.enabled ? '/lms/dashboard' : '/dashboard'
            set({ signedIn: true, user, token, loginOpen: false, route: nextRoute })
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
        const nextRoute: Route = get().appSettings.lms.enabled ? '/lms/dashboard' : '/dashboard'
        set({ signedIn: true, user: fallbackUser, token: 'mock', loginOpen: false, route: nextRoute })
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
        set({ appSettings: normalizeAppSettings(merged), settingsVersion: get().settingsVersion })
      },

      hydrateSettings: (settings, version) => {
        set({ appSettings: normalizeAppSettings(settings), settingsVersion: version ?? null })
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
        settingsVersion: state.settingsVersion,
      }),
    }
  )
)
