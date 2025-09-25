import React, { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'

export default function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const createProject = useAppStore((s) => s.createProject)
  const selectProject = useAppStore((s) => s.selectProject)
  const setRoute = useAppStore((s) => s.setRoute)

  const [pname, setPname] = useState('')
  const [pdesc, setPdesc] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pname.trim()) return
    const p = createProject({ name: pname.trim(), description: pdesc.trim() || undefined })
    toast.success('Project created')
    setPname(''); setPdesc('')
    onClose()
    selectProject(p.id)
    setRoute('/ai')
  }

  return (
    <form onSubmit={submit} className="max-w-md rounded-2xl border bg-white p-4 shadow">
      <h3 className="font-semibold mb-2">Create Project</h3>
      <label className="block text-sm font-medium">Name</label>
      <input className="mt-1 w-full rounded border px-3 py-2" value={pname} onChange={(e)=>setPname(e.target.value)} required minLength={3} maxLength={80} />
      <label className="mt-3 block text-sm font-medium">Description</label>
      <textarea className="mt-1 w-full rounded border px-3 py-2" value={pdesc} onChange={(e)=>setPdesc(e.target.value)} maxLength={500} />
      <div className="mt-4 flex gap-3">
        <button className="rounded bg-brand px-4 py-2 text-white">Create</button>
        <button type="button" onClick={onClose} className="rounded border px-4 py-2">Cancel</button>
      </div>
    </form>
  )
}

