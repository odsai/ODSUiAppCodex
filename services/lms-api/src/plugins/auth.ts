import fp from 'fastify-plugin'
import { FastifyRequest, FastifyReply } from 'fastify'
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken'
import jwksClient, { JwksClient } from 'jwks-rsa'

type VerifiedUser = {
  sub: string
  roles: string[]
  tenantId: string
}

function buildDevVerifier() {
  return async (authorization?: string): Promise<VerifiedUser | null> => {
    if (!authorization) return null
    const [scheme, token] = authorization.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null
    const isAdmin = token.toLowerCase().includes('admin')
    return { sub: 'dev-user', roles: isAdmin ? ['admin'] : ['learner'], tenantId: 'mock-tenant' }
  }
}

function buildAzureVerifier() {
  const tenantId = process.env.AZURE_TENANT_ID
  const audience = process.env.AZURE_AUDIENCE
  if (!tenantId || !audience) {
    throw new Error('AZURE_TENANT_ID and AZURE_AUDIENCE must be set for auth')
  }
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`
  const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
  const client: JwksClient = jwksClient({ jwksUri, cache: true, rateLimit: true })

  const getKey = (header: JwtHeader, callback: SigningKeyCallback) => {
    if (!header.kid) return callback(new Error('No KID in token header'), undefined)
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err, undefined)
      const signingKey = key?.getPublicKey()
      callback(null, signingKey)
    })
  }

  return async (authorization?: string): Promise<VerifiedUser | null> => {
    if (!authorization) return null
    const [scheme, token] = authorization.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null

    return await new Promise<VerifiedUser | null>((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        { algorithms: ['RS256'], audience, issuer },
        (err, decoded) => {
          if (err) return reject(err)
          const claims = decoded as Record<string, any>
          const roles: string[] = Array.isArray(claims?.roles)
            ? claims.roles.filter((r: unknown): r is string => typeof r === 'string')
            : typeof claims?.scp === 'string'
              ? String(claims.scp)
                  .split(/\s+/)
                  .filter(Boolean)
              : []
          const user: VerifiedUser = {
            sub: String(claims?.sub ?? claims?.oid ?? 'unknown'),
            roles,
            tenantId: String(claims?.tid ?? tenantId),
          }
          resolve(user)
        },
      )
    })
  }
}

export const authPlugin = fp(async (app) => {
  app.decorateRequest('user', null as VerifiedUser | null)

  const devMode = process.env.AUTH_DEV_ALLOW === '1'
  const verifier = devMode ? buildDevVerifier() : buildAzureVerifier()

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Public allowlist: permit unauthenticated access to health and favicon
    const urlPath = (request.raw.url || '').split('?')[0]
    const m = request.method
    if ((m === 'GET' || m === 'HEAD') && (urlPath === '/health' || urlPath === '/favicon.ico')) {
      return
    }
    try {
      const result = await verifier(request.headers.authorization)
      if (!result) return reply.unauthorized('Missing or invalid bearer token')
      request.user = result
    } catch (err) {
      request.log.warn({ err }, 'JWT verification failed')
      return reply.unauthorized('Invalid token')
    }
  })
})

declare module 'fastify' {
  interface FastifyRequest {
    user: VerifiedUser | null
  }
}
