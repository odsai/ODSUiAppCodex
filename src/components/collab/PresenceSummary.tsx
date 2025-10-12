import React from 'react'
import { usePresenceStore } from '../../store/presenceStore'

const statusColor: Record<string, string> = {
  online: 'bg-emerald-500',
  idle: 'bg-amber-400',
  offline: 'bg-slate-400',
}

export default function PresenceSummary() {
  const participants = usePresenceStore((s) => s.participants)
  const connected = usePresenceStore((s) => s.connected)

  if (!participants.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300/80">
        {connected
          ? 'Presence updates appear once collaborators join this project.'
          : 'Presence is disabled. Enable collaboration in Settings → Dashboard to show teammates here.'}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm shadow-sm dark:border-slate-700"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: participant.avatarColor }}
          >
            {participant.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{participant.name}</div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span className={`h-2 w-2 rounded-full ${statusColor[participant.status] || 'bg-slate-400'}`} />
              <span>{participant.role}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Active {new Date(participant.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
