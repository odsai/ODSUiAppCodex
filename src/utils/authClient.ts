import type { AuthConfig } from '../store/appStore'

let msalImport: typeof import('@azure/msal-browser') | null = null
let cachedApp: import('@azure/msal-browser').PublicClientApplication | null = null
let cachedConfigKey = ''

const getMsalModule = async () => {
  if (!msalImport) {
    msalImport = await import('@azure/msal-browser')
  }
  return msalImport
}

const buildKey = (config: AuthConfig) =>
  JSON.stringify({ authority: config.authority, clientId: config.clientId, redirectUri: config.redirectUri })

export const ensureAzureClient = async (config: AuthConfig) => {
  if (typeof window === 'undefined') throw new Error('Azure SSO is only available in the browser environment')
  const msal = await getMsalModule()
  const key = buildKey(config)
  if (!cachedApp || cachedConfigKey !== key) {
    cachedApp = new msal.PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: config.authority || 'https://login.microsoftonline.com/common',
        redirectUri: config.redirectUri || window.location.origin,
        postLogoutRedirectUri: config.postLogoutRedirectUri || config.redirectUri || window.location.origin,
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
      },
    })
    cachedConfigKey = key
  }
  return cachedApp
}

export const azureLogin = async (config: AuthConfig) => {
  const client = await ensureAzureClient(config)
  const msal = await getMsalModule()
  const scopes = config.scopes?.length ? config.scopes : ['openid', 'profile', 'email']

  const request: import('@azure/msal-browser').PopupRequest = {
    scopes,
    redirectUri: config.redirectUri || window.location.origin,
  }

  try {
    const result = await client.loginPopup(request)
    client.setActiveAccount(result.account ?? null)
    return result
  } catch (error) {
    if (error instanceof msal.InteractionRequiredAuthError) {
      const result = await client.acquireTokenPopup(request)
      client.setActiveAccount(result.account ?? null)
      return result
    }
    throw error
  }
}

export const acquireAzureToken = async (config: AuthConfig) => {
  const client = await ensureAzureClient(config)
  const scopes = config.scopes?.length ? config.scopes : ['openid', 'profile', 'email']
  const account = client.getActiveAccount() || client.getAllAccounts()[0]
  if (!account) return null
  try {
    const result = await client.acquireTokenSilent({ scopes, account })
    return result
  } catch {
    return null
  }
}

export const azureLogout = async (config: AuthConfig) => {
  const client = await ensureAzureClient(config)
  const account = client.getActiveAccount() || client.getAllAccounts()[0]
  if (!account) return
  await client.logoutPopup({
    account,
    postLogoutRedirectUri: config.postLogoutRedirectUri || config.redirectUri || window.location.origin,
  })
  client.setActiveAccount(null)
}
