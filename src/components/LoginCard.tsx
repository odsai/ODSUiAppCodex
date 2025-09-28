import React, { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'

export default function LoginCard({ onClose }: { onClose?: () => void }) {
  const login = useAppStore((s) => s.login)
  const setRoute = useAppStore((s) => s.setRoute)
  const appSettings = useAppStore((s) => s.appSettings)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ssoEnabled =
    appSettings.auth?.enabled &&
    !!appSettings.auth.clientId &&
    !!appSettings.auth.authority &&
    typeof window !== 'undefined'

  const handleLogin = async (e?: React.FormEvent | React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    setError(null)
    if (ssoEnabled) {
      const { clientId, redirectUri, authority } = appSettings.auth
      if (!clientId || !redirectUri || !authority) {
        toast.error('SSO configuration is incomplete. Check Settings → Single Sign-On.')
        return
      }
    }
    setLoading(true)
    try {
      if (ssoEnabled) {
        await login('', '')
      } else {
        await login(email, password)
      }
      toast.success('Signed in successfully')
      onClose?.()
      const next = appSettings.routes?.defaultAfterLogin || '/dashboard'
      setRoute(next)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (ssoEnabled) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Sign in with Azure AD</h2>
        <p className="text-sm text-slate-600">
          You will be redirected to Microsoft Entra ID to authenticate. After sign-in you return here automatically.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="mt-4 w-full rounded bg-brand px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Opening Azure login…' : 'Continue with Microsoft'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleLogin} className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow">
      <h2 className="text-lg font-semibold mb-4">Sign in</h2>
      <label className="block text-sm font-medium">Email</label>
      <input
        type="email"
        className="mt-1 w-full rounded border px-3 py-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <label className="mt-4 block text-sm font-medium">Password</label>
      <input
        type="password"
        className="mt-1 w-full rounded border px-3 py-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button disabled={loading} className="rounded bg-brand px-4 py-2 text-white disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <a className="text-sm text-slate-600 hover:underline" href="#" onClick={(e) => e.preventDefault()}>
          Create account on ODSAi
        </a>
        <a className="text-sm text-slate-600 hover:underline" href="#" onClick={(e) => e.preventDefault()}>
          Forgot password?
        </a>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Tip: use email starting with <span className="font-semibold">admin</span> to see admin features.
      </p>
    </form>
  )
}
