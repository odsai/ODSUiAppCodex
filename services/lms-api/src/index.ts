import { createApp } from './server/app'

const port = Number(process.env.PORT ?? 8080)

async function main() {
  const app = await createApp()
  try {
    await app.listen({ port, host: '0.0.0.0' })
    app.log.info('LMS API listening on %d', port)
  } catch (err) {
    app.log.error(err, 'Failed to start LMS API')
    process.exit(1)
  }
}

void main()
