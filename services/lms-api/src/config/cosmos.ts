export type CosmosConfig = {
  endpoint: string
  key: string
  database: string
  coursesContainer: string
  progressContainer: string
}

export function getCosmosConfig(): CosmosConfig {
  const endpoint = process.env.COSMOS_ENDPOINT || ''
  const key = process.env.COSMOS_KEY || ''
  const database = process.env.COSMOS_DB || 'odsui-lms'
  const coursesContainer = process.env.COSMOS_CONTAINER_COURSES || 'courses'
  const progressContainer = process.env.COSMOS_CONTAINER_PROGRESS || 'progress'
  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY are required when DATA_BACKEND=cosmos')
  }
  return { endpoint, key, database, coursesContainer, progressContainer }
}

