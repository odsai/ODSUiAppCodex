import { test, expect } from '@playwright/test'

test.describe('Header rail', () => {
  test('expands on keyboard toggle and supports search navigation', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear())
    await page.goto('/')

    const toggle = page.getByRole('button', { name: /navigation rail/i })
    await toggle.focus()
    await expect(toggle).toBeFocused()

    const initialExpanded = await toggle.getAttribute('aria-expanded')
    if (initialExpanded === 'true') {
      await toggle.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    } else {
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    }

    await toggle.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const primaryNav = page.getByRole('navigation', { name: /primary/i })
    await expect(primaryNav).toBeVisible()

    const searchInput = page.getByRole('combobox', { name: /search apps/i })
    await searchInput.fill('dashboard')
    await searchInput.press('ArrowDown')
    await searchInput.press('Enter')

    await expect(primaryNav).toBeVisible()

    await toggle.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(primaryNav).toBeHidden()
  })
})
