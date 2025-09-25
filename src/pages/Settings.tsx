import React, { useState } from 'react'
import { useAppStore, type AppSettings, type Route } from '../store/appStore'
import { toast } from '../store/toastStore'

export default function Settings(){
  const user = useAppStore(s=>s.user)
  const isAdmin = !!user?.roles?.includes('admin')
  const appSettings = useAppStore(s=>s.appSettings)
  const updateSettings = useAppStore(s=>s.updateSettings)
  const setTheme = useAppStore(s=>s.setTheme)
  const theme = useAppStore(s=>s.theme)

  const [draft, setDraft] = useState<AppSettings>(appSettings)
  const [saving, setSaving] = useState(false)

  const onSave = async () => {
    if (!isAdmin) return
    setSaving(true)
    try {
      updateSettings(draft)
      toast.success('Settings saved')
    } catch (e:any) {
      toast.error('Failed to save settings')
    } finally { setSaving(false) }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {!isAdmin && (
        <div className="rounded border bg-white p-4">
          <h2 className="font-semibold">Preferences</h2>
          <p className="mt-2 text-sm text-slate-600">Personal preferences (limited view). More will appear here later.</p>
          <div className="mt-4 flex gap-3">
            {(['light','dark','system'] as const).map((t)=>{
              const active = theme === t
              return (
                <button
                  key={t}
                  aria-pressed={active}
                  className={`rounded border px-3 py-1 ${active ? 'bg-brand text-white border-brand' : ''}`}
                  onClick={()=> setTheme(t)}
                >{t[0].toUpperCase()+t.slice(1)}</button>
              )
            })}
          </div>
        </div>
      )}

      {isAdmin && (
        <>
          <section className="rounded border bg-white p-4">
            <h2 className="font-semibold">Links</h2>
            <p className="mt-1 text-sm text-slate-600">Provide the hosted URLs for your tools. Use Test to check reachability.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={() => {
                  const localhost = {
                    owuiUrl: 'http://localhost:3000',
                    penpotUrl: 'http://localhost:9001',
                    flowiseUrl: 'http://localhost:3001',
                    excalidrawUrl: 'http://localhost:4000',
                    comfyuiUrl: 'http://localhost:8188',
                  }
                  setDraft({ ...draft, links: { ...draft.links, ...localhost } })
                  toast.info('Prefilled localhost defaults (adjust as needed)')
                }}
              >
                Prefill localhost defaults
              </button>
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={() => {
                  setDraft({
                    ...draft,
                    links: { owuiUrl: '', penpotUrl: '', flowiseUrl: '', excalidrawUrl: '', comfyuiUrl: '' },
                  })
                }}
              >
                Clear all
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(['owuiUrl','penpotUrl','flowiseUrl','excalidrawUrl','comfyuiUrl'] as const).map((k)=> (
                <div key={k}>
                  <label className="block text-sm font-medium">{k}</label>
                  <div className="mt-1 flex gap-2">
                    <input className="flex-1 rounded border px-3 py-2" value={draft.links[k]}
                      onChange={(e)=> setDraft({...draft, links: {...draft.links, [k]: e.target.value}})} placeholder={`https://...`} />
                    <button type="button" className="rounded border px-3 py-2" onClick={async ()=>{
                      const { ping } = await import('../utils/health')
                      const ok = await ping(draft.links[k])
                      if (ok) toast.success(`${k} reachable`) ; else toast.error(`${k} seems offline`)
                    }}>Test</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border bg-white p-4">
            <h2 className="font-semibold">Routes</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Default After Login</label>
                <select className="mt-1 w-full rounded border px-3 py-2" value={draft.routes.defaultAfterLogin}
                  onChange={(e)=> setDraft({...draft, routes: {...draft.routes, defaultAfterLogin: e.target.value as Route}})}>
                  {['/dashboard','/ai','/penpot','/flowise','/excalidraw','/comfyui','/groups','/settings'].map((r)=> (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Default App</label>
                <select className="mt-1 w-full rounded border px-3 py-2" value={draft.routes.defaultApp}
                  onChange={(e)=> setDraft({...draft, routes: {...draft.routes, defaultApp: e.target.value as Route}})}>
                  {['/ai','/penpot','/flowise','/excalidraw','/comfyui'].map((r)=> (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded border bg-white p-4">
            <h2 className="font-semibold">Appearance</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Theme</label>
                <select className="mt-1 w-full rounded border px-3 py-2" value={draft.appearance.theme}
                  onChange={(e)=> setDraft({...draft, appearance: {...draft.appearance, theme: e.target.value as AppSettings['appearance']['theme']}})}>
                  {['system','light','dark'].map((t)=> (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Brand Color</label>
                <input type="text" className="mt-1 w-full rounded border px-3 py-2" value={draft.appearance.brandColor}
                  onChange={(e)=> setDraft({...draft, appearance: {...draft.appearance, brandColor: e.target.value}})} />
              </div>
            </div>
          </section>

          <section className="rounded border bg-white p-4">
            <h2 className="font-semibold">Courses</h2>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm">Allow self-enroll</label>
              <input type="checkbox" checked={draft.courses.allowSelfEnroll} onChange={(e)=> setDraft({...draft, courses: {...draft.courses, allowSelfEnroll: e.target.checked}})} />
            </div>
          </section>

          <div className="flex gap-3">
            <button disabled={saving} onClick={onSave} className="rounded bg-brand px-4 py-2 text-white disabled:opacity-50">{saving?'Saving...':'Save'}</button>
            <button disabled={saving} onClick={()=> setDraft(appSettings)} className="rounded border px-4 py-2 disabled:opacity-50">Reset</button>
          </div>
        </>
      )}
    </div>
  )
}
