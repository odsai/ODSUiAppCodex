import React, { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'

export default function ExternalApp() {
  const apps = useAppStore((s) => s.appSettings.apps)
  const [appId, setAppId] = useState<string | null>(null)

  useEffect(() => {
    const read = () => {
      const raw = (window.location.hash || '').replace(/^#/, '')
      const [, query = ''] = raw.split('?')
      const params = new URLSearchParams(query)
      const id = params.get('id')
      setAppId(id)
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  const app = useMemo(() => apps.find((a) => a.id === appId), [apps, appId])

  if (!appId) {
    return (
      <div className="mx-auto max-w-3xl mt-10 rounded border bg-white p-4 text-slate-700">
        <h2 className="text-xl font-semibold">Open App</h2>
        <p className="mt-2 text-sm">No app selected. Use the pill menu to pick an app.</p>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="mx-auto max-w-3xl mt-10 rounded border bg-white p-4 text-slate-700">
        <h2 className="text-xl font-semibold">App not found</h2>
        <p className="mt-2 text-sm">The app id {appId} is not configured.</p>
      </div>
    )
  }

  const src = (app.url || '').trim()
  if (!src && app.kind === 'route') {
    return (
      <div className="mx-auto max-w-3xl mt-10 rounded border bg-white p-4 text-slate-700">
        <h2 className="text-xl font-semibold">Internal app</h2>
        <p className="mt-2 text-sm">This app is an internal route and no external link is configured. Use the pill menu to navigate.</p>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen">
      {src ? (
        <iframe
          title={app.label}
          src={src}
          className="absolute inset-0 h-full w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold">{app.label}</h2>
            <p className="mt-2 text-slate-600">Set the tool link in Settings → Apps.</p>
          </div>
        </div>
      )}
    </div>
  )
}
