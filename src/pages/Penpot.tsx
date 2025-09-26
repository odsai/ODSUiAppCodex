import React, { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { ping } from '../utils/health'
import { toast } from '../store/toastStore'

export default function Penpot(){
  const apps = useAppStore((s) => s.appSettings.apps)
  const config = useMemo(() =>
    apps.find((app) => app.id === 'app-penpot' || (app.kind === 'route' && app.route === '/penpot')),
  [apps])
  const url = config?.url
  const [offline, setOffline] = useState(false)
  useEffect(()=>{
    let mounted=true
    if (!url) { setOffline(false); return }
    ping(url).then(ok=>{ if(!mounted) return; setOffline(!ok); if(!ok) toast.error('Penpot appears offline or unreachable') })
    return ()=>{ mounted=false }
  },[url])
  return (
    <div className="mx-auto max-w-4xl mt-10 space-y-4 text-center">
      <h2 className="text-2xl font-bold">Penpot</h2>
      <div className="mx-auto max-w-3xl flex items-center justify-center gap-3 text-sm">
        <span className="text-slate-600 truncate">{url || 'No URL configured (Settings → Apps)'}</span>
        {url && (<a href={url} target="_blank" rel="noopener noreferrer" className="rounded border px-2 py-1 hover:bg-slate-50">Open tool</a>)}
      </div>
      {offline && (<div className="mx-auto max-w-xl rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">Tool offline: Check Settings → Apps and verify the Penpot link.</div>)}
      <p className="mt-2 text-slate-600">Dummy Penpot content.</p>
    </div>
  )
}
