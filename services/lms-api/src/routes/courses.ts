import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { OwuiAdapter } from '../clients/owuiAdapter'
import { getCoursesRepo } from '../data/coursesRepo'
import { getPassThreshold, getMaxQuizAttempts, getCertificateStorageDir } from '../config/env'
import { recordTutorFailure, recordTutorSuccess, metricsSnapshot } from '../server/metrics'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit') as any
const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function sanitizeSegment(segment: string) {
  return segment.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function buildCertificateFilePath(baseDir: string, tenantId: string | undefined, courseId: string, userId: string, ext: string) {
  const dir = path.join(baseDir, sanitizeSegment(tenantId ?? 'tenant'), sanitizeSegment(courseId))
  const filePath = path.join(dir, `${sanitizeSegment(userId)}.${ext}`)
  return { dir, filePath }
}

function extractOwuiWorkflowRef(lesson: unknown): string | undefined {
  if (typeof lesson !== 'object' || !lesson) return undefined
  const direct = (lesson as any).owuiWorkflowRef
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  const payload = (lesson as any).payload
  if (payload && typeof payload === 'object') {
    const nested = (payload as any).owuiWorkflowRef
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
  }
  return undefined
}

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
  settings: z.object({ modulePrereqs: z.boolean().optional() }).partial().optional(),
})

