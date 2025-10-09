import path from 'node:path'
import fs from 'node:fs/promises'
import { BlobServiceClient } from '@azure/storage-blob'
import { getCertificateStorageStrategy } from '../config/env'

const sanitizeSegment = (segment: string | undefined | null): string =>
  (segment ?? 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_')

type CertificateContext = {
  tenantId?: string | null
  courseId: string
  userId: string
}

let blobContainerClient: ReturnType<BlobServiceClient['getContainerClient']> | null = null

const ensureBlobContainer = async (connectionString: string, container: string) => {
  if (blobContainerClient) return blobContainerClient
  const client = BlobServiceClient.fromConnectionString(connectionString)
  const containerClient = client.getContainerClient(container)
  await containerClient.createIfNotExists({ access: 'private' })
  blobContainerClient = containerClient
  return containerClient
}

export const certificateExists = async (ctx: CertificateContext): Promise<boolean> => {
  const strategy = getCertificateStorageStrategy()
  if (!strategy) return false
  if (strategy.type === 'filesystem') {
    const filePath = path.join(
      strategy.directory,
      sanitizeSegment(ctx.tenantId),
      sanitizeSegment(ctx.courseId),
      `${sanitizeSegment(ctx.userId)}.pdf`,
    )
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
  const container = await ensureBlobContainer(strategy.connectionString, strategy.container)
  const blob = container.getBlockBlobClient(
    `${sanitizeSegment(ctx.tenantId)}/${sanitizeSegment(ctx.courseId)}/${sanitizeSegment(ctx.userId)}.pdf`,
  )
  const exists = await blob.exists()
  return exists
}

export const storeCertificatePdf = async (buffer: Buffer, ctx: CertificateContext): Promise<void> => {
  const strategy = getCertificateStorageStrategy()
  if (!strategy) return
  if (strategy.type === 'filesystem') {
    const dir = path.join(strategy.directory, sanitizeSegment(ctx.tenantId), sanitizeSegment(ctx.courseId))
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, `${sanitizeSegment(ctx.userId)}.pdf`)
    await fs.writeFile(filePath, buffer)
    return
  }
  const container = await ensureBlobContainer(strategy.connectionString, strategy.container)
  const blob = container.getBlockBlobClient(
    `${sanitizeSegment(ctx.tenantId)}/${sanitizeSegment(ctx.courseId)}/${sanitizeSegment(ctx.userId)}.pdf`,
  )
  await blob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: 'application/pdf' },
    overwrite: true,
  })
}
