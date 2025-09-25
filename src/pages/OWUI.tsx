import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { ping } from '../utils/health'
import { toast } from '../store/toastStore'

export default function OWUI(){
  const activeProjectId = useAppStore(s=>s.activeProjectId)
  const activeCourseId = useAppStore(s=>s.activeCourseId)
  const projects = useAppStore(s=>s.projects)
  const courses = useAppStore(s=>s.courses)
  const owuiUrl = useAppStore(s=>s.appSettings.links.owuiUrl)
  const project = projects.find(p=>p.id===activeProjectId)
  const course = courses.find(c=>c.id===activeCourseId)
  const [offline, setOffline] = useState(false)

  useEffect(()=>{
    let mounted = true
    if (!owuiUrl) { setOffline(false); return }
    ping(owuiUrl).then(ok => {
      if (!mounted) return
      setOffline(!ok)
      if (!ok) toast.error('OWUI appears offline or unreachable')
    })
    return ()=>{ mounted = false }
  }, [owuiUrl])
  return (
    <div className="mx-auto max-w-4xl mt-10 space-y-4">
      <h2 className="text-2xl font-bold">OWUI</h2>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-600 truncate">{owuiUrl || 'No URL configured (Settings → Links)'}</span>
        {owuiUrl && (
          <a href={owuiUrl} target="_blank" rel="noopener noreferrer" className="rounded border px-2 py-1 hover:bg-slate-50">Open tool</a>
        )}
      </div>
      {offline && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">Tool offline: Check Settings → Links → owuiUrl</div>
      )}
      {project && (
        <div className="rounded border bg-white p-3"><span className="font-semibold">Project:</span> {project.name}</div>
      )}
      {course && (
        <div className="rounded border bg-white p-3"><span className="font-semibold">Channel:</span> {course.title} <span className="text-xs text-slate-500">(stub)</span></div>
      )}
      {!project && !course && (
        <p className="text-slate-600">No project or course selected yet.</p>
      )}
      <p className="text-slate-600">Dummy OWUI content.</p>
    </div>
  )
}
