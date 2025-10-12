import React, { useMemo, useState } from 'react'
import { useReviewStore, type ReviewEntry } from '../../store/reviewStore'
import { useAppStore } from '../../store/appStore'

const statusClasses: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  changes: 'bg-rose-500/10 text-rose-600',
}

export default function ReviewQueuePanel() {
  const queue = useReviewStore((s) => s.queue)
  const resolve = useReviewStore((s) => s.resolve)
  const isMentor = useAppStore(
    (s) =>
      !!s.user?.roles?.some((role) => role === 'mentor' || role === 'admin'),
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<ReviewEntry | null>(null)

  const pending = useMemo(
    () => queue.filter((entry) => entry.status === 'pending'),
    [queue],
  )
  const historical = useMemo(
    () => queue.filter((entry) => entry.status !== 'pending'),
    [queue],
  )

  if (!queue.length) return null

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 p-4 shadow-sm dark:border-slate-700">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
        Review queue
      </h3>
      <ul className="space-y-2 text-sm">
        {pending.map((entry) => (
          <li
            key={entry.id}
            className="rounded-2xl border border-slate-200 p-3 shadow-sm dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {entry.title}
                </div>
                <div className="text-xs text-slate-500">
                  Submitted by {entry.submittedBy}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses[entry.status] || 'bg-slate-100 text-slate-500'}`}
              >
                {entry.status}
              </span>
            </div>
            {entry.notes && (
              <p className="mt-2 text-xs text-slate-500">
                Notes: {entry.notes}
              </p>
            )}
            {isMentor && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600"
                  onClick={() => resolve(entry.id, 'approved')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-full border border-rose-500 px-3 py-1 text-xs font-semibold text-rose-600"
                  onClick={() =>
                    resolve(
                      entry.id,
                      'changes',
                      'Needs updates before publish.',
                    )
                  }
                >
                  Request changes
                </button>
              </div>
            )}
            <button
              type="button"
              className="mt-3 text-xs underline"
              onClick={() => setSelected(entry)}
            >
              View details
            </button>
          </li>
        ))}
      </ul>
      {historical.length > 0 && (
        <div>
          <button
            type="button"
            className="text-xs uppercase tracking-wide text-slate-400"
            onClick={() => setExpandedId((prev) => (prev ? null : 'history'))}
          >
            {expandedId ? 'Hide history' : 'Show history'} ({historical.length})
          </button>
          {expandedId && (
            <ul className="mt-2 space-y-2 text-xs">
              {historical.slice(0, 5).map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-dashed border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <span>{entry.title}</span>
                    <span
                      className={`rounded-full px-2 py-1 ${statusClasses[entry.status] || 'bg-slate-100 text-slate-500'}`}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-500">
                    Last updated {new Date(entry.updatedAt).toLocaleString()}
                  </div>
                  {entry.conflict && (
                    <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                      Published version may be stale. Republish after addressing
                      feedback.
                    </div>
                  )}
                  <button
                    type="button"
                    className="mt-2 text-xs underline"
                    onClick={() => setSelected(entry)}
                  >
                    View details
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                {selected.title}
              </h4>
              <p className="text-xs text-slate-500">
                Submitted by {selected.submittedBy}
              </p>
            </div>
            <button
              type="button"
              className="text-xs uppercase tracking-wide text-slate-400"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-200">
            <div>Status: {selected.status}</div>
            {selected.notes && <div>Notes: {selected.notes}</div>}
            <div>
              Submitted: {new Date(selected.submittedAt).toLocaleString()}
            </div>
            <div>
              Last updated: {new Date(selected.updatedAt).toLocaleString()}
            </div>
          </div>
          {selected.conflict && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              Published copy may be stale. Review feedback and republish
              updates.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
