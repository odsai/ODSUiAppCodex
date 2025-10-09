export const buildApiHeaders = (token?: string | null, tenantId?: string | null): Record<string, string> => {
  const headers: Record<string, string> = {}
  if (tenantId) headers['X-Tenant-Id'] = tenantId
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}
