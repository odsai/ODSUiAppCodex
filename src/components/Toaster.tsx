import React from 'react'
import { useToastStore } from '../store/toastStore'

const kindStyles: Record<string, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={`text-white shadow rounded px-3 py-2 ${kindStyles[t.kind] || 'bg-slate-800'}`}>
          <div className="flex items-start gap-3">
            <div className="text-sm">{t.message}</div>
            <button aria-label="Close" className="ml-auto text-white/80 hover:text-white" onClick={() => remove(t.id)}>×</button>
          </div>
        </div>
      ))}
    </div>
  )
}

