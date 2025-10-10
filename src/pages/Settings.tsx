import React, { useEffect, useMemo, useState } from 'react'
import { useAppStore, type AppConfig, type AppSettings, type ColorPalette, type HeaderSettings } from '../store/appStore'
import { toast } from '../store/toastStore'
import { ping } from '../utils/health'
import { ICON_OPTIONS, resolveIcon } from '../utils/iconCatalog'
import { saveWorkspaceSettings } from '../utils/settingsClient'

const PROTECTED_APP_IDS = new Set(['app-dashboard', 'app-settings'])

const cloneSettings = (settings: AppSettings): AppSettings =>
  JSON.parse(JSON.stringify(settings)) as AppSettings

const makeId = () => `app_${Math.random().toString(36).slice(2, 10)}`

const isValidUrl = (value?: string) => {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

type OwuiHealthResponse = {
  status?: string
  breaker?: {
    open?: boolean
    cooldownMsRemaining?: number
  }
  message?: string
}

type TabId = 'apps' | 'branding' | 'header' | 'lms' | 'auth'

const Tabs: { id: TabId; label: string }[] = [
  { id: 'apps', label: 'Apps' },
  { id: 'branding', label: 'Branding & Theme' },
  { id: 'header', label: 'Header Bar' },
  { id: 'lms', label: 'LMS' },
  { id: 'auth', label: 'Single Sign-On' },
]

const readFileAsDataUrl = async (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const AppsTab = ({
  apps,
  onChange,
  allowSelfEnroll,
  onToggleAllowSelfEnroll,
}: {
  apps: AppConfig[]
  onChange: (next: AppConfig[]) => void
  allowSelfEnroll: boolean
  onToggleAllowSelfEnroll: (value: boolean) => void
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleUpdate = (id: string, updater: (app: AppConfig) => AppConfig) => {
    onChange(apps.map((app) => (app.id === id ? updater(app) : app)))
  }

  const handleRemove = (id: string) => {
    onChange(apps.filter((app) => app.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const handleTest = async (url?: string) => {
    if (!url) {
      toast.error('No URL configured yet')
      return
    }
    const ok = await ping(url)
    if (ok) toast.success('Link reachable')
    else toast.error('Link appears offline')
  }

  return (
    <div className="space-y-4">
      {apps.map((app) => {
        const open = expandedId === app.id
        return (
          <div key={app.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-slate-50 text-slate-700">
                  {app.iconImage ? (
                    <img src={app.iconImage} alt="" className="h-6 w-6 object-contain" />
                  ) : (
                    resolveIcon(app.icon, 18)
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold">{app.label}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{app.url ? app.url : 'No link configured'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <input
                    type="checkbox"
                    checked={app.enabled}
                    onChange={(e) =>
                      handleUpdate(app.id, (prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <input
                    type="checkbox"
                    checked={!!app.adminOnly}
                    onChange={(e) =>
                      handleUpdate(app.id, (prev) => ({ ...prev, adminOnly: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  Admin only
                </label>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm text-slate-600"
                  onClick={() => setExpandedId(open ? null : app.id)}
                >
                  {open ? 'Close' : 'Configure'}
                </button>
              </div>
            </div>

            {open && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-sm font-medium">Display name</label>
                  <input
                    className="w-full rounded border px-3 py-2"
                    value={app.label}
                    onChange={(e) =>
                      handleUpdate(app.id, (prev) => ({ ...prev, label: e.target.value }))
                    }
                  />
                  <label className="block text-sm font-medium">Description (optional)</label>
                  <textarea
                    className="h-20 w-full rounded border px-3 py-2"
                    value={app.description || ''}
                    onChange={(e) =>
                      handleUpdate(app.id, (prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium">Icon</label>
                  <select
                    className="w-full rounded border px-3 py-2"
                    value={app.icon}
                    onChange={(e) =>
                      handleUpdate(app.id, (prev) => ({ ...prev, icon: e.target.value }))
                    }
                  >
                    {ICON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <label className="block text-sm font-medium">Custom icon upload (optional)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    className="mt-1 w-full text-sm"
                    onChange={async (e) => {
                      if (!e.target.files?.[0]) return
                      const dataUrl = await readFileAsDataUrl(e.target.files[0])
                      handleUpdate(app.id, (prev) => ({ ...prev, iconImage: dataUrl }))
                    }}
                  />
                  {app.iconImage && (
                    <div className="mt-2 flex items-center gap-3">
                      <img src={app.iconImage} alt="Icon preview" className="h-10 w-10 rounded border" />
                      <button
                        type="button"
                        className="text-sm text-red-500"
                        onClick={() => handleUpdate(app.id, (prev) => ({ ...prev, iconImage: undefined }))}
                      >
                        Remove custom icon
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Provide a link to open inside the shell. Leave blank to show a placeholder message.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium">Tool link</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded border px-3 py-2"
                      value={app.url || ''}
                      placeholder="https://example.com"
                      onChange={(e) =>
                        handleUpdate(app.id, (prev) => ({ ...prev, url: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm"
                      onClick={() => handleTest(app.url)}
                    >
                      Test
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    The link is used for availability checks and embed configuration.
                  </p>
                </div>

                {!PROTECTED_APP_IDS.has(app.id) && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-600">Remove app</label>
                    <button
                      type="button"
                      className="rounded border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                      onClick={() => handleRemove(app.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        className="rounded-lg border border-dashed px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
        onClick={() => {
          const newApp: AppConfig = {
            id: makeId(),
            label: 'New App',
            icon: 'FiTool',
            enabled: true,
            adminOnly: false,
            url: '',
          }
          onChange([...apps, newApp])
          setExpandedId(newApp.id)
        }}
      >
        + Add app
      </button>
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Courses</h3>
        <label className="mt-3 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={allowSelfEnroll}
            onChange={(e) => onToggleAllowSelfEnroll(e.target.checked)}
          />
          Allow course self-enrollment
        </label>
      </section>
    </div>
  )
}

function MetricsPanel() {
  const lms = useAppStore((s) => s.appSettings.lms)
  const token = useAppStore((s) => s.token)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<null | {
    tutor_success_total?: number
    tutor_failure_total?: number
    tutor_latency_p95_ms?: number
    tutor_latency_p99_ms?: number
    samples?: number
  }>(null)
  const refresh = async () => {
    if (!lms.apiBaseUrl) {
      toast.info('Set LMS API base URL')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${lms.apiBaseUrl.replace(/\/$/, '')}/metrics`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }) },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as typeof data
      setData(json)
    } catch {
      toast.error('Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="mt-1 rounded border p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-600">
          <div>Success: {data?.tutor_success_total ?? 0}</div>
          <div>Failure: {data?.tutor_failure_total ?? 0}</div>
          <div>P95 latency: {data?.tutor_latency_p95_ms ?? 0} ms</div>
          <div>P99 latency: {data?.tutor_latency_p99_ms ?? 0} ms</div>
        </div>
        <button className="rounded border px-3 py-1 text-sm" onClick={refresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}

const BrandingTab = ({
  appearance,
  onChange,
}: {
  appearance: AppSettings['appearance']
  onChange: (next: AppSettings['appearance']) => void
}) => {
  const activePalette = useMemo(
    () => appearance.palettes.find((p) => p.id === appearance.selectedPaletteId) || appearance.palettes[0],
    [appearance.palettes, appearance.selectedPaletteId],
  )

  const handlePaletteChange = (id: string, patch: Partial<ColorPalette>) => {
    const next = appearance.palettes.map((palette) =>
      palette.id === id ? { ...palette, ...patch } : palette,
    )
    onChange({ ...appearance, palettes: next })
  }

  const addPalette = () => {
    const newPalette: ColorPalette = {
      id: `palette_${Math.random().toString(36).slice(2, 8)}`,
      name: 'New scheme',
      primary: '#2563EB',
      secondary: '#1E293B',
      accent: '#38BDF8',
    }
    onChange({ ...appearance, palettes: [...appearance.palettes, newPalette] })
  }

  const removePalette = (id: string) => {
    if (appearance.palettes.length <= 1) {
      toast.error('Keep at least one palette')
      return
    }
    const next = appearance.palettes.filter((palette) => palette.id !== id)
    const selected = appearance.selectedPaletteId === id ? next[0]?.id ?? '' : appearance.selectedPaletteId
    onChange({ ...appearance, palettes: next, selectedPaletteId: selected })
  }

  const handleSelectPalette = (id: string) => {
    const palette = appearance.palettes.find((item) => item.id === id)
    onChange({
      ...appearance,
      selectedPaletteId: id,
      brandColor: palette?.primary ?? appearance.brandColor,
    })
  }

  const handleFile = async (file: File, key: 'logoDataUrl' | 'iconDataUrl') => {
    const dataUrl = await readFileAsDataUrl(file)
    onChange({ ...appearance, [key]: dataUrl })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Studio title</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={appearance.title}
              onChange={(e) => onChange({ ...appearance, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Intro text</label>
            <textarea
              className="mt-1 h-24 w-full rounded border px-3 py-2"
              value={appearance.intro}
              onChange={(e) => onChange({ ...appearance, intro: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Intro alignment</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={appearance.introAlignment}
              onChange={(e) =>
                onChange({ ...appearance, introAlignment: e.target.value as 'left' | 'center' })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Live preview</p>
          <div
            className={`mt-3 rounded-xl border-2 p-6 text-${appearance.introAlignment} shadow-inner`}
            style={{
              borderColor: activePalette?.accent,
              background: `${activePalette?.primary}15`,
            }}
          >
            {appearance.logoDataUrl ? (
              <img src={appearance.logoDataUrl} alt="Logo preview" className="mx-auto h-16 object-contain" />
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
                Logo
              </div>
            )}
            <h2 className="mt-4 text-2xl font-bold" style={{ color: appearance.brandColor }}>
              {appearance.title || 'Welcome to ODSAiStudio!'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{appearance.intro}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Primary brand color</label>
            <input
              type="text"
              className="mt-1 w-full rounded border px-3 py-2"
              value={appearance.brandColor}
              onChange={(e) => onChange({ ...appearance, brandColor: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Logo upload</label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/svg+xml"
              className="mt-1 w-full text-sm"
              onChange={async (e) => {
                if (e.target.files?.[0]) await handleFile(e.target.files[0], 'logoDataUrl')
              }}
            />
            {appearance.logoDataUrl && (
              <div className="mt-3 flex items-center gap-3">
                <img src={appearance.logoDataUrl} alt="Logo" className="h-12" />
                <button
                  type="button"
                  className="text-sm text-red-500"
                  onClick={() => onChange({ ...appearance, logoDataUrl: undefined })}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Icon upload</label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/svg+xml"
              className="mt-1 w-full text-sm"
              onChange={async (e) => {
                if (e.target.files?.[0]) await handleFile(e.target.files[0], 'iconDataUrl')
              }}
            />
            {appearance.iconDataUrl && (
              <div className="mt-3 flex items-center gap-3">
                <img src={appearance.iconDataUrl} alt="Icon" className="h-12" />
                <button
                  type="button"
                  className="text-sm text-red-500"
                  onClick={() => onChange({ ...appearance, iconDataUrl: undefined })}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Color schemes</h3>
            <button type="button" className="text-sm text-brand" onClick={addPalette}>
              + Add scheme
            </button>
          </div>
          <div className="space-y-3">
            {appearance.palettes.map((palette) => (
              <div key={palette.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="radio"
                      name="palette"
                      checked={appearance.selectedPaletteId === palette.id}
                      onChange={() => handleSelectPalette(palette.id)}
                    />
                    {palette.name}
                  </label>
                  <button
                    type="button"
                    className="text-xs text-red-500"
                    onClick={() => removePalette(palette.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <div>
                    <label className="block text-xs uppercase text-slate-500">Primary</label>
                    <input
                      type="text"
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={palette.primary}
                      onChange={(e) => handlePaletteChange(palette.id, { primary: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-slate-500">Secondary</label>
                    <input
                      type="text"
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={palette.secondary}
                      onChange={(e) => handlePaletteChange(palette.id, { secondary: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-slate-500">Accent</label>
                    <input
                      type="text"
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={palette.accent}
                      onChange={(e) => handlePaletteChange(palette.id, { accent: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const HeaderTab = ({ header, onChange }: { header: HeaderSettings; onChange: (next: HeaderSettings) => void }) => {
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-slate-700">{label}</div>
      <div>{children}</div>
    </div>
  )

  return (
    <section className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold">Header Bar</h3>
      <Row label="Position">
        <select
          className="rounded border px-3 py-2 text-sm"
          value={header.position}
          onChange={(e) => onChange({ ...header, position: e.target.value as HeaderSettings['position'] })}
        >
          <option value="static">Persistent (top of page)</option>
          <option value="fixed">Overlay (fixed)</option>
        </select>
      </Row>
      <Row label="Compact icons and spacing">
        <input type="checkbox" checked={header.compact} onChange={(e) => onChange({ ...header, compact: e.target.checked })} />
      </Row>
      <Row label="Edge reveal (show when cursor hits top edge)">
        <input type="checkbox" checked={header.edgeReveal} onChange={(e) => onChange({ ...header, edgeReveal: e.target.checked })} />
      </Row>
      <Row label="Enable header bar">
        <input type="checkbox" checked={header.enabled} onChange={(e) => onChange({ ...header, enabled: e.target.checked })} />
      </Row>
      <Row label="Auto-expand on hover">
        <input type="checkbox" checked={header.autoHide} onChange={(e) => onChange({ ...header, autoHide: e.target.checked })} />
      </Row>
      <Row label="Show logo">
        <input type="checkbox" checked={header.showLogo} onChange={(e) => onChange({ ...header, showLogo: e.target.checked })} />
      </Row>
      <Row label="Show search">
        <input type="checkbox" checked={header.showSearch} onChange={(e) => onChange({ ...header, showSearch: e.target.checked })} />
      </Row>
      <Row label="Build menu from Apps">
        <input type="checkbox" checked={header.menuFromApps} onChange={(e) => onChange({ ...header, menuFromApps: e.target.checked })} />
      </Row>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Height (px)</label>
          <input
            type="number"
            min={40}
            max={96}
            className="mt-1 w-full rounded border px-3 py-2"
            value={header.height}
            onChange={(e) => onChange({ ...header, height: Number.parseInt(e.target.value, 10) || 56 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Corner rounding</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={header.rounded}
            onChange={(e) => onChange({ ...header, rounded: e.target.value as HeaderSettings['rounded'] })}
          >
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">XL</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Always hide on App IDs (comma-separated)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="app_abc123, app_xyz456"
            value={(header.hideOnAppIds || []).join(', ')}
            onChange={(e) => onChange({ ...header, hideOnAppIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          />
          <p className="mt-1 text-xs text-slate-500">When viewing /app with one of these IDs, the header rail is fully hidden to preserve native UI.</p>
        </div>
      </div>
      <p className="text-xs text-slate-500">The header bar mirrors the floating pill menu but sits at the top. Use it for quick access and search.</p>
    </section>
  )
}

const LmsTab = ({
  lms,
  onChange,
}: {
  lms: AppSettings['lms']
  onChange: (next: AppSettings['lms']) => void
}) => {
  const update = (patch: Partial<AppSettings['lms']>) => {
    onChange({ ...lms, ...patch })
  }

  const updateFeature = (key: keyof AppSettings['lms']['features'], value: boolean) => {
    onChange({
      ...lms,
      features: { ...lms.features, [key]: value },
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">LMS availability</h2>
            <p className="text-sm text-slate-500">
              Control whether the Learning workspace appears in the launcher and where it fetches content.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={lms.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            Enabled
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">API base URL</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="https://lms.example.com/api"
              value={lms.apiBaseUrl || ''}
              onChange={(e) => update({ apiBaseUrl: e.target.value })}
            />
            <div className="mt-2">
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  if (!lms.apiBaseUrl) {
                    toast.info('No API base URL set. Using mock data.')
                    return
                  }
                  const ok = await ping(lms.apiBaseUrl)
                  if (ok) {
                    toast.success('API reachable')
                  } else {
                    toast.error('API not reachable')
                  }
                }}
              >
                Test API
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Requests for courses, lessons, and progress use this endpoint.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">Asset CDN URL</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="https://cdn.example.com/lms"
              value={lms.assetCdnUrl || ''}
              onChange={(e) => update({ assetCdnUrl: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">
              Optional. Use when lesson media is served from a separate CDN.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">OWUI workflow base URL</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="https://owui.yourdomain.com"
              value={lms.owuiWorkflowBaseUrl || ''}
              onChange={(e) => update({ owuiWorkflowBaseUrl: e.target.value })}
            />
            <div className="mt-2 flex items-start gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  if (!lms.apiBaseUrl) {
                    toast.info('Configure the LMS API base URL first.')
                    return
                  }
                  try {
                    const base = lms.apiBaseUrl.replace(/\/$/, '')
                    const res = await fetch(`${base}/owui/health`, {
                      headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }),
                      },
                    })
                    if (res.ok) {
                      const payload: OwuiHealthResponse = await res
                        .json()
                        .catch(() => ({} as OwuiHealthResponse))
                      const open = payload.breaker?.open
                      if (open) {
                        const ms = payload?.breaker?.cooldownMsRemaining ?? 0
                        toast.info(`OWUI reachable; breaker cooling down (${ms} ms)`)
                      } else {
                        toast.success('OWUI tutor endpoint reachable')
                      }
                    } else {
                      const payload: OwuiHealthResponse = await res
                        .json()
                        .catch(() => ({} as OwuiHealthResponse))
                      toast.error(payload.message || `OWUI health check failed (${res.status})`)
                    }
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'OWUI health check failed')
                  }
                }}
              >
                Test OWUI
              </button>
              <p className="text-xs text-slate-500">
                Requires `OWUI_BASE_URL` (and optional `OWUI_API_KEY`) on the LMS API server.
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-500">Used to embed OWUI workflows inside lessons (e.g., https://owui.example.com/workflows/&lt;id&gt;).</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Tutor metrics (read-only)</label>
            <MetricsPanel />
            <p className="mt-1 text-xs text-slate-500">Aggregated counts and latency snapshots exposed by the LMS API.</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Pass threshold</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              className="mt-1 w-full rounded border px-3 py-2"
              value={lms.rules?.passThreshold ?? 0.7}
              onChange={(e) => update({ rules: { ...(lms.rules ?? { passThreshold: 0.7, maxQuizAttempts: 3 }), passThreshold: Math.max(0, Math.min(1, Number(e.target.value))) } })}
            />
            <p className="mt-1 text-xs text-slate-500">Minimum quiz score required to unlock next lesson.</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Max quiz attempts</label>
            <input
              type="number"
              min={1}
              max={10}
              className="mt-1 w-full rounded border px-3 py-2"
              value={lms.rules?.maxQuizAttempts ?? 3}
              onChange={(e) => update({ rules: { ...(lms.rules ?? { passThreshold: 0.7, maxQuizAttempts: 3 }), maxQuizAttempts: Math.max(1, Number.parseInt(e.target.value || '1', 10)) } })}
            />
            <p className="mt-1 text-xs text-slate-500">After this, lesson may lock until instructor review.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded border bg-slate-50 p-4 text-sm">
            <input
              type="checkbox"
              checked={lms.autoEnrollNewUsers}
              onChange={(e) => update({ autoEnrollNewUsers: e.target.checked })}
            />
            Auto-enroll new users into onboarding courses
          </label>
          <div>
            <label className="block text-sm font-medium">Recent courses to show</label>
            <input
              type="number"
              min={1}
              max={24}
              className="mt-1 w-full rounded border px-3 py-2"
              value={lms.recentCoursesLimit}
              onChange={(e) =>
                update({ recentCoursesLimit: Math.max(1, Number.parseInt(e.target.value || '0', 10) || 1) })
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Controls how many courses appear on the dashboard overview.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Feature toggles</h2>
        <p className="text-sm text-slate-500">Enable extensions that your learning content relies on.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(
            [
              { key: 'quizzes', label: 'Quizzes', hint: 'Deliver graded checks inside lessons.' },
              { key: 'discussions', label: 'Discussions', hint: 'Threaded conversations per lesson.' },
              { key: 'certificates', label: 'Certificates', hint: 'Issue completion certificates automatically.' },
              { key: 'requireQuizPass', label: 'Require quiz pass to unlock next', hint: 'Learners must pass the quiz to proceed.' },
              { key: 'sequential', label: 'Sequential lessons', hint: 'Require completing a lesson before unlocking the next.' },
              { key: 'modulePrereqs', label: 'Module prerequisites', hint: 'Require previous module completion before entering next.' },
            ] as const
          ).map(({ key, label, hint }) => (
            <label key={key} className="flex items-start gap-3 rounded border p-3 text-sm">
              <input
                type="checkbox"
                checked={lms.features[key]}
                onChange={(e) => updateFeature(key, e.target.checked)}
              />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="mt-1 block text-xs text-slate-500">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}

const AuthTab = ({
  auth,
  onChange,
}: {
  auth: AppSettings['auth']
  onChange: (next: AppSettings['auth']) => void
}) => {
  const [testing, setTesting] = useState(false)

  const scopesText = useMemo(() => (auth?.scopes?.length ? auth.scopes.join('\n') : ''), [auth?.scopes])

  const update = (patch: Partial<AppSettings['auth']>) => {
    const mergedScopes =
      patch.scopes !== undefined ? patch.scopes : auth?.scopes && auth.scopes.length ? auth.scopes : ['openid', 'profile', 'email']
    onChange({ ...auth, ...patch, scopes: mergedScopes })
  }

  const handleTenantChange = (value: string) => {
    const trimmed = value.trim()
    const suggestedAuthority = trimmed
      ? `https://login.microsoftonline.com/${trimmed}`
      : 'https://login.microsoftonline.com/common'
    const shouldUpdateAuthority =
      !auth.authority ||
      auth.authority.endsWith(`/${auth.tenantId}`) ||
      auth.authority.includes('/common')

    update({
      tenantId: trimmed,
      authority: shouldUpdateAuthority ? suggestedAuthority : auth.authority,
    })
  }

  const handleScopesChange = (value: string) => {
    const next = value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    update({ scopes: next.length ? next : ['openid', 'profile', 'email'] })
  }

  const testConfiguration = async () => {
    if (!auth.authority || !isValidUrl(auth.authority)) {
      toast.error('Authority must be a valid URL before testing')
      return
    }
    setTesting(true)
    try {
      const cleanAuthority = auth.authority.replace(/\/$/, '')
      const res = await fetch(`${cleanAuthority}/.well-known/openid-configuration`)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      await res.json()
      toast.success('Azure AD discovery endpoint reachable')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reach discovery endpoint'
      toast.error(message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Azure Active Directory (Entra ID)</h3>
            <p className="text-sm text-slate-500">Configure tenant details to enable single sign-on across the studio.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={auth.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            Enable
          </label>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Tenant ID</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={auth.tenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">Azure Entra tenant GUID. Updates the authority automatically.</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Authority URL</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="https://login.microsoftonline.com/<tenant>"
              value={auth.authority}
              onChange={(e) => update({ authority: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Client ID (Application ID)</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={auth.clientId}
              onChange={(e) => update({ clientId: e.target.value.trim() })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Redirect URI</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder={`${typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.example.com'}/auth/callback`}
              value={auth.redirectUri}
              onChange={(e) => update({ redirectUri: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">Register this URI in Azure app registration (SPA redirect).</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Post-logout redirect URI</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={auth.postLogoutRedirectUri}
              onChange={(e) => update({ postLogoutRedirectUri: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Scopes (space or comma separated)</label>
            <textarea
              className="mt-1 h-24 w-full rounded border px-3 py-2 text-sm"
              value={scopesText}
              onChange={(e) => handleScopesChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">Defaults to openid, profile, email. Add API scopes as needed.</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="rounded border px-4 py-2 text-sm"
            onClick={testConfiguration}
            disabled={testing}
          >
            {testing ? 'Testing…' : 'Test discovery endpoint'}
          </button>
          <span className="text-xs text-slate-500">Ensure the discovery document resolves before enabling SSO.</span>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">Notes</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>Use a SPA (single-page application) registration in Azure Entra ID with PKCE enabled.</li>
          <li>Do not store client secrets in the browser. If your flow requires one, delegate to a backend.</li>
          <li>Every embedded tool should trust the same identity provider for seamless sign-in.</li>
        </ul>
      </section>
    </div>
  )
}

export default function Settings() {
  const user = useAppStore((s) => s.user)
  const isAdmin = !!user?.roles?.includes('admin')
  const appSettings = useAppStore((s) => s.appSettings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const hydrateSettings = useAppStore((s) => s.hydrateSettings)
  const setTheme = useAppStore((s) => s.setTheme)
  const theme = useAppStore((s) => s.theme)
  const token = useAppStore((s) => s.token)
  const settingsVersion = useAppStore((s) => s.settingsVersion)

  const [draft, setDraft] = useState<AppSettings>(() => cloneSettings(appSettings))
  const [activeTab, setActiveTab] = useState<TabId>('apps')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(cloneSettings(appSettings))
  }, [appSettings])

  const validateDraft = (): boolean => {
    const errors: string[] = []
    draft.apps.forEach((app) => {
      if (!app.label.trim()) errors.push('Each app needs a name')
      if (app.url && !isValidUrl(app.url)) errors.push(`${app.label}: invalid link ${app.url}`)
    })
    if (!draft.appearance.palettes.length) {
      errors.push('At least one color palette is required')
    }
    if (draft.lms.enabled) {
      if (draft.lms.apiBaseUrl && !isValidUrl(draft.lms.apiBaseUrl)) {
        errors.push('LMS API base URL must be http(s)')
      }
      if (draft.lms.assetCdnUrl && !isValidUrl(draft.lms.assetCdnUrl)) {
        errors.push('LMS asset CDN must be http(s)')
      }
      if (!Number.isFinite(draft.lms.recentCoursesLimit) || draft.lms.recentCoursesLimit < 1) {
        errors.push('Recent courses limit must be at least 1')
      }
    }
    if (draft.auth.enabled) {
      if (!draft.auth.clientId.trim()) errors.push('SSO client ID is required when enabling Azure AD')
      if (!draft.auth.authority || !isValidUrl(draft.auth.authority)) {
        errors.push('SSO authority must be a valid URL')
      }
      if (!draft.auth.redirectUri || !isValidUrl(draft.auth.redirectUri)) {
        errors.push('SSO redirect URI must be a valid URL')
      }
    }
    if (errors.length) {
      toast.error(errors[0])
      return false
    }
    return true
  }

  const onSave = async () => {
    if (!isAdmin) return
    if (!validateDraft()) return
    setSaving(true)
    try {
      const baseUrl = (draft.lms.apiBaseUrl || appSettings.lms.apiBaseUrl || '').trim()
      const tenantId = user?.tenantId || draft.auth.tenantId || appSettings.auth.tenantId || ''

      if (baseUrl && tenantId) {
        try {
          const result = await saveWorkspaceSettings({
            baseUrl,
            token,
            tenantId,
            settings: cloneSettings(draft),
            version: settingsVersion ?? undefined,
          })
          hydrateSettings(result.settings, result.version)
          toast.success('Settings saved')
        } catch (error) {
          if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
            toast.error('Settings changed in another session. Refresh and try again.')
          } else {
            toast.error('Failed to sync settings')
          }
        }
      } else {
        updateSettings(cloneSettings(draft))
        toast.success('Settings saved locally')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Theme preference</h2>
          <p className="mt-1 text-sm text-slate-600">Switch between light, dark, or system modes.</p>
          <div className="mt-4 flex gap-3">
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const active = theme === mode
              return (
                <button
                  key={mode}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    active ? 'border-brand bg-brand text-white' : 'border-slate-200'
                  }`}
                  onClick={() => setTheme(mode)}
                >
                  {mode.toUpperCase()}
                </button>
              )
            })}
          </div>
        </section>
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Additional administrative settings are only available to workspace admins.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <p className="text-sm text-slate-500">Manage tools, theming, and default behavior for ODSAiStudio.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-full border bg-white p-1 shadow-sm">
        {Tabs.map((tab) => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active ? 'bg-brand text-white shadow-sm' : 'text-slate-600'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'apps' && (
        <AppsTab
          apps={draft.apps}
          onChange={(apps) => setDraft((prev) => ({ ...prev, apps }))}
          allowSelfEnroll={draft.courses.allowSelfEnroll}
          onToggleAllowSelfEnroll={(value) =>
            setDraft((prev) => ({ ...prev, courses: { ...prev.courses, allowSelfEnroll: value } }))
          }
        />
      )}

      {activeTab === 'branding' && (
        <BrandingTab
          appearance={draft.appearance}
          onChange={(appearance) => setDraft((prev) => ({ ...prev, appearance }))}
        />
      )}

      {activeTab === 'header' && (
        <HeaderTab
          header={draft.header || {
            enabled: true,
            autoHide: true,
            height: 56,
            rounded: 'xl',
            showLogo: true,
            showSearch: true,
            menuFromApps: true,
            compact: true,
            hideOnAppIds: [],
          }}
          onChange={(headerCfg) => setDraft((prev) => ({ ...prev, header: headerCfg }))}
        />
      )}

      {activeTab === 'lms' && (
        <LmsTab
          lms={draft.lms}
          onChange={(lmsSettings) => setDraft((prev) => ({ ...prev, lms: lmsSettings }))}
        />
      )}

      {activeTab === 'auth' && (
        <AuthTab
          auth={draft.auth}
          onChange={(authConfig) => setDraft((prev) => ({ ...prev, auth: authConfig }))}
        />
      )}

      <div className="flex gap-3 border-t pt-4">
        <button
          type="button"
          className="rounded bg-brand px-4 py-2 text-white disabled:opacity-60"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          className="rounded border px-4 py-2"
          onClick={() => {
            setDraft(cloneSettings(appSettings))
            toast.info('Changes reverted to last saved values')
          }}
        >
          Revert changes
        </button>
      </div>
    </div>
  )
}
