import { test, expect } from '@playwright/test'

const waitForRailTransition = async (selector: string, expected: 'open' | 'closed', page) => {
  await page.waitForTimeout(150)
  const opacity = await page.locator(selector).evaluate((el) => window.getComputedStyle(el).opacity)
  if (expected === 'open') {
    expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0.9)
  } else {
    expect(parseFloat(opacity)).toBeLessThanOrEqual(0.1)
  }
}

test.describe('Header rail', () => {
  test('expands on keyboard toggle and supports search navigation', async ({ page }) => {
    await page.goto('/')

    const toggle = page.getByRole('button', { name: /show navigation rail/i })
    await toggle.focus()
    await expect(toggle).toBeFocused()

    await toggle.press('Enter')
    await waitForRailTransition('header', 'open', page)

    const searchInput = page.getByRole('combobox', { name: /search apps/i })
    await searchInput.fill('dashboard')
    await searchInput.press('ArrowDown')
    await searchInput.press('Enter')

    await waitForRailTransition('header', 'open', page)

    await toggle.press('Enter')
    await waitForRailTransition('header', 'closed', page)
  })
})
