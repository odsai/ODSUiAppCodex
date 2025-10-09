import { FastifyInstance } from 'fastify'
import { getWorkspaceSettingsRepo } from '../data/workspaceSettingsRepo'
import { normalizeAppSettings } from '../domain/appSettings'

export async function registerWorkspaceRoutes(app: FastifyInstance) {
  const repo = getWorkspaceSettingsRepo()

  app.get('/workspace/settings', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) return reply.badRequest('Tenant context required')
    const record = await repo.get(tenantId)
    reply.header('Cache-Control', 'no-store')
    reply.header('ETag', `"${record.version}"`)
    return record.settings
  })

  app.put('/workspace/settings', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) return reply.badRequest('Tenant context required')
    const isAdmin = request.user?.roles?.includes('admin') || process.env.AUTH_DEV_ALLOW === '1'
    if (!isAdmin) return reply.forbidden('Admin only')

    const body = normalizeAppSettings(request.body)
    const ifMatchRaw = request.headers['if-match']
    let expectedVersion: number | null | undefined = undefined
    if (typeof ifMatchRaw === 'string') {
      const stripped = ifMatchRaw.replace(/"/g, '').trim()
      const parsed = Number(stripped)
      expectedVersion = Number.isFinite(parsed) ? parsed : null
    }

    try {
      const record = await repo.save(tenantId, body, {
        expectedVersion,
        updatedBy: request.user?.sub,
      })
      reply.header('Cache-Control', 'no-store')
      reply.header('ETag', `"${record.version}"`)
      return record.settings
    } catch (error) {
      if ((error as any)?.code === 'VERSION_CONFLICT') {
        return reply.status(412).send({ error: 'Settings were updated elsewhere. Refresh and try again.' })
      }
      throw error
    }
  })
}
