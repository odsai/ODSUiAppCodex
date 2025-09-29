import { CosmosClient, SqlQuerySpec } from '@azure/cosmos'
import { getCosmosConfig } from '../config/cosmos'
import type {
  CoursesRepo,
  CourseDetail,
  CourseSummary,
  ProgressRecord,
} from './coursesRepo'

export class CosmosCoursesRepo implements CoursesRepo {
  #client: CosmosClient
  #dbName: string
  #coursesContainer: string
  #progressContainer: string

  constructor() {
    const cfg = getCosmosConfig()
    this.#client = new CosmosClient({ endpoint: cfg.endpoint, key: cfg.key })
    this.#dbName = cfg.database
    this.#coursesContainer = cfg.coursesContainer
    this.#progressContainer = cfg.progressContainer
  }

  async listCourses(tenantId: string, _userId: string): Promise<CourseSummary[]> {
    const query: SqlQuerySpec = {
      query: 'SELECT c.id, c.title, c.description, c.tags, c.status, c.updatedAt FROM c WHERE c.tenantId = @tenant AND c.type = "course" AND c.status = "published"',
      parameters: [{ name: '@tenant', value: tenantId }],
    }
    const { resources } = await this.#client
      .database(this.#dbName)
      .container(this.#coursesContainer)
      .items.query(query, { enableCrossPartitionQuery: true })
      .fetchAll()
    return (resources as any[]).map((c) => ({
      id: String(c.id),
      title: String(c.title),
      description: c.description ? String(c.description) : undefined,
      tags: Array.isArray(c.tags) ? c.tags : [],
      status: (c.status as any) ?? 'published',
      updatedAt: String(c.updatedAt ?? new Date().toISOString()),
    }))
  }

  async getCourse(tenantId: string, id: string): Promise<CourseDetail | null> {
    // Prefer point read with partition key when the item uses tenantId as partition
    try {
      const { resource } = await this.#client
        .database(this.#dbName)
        .container(this.#coursesContainer)
        .item(id, tenantId)
        .read()
      if (!resource) return null
      return resource as unknown as CourseDetail
    } catch {
      // Fallback to query if point read fails (e.g., different partition key)
      const query: SqlQuerySpec = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenant AND c.id = @id',
        parameters: [
          { name: '@tenant', value: tenantId },
          { name: '@id', value: id },
        ],
      }
      const { resources } = await this.#client
        .database(this.#dbName)
        .container(this.#coursesContainer)
        .items.query(query, { enableCrossPartitionQuery: true })
        .fetchAll()
      return (resources?.[0] as unknown as CourseDetail) ?? null
    }
  }

  async getProgress(tenantId: string, userId: string, courseId: string): Promise<ProgressRecord[]> {
    const query: SqlQuerySpec = {
      query: 'SELECT * FROM p WHERE p.tenantId = @tenant AND p.type = "progress" AND p.userId = @user AND p.courseId = @course',
      parameters: [
        { name: '@tenant', value: tenantId },
        { name: '@user', value: userId },
        { name: '@course', value: courseId },
      ],
    }
    const { resources } = await this.#client
      .database(this.#dbName)
      .container(this.#progressContainer)
      .items.query(query, { enableCrossPartitionQuery: true })
      .fetchAll()
    return (resources as any[]).map((r) => ({
      userId: String(r.userId),
      courseId: String(r.courseId),
      lessonId: String(r.lessonId),
      status: r.status as any,
      score: typeof r.score === 'number' ? r.score : undefined,
      aiInteractions: Array.isArray(r.aiInteractions) ? r.aiInteractions : undefined,
      updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
    }))
  }

  async upsertProgress(record: ProgressRecord): Promise<void> {
    const item = {
      id: `${record.userId}:${record.courseId}:${record.lessonId}`,
      type: 'progress',
      tenantId: 'unknown', // will be added by route layer or set via record augmentation
      ...record,
      updatedAt: new Date().toISOString(),
    }
    await this.#client
      .database(this.#dbName)
      .container(this.#progressContainer)
      .items.upsert(item as any)
  }
}

