import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import { authPlugin } from '../plugins/auth'
import { tenantPlugin } from '../plugins/tenant'
import { registerCourseRoutes } from '../routes/courses'

export async function createApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  })

  await app.register(sensible)
  await app.register(helmet, { global: true })
  await app.register(cors, { origin: true })
  await app.register(authPlugin)
  await app.register(tenantPlugin)

  await app.register(async (instance) => {
    registerCourseRoutes(instance)

    instance.get('/health', async () => ({ status: 'ok' }))
    instance.get('/favicon.ico', async (_req, reply) => {
      reply.code(204).header('Content-Type', 'image/x-icon').send()
    })
  })

  return app
}
