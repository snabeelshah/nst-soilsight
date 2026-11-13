import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test('key planning views pass automated WCAG A/AA checks', async ({ page }) => {
  await page.route('https://**/*', (route) => route.abort())
  await page.goto('/')
  for (const [name, heading] of [
    ['Field overview', 'A clearer view of your next growing season.'],
    ['Crop planner', 'Current practice versus two alternatives'],
    ['Risk calendar', 'Know when to pay closer attention'],
    ['Climate simulator', 'What if the next season feels different?'],
  ]) {
    await page.getByRole('button', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(
      result.violations,
      `${name}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([])
  }
})
