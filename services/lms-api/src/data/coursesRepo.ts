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
}

export type ProgressRecord = {
  userId: string
  courseId: string
  lessonId: string
  status: 'not-started' | 'in-progress' | 'completed'
  score?: number
  aiInteractions?: Array<{ sessionId?: string; workflowId?: string; summary?: string }>
  updatedAt?: string
}

export interface CoursesRepo {
  listCourses(tenantId: string, userId: string): Promise<CourseSummary[]>
  getCourse(tenantId: string, id: string): Promise<CourseDetail | null>
  getProgress(tenantId: string, userId: string, courseId: string): Promise<ProgressRecord[]>
  upsertProgress(record: ProgressRecord): Promise<void>
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
            { id: 'm1l1', type: 'reading', payload: { body: 'Welcome!' } },
            { id: 'm1l2', type: 'video', payload: { url: 'https://www.w3schools.com/html/mov_bbb.mp4' } },
          ],
        },
      ],
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

  async getCourse(_tenantId: string, id: string): Promise<CourseDetail | null> {
    return this.#courses[id] ?? null
  }

  async getProgress(_tenantId: string, userId: string, courseId: string): Promise<ProgressRecord[]> {
    return this.#progress.filter((p) => p.userId === userId && p.courseId === courseId)
  }

  async upsertProgress(record: ProgressRecord): Promise<void> {
    const idx = this.#progress.findIndex(
      (p) => p.userId === record.userId && p.courseId === record.courseId && p.lessonId === record.lessonId,
    )
    if (idx >= 0) this.#progress[idx] = { ...this.#progress[idx], ...record, updatedAt: new Date().toISOString() }
    else this.#progress.push({ ...record, updatedAt: new Date().toISOString() })
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
