import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { OwuiAdapter } from '../clients/owuiAdapter'
import { getCoursesRepo } from '../data/coursesRepo'

const courseSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  updatedAt: z.string(),
})

const courseDetailSchema = courseSummarySchema.extend({
  publishedVersion: z.number().int().min(1),
  draftVersion: z.number().int().min(1).optional(),
  modules: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      order: z.number().int(),
      lessons: z.array(
        z.object({
          id: z.string(),
          type: z.enum(['video', 'reading', 'embed', 'quiz', 'lab']),
          payload: z.record(z.unknown()),
          estimatedDuration: z.number().int().optional(),
          owuiWorkflowRef: z.string().optional(),
        }),
      ),
    }),
  ),
})

const progressSchema = z.object({
  userId: z.string(),
  courseId: z.string(),
  lessonId: z.string(),
  status: z.enum(['not-started', 'in-progress', 'completed']),
  score: z.number().min(0).max(1).optional(),
  aiInteractions: z
    .array(
      z.object({
        sessionId: z.string().optional(),
        workflowId: z.string().optional(),
        summary: z.string().optional(),
      }),
    )
    .optional(),
  updatedAt: z.string().optional(),
})

export function registerCourseRoutes(app: FastifyInstance) {
  let owui: OwuiAdapter | null = null
  try {
    owui = new OwuiAdapter()
  } catch {
    app.log.warn('OWUI not configured; tutor endpoint will return 503')
  }
  const repo = getCoursesRepo()
  app.get('/courses', async (request) => {
    request.log.info({ tenantId: request.tenantId }, 'list courses')
    const list = await repo.listCourses(request.tenantId, request.user?.sub ?? 'anonymous')
    return list
  })

  app.get('/courses/:courseId', async (request, reply) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    request.log.info({ tenantId: request.tenantId, courseId: params.courseId }, 'get course')
    const course = await repo.getCourse(request.tenantId, params.courseId)
    if (!course) return reply.notFound('Course not found')
    return courseDetailSchema.parse(course)
  })

  app.get('/courses/:courseId/progress', async (request) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    request.log.info({ tenantId: request.tenantId, courseId: params.courseId, user: request.user?.sub }, 'get progress')
    return await repo.getProgress(request.tenantId, request.user?.sub ?? 'anonymous', params.courseId)
  })

  app.post('/courses/:courseId/progress', async (request, reply) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    const payload = progressSchema.parse(request.body)
    request.log.info({ tenantId: request.tenantId, courseId: params.courseId, payload }, 'upsert progress')
    await repo.upsertProgress({ ...payload, courseId: params.courseId, userId: request.user?.sub ?? payload.userId }, request.tenantId)
    reply.code(202)
    return { status: 'accepted' }
  })

  app.post('/courses/:courseId/lessons/:lessonId/tutor', async (request, reply) => {
    const params = z.object({ courseId: z.string(), lessonId: z.string() }).parse(request.params)
    const body = z.object({ prompt: z.string().min(1) }).parse(request.body)
    request.log.info({ tenantId: request.tenantId, params, body }, 'invoke tutor (stub)')
    if (!owui) {
      reply.code(503)
      return { error: 'OWUI not configured' }
    }
    const lessonContext = JSON.stringify({ courseId: params.courseId, lessonId: params.lessonId })
    const response = await owui.invokeTutor({
      workflowId: 'lesson-tutor-workflow',
      lessonContext,
      prompt: body.prompt,
      userId: request.user?.sub ?? 'anonymous',
    })
    return { sessionId: response.sessionId, message: response.reply }
  })
}
