import React, { useMemo } from 'react'
import { usePresenceStore } from '../../store/presenceStore'

const formatTime = (iso: string) => {
  const time = new Date(iso)
  return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ActivitySidebar() {
  const activities = usePresenceStore((s) => s.activities)
  const connected = usePresenceStore((s) => s.connected)

  const grouped = useMemo(() => activities.slice(0, 12), [activities])

  return (
    <div className="rounded-3xl border border-slate-200 p-4 shadow-sm dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Activity stream</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300/80">
            {connected ? 'Realtime updates from collaborators.' : 'Connect to presence to see recent activity.'}
          </p>
        </div>
        {grouped.length > 0 && (
          <button
            type="button"
            className="rounded-full border px-3 py-1 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-400"
            onClick={() => usePresenceStore.getState().clearActivities()}
          >
            Clear
          </button>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {grouped.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-300/80">
            {connected
              ? 'Activity updates will appear here as collaborators edit this project.'
              : 'Presence is currently disabled. Enable collaboration in Settings → Dashboard to stream updates.'}
          </div>
        ) : (
          grouped.map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-200 p-3 shadow-sm dark:border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="uppercase tracking-wide text-slate-400">{event.type}</span>
                <span>{formatTime(event.timestamp)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{event.message}</p>
              {event.actor && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300/80">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                    style={{ background: event.actor.avatarColor }}
                  >
                    {event.actor.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    {event.actor.name}{' '}
                    <span className="text-slate-400 dark:text-slate-500">· {event.actor.role}</span>
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
