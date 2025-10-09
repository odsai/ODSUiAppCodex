import fs from 'node:fs/promises'
import path from 'node:path'
import { CosmosClient, SqlQuerySpec } from '@azure/cosmos'
import { getCosmosConfig } from '../config/cosmos'
import { createDefaultAppSettings, normalizeAppSettings, type AppSettings, type WorkspaceSettingsRecord } from '../domain/appSettings'

export interface WorkspaceSettingsRepo {
  get(tenantId: string): Promise<WorkspaceSettingsRecord>
  save(
    tenantId: string,
    settings: AppSettings,
    options: { expectedVersion?: number | null; updatedBy?: string },
  ): Promise<WorkspaceSettingsRecord>
}

const DEFAULT_VERSION = 0

class FileWorkspaceSettingsRepo implements WorkspaceSettingsRepo {
  #filePath: string

  constructor(filePath?: string) {
    this.#filePath = filePath || path.resolve(process.cwd(), 'workspace-settings.json')
  }

  async #readAll(): Promise<Record<string, WorkspaceSettingsRecord>> {
    try {
      const raw = await fs.readFile(this.#filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Record<string, WorkspaceSettingsRecord>
      return parsed || {}
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
      throw error
    }
  }

  async #writeAll(data: Record<string, WorkspaceSettingsRecord>): Promise<void> {
    await fs.mkdir(path.dirname(this.#filePath), { recursive: true })
    const tmp = `${this.#filePath}.${Date.now()}.tmp`
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
    await fs.rename(tmp, this.#filePath)
  }

  async get(tenantId: string): Promise<WorkspaceSettingsRecord> {
    const all = await this.#readAll()
    const existing = all[tenantId]
    if (existing) return existing
    const defaults = createDefaultAppSettings()
    return { settings: defaults, version: DEFAULT_VERSION, updatedAt: defaults.updatedAt }
  }

  async save(
    tenantId: string,
    settings: AppSettings,
    { expectedVersion, updatedBy }: { expectedVersion?: number | null; updatedBy?: string },
  ): Promise<WorkspaceSettingsRecord> {
    const all = await this.#readAll()
    const current = all[tenantId]
    const currentVersion = current?.version ?? DEFAULT_VERSION
    if (expectedVersion !== undefined && expectedVersion !== null && expectedVersion !== currentVersion) {
      const error = new Error('settings version conflict')
      ;(error as any).code = 'VERSION_CONFLICT'
      throw error
    }
    const normalized = normalizeAppSettings(settings)
    const version = currentVersion + 1
    const record: WorkspaceSettingsRecord = {
      settings: { ...normalized, updatedAt: new Date().toISOString(), updatedBy },
      version,
      updatedAt: normalized.updatedAt,
      updatedBy,
    }
    all[tenantId] = record
    await this.#writeAll(all)
    return record
  }
}

class CosmosWorkspaceSettingsRepo implements WorkspaceSettingsRepo {
  #client: CosmosClient
  #dbName: string
  #container: string

  constructor() {
    const cfg = getCosmosConfig()
    this.#client = new CosmosClient({ endpoint: cfg.endpoint, key: cfg.key })
    this.#dbName = cfg.database
    this.#container = cfg.workspaceContainer
  }

  async #containerRef() {
    return this.#client.database(this.#dbName).container(this.#container)
  }

  async get(tenantId: string): Promise<WorkspaceSettingsRecord> {
    const container = await this.#containerRef()
    const id = 'workspace-settings'
    try {
      const { resource } = await container.item(id, tenantId).read<{ version?: number; settings?: unknown; updatedAt?: string; updatedBy?: string }>()
      if (resource && resource.settings) {
        const normalized = normalizeAppSettings(resource.settings)
        return {
          settings: normalized,
          version: typeof resource.version === 'number' ? resource.version : DEFAULT_VERSION,
          updatedAt: resource.updatedAt || normalized.updatedAt,
          updatedBy: resource.updatedBy,
        }
      }
    } catch (error) {
      if ((error as any)?.code !== 404) throw error
    }
    const defaults = createDefaultAppSettings()
    return { settings: defaults, version: DEFAULT_VERSION, updatedAt: defaults.updatedAt }
  }

  async save(
    tenantId: string,
    settings: AppSettings,
    { expectedVersion, updatedBy }: { expectedVersion?: number | null; updatedBy?: string },
  ): Promise<WorkspaceSettingsRecord> {
    const container = await this.#containerRef()
    const id = 'workspace-settings'
    let currentVersion = DEFAULT_VERSION
    try {
      const { resource } = await container.item(id, tenantId).read<{ version?: number }>()
      if (resource && typeof resource.version === 'number') {
        currentVersion = resource.version
      }
    } catch (error) {
      if ((error as any)?.code !== 404) throw error
    }
    if (expectedVersion !== undefined && expectedVersion !== null && expectedVersion !== currentVersion) {
      const err = new Error('settings version conflict')
      ;(err as any).code = 'VERSION_CONFLICT'
      throw err
    }

    const normalized = normalizeAppSettings(settings)
    const version = currentVersion + 1
    const payload = {
      id,
      tenantId,
      version,
      settings: normalized,
      updatedAt: normalized.updatedAt,
      updatedBy,
      type: 'workspace-settings',
    }
    await container.items.upsert(payload)
    return { settings: normalized, version, updatedAt: normalized.updatedAt, updatedBy }
  }
}

export function getWorkspaceSettingsRepo(): WorkspaceSettingsRepo {
  if (process.env.DATA_BACKEND === 'cosmos') {
    return new CosmosWorkspaceSettingsRepo()
  }
  return new FileWorkspaceSettingsRepo(process.env.WORKSPACE_SETTINGS_PATH)
}
