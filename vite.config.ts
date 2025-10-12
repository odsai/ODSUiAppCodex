import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    include: [
      'tests/**/*.test.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'services/lms-api/tests/**/*.test.{ts,tsx}',
    ],
    exclude: ['tests/e2e/**/*', 'node_modules/**'],
  },
})