const progressSchema = z.object({
  userId: z.string().optional(),
  courseId: z.string().optional(),
  lessonId: z.string(),
  status: z.enum(['not-started', 'in-progress', 'completed']),
  score: z.number().min(0).max(1).optional(),
  attempts: z.number().int().min(0).optional(),
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

  app.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', 'application/json; charset=utf-8')
    return metricsSnapshot()
  })

  app.get('/owui/health', async (request, reply) => {
    const isAdmin = request.user?.roles?.includes('admin') || process.env.AUTH_DEV_ALLOW === '1'
    if (!isAdmin) return reply.forbidden('Admin only')
    if (!owui) {
      return reply.code(503).send({ status: 'unconfigured' })
    }
    try {
      const data = await owui.health()
      const breaker = typeof owui.breakerInfo === 'function' ? owui.breakerInfo() : undefined
      return { status: 'ok', data, ...(breaker ? { breaker } : {}) }
    } catch (error) {
      request.log.warn({ error }, 'OWUI health check failed')
      return reply.code(502).send({
        status: 'error',
        message: error instanceof Error ? error.message : 'OWUI health check failed',
      })
    }
  })

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

  app.get('/courses/:courseId/progress/all', async (request, reply) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    const isAdmin = request.user?.roles?.includes('admin') || process.env.AUTH_DEV_ALLOW === '1'
    if (!isAdmin) return reply.forbidden('Admin only')
    request.log.info({ tenantId: request.tenantId, courseId: params.courseId }, 'get all progress')
    return await repo.listAllProgress(request.tenantId, params.courseId)
  })

  app.post('/courses/:courseId/progress', async (request, reply) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    const payload = progressSchema.parse(request.body)
    request.log.info({ tenantId: request.tenantId, courseId: params.courseId, payload }, 'upsert progress')
    // Server-side enforcement of max quiz attempts (unless completed)
    try {
      const course = await repo.getCourse(request.tenantId, params.courseId)
      const lesson = (course?.modules ?? []).flatMap((m) => m.lessons).find((l) => l.id === payload.lessonId)
      if (lesson?.type === 'quiz' && payload.status !== 'completed') {
        const current = await repo.getProgress(request.tenantId, request.user?.sub ?? 'anonymous', params.courseId)
        const rec = current.find((r) => r.lessonId === payload.lessonId)
        const attempts = (rec as any)?.attempts ?? 0
        const max = getMaxQuizAttempts()
        if (attempts >= max) {
          return reply.code(409).send({ error: 'Max attempts reached' })
        }
      }
    } catch (e) {
      // if course lookup fails, proceed without gating
    }
    await repo.upsertProgress({ ...payload, courseId: params.courseId, userId: request.user?.sub ?? payload.userId ?? 'anonymous' }, request.tenantId)
    reply.code(202)
    return { status: 'accepted' }
  })

  app.delete('/courses/:courseId/progress', async (request, reply) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    // Admin-only reset; in dev mode, roles may be empty, so allow if AUTH_DEV_ALLOW
    const isAdmin = request.user?.roles?.includes('admin') || process.env.AUTH_DEV_ALLOW === '1'
    if (!isAdmin) return reply.forbidden('Admin only')
    const userId = request.user?.sub ?? 'anonymous'
    await repo.clearProgress(request.tenantId, userId, params.courseId)
    return reply.code(204).send()
  })

  app.patch('/courses/:courseId/settings', async (request, reply) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    const body = z.object({ modulePrereqs: z.boolean().optional() }).parse(request.body)
    const isAdmin = request.user?.roles?.includes('admin') || process.env.AUTH_DEV_ALLOW === '1'
    if (!isAdmin) return reply.forbidden('Admin only')
    const updated = await repo.updateCourseSettings(request.tenantId, params.courseId, body)
    if (!updated) return reply.notFound('Course not found')
    return courseDetailSchema.parse(updated)
  })

  app.delete('/courses/:courseId/lessons/:lessonId/attempts', async (request, reply) => {
    const params = z.object({ courseId: z.string(), lessonId: z.string() }).parse(request.params)
    const isAdmin = request.user?.roles?.includes('admin') || process.env.AUTH_DEV_ALLOW === '1'
    if (!isAdmin) return reply.forbidden('Admin only')
    const userId = request.user?.sub ?? 'anonymous'
    await repo.clearLessonProgress(request.tenantId, userId, params.courseId, params.lessonId)
    return reply.code(204).send()
  })

  app.patch('/courses/:courseId/lessons/:lessonId/owui', async (request, reply) => {
    const params = z.object({ courseId: z.string(), lessonId: z.string() }).parse(request.params)
    const body = z.object({ workflowRef: z.string().trim().optional() }).parse(request.body)
    const isAdmin = request.user?.roles?.includes('admin') || process.env.AUTH_DEV_ALLOW === '1'
    if (!isAdmin) return reply.forbidden('Admin only')
    const updated = await repo.updateLessonWorkflowRef(request.tenantId, params.courseId, params.lessonId, body.workflowRef)
    if (!updated) return reply.notFound('Course or lesson not found')
    return courseDetailSchema.parse(updated)
  })

  app.get('/courses/:courseId/certificate', async (request, reply) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    try {
      const [course, progress] = await Promise.all([
        repo.getCourse(request.tenantId, params.courseId),
        repo.getProgress(request.tenantId, request.user?.sub ?? 'anonymous', params.courseId),
      ])
      if (!course) return reply.notFound('Course not found')
      const byLesson = new Map(progress.map((p) => [p.lessonId, p]))
      const passThreshold = getPassThreshold()
      let eligible = true
      for (const m of course.modules) {
        for (const l of m.lessons) {
          const r = byLesson.get(l.id)
          if (!r || r.status !== 'completed') { eligible = false; break }
          if (l.type === 'quiz' && typeof r.score === 'number' && r.score < passThreshold) { eligible = false; break }
        }
        if (!eligible) break
      }
      const storageDir = getCertificateStorageDir()
      let stored = false
      if (storageDir && eligible) {
        const { filePath } = buildCertificateFilePath(
          storageDir,
          request.tenantId,
          params.courseId,
          request.user?.sub ?? 'anonymous',
          'pdf',
        )
        stored = fs.existsSync(filePath)
      }
      const url = eligible ? `/courses/${encodeURIComponent(params.courseId)}/certificate/pdf` : null
      return { eligible, url, stored }
    } catch {
      return { eligible: false, url: null }
    }
  })

  app.get('/courses/:courseId/certificate/download', async (request, reply) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    try {
      const [course, progress] = await Promise.all([
        repo.getCourse(request.tenantId, params.courseId),
        repo.getProgress(request.tenantId, request.user?.sub ?? 'anonymous', params.courseId),
      ])
      if (!course) return reply.notFound('Course not found')
      const byLesson = new Map(progress.map((p) => [p.lessonId, p]))
      const passThreshold = getPassThreshold()
      let eligible = true
      for (const m of course.modules) {
        for (const l of m.lessons) {
          const r = byLesson.get(l.id)
          if (!r || r.status !== 'completed') { eligible = false; break }
          if (l.type === 'quiz' && typeof r.score === 'number' && r.score < passThreshold) { eligible = false; break }
        }
        if (!eligible) break
      }
      if (!eligible) return reply.forbidden('Not eligible yet')
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Certificate</title>
      <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:40px;background:#f9fafb;color:#111827}
      .card{max-width:720px;margin:0 auto;border:2px solid #10b981;border-radius:16px;background:#ecfdf5;padding:32px;text-align:center}
      h1{margin:0 0 8px;font-size:28px;color:#065f46}
      h2{margin:0 0 24px;font-size:18px;color:#047857}
      .meta{margin-top:24px;font-size:12px;color:#374151}</style></head><body>
      <div class="card">
      <h1>Certificate of Completion</h1>
      <h2>${escapeHtml(course.title)}</h2>
      <p>This certifies that <strong>${escapeHtml(request.user?.sub ?? 'Learner')}</strong> has successfully completed the course.</p>
      <div class="meta">Issued on ${new Date().toLocaleDateString()}</div>
      </div></body></html>`
      const storageDir = getCertificateStorageDir()
      if (storageDir) {
        try {
          const userId = request.user?.sub ?? 'anonymous'
          const { dir, filePath } = buildCertificateFilePath(storageDir, request.tenantId, params.courseId, userId, 'html')
          await fsPromises.mkdir(dir, { recursive: true })
          await fsPromises.writeFile(filePath, html, 'utf8')
        } catch (err) {
          request.log.warn({ err }, 'failed to persist HTML certificate')
        }
      }
      reply.header('Content-Type', 'text/html; charset=utf-8').send(html)
    } catch (e) {
      return reply.internalServerError('Failed to render certificate')
    }
  })

  app.get('/courses/:courseId/certificate/pdf', async (request, reply) => {
    const params = z.object({ courseId: z.string() }).parse(request.params)
    try {
      const [course, progress] = await Promise.all([
        repo.getCourse(request.tenantId, params.courseId),
        repo.getProgress(request.tenantId, request.user?.sub ?? 'anonymous', params.courseId),
      ])
      if (!course) return reply.notFound('Course not found')
      const byLesson = new Map(progress.map((p) => [p.lessonId, p]))
      const passThreshold = getPassThreshold()
      let eligible = true
      for (const m of course.modules) {
        for (const l of m.lessons) {
          const r = byLesson.get(l.id)
          if (!r || r.status !== 'completed') { eligible = false; break }
          if (l.type === 'quiz' && typeof r.score === 'number' && r.score < passThreshold) { eligible = false; break }
        }
        if (!eligible) break
      }
      if (!eligible) return reply.forbidden('Not eligible yet')

      reply.header('Content-Type', 'application/pdf')
      reply.header('Content-Disposition', `attachment; filename=certificate-${params.courseId}.pdf`)

      const chunks: Buffer[] = []
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))

      // Header
      doc
        .fontSize(24)
        .fillColor('#065f46')
        .text('Certificate of Completion', { align: 'center' })
      doc.moveDown(0.5)
      doc
        .fontSize(16)
        .fillColor('#047857')
        .text(course.title || 'Course', { align: 'center' })
      doc.moveDown(2)

      // Body
      const learner = request.user?.sub ?? 'Learner'
      doc.fontSize(12).fillColor('#111827')
      doc.text('This certifies that', { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(18).fillColor('#111827').text(learner, { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(12).fillColor('#111827').text('has successfully completed the course.', { align: 'center' })
      doc.moveDown(1.5)

      // Meta
      const issued = new Date().toLocaleString()
      doc.fontSize(10).fillColor('#374151').text(`Issued on: ${issued}`, { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#374151').text(`Tenant: ${request.tenantId || 'N/A'}`, { align: 'center' })

      // Footer line
      doc.moveDown(2)
      doc.strokeColor('#10b981').lineWidth(2).moveTo(100, doc.y).lineTo(495, doc.y).stroke()
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#6b7280').text('ODSAiStudio LMS', { align: 'center' })

      await new Promise<void>((resolvePromise, rejectPromise) => {
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks)
            const storageDir = getCertificateStorageDir()
            if (storageDir) {
              const userId = request.user?.sub ?? 'anonymous'
              const { dir, filePath } = buildCertificateFilePath(storageDir, request.tenantId, params.courseId, userId, 'pdf')
              await fsPromises.mkdir(dir, { recursive: true })
              await fsPromises.writeFile(filePath, buffer)
            }
            reply.send(buffer)
            resolvePromise()
          } catch (err) {
            rejectPromise(err)
          }
        })
        doc.on('error', rejectPromise)
        doc.end()
      })
    } catch (e) {
      request.log.error({ e }, 'Failed generating certificate PDF')
      return reply.internalServerError('Failed to render certificate PDF')
    }
  })

  app.post('/courses/:courseId/lessons/:lessonId/tutor', async (request, reply) => {
    const params = z.object({ courseId: z.string(), lessonId: z.string() }).parse(request.params)
    const body = z.object({ prompt: z.string().min(1) }).parse(request.body)
    request.log.info({ tenantId: request.tenantId, params }, 'invoke tutor')
    if (!owui) {
      reply.code(503)
      return { error: 'OWUI not configured' }
    }

    const userId = request.user?.sub ?? 'anonymous'

    try {
      if (owui.isBreakerOpen()) {
        const info = owui.breakerInfo()
        reply.code(503)
        return { error: 'OWUI temporarily unavailable (cooling down)', breaker: info }
      }
      const course = await repo.getCourse(request.tenantId, params.courseId)
      if (!course) return reply.notFound('Course not found')
      const lesson = (course.modules ?? []).flatMap((m) => m.lessons).find((l) => l.id === params.lessonId)
      if (!lesson) return reply.notFound('Lesson not found')

      const workflowRef = extractOwuiWorkflowRef(lesson)
      if (!workflowRef) {
        return reply.badRequest('Lesson has no tutor workflow configured')
      }

      const lessonContext = JSON.stringify({
        courseId: params.courseId,
        lessonId: params.lessonId,
        courseTitle: course.title,
        lessonTitle: (lesson as any).title ?? lesson.id,
      })

      const t0 = Date.now()
      const response = await owui.invokeTutor({
        workflowId: workflowRef,
        lessonContext,
        prompt: body.prompt,
        userId,
      })
      const latency = Date.now() - t0
      try { recordTutorSuccess(latency) } catch {}

      // Persist interaction snapshot; do not fail the request on persistence errors.
      try {
        const currentProgress = await repo.getProgress(request.tenantId, userId, params.courseId)
        const existing = currentProgress.find((p) => p.lessonId === params.lessonId)
        const interactions = [...(existing?.aiInteractions ?? []), {
          sessionId: response.sessionId,
          workflowId: workflowRef,
          summary: response.reply?.slice(0, 4000) ?? '',
        }]
        await repo.upsertProgress({
          userId,
          courseId: params.courseId,
          lessonId: params.lessonId,
          status: existing?.status ?? 'in-progress',
          score: existing?.score,
          aiInteractions: interactions,
        }, request.tenantId)
      } catch (persistErr) {
        request.log.warn({ err: persistErr }, 'failed to store tutor interaction')
      }

      return { sessionId: response.sessionId, message: response.reply, workflowId: workflowRef, latency }
    } catch (error) {
      try { recordTutorFailure() } catch {}
      request.log.error({ err: error, tenantId: request.tenantId, params }, 'OWUI tutor invocation failed')
      if (error instanceof Error && /OWUI/.test(error.message)) {
        reply.code(502)
        return { error: error.message }
      }
      throw error
    }
  })

  app.post('/courses/:courseId/lessons/:lessonId/quiz', async (request, reply) => {
    const params = z.object({ courseId: z.string(), lessonId: z.string() }).parse(request.params)
    const body = z.object({ selected: z.array(z.string()).optional(), questions: z.array(z.object({ id: z.string(), selected: z.array(z.string()) })).optional() }).parse(request.body)
    try {
      const course = await repo.getCourse(request.tenantId, params.courseId)
      const lesson = (course?.modules ?? []).flatMap((m) => m.lessons).find((l) => l.id === params.lessonId)
      if (!lesson || lesson.type !== 'quiz') return reply.badRequest('Not a quiz lesson')
      const payload = (lesson as any).payload ?? {}
      let score = 0
      if (Array.isArray(payload.questions)) {
        // Exact-match per question
        const qmap = new Map<string, { options: Array<{ id: string; correct?: boolean }> }>()
        for (const q of payload.questions as Array<{ id: string; options: Array<{ id: string; correct?: boolean }> }>) {
          qmap.set(q.id, { options: q.options })
        }
        const submitted = body.questions ?? []
        const totalQ = qmap.size || 1
        let correctQ = 0
        for (const [qid, q] of qmap.entries()) {
          const sub = submitted.find((s) => s.id === qid)
          const correctIds = new Set(q.options.filter((o) => o.correct).map((o) => o.id))
          const sel = new Set((sub?.selected ?? []))
          // exact-match: selected must equal correct set
          if (correctIds.size === sel.size && [...correctIds].every((id) => sel.has(id))) {
            correctQ += 1
          }
        }
        score = correctQ / totalQ
      } else {
        // Single-question options fallback
        const opts = Array.isArray(payload.options) ? (payload.options as Array<{ id: string; correct?: boolean }>) : []
        const correctIds = new Set(opts.filter((o) => o.correct).map((o) => o.id))
        const selected = new Set(body.selected ?? [])
        const total = correctIds.size || 1
        let ok = 0
        correctIds.forEach((id) => { if (selected.has(id)) ok += 1 })
        score = ok / total
      }
      const passed = score >= getPassThreshold()
      await repo.upsertProgress({
        userId: request.user?.sub ?? 'anonymous',
        courseId: params.courseId,
        lessonId: params.lessonId,
        status: passed ? 'completed' : 'in-progress',
        score,
      }, request.tenantId)
      return { score, passed, status: passed ? 'completed' : 'in-progress' }
    } catch (e) {
      request.log.warn({ e }, 'quiz submission failed')
      return reply.internalServerError('Quiz scoring failed')
    }
  })
}
