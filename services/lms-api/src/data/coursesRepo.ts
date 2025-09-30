export type CourseSummary = {
  id: string
  title: string
  description?: string
  tags?: string[]
  status: 'draft' | 'published' | 'archived'
  updatedAt: string
}

export type Lesson = {
  id: string
  title?: string
  type: 'video' | 'reading' | 'embed' | 'quiz' | 'lab'
  payload: Record<string, unknown>
  estimatedDuration?: number
  owuiWorkflowRef?: string
}

export type Module = {
  id: string
  title: string
  order: number
  lessons: Lesson[]
}

export type CourseDetail = CourseSummary & {
  publishedVersion: number
  draftVersion?: number
  modules: Module[]
  settings?: { modulePrereqs?: boolean }
}

export type ProgressRecord = {
  userId: string
  courseId: string
  lessonId: string
  status: 'not-started' | 'in-progress' | 'completed'
  score?: number
  attempts?: number
  aiInteractions?: Array<{ sessionId?: string; workflowId?: string; summary?: string }>
  updatedAt?: string
}

export interface CoursesRepo {
  listCourses(tenantId: string, userId: string): Promise<CourseSummary[]>
  listAllCourses(tenantId: string): Promise<CourseDetail[]>
  getCourse(tenantId: string, id: string): Promise<CourseDetail | null>
  getProgress(tenantId: string, userId: string, courseId: string): Promise<ProgressRecord[]>
  listAllProgress(tenantId: string, courseId: string): Promise<ProgressRecord[]>
  upsertProgress(record: ProgressRecord, tenantId: string): Promise<void>
  clearProgress(tenantId: string, userId: string, courseId: string): Promise<void>
  clearLessonProgress(tenantId: string, userId: string, courseId: string, lessonId: string): Promise<void>
  updateCourseSettings(tenantId: string, courseId: string, settings: Partial<{ modulePrereqs: boolean }>): Promise<CourseDetail | null>
  updateLessonWorkflowRef(tenantId: string, courseId: string, lessonId: string, workflowRef?: string): Promise<CourseDetail | null>
}

export class InMemoryCoursesRepo implements CoursesRepo {
  #courses: Record<string, CourseDetail>
  #progress: ProgressRecord[] = []
  constructor() {
    const sample: CourseDetail = {
      id: 'course-odsai-sample',
      title: 'ODSAiStudio Starter Course',
      description: 'Sample course placeholder until backend connects to Cosmos DB.',
      status: 'published',
      updatedAt: new Date().toISOString(),
      publishedVersion: 1,
      modules: [
        {
          id: 'm1',
          title: 'Getting Started',
          order: 1,
          lessons: [
            { id: 'm1l1', title: 'Welcome', type: 'reading', payload: { body: 'Welcome!' } },
            { id: 'm1l2', title: 'What is ODSAiStudio?', type: 'video', payload: { url: 'https://www.w3schools.com/html/mov_bbb.mp4' } },
          ],
        },
        {
          id: 'm2',
          title: 'Check Understanding',
          order: 2,
          lessons: [
            {
              id: 'm2q1',
              title: 'Prompt Patterns Quiz',
              type: 'quiz',
              payload: {
                options: [
                  { id: 'a', text: 'Be specific', correct: true },
                  { id: 'b', text: 'Be ambiguous', correct: false },
                  { id: 'c', text: 'Provide examples', correct: true },
                ],
              },
              owuiWorkflowRef: 'lesson-tutor-workflow',
            },
          ],
        },
      ],
      settings: { modulePrereqs: true },
    }
    this.#courses = { [sample.id]: sample }
  }

  async listCourses(): Promise<CourseSummary[]> {
    return Object.values(this.#courses).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      tags: [],
      status: c.status,
      updatedAt: c.updatedAt,
    }))
  }

  async listAllCourses(): Promise<CourseDetail[]> {
    return Object.values(this.#courses).map((c) => ({ ...c }))
  }

  async getCourse(_tenantId: string, id: string): Promise<CourseDetail | null> {
    return this.#courses[id] ?? null
  }

  async getProgress(_tenantId: string, userId: string, courseId: string): Promise<ProgressRecord[]> {
    return this.#progress.filter((p) => p.userId === userId && p.courseId === courseId)
  }

  async listAllProgress(_tenantId: string, courseId: string): Promise<ProgressRecord[]> {
    return this.#progress.filter((p) => p.courseId === courseId)
  }

  async upsertProgress(record: ProgressRecord, _tenantId: string): Promise<void> {
    const idx = this.#progress.findIndex(
      (p) => p.userId === record.userId && p.courseId === record.courseId && p.lessonId === record.lessonId,
    )
    if (idx >= 0) {
      const prev = this.#progress[idx]
      const attempts = (prev.attempts ?? 0) + 1
      this.#progress[idx] = { ...prev, ...record, attempts, updatedAt: new Date().toISOString() }
    } else {
      this.#progress.push({ ...record, attempts: 1, updatedAt: new Date().toISOString() })
    }
  }

  async clearProgress(_tenantId: string, userId: string, courseId: string): Promise<void> {
    this.#progress = this.#progress.filter((p) => !(p.userId === userId && p.courseId === courseId))
  }

  async clearLessonProgress(_tenantId: string, userId: string, courseId: string, lessonId: string): Promise<void> {
    this.#progress = this.#progress.filter((p) => !(p.userId === userId && p.courseId === courseId && p.lessonId === lessonId))
  }

  async updateCourseSettings(_tenantId: string, courseId: string, settings: Partial<{ modulePrereqs: boolean }>): Promise<CourseDetail | null> {
    const existing = this.#courses[courseId]
    if (!existing) return null
    const next: CourseDetail = {
      ...existing,
      settings: { ...(existing.settings ?? {}), ...settings },
    }
    this.#courses[courseId] = next
    return next
  }

  async updateLessonWorkflowRef(_tenantId: string, courseId: string, lessonId: string, workflowRef?: string): Promise<CourseDetail | null> {
    const existing = this.#courses[courseId]
    if (!existing) return null
    const modules = existing.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => {
        if (lesson.id !== lessonId) return lesson
        const payload = { ...(lesson.payload ?? {}) }
        if (workflowRef) {
          payload.owuiWorkflowRef = workflowRef
        } else {
          delete payload.owuiWorkflowRef
        }
        return {
          ...lesson,
          owuiWorkflowRef: workflowRef,
          payload,
        }
      }),
    }))
    const next: CourseDetail = { ...existing, modules }
    this.#courses[courseId] = next
    return next
  }
}

export function getCoursesRepo(): CoursesRepo {
  if (process.env.DATA_BACKEND === 'cosmos') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CosmosCoursesRepo } = require('./cosmosRepo') as { CosmosCoursesRepo: new () => CoursesRepo }
    return new CosmosCoursesRepo()
  }
  return new InMemoryCoursesRepo()
}
