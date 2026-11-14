import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { climateResponse, recentClimateResponse, soilResponse } from '../fixtures'
const api = async (page: import('@playwright/test').Page) => {
  // External services are mocked for deterministic tests; this does not validate live access.
  await page.route('https://**/*', (route) => {
    const url = route.request().url()
    if (url.includes('power.larc.nasa.gov/api/temporal/daily/'))
      return route.fulfill({ json: recentClimateResponse() })
    if (url.includes('power.larc.nasa.gov')) return route.fulfill({ json: climateResponse() })
    if (url.includes('rest.isric.org')) return route.fulfill({ json: soilResponse() })
    return route.abort()
  })
}
test.beforeEach(async ({ page }) => {
  await api(page)
  await page.goto('/')
  await page.getByLabel('Choose a demo location').selectOption('0')
})
test('opens without an assumed field or calculated data', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No field selected', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Draw field boundary' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load NASA data', exact: true })).toHaveCount(0)
  await expect(page.getByText('Demo mode.', { exact: true })).toHaveCount(0)
})
test('demo provenance, all views, priorities, stress and exported evidence', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await expect(page.getByText('Demo mode.', { exact: true })).toBeVisible()
  await expect(page.getByLabel(/This outline is one farm field/)).toBeChecked()
  await expect(page.locator('.nasa-query-point')).toHaveCount(1)
  await expect(page.getByText('NASA query point', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'A clearer view of your next growing season.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Crop planner', exact: true }).click()
  await expect(page.locator('.strategy-card')).toHaveCount(3)
  await expect(page.locator('.strategy-card').first().getByText('Highest score')).toBeVisible()
  await page.getByLabel('Save water', { exact: true }).fill('100')
  await expect(page.getByLabel('Save water', { exact: true })).toHaveValue('100')
  await page.locator('.strategy-card').first().getByText('Why this score?').click()
  await expect(page.locator('.score-breakdown').first()).toBeVisible()
  for (const [name, heading] of [
    ['NASA climate', 'A year of climate, in context'],
    ['Risk calendar', 'Know when to pay closer attention'],
    ['Soil health', 'Healthy soil starts with better questions'],
    ['Sources & methods', 'Understand the evidence behind the plan'],
  ]) {
    await page.getByRole('button', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Climate simulator', exact: true }).click()
  const before = await page.locator('.scenario').innerText()
  await page.getByLabel('Temperature change').fill('3')
  await page.getByLabel('Rainfall change').fill('-30')
  await expect(page.locator('.scenario')).not.toHaveText(before)
  await page.getByRole('button', { name: 'Action plan', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export plan', exact: true }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('soilsight-field-plan.json')
  const stream = await file.createReadStream()
  const chunks = []
  for await (const chunk of stream!) chunks.push(chunk)
  const content = JSON.parse(Buffer.concat(chunks).toString())
  expect(content.climate.kind).toBe('demo')
  expect(content.rotations).toHaveLength(3)
  expect(content.field.areaHectares).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Field advisor', exact: true }).click()
  await page.getByRole('button', { name: 'How much water is needed?' }).click()
  await expect(page.getByRole('log')).toContainText('demo data')
  expect(errors).toEqual([])
})
test('loads NASA data, clears stale data on boundary deletion and supports redraw', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Load NASA data', exact: true }).click()
  await expect(page.getByText('NASA climate loaded', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Example boundary retained; live NASA climate loaded for its centre point.'),
  ).toBeVisible()
  await expect(page.getByText('synthetic climate loaded', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: 'NASA climate', exact: true }).click()
  await expect(page.getByText('14 mm', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Field overview', exact: true }).click()
  await expect(page.getByText('Demo mode.', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear field boundary' }).click()
  await expect(page.getByRole('button', { name: 'Load NASA data', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Crop planner', exact: true }).click()
  await expect(page.getByText('Your field comes first')).toBeVisible()
  await page.getByRole('button', { name: 'Field overview', exact: true }).click()
  await page.getByLabel('Search location or coordinates').fill('36.7468, -119.7726')
  await page.getByRole('button', { name: 'Find', exact: true }).click()
  await expect(page.getByText('Location found.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Draw field boundary' }).click()
  const map = await page.locator('.field-map').boundingBox()
  expect(map).toBeTruthy()
  const x = map!.x + 200,
    y = map!.y + 100
  for (const [dx, dy] of [
    [0, 0],
    [130, 0],
    [130, 100],
    [0, 100],
    [0, 0],
  ]) {
    // Leaflet Draw suppresses new vertices for 50 ms after each click.
    await page.waitForTimeout(75)
    await page.mouse.click(x + dx, y + dy)
  }
  await expect(page.getByText('Boundary saved.', { exact: false })).toBeVisible()
  await expect(page.getByLabel(/This outline is one farm field/)).not.toBeChecked()
  await page.getByLabel(/This outline is one farm field/).check()
  await expect(page.getByRole('button', { name: 'Load NASA data', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Load NASA data', exact: true }).click()
  await expect(page.getByText('NASA climate loaded', { exact: true })).toBeVisible()
})

test('searching a new place clears the previous field and prevents stale results', async ({
  page,
}) => {
  await page.getByLabel('Search location or coordinates').fill('40, -105')
  await page.getByRole('button', { name: 'Find', exact: true }).click()
  await expect(
    page.getByText('The previous field and results were cleared.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByText('Demo mode.', { exact: true })).toHaveCount(0)
  await expect(page.locator('.nasa-query-point')).toHaveCount(0)
  await expect(page.getByText('No field selected', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load NASA data', exact: true })).toHaveCount(0)
})

test('rejects a region-sized polygon before requesting data', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Draw field boundary' }).click()
  const map = await page.locator('.field-map').boundingBox()
  expect(map).toBeTruthy()
  const x = map!.x + 220,
    y = map!.y + 100
  for (const [dx, dy] of [
    [0, 0],
    [140, 0],
    [140, 100],
    [0, 100],
    [0, 0],
  ]) {
    await page.waitForTimeout(75)
    await page.mouse.click(x + dx, y + dy)
  }
  await expect(page.getByText('too large for farm-scale analysis', { exact: false })).toBeVisible()
  await expect(page.getByText('No field selected', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load NASA data', exact: true })).toHaveCount(0)
})

test('uses a supported NASA imagery tile matrix and reports overlay failures separately', async ({
  page,
}) => {
  let requestedTile = ''
  await page.route('https://gibs.earthdata.nasa.gov/**', async (route) => {
    requestedTile = route.request().url()
    await route.abort('failed')
  })
  await page.getByRole('button', { name: 'NASA satellite', exact: false }).click()
  await expect.poll(() => requestedTile).toContain('GoogleMapsCompatible_Level8')
  expect(requestedTile).not.toContain('GoogleMapsCompatible_Level9')
  await expect(
    page.getByText('NASA satellite tiles are unavailable.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByText('Map tiles are unavailable.', { exact: false })).toHaveCount(0)
})
test('failed services and invalid imports do not fabricate successful data', async ({ page }) => {
  await page.route('https://power.larc.nasa.gov/**', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await page.getByRole('button', { name: 'Load NASA data', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('could not be loaded')
  await expect(page.getByText('Demo mode.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Import data', exact: true }).click()
  await page.getByLabel('Climate dataset file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"monthly":[]}'),
  })
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('12 monthly')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Historical trends', exact: true }).click()
  await page.getByRole('button', { name: 'Load NASA history' }).click()
  await expect(
    page.getByText('No synthetic trend has been substituted.', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.chart')).toHaveCount(0)
})
test('mobile navigation, language and layout remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(
    page.getByRole('heading', { name: 'A clearer view of your next growing season.' }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'اردو', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('button', { name: 'فصلوں کی منصوبہ بندی', exact: true }).click()
  await expect(page.locator('.strategy-card')).toHaveCount(3)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test('editing a drawn boundary updates geometry and invalidates earlier climate', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Load NASA data', exact: true }).click()
  await expect(page.getByText('NASA climate loaded', { exact: true })).toBeVisible()
  const before = await page.locator('.field-stats > strong').innerText()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const handle = page.locator('.leaflet-editing-icon').first()
  await expect(handle).toBeVisible()
  const bounds = await handle.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds!.x + 55, bounds!.y + 40, { steps: 8 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Save boundary' }).click()
  await expect(page.locator('.field-stats > strong')).not.toHaveText(before)
  await expect(page.getByText('NASA climate loaded', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Crop planner', exact: true }).click()
  await expect(page.getByText('Your field comes first')).toBeVisible()
})

test('valid imports remain labelled and recompute the dashboard', async ({ page }) => {
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    tempMin: 12,
    tempMax: 28,
    tempAvg: 20,
    rainfall: 50,
  }))
  await page.getByRole('button', { name: 'Import data', exact: true }).click()
  await page.getByLabel('Climate dataset file').setInputFiles({
    name: 'field.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ monthly })),
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.data-banner')).toContainText('Imported data')
  await expect(page.locator('.metrics-grid').first()).toContainText('600')
  await page.getByRole('button', { name: 'NASA climate', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('Unavailable')
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(12)
})

test('complete NASA history is calculated and soil service failures are labelled', async ({
  page,
}) => {
  await page.route('https://rest.isric.org/**', (route) => route.fulfill({ status: 503, body: '' }))
  await page.getByRole('button', { name: 'Load NASA data', exact: true }).click()
  await expect(page.getByText('NASA climate loaded', { exact: true })).toBeVisible()
  await expect(page.getByText('SoilGrids is unavailable.', { exact: false })).toBeVisible()
  await page.route('https://power.larc.nasa.gov/api/temporal/monthly/**', (route) => {
    const url = new URL(route.request().url()),
      start = Number(url.searchParams.get('start')),
      end = Number(url.searchParams.get('end'))
    const rain: Record<string, number> = {},
      temp: Record<string, number> = {}
    for (let y = start; y <= end; y++)
      for (let m = 1; m <= 12; m++) {
        const key = `${y}${String(m).padStart(2, '0')}`
        rain[key] = 2
        temp[key] = 20 + 0.1 * (y - start)
      }
    return route.fulfill({ json: { properties: { parameter: { PRECTOTCORR: rain, T2M: temp } } } })
  })
  await page.getByRole('button', { name: 'Historical trends', exact: true }).click()
  await page.getByRole('button', { name: 'Load NASA history' }).click()
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(15)
  await expect(page.locator('.metrics-grid')).toContainText('0.1°C/year')
})
