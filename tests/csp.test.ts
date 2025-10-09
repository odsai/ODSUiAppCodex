import { readFileSync } from 'node:fs'
import { test, expect } from 'vitest'

test('production CSP is strict and has HSTS', () => {
  const raw = readFileSync('staticwebapp.config.json', 'utf8')
  const json = JSON.parse(raw)
  const headers = json.globalHeaders || {}
  const csp: string = headers['Content-Security-Policy'] || ''
  const hsts: string = headers['Strict-Transport-Security'] || ''

  expect(hsts).toContain('max-age=')
  expect(csp).toContain("frame-ancestors 'self'")
  expect(csp).toContain("object-src 'none'")
  expect(csp.includes('http://localhost')).toBe(false)
})

test('dev CSP allows localhost only in dev config', () => {
  const raw = readFileSync('staticwebapp.dev.config.json', 'utf8')
  const json = JSON.parse(raw)
  const csp: string = json.globalHeaders['Content-Security-Policy'] || ''
  expect(csp).toContain('http://localhost')
})
