import React from 'react'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'

export default function HeaderBar() {
  const signedIn = useAppStore(s=>s.signedIn)
  const user = useAppStore(s=>s.user)
  const setRoute = useAppStore(s=>s.setRoute)
  const logout = useAppStore(s=>s.logout)

  if (!signedIn) return null
  return (
    <header className="sticky top-0 z-30 mb-4 flex items-center justify-between border-b bg-white/80 p-3 backdrop-blur">
      <button className="text-base font-semibold" onClick={()=> setRoute('/dashboard')} aria-label="Go to dashboard">ODSAi Studio</button>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-700 truncate max-w-[40vw]">{user?.name} ({user?.email})</span>
        <button
          className="rounded border px-3 py-1 hover:bg-slate-50"
          onClick={() => {
            if (confirm('Are you sure you want to log out?')) {
              logout(); toast.info('Logged out'); setRoute('/dashboard')
            }
          }}
        >Logout</button>
      </div>
    </header>
  )
}

