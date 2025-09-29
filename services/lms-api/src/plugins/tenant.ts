import fp from 'fastify-plugin'
import { FastifyReply, FastifyRequest } from 'fastify'

export const tenantPlugin = fp(async (app) => {
  app.decorateRequest('tenantId', '')

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const urlPath = (request.raw.url || '').split('?')[0]
    const m = request.method
    if ((m === 'GET' || m === 'HEAD') && (urlPath === '/health' || urlPath === '/favicon.ico')) {
      // Skip tenant enforcement for public endpoints
      request.tenantId = ''
      return
    }
    const headerTenant = request.headers['x-tenant-id']
    const tenantId = typeof headerTenant === 'string' ? headerTenant : undefined
    const userTenant = request.user?.tenantId

    if (!tenantId && !userTenant) {
      reply.badRequest('Tenant context required')
      return reply
    }

    if (tenantId && userTenant && tenantId !== userTenant) {
      reply.forbidden('Tenant mismatch between token and header')
      return reply
    }

    request.tenantId = tenantId ?? userTenant ?? ''
  })
})

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string
  }
}
