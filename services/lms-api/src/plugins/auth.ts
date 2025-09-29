import fp from 'fastify-plugin'
import { FastifyRequest, FastifyReply } from 'fastify'

// Placeholder verifier. In production this will validate Azure AD JWTs.
async function verifyToken(authorization?: string) {
  if (!authorization) return null
  const [scheme, token] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  // TODO: integrate with Entra ID JWKS validation.
  return {
    sub: 'mock-user',
    roles: ['learner'],
    tenantId: 'mock-tenant',
  }
}

export const authPlugin = fp(async (app) => {
  app.decorateRequest('user', null)

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await verifyToken(request.headers.authorization)
    if (!result) {
      reply.unauthorized('Missing or invalid bearer token')
      return reply
    }

    request.user = result
  })
})

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      sub: string
      roles: string[]
      tenantId: string
    } | null
  }
}
