import crypto from 'crypto'

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

export type ColorPalette = {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const generateAppId = () => `app_${crypto.randomBytes(4).toString('hex')}`

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
      .split(/[\s,]+/)
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

export const createDefaultAppSettings = (): AppSettings => {
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
    updatedAt: new Date().toISOString(),
  }
}

export const normalizeAppSettings = (incoming: unknown): AppSettings => {
  const record: Record<string, unknown> = isRecord(incoming) ? incoming : {}
  const defaults = createDefaultAppSettings()

  let apps: AppConfig[]
  if (Array.isArray(record.apps) && record.apps.length) {
    apps = (record.apps as unknown[]).map((app) => normalizeAppConfig(app))
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

  const coursesRecord: Record<string, unknown> = isRecord(record.courses) ? record.courses : {}
  const allowSelfEnroll = coursesRecord.allowSelfEnroll !== undefined ? !!coursesRecord.allowSelfEnroll : defaults.courses.allowSelfEnroll

  const lmsRecord: Record<string, unknown> = isRecord(record.lms) ? record.lms : {}
  const featuresRecord: Record<string, unknown> = isRecord(lmsRecord.features) ? lmsRecord.features : {}
  const rulesRecord: Record<string, unknown> = isRecord(lmsRecord.rules) ? lmsRecord.rules : {}

  const lms: LmsSettings = {
    enabled: lmsRecord.enabled !== undefined ? !!lmsRecord.enabled : defaults.lms.enabled,
    apiBaseUrl: typeof lmsRecord.apiBaseUrl === 'string' ? lmsRecord.apiBaseUrl : defaults.lms.apiBaseUrl,
    assetCdnUrl: typeof lmsRecord.assetCdnUrl === 'string' ? lmsRecord.assetCdnUrl : defaults.lms.assetCdnUrl,
    owuiWorkflowBaseUrl:
      typeof lmsRecord.owuiWorkflowBaseUrl === 'string' ? lmsRecord.owuiWorkflowBaseUrl : defaults.lms.owuiWorkflowBaseUrl,
    autoEnrollNewUsers:
      lmsRecord.autoEnrollNewUsers !== undefined ? !!lmsRecord.autoEnrollNewUsers : defaults.lms.autoEnrollNewUsers,
    features: {
      quizzes: featuresRecord.quizzes !== undefined ? !!featuresRecord.quizzes : defaults.lms.features.quizzes,
      discussions: featuresRecord.discussions !== undefined ? !!featuresRecord.discussions : defaults.lms.features.discussions,
      certificates: featuresRecord.certificates !== undefined ? !!featuresRecord.certificates : defaults.lms.features.certificates,
      requireQuizPass:
        featuresRecord.requireQuizPass !== undefined ? !!featuresRecord.requireQuizPass : defaults.lms.features.requireQuizPass,
      sequential: featuresRecord.sequential !== undefined ? !!featuresRecord.sequential : defaults.lms.features.sequential,
      modulePrereqs:
        featuresRecord.modulePrereqs !== undefined ? !!featuresRecord.modulePrereqs : defaults.lms.features.modulePrereqs,
    },
    rules: {
      passThreshold:
        typeof rulesRecord.passThreshold === 'number' && Number.isFinite(rulesRecord.passThreshold)
          ? Math.min(1, Math.max(0, rulesRecord.passThreshold))
          : defaults.lms.rules?.passThreshold ?? 0.7,
      maxQuizAttempts:
        typeof rulesRecord.maxQuizAttempts === 'number' && Number.isFinite(rulesRecord.maxQuizAttempts)
          ? Math.max(1, Math.trunc(rulesRecord.maxQuizAttempts))
          : defaults.lms.rules?.maxQuizAttempts ?? 3,
    },
    recentCoursesLimit:
      typeof lmsRecord.recentCoursesLimit === 'number' && Number.isFinite(lmsRecord.recentCoursesLimit)
        ? Math.max(1, Math.trunc(lmsRecord.recentCoursesLimit))
        : defaults.lms.recentCoursesLimit,
  }

  const auth = normalizeAuthConfig(record.auth)

  const updatedAt =
    typeof record.updatedAt === 'string' && record.updatedAt
      ? record.updatedAt
      : new Date().toISOString()

  const updatedBy = typeof record.updatedBy === 'string' && record.updatedBy ? record.updatedBy : undefined

  const misc = isRecord(record.misc) ? (record.misc as Record<string, unknown>) : undefined

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
    courses: { allowSelfEnroll },
    lms,
    auth,
    misc,
    updatedAt,
    updatedBy,
  }
}

export type WorkspaceSettingsRecord = {
  settings: AppSettings
  version: number
  updatedAt: string
  updatedBy?: string
}
