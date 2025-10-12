import React, { useEffect, useMemo, useState } from 'react'
import { useAppStore, type Project } from '../../store/appStore'
import RichEditor from '../editor/RichEditor'
import { useReviewStore } from '../../store/reviewStore'

const statusOptions: Project['status'][] = ['draft', 'review', 'published']

export default function AuthoringPanel({ project }: { project: Project }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const user = useAppStore((s) => s.user)
  const [status, setStatus] = useState<Project['status']>(project.status || 'draft')
  const [aiSummary, setAiSummary] = useState(project.draft?.aiSummary || '')
  const [conflict, setConflict] = useState(false)
  const submitReview = useReviewStore((s) => s.submit)

  const autosaveKey = useMemo(() => `project_draft_${project.id}`, [project.id])

  useEffect(() => {
    setConflict(project.draft?.updatedAt !== project.updatedAt)
    setAiSummary(project.draft?.aiSummary || '')
  }, [project.draft?.updatedAt, project.updatedAt, project.draft?.aiSummary])

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 p-5 shadow-sm dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Project brief</h3>
        <select
          value={status}
          onChange={(event) => {
            const next = event.target.value as Project['status']
            setStatus(next)
            updateProject(project.id, { status: next })
          }}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <RichEditor
        value={project.draft?.body || project.description || ''}
        autosaveKey={autosaveKey}
        placeholder="Describe the project goals, context, and deliverables…"
        onChange={(body) => updateProject(project.id, { draft: { body, updatedAt: new Date().toISOString() } })}
        onSave={(body) => updateProject(project.id, { draft: { body, updatedAt: new Date().toISOString() } })}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>Autosaves every few seconds.</span>
          {conflict && <span className="rounded-full bg-amber-500/20 px-2 py-1 text-amber-600">Published version changed. Review before publishing.</span>}
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1"
          onClick={() => {
            localStorage.removeItem(autosaveKey)
            updateProject(project.id, { draft: { body: project.description || '', updatedAt: new Date().toISOString() } })
          }}
        >
          Reset to published
        </button>
        <button
          type="button"
          className="rounded-full bg-brand px-3 py-1 font-semibold text-white"
          onClick={() => {
            setStatus('review')
            updateProject(project.id, { status: 'review' })
            submitReview({
              projectId: project.id,
              title: project.name,
              submittedBy: user?.name || 'Unknown',
              draftBody: project.draft?.body || project.description,
            })
          }}
        >
          Submit for review
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">AI co-author (coming soon)</h4>
            <p className="text-xs text-slate-500">Generate summaries or critique prompts once the backend connector is live.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1 text-xs"
            onClick={() => setAiSummary('AI summary placeholder: highlight key goals and risks here.')}
          >
            Preview summary
          </button>
        </div>
        {aiSummary && <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{aiSummary}</p>}
      </div>
    </div>
  )
}
