import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { authPlugin } from '../plugins/auth'
import { tenantPlugin } from '../plugins/tenant'
import { registerCourseRoutes } from '../routes/courses'
import { registerWorkspaceRoutes } from '../routes/workspace'
import { initTelemetry } from '../telemetry/appInsights'

initTelemetry()

export async function createApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  })

  await app.register(sensible)
  await app.register(helmet, { global: true })

  const isProd = process.env.NODE_ENV === 'production'
  const defaultDevOrigins = 'http://localhost:5173,http://127.0.0.1:5173'
  const rawAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS ?? (isProd ? '' : defaultDevOrigins)
  const allowedOrigins = rawAllowedOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const isLoopback = (value: string) => /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(value)

  if (isProd) {
    if (allowedOrigins.length === 0) {
      throw new Error('CORS_ALLOWED_ORIGINS must be configured for production deployments')
    }
    if (allowedOrigins.some(isLoopback)) {
      throw new Error('CORS_ALLOWED_ORIGINS cannot include localhost entries in production')
    }
  }

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error('Origin not allowed'), false)
    },
    credentials: true,
  })

  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX ?? 120)
  const timeWindow = process.env.RATE_LIMIT_WINDOW ?? '1 minute'
  const allowList = (process.env.RATE_LIMIT_ALLOWLIST || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  await app.register(rateLimit, {
    global: true,
    max: Number.isFinite(rateLimitMax) && rateLimitMax > 0 ? rateLimitMax : 120,
    timeWindow,
    allowList,
    hook: 'onSend',
  })
  await app.register(authPlugin)
  await app.register(tenantPlugin)

  const readinessChecks = () => {
    const issues: string[] = []
    if (isProd && process.env.AUTH_DEV_ALLOW === '1') {
      issues.push('AUTH_DEV_ALLOW is enabled in production')
    }
    if (process.env.DATA_BACKEND === 'cosmos') {
      if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY) {
        issues.push('Cosmos DB configuration incomplete')
      }
    }
    return issues
  }

  await app.register(async (instance) => {
    registerCourseRoutes(instance)
    registerWorkspaceRoutes(instance)

    instance.get('/health', async () => ({ status: 'ok' }))
    instance.get('/live', async () => ({ status: 'ok' }))
    instance.get('/ready', async (_req, reply) => {
      const issues = readinessChecks()
      if (issues.length > 0) {
        return reply.code(503).send({ status: 'error', issues })
      }
      return { status: 'ok' }
    })
    instance.get('/favicon.ico', async (_req, reply) => {
      reply.code(204).header('Content-Type', 'image/x-icon').send()
    })
  })

  return app
}
