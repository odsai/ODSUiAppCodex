import React from 'react'
import { useNotificationStore } from '../../store/notificationStore'

const kindStyles: Record<string, string> = {
  mention: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/50 dark:bg-sky-900/30 dark:text-sky-200',
  review: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-900/30 dark:text-violet-200',
  system: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
}

export default function NotificationsPanel() {
  const notifications = useNotificationStore((s) => s.items)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const unreadCount = notifications.filter((notification) => !notification.read).length
  const conflictCount = notifications.filter((notification) => notification.kind === 'system' && /stale/i.test(notification.message)).length

  if (!notifications.length) return null

  return (
    <div className="rounded-3xl border border-slate-200 p-4 shadow-sm dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-brand/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand">
              {unreadCount} unread
            </span>
          )}
          {conflictCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              {conflictCount} conflict
            </span>
          )}
        </div>
        <button
          type="button"
          className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
          onClick={markAllRead}
        >
          Mark all read
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {notifications.slice(0, 6).map((notification) => (
          <li
            key={notification.id}
            className={`rounded-2xl border px-3 py-2 transition ${kindStyles[notification.kind] || kindStyles.system} ${notification.read ? 'opacity-70' : ''}`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wide text-slate-400">{notification.kind}</span>
              <span>{new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="mt-1 text-sm text-slate-700 dark:text-slate-100">{notification.message}</div>
            {!notification.read && (
              <button
                type="button"
                className="mt-2 text-xs underline"
                onClick={() => markRead(notification.id)}
              >
                Mark read
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
