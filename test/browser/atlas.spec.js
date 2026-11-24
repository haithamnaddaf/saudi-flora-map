import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { STORAGE_KEY, UPDATE_EVENT } from '../../src/updates.js'

// Reader-map redesign acceptance suite. Prepared for a normal Playwright browser;
// not executed in the restricted local environment (Chromium startup is blocked).
const ORIGIN = 'http://127.0.0.1:4181'
const ARAK_UUID = 'f009a176-94e3-4387-b682-0f416bf31afd'
const ATHL_UUID = '6574cd14-d824-4862-8a29-2ae880461085'
const TALH_UUID = 'c120f1d4-0878-4d01-9757-07422c6b9459'
const JUNIPER_UUID = 'c1c50e15-45ff-42ba-8973-3d4a74aa0724'
const NCVC_ARAK = 'https://ncvc.gov.sa/ar/digitalKnowledge/PlantDiversity/Pages/Salvadora-Persica-L.aspx'
const ARAK_REGIONS = ['SA-01', 'SA-02', 'SA-03', 'SA-04', 'SA-07', 'SA-09', 'SA-11', 'SA-14']
const arak = JSON.parse(await readFile(new URL(`../../public/data/plants/${ARAK_UUID}.json`, import.meta.url), 'utf8'))
const juniper = JSON.parse(await readFile(new URL(`../../public/data/plants/${JUNIPER_UUID}.json`, import.meta.url), 'utf8'))
const arakSpatial = JSON.parse(await readFile(new URL(`../../public/data/spatial/${ARAK_UUID}.json`, import.meta.url), 'utf8'))
const arakPointIds = arakSpatial.observations.filter(item => item.pointEligible).map(item => item.id).sort()
const dhahran = arakSpatial.observations.find(item => item.id === '5908868424')
const template = fileURLToPath(new URL('../../public/templates/distribution-v2.xlsx', import.meta.url))

// A deterministic, minimal XLSX fixture: delete one existing Asir relation and
// add an explicitly pending test relation. It adds no published botanical claim.
const updateWorkbook = Buffer.from('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', 'base64')

function documented(widget) { return widget.locator('svg path[role="button"]') }
function sourceCard(widget) { return widget.locator('.source-card') }
function shortcut(widget, name) { return widget.getByRole('button', { name: 'عرض مصادر ' + name, exact: true }) }
function primarySource(widget) { return sourceCard(widget).locator('.primary-source-link').first() }
function siteMarkers(widget) { return widget.locator('[data-point]') }

async function ready(widget, name) {
  await expect(widget.getByRole('heading', { name, exact: true, level: 2 })).toBeVisible()
  await expect(widget.locator('.flora-widget')).toHaveAttribute('aria-busy', 'false')
}

async function mountHost(page, maps = [{ id: 'host-map', uuid: ARAK_UUID }]) {
  const elements = maps.map(({ id, uuid, local = false }) => `<saudi-flora-map id="${id}"${uuid ? ` uuid="${uuid}"` : ''}${local ? ' local-preview' : ''}></saudi-flora-map>`).join('')
  await page.route('**/__widget-host__.html', route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مضيف اختبار الخريطة</title><style>body{margin:0;font-family:Arial,sans-serif}main{max-width:1000px;margin:auto;padding:16px}#host-button{color:rgb(90,30,110);min-height:44px;padding:8px}h2{font-size:72px;color:rgb(90,30,110)}</style><script type="module" src="/assets/flora-map.js"></script></head><body><main><h1>صفحة المضيف</h1><button id="host-button">زر المضيف</button>${elements}</main></body></html>`,
  }))
  await page.goto(ORIGIN + '/__widget-host__.html')
  await page.evaluate(() => customElements.whenDefined('saudi-flora-map'))
  return maps.map(({ id }) => page.locator('#' + id))
}

async function regionPoint(widget, id) {
  const target = widget.locator(`path[data-region="${id}"]`)
  await target.scrollIntoViewIfNeeded()
  return target.evaluate(path => {
    const box = path.getBBox()
    const transform = path.getScreenCTM()
    const candidates = []
    for (let row = 1; row < 16; row++) for (let column = 1; column < 16; column++) {
      candidates.push(new DOMPoint(box.x + box.width * column / 16, box.y + box.height * row / 16))
    }
    // A central interior hit is less sensitive to coastline simplification and
    // hidden labels than a bounding-box centre or the first edge pixel.
    candidates.sort((a, b) => Math.hypot(a.x - box.x - box.width / 2, a.y - box.y - box.height / 2)
      - Math.hypot(b.x - box.x - box.width / 2, b.y - box.y - box.height / 2))
    for (const candidate of candidates) {
      if (!path.isPointInFill(candidate)) continue
      const screen = candidate.matrixTransform(transform)
      if (screen.x < 8 || screen.x > innerWidth - 8 || screen.y < 8 || screen.y > innerHeight - 8) continue
      const hit = path.getRootNode().elementFromPoint?.(screen.x, screen.y)
      if (!hit || hit === path || path.contains(hit)) {
        return { x: screen.x, y: screen.y }
      }
    }
    throw Error('No interior hit target found for ' + path.dataset.region)
  })
}

async function hoverRegion(page, widget, id) {
  const point = await regionPoint(widget, id)
  await page.mouse.move(point.x, point.y, { steps: 8 })
  return point
}

async function slowlyReachSource(page, widget, start, regionName) {
  const card = sourceCard(widget)
  const link = primarySource(widget)
  await expect(link).toBeInViewport()
  const expectedHref = await link.getAttribute('href')
  const box = await link.boundingBox()
  const destination = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  // A real, straight pointer journey, including intermediate SVG hit targets.
  // 20×45ms exceeds both the former 420ms close delay and the 150ms hover intent.
  // No locator.hover(), focus(), forced dispatch, or jump to the card is used.
  for (let step = 1; step <= 20; step++) {
    await page.mouse.move(start.x + (destination.x - start.x) * step / 20,
      start.y + (destination.y - start.y) * step / 20, { steps: 2 })
    await page.waitForTimeout(45)
    await expect(card.getByRole('heading', { name: regionName, exact: true })).toBeVisible()
    await expect(primarySource(widget)).toHaveAttribute('href', expectedHref)
  }
  return { destination, expectedHref }
}

function deletionPatch() {
  return {
    schemaVersion: 2, baseVersion: arak.version, updatedAt: '2026-11-23T00:00:00.000Z',
    changes: [{ uuid: ARAK_UUID, scientificName: arak.scientificName, recordId: 'E-TEXT-51936118c3516a67',
      action: 'delete', provenance: { file: 'browser-review.xlsx', sheet: 'Records', row: 2 } }],
  }
}

test('a real UUID exposes eight Arak regions, published sites and the matching NCVC citation', async ({ page }) => {
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  expect(await documented(widget).evaluateAll(nodes => nodes.map(node => node.dataset.region).sort())).toEqual(ARAK_REGIONS)
  expect(await siteMarkers(widget).evaluateAll(nodes => nodes.map(node => node.dataset.point).sort())).toEqual(arakPointIds)
  await expect(widget.getByRole('button', { name: 'مواقع الرصد', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(widget.locator('.scientific')).toHaveText(arak.scientificName)
  await shortcut(widget, 'مكة المكرمة').click()
  const card = sourceCard(widget)
  await expect(card.getByRole('heading', { name: 'مكة المكرمة', exact: true })).toBeVisible()
  await expect(card.getByText('بطاقة الأراك — مركز الغطاء النباتي', { exact: true })).toBeVisible()
  const reference = card.locator(`.primary-source-link[href="${NCVC_ARAK}"]`)
  await expect(reference).toBeVisible()
  await expect(reference).toHaveAttribute('target', '_blank')
  await expect(reference).toHaveAttribute('rel', /noopener/)
  await expect(card.locator('.location-level')).toHaveText('منطقة إدارية')
  await expect(card.locator('.precision-note')).toContainText('لا يعني انتشاره في كامل مساحتها')
})

test('the published module embeds without an iframe, catalog, raw research payload, or host style leakage', async ({ page }) => {
  const requests = []
  page.on('request', request => requests.push(new URL(request.url()).pathname))
  const [widget] = await mountHost(page)
  await ready(widget, arak.name)
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(requests).toContain('/assets/flora-map.js')
  expect(requests.filter(path => path.endsWith('.json')).sort()).toEqual([
    `/data/plants/${ARAK_UUID}.json`, `/data/spatial/${ARAK_UUID}.json`, '/data/regions.v1.json',
  ].sort())
  expect(requests.some(path => /catalog|siwar_plant_distribution|distribution\.v1/.test(path))).toBe(false)
  await expect(page.locator('#host-button')).toHaveCSS('color', 'rgb(90, 30, 110)')
  await expect(widget.getByRole('heading', { name: arak.name, exact: true })).not.toHaveCSS('color', 'rgb(90, 30, 110)')
})

test('no UUID hides the map and never selects a sample automatically', async ({ page }) => {
  const plantRequests = []
  page.on('request', request => { if (request.url().includes('/data/plants/')) plantRequests.push(request.url()) })
  await page.goto('/')
  const widget = page.locator('#plant-map')
  await expect(widget.locator('.empty-state')).toContainText('اختر نباتًا')
  await expect(documented(widget)).toHaveCount(0)
  await expect(siteMarkers(widget)).toHaveCount(0)
  await expect(widget.locator('.scientific')).toBeEmpty()
  expect(plantRequests).toEqual([])
})

test('an unknown UUID does not fall back to a different plant', async ({ page }) => {
  const unknown = '00000000-0000-4000-8000-000000000000'
  await page.route(`**/plants/${unknown}.json`, route => route.fulfill({ status: 404, body: 'not found' }))
  await page.goto('/?uuid=' + unknown)
  const widget = page.locator('#plant-map')
  await expect(widget.locator('.empty-state')).toContainText('غير متوفر')
  await expect(documented(widget)).toHaveCount(0)
  await expect(siteMarkers(widget)).toHaveCount(0)
  await expect(widget.locator('.scientific')).toBeEmpty()
  await expect(widget.locator('.retry')).toBeHidden()
})

for (const query of [
  'uuid=not-a-uuid',
  `uuid=${ARAK_UUID}&uuid=${ARAK_UUID}`,
  `uuid=${ARAK_UUID}&entryId=${JUNIPER_UUID}`,
  `uuid=${ARAK_UUID}&senseId=one&senseId=two`,
]) {
  test('invalid or duplicated identity context is rejected: ' + query, async ({ page }) => {
    await page.goto('/?' + query)
    const widget = page.locator('#plant-map')
    await expect(widget.locator('.empty-state')).toContainText('غير متوفر')
    await expect(documented(widget)).toHaveCount(0)
    await expect(widget.locator('.scientific')).toBeEmpty()
  })
}

test('a mismatched sense identifier cannot borrow a valid UUID distribution', async ({ page }) => {
  await page.goto(`/?uuid=${ARAK_UUID}&senseId=wrong-sense`)
  const widget = page.locator('#plant-map')
  await expect(widget.locator('.empty-state')).toContainText('غير متوفر')
  await expect(documented(widget)).toHaveCount(0)
})

test('the held Athl identity hides its map and uses simple availability copy', async ({ page }) => {
  await page.goto('/?uuid=' + ATHL_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, 'الأثل')
  await expect(documented(widget)).toHaveCount(0)
  await expect(siteMarkers(widget)).toHaveCount(0)
  await expect(widget.locator('.empty-state')).toContainText('غير متوفر')
  await expect(widget.locator('.region-shortcuts button')).toHaveCount(0)
})

test('text-only Najd evidence does not display an empty map or guessed regions', async ({ page }) => {
  await page.goto('/?uuid=' + TALH_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, 'طلح')
  await expect(documented(widget)).toHaveCount(0)
  await expect(widget.locator('.empty-state')).toContainText('غير متوفر')
  await expect(widget.locator('.map-stage')).toBeHidden()
  await expect(widget.locator('.map-bottom')).toBeHidden()
  await expect(widget).toHaveAttribute('data-map-available', 'false')
  await expect(siteMarkers(widget)).toHaveCount(0)
  await expect(documented(widget)).toHaveCount(0)
})

test('a delayed previous UUID cannot overwrite the newly selected plant', async ({ page }) => {
  let release, intercepted
  const gate = new Promise(resolve => { release = resolve })
  const requestStarted = new Promise(resolve => { intercepted = resolve })
  await page.route(`**/plants/${ARAK_UUID}.json`, async route => {
    intercepted()
    await gate
    await route.fulfill({ json: arak })
  })
  await page.goto('/?uuid=' + ARAK_UUID, { waitUntil: 'domcontentloaded' })
  await requestStarted
  const widget = page.locator('#plant-map')
  const response = page.waitForResponse(response => response.url().endsWith(`/plants/${ARAK_UUID}.json`))
  try {
    await widget.evaluate((element, uuid) => element.setPlant(uuid), JUNIPER_UUID)
    await ready(widget, juniper.name)
  } finally {
    release()
  }
  await response
  await page.evaluate(() => new Promise(requestAnimationFrame))
  await ready(widget, juniper.name)
  await expect(widget.locator('.scientific')).toHaveText(juniper.scientificName)
  expect(await documented(widget).evaluateAll(nodes => nodes.map(node => node.dataset.region).sort())).toEqual(
    [...new Set(juniper.records.filter(record => record.status === 'verified').map(record => record.regionId).filter(Boolean))].sort())
})

test('a delayed spatial response cannot add the previous plant sites to the current UUID', async ({ page }) => {
  let release, started
  const gate = new Promise(resolve => { release = resolve })
  const requested = new Promise(resolve => { started = resolve })
  await page.route(`**/spatial/${ARAK_UUID}.json`, async route => {
    started(); await gate; await route.fulfill({ json: arakSpatial })
  })
  await page.goto('/?uuid=' + ARAK_UUID, { waitUntil: 'domcontentloaded' })
  await requested
  const widget = page.locator('#plant-map')
  const response = page.waitForResponse(response => response.url().endsWith(`/spatial/${ARAK_UUID}.json`))
  try {
    await widget.evaluate((element, uuid) => element.setPlant(uuid), TALH_UUID)
    await ready(widget, 'طلح')
  } finally { release() }
  await response
  await page.evaluate(() => new Promise(requestAnimationFrame))
  await ready(widget, 'طلح')
  await expect(siteMarkers(widget)).toHaveCount(0)
  await expect(documented(widget)).toHaveCount(0)
})

test('a slow real pointer journey from Eastern Province reaches and opens its unchanged source', async ({ page }) => {
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  await widget.getByRole('button', { name: 'المناطق المذكورة', exact: true }).click()
  await page.evaluate(() => document.fonts.ready)
  const start = await hoverRegion(page, widget, 'SA-04')
  const card = sourceCard(widget)
  await expect(card.getByRole('heading', { name: 'الشرقية', exact: true })).toBeVisible()
  await expect(card.getByRole('button', { name: 'تثبيت البطاقة', exact: true })).toBeEnabled()
  const { destination, expectedHref } = await slowlyReachSource(page, widget, start, 'الشرقية')
  await expect(card.getByRole('button', { name: 'تثبيت البطاقة', exact: true })).toBeEnabled()
  // Keep the test independent of the external site's uptime; the actual link is clicked.
  await page.context().route(expectedHref, route => route.fulfill({ contentType: 'text/html', body: '<title>Source opened</title>' }))
  const opened = page.waitForEvent('popup')
  await page.mouse.click(destination.x, destination.y)
  const popup = await opened
  await popup.waitForLoadState('domcontentloaded')
  expect(popup.url()).toBe(expectedHref)
  await popup.close()
  await expect(card.getByRole('heading', { name: 'الشرقية', exact: true })).toBeVisible()
})

test('Escape outside the component dismisses hover and small pointer movement cannot reopen it', async ({ page }) => {
  const [widget] = await mountHost(page)
  await ready(widget, arak.name)
  await widget.getByRole('button', { name: 'المناطق المذكورة', exact: true }).click()
  await page.locator('#host-button').focus()
  const start = await hoverRegion(page, widget, 'SA-04')
  const card = sourceCard(widget)
  await expect(card.getByRole('heading', { name: 'الشرقية', exact: true })).toBeVisible()
  await expect(page.locator('#host-button')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(card).toBeHidden()
  await page.mouse.move(start.x + 1, start.y + 1, { steps: 3 })
  await page.waitForTimeout(250)
  await expect(card).toBeHidden()
  await page.mouse.move(4, 4, { steps: 8 })
  await page.mouse.move(start.x, start.y, { steps: 8 })
  await expect(card.getByRole('heading', { name: 'الشرقية', exact: true })).toBeVisible()
  await ready(widget, arak.name)
})

test('a focused source link survives hovering another region, and explicit pinning survives mouse travel', async ({ page }) => {
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  await widget.getByRole('button', { name: 'المناطق المذكورة', exact: true }).click()
  await hoverRegion(page, widget, 'SA-02')
  const card = sourceCard(widget), link = primarySource(widget)
  await expect(card.getByRole('heading', { name: 'مكة المكرمة', exact: true })).toBeVisible()
  await link.focus()
  await hoverRegion(page, widget, 'SA-04')
  await page.waitForTimeout(250)
  await expect(link).toBeFocused()
  await expect(link).toHaveAttribute('href', NCVC_ARAK)
  await card.getByRole('button', { name: 'تثبيت البطاقة', exact: true }).click()
  await hoverRegion(page, widget, 'SA-01')
  await page.waitForTimeout(250)
  await expect(card.getByRole('heading', { name: 'مكة المكرمة', exact: true })).toBeVisible()
  await expect(card.getByRole('button', { name: 'البطاقة مثبتة', exact: true })).toBeDisabled()
  await page.mouse.click(4, 4)
  await expect(card).toBeHidden()
})

test('the Dhahran site opens its own occurrence source, uncertainty and license with keyboard controls', async ({ page }) => {
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  const marker = widget.locator(`[data-point="${dhahran.id}"]`)
  await marker.focus()
  await page.keyboard.press('Enter')
  const card = sourceCard(widget)
  await expect(card.getByRole('heading', { name: 'الظهران', exact: true })).toBeVisible()
  await expect(primarySource(widget)).toHaveAttribute('href', dhahran.referenceUrl)
  await expect(card.locator('.precision-note')).toContainText('٥ م')
  await expect(card.locator('.evidence-summary')).not.toContainText('Salvadora')
  await card.getByText('تفاصيل المرجع', { exact: true }).click()
  await expect(card.getByRole('link', { name: /ترخيص السجل/ })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-nc/4.0/legalcode')
  await page.keyboard.press('Escape')
  await expect(card).toBeHidden()
  await expect(marker).toBeFocused()
})

test('zooming a listed site from regions reveals that real point and reset restores Saudi overview', async ({ page }) => {
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  const drawing = widget.locator('svg.flora-regions-map')
  const overview = await drawing.getAttribute('viewBox')
  await widget.getByRole('button', { name: 'المناطق المذكورة', exact: true }).click()
  await shortcut(widget, 'الشرقية').click()
  const card = sourceCard(widget)
  await card.getByText('المواقع المذكورة في هذه المنطقة', { exact: true }).click()
  await card.getByLabel('اختر مكانًا لقراءة دليله').selectOption(dhahran.id)
  await expect(card.getByRole('heading', { name: 'الظهران', exact: true })).toBeVisible()
  await card.getByRole('button', { name: 'تكبير الموقع', exact: true }).click()
  await expect(widget.getByRole('button', { name: 'مواقع الرصد', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(widget.locator(`[data-point="${dhahran.id}"]`)).toBeVisible()
  await expect(drawing).not.toHaveAttribute('viewBox', overview)
  await expect(primarySource(widget)).toHaveAttribute('href', dhahran.referenceUrl)
  await widget.getByRole('button', { name: 'عرض المملكة كاملة', exact: true }).click()
  await expect(drawing).toHaveAttribute('viewBox', overview)
  await expect(sourceCard(widget)).toBeHidden()
  await expect(widget.getByRole('button', { name: 'عرض المملكة كاملة', exact: true })).toBeDisabled()
})

test('missing spatial detail keeps regional citations available without fabricated site markers', async ({ page }) => {
  await page.route(`**/spatial/${ARAK_UUID}.json`, route => route.fulfill({ status: 404, body: 'missing spatial detail' }))
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  await expect(siteMarkers(widget)).toHaveCount(0)
  await expect(documented(widget)).toHaveCount(8)
  await expect(widget.getByRole('button', { name: 'مواقع الرصد', exact: true })).toBeDisabled()
  await shortcut(widget, 'مكة المكرمة').click()
  await expect(primarySource(widget)).toHaveAttribute('href', NCVC_ARAK)
})

test('keyboard selection, pinning and focus restoration work on a map region', async ({ page }) => {
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  const region = widget.locator('path[data-region="SA-02"]')
  await region.focus()
  await page.keyboard.press('Enter')
  await expect(sourceCard(widget)).toBeVisible()
  await expect(widget.getByRole('button', { name: 'إغلاق بطاقة المصادر' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(sourceCard(widget)).toBeHidden()
  await expect(region).toBeFocused()
  await page.keyboard.press('Space')
  await expect(sourceCard(widget)).toBeVisible()
  await widget.getByRole('button', { name: 'إغلاق بطاقة المصادر' }).click()
  await expect(sourceCard(widget)).toBeHidden()
})

test.describe('touch interaction', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })
  test('region alternatives are finger sized and open citations by tapping', async ({ page }) => {
    await page.goto('/?uuid=' + ARAK_UUID)
    const widget = page.locator('#plant-map')
    await ready(widget, arak.name)
    const visibleNames = await widget.locator('.flora-map-label:not(.flora-map-point-label)').evaluateAll(nodes =>
      nodes.filter(node => getComputedStyle(node).visibility === 'visible').map(node => node.textContent))
    expect(visibleNames.length).toBeGreaterThanOrEqual(4)
    expect(visibleNames).toContain('الرياض')
    for (const button of await widget.locator('.region-shortcuts button').all()) {
      const box = await button.boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    await shortcut(widget, 'مكة المكرمة').tap()
    const card = sourceCard(widget)
    await expect(card.getByRole('heading', { name: 'مكة المكرمة', exact: true })).toBeInViewport()
    await expect(card).toHaveCSS('position', 'relative')
    const link = card.locator(`.primary-source-link[href="${NCVC_ARAK}"]`)
    await expect(link).toBeVisible()
    await page.context().route(NCVC_ARAK, route => route.fulfill({ contentType: 'text/html', body: '<title>Source opened</title>' }))
    const opened = page.waitForEvent('popup')
    await link.tap()
    const popup = await opened
    await popup.waitForLoadState('domcontentloaded')
    expect(popup.url()).toBe(NCVC_ARAK)
    await popup.close()
    await card.getByRole('button', { name: 'إغلاق بطاقة المصادر' }).tap()
    await expect(card).toBeHidden()
  })

  test('a phone can choose a listed site, zoom to its original position and return to the Kingdom', async ({ page }) => {
    await page.goto('/?uuid=' + ARAK_UUID)
    const widget = page.locator('#plant-map')
    await ready(widget, arak.name)
    const drawing = widget.locator('svg.flora-regions-map')
    const overview = await drawing.getAttribute('viewBox')
    await widget.getByRole('button', { name: 'المناطق المذكورة', exact: true }).tap()
    await shortcut(widget, 'الشرقية').tap()
    const card = sourceCard(widget)
    await card.getByText('المواقع المذكورة في هذه المنطقة', { exact: true }).tap()
    await card.getByLabel('اختر مكانًا لقراءة دليله').selectOption(dhahran.id)
    await card.getByRole('button', { name: 'تكبير الموقع', exact: true }).tap()
    await expect(widget.getByRole('button', { name: 'مواقع الرصد', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(card.getByRole('heading', { name: 'الظهران', exact: true })).toBeVisible()
    await expect(primarySource(widget)).toHaveAttribute('href', dhahran.referenceUrl)
    await expect(drawing).not.toHaveAttribute('viewBox', overview)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await widget.getByRole('button', { name: 'عرض المملكة كاملة', exact: true }).tap()
    await expect(drawing).toHaveAttribute('viewBox', overview)
    await expect(card).toBeHidden()
  })
})

test('two map instances keep independent UUIDs and reconnect with a single drawing', async ({ page }) => {
  const [first, second] = await mountHost(page, [{ id: 'map-one', uuid: ARAK_UUID }, { id: 'map-two', uuid: JUNIPER_UUID }])
  await ready(first, arak.name)
  await ready(second, juniper.name)
  await shortcut(first, 'مكة المكرمة').click()
  await second.evaluate((element, uuid) => element.setPlant(uuid), TALH_UUID)
  await ready(second, 'طلح')
  await expect(documented(first)).toHaveCount(8)
  await expect(documented(second)).toHaveCount(0)
  await expect(sourceCard(first)).toBeVisible()
  await first.evaluate(element => { window.detachedMapForTest = element; element.remove() })
  await expect(page.locator('#map-one')).toHaveCount(0)
  await page.evaluate(() => document.querySelector('main').append(window.detachedMapForTest))
  await ready(first, arak.name)
  await expect(first.locator('svg.flora-regions-map')).toHaveCount(1)
  await expect(documented(first)).toHaveCount(8)
  await expect(siteMarkers(first)).toHaveCount(arakPointIds.length)
  await expect(sourceCard(first)).toBeHidden()
  await ready(second, 'طلح')
})

test('local patches require opt-in, stay isolated and recover honestly after a malformed patch', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken'), STORAGE_KEY)
  const [published, local] = await mountHost(page, [{ id: 'published-map', uuid: ARAK_UUID }, { id: 'local-map', uuid: ARAK_UUID, local: true }])
  await ready(published, arak.name)
  await ready(local, arak.name)
  await expect(documented(published)).toHaveCount(8)
  await expect(local.locator('.local-notice')).toContainText('تعذر تطبيق')
  await page.evaluate(({ key, eventName, patch }) => {
    localStorage.setItem(key, JSON.stringify(patch))
    window.dispatchEvent(new CustomEvent(eventName, { detail: { uuids: [patch.changes[0].uuid] } }))
  }, { key: STORAGE_KEY, eventName: UPDATE_EVENT, patch: deletionPatch() })
  await expect(documented(local)).toHaveCount(7)
  await expect(documented(published)).toHaveCount(8)
  await expect(local.locator('.local-notice')).toContainText('تُعرض تعديلات محفوظة')
  await expect(local.locator('.local-notice')).not.toContainText('تعذر')
  await expect(published.locator('.local-notice')).toBeHidden()
  // Deleting an occurrence relation must invalidate its cached spatial detail.
  const pointPatch = deletionPatch()
  pointPatch.changes[0].recordId = dhahran.recordId
  await page.evaluate(({ key, eventName, patch }) => {
    localStorage.setItem(key, JSON.stringify(patch))
    window.dispatchEvent(new CustomEvent(eventName, { detail: { uuids: [patch.changes[0].uuid] } }))
  }, { key: STORAGE_KEY, eventName: UPDATE_EVENT, patch: pointPatch })
  const remaining = arakSpatial.observations.filter(item => item.pointEligible && item.recordId !== dhahran.recordId).length
  await expect(siteMarkers(local)).toHaveCount(remaining)
  await expect(local.locator(`[data-point="${dhahran.id}"]`)).toHaveCount(0)
  await expect(siteMarkers(published)).toHaveCount(arakPointIds.length)
})

test('a failed plant request exposes a retry that loads the same UUID', async ({ page }) => {
  const pattern = `**/plants/${ARAK_UUID}.json`
  await page.route(pattern, route => route.fulfill({ status: 503, body: 'unavailable' }))
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await expect(widget.getByRole('button', { name: 'إعادة المحاولة', exact: true })).toBeVisible()
  await page.unroute(pattern)
  await widget.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click()
  await ready(widget, arak.name)
  await expect(documented(widget)).toHaveCount(8)
})

test('missing map geometry is retryable and is not reported as an unknown plant', async ({ page }) => {
  const pattern = '**/regions.v1.json'
  await page.route(pattern, route => route.fulfill({ status: 404, body: 'missing geometry' }))
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await expect(widget.locator('.empty-state')).not.toContainText('لم نعثر على نبات')
  await expect(widget.getByRole('button', { name: 'إعادة المحاولة', exact: true })).toBeVisible()
  await page.unroute(pattern)
  await widget.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click()
  await ready(widget, arak.name)
})

test('observation years stay with their own locality rather than borrowing the first source year', async ({ page }) => {
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  await shortcut(widget, 'تبوك').click()
  const card = sourceCard(widget)
  await card.getByRole('button', { name: /عرض بقية المصادر/ }).click()
  const observations = card.locator('.source-entry').filter({ has: page.getByText('مشاهدات iNaturalist', { exact: true }) })
  await observations.getByText('تفاصيل المرجع', { exact: true }).click()
  const wajh = observations.locator('.reference-record').filter({ has: page.locator('a[href="https://www.gbif.org/occurrence/5062783847"]') })
  const tabuk = observations.locator('.reference-record').filter({ has: page.locator('a[href="https://www.gbif.org/occurrence/5844154136"]') })
  await expect(wajh).toContainText('2024')
  await expect(wajh).not.toContainText('2025')
  await expect(tabuk).toContainText('2025')
  await expect(tabuk).not.toContainText('2024')
})

for (const width of [320, 390, 768, 1440]) {
  test(`the embedded map and source card reflow at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/?embed=1&uuid=' + ARAK_UUID)
    const widget = page.locator('#plant-map')
    await ready(widget, arak.name)
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await shortcut(widget, 'مكة المكرمة').click()
    const card = sourceCard(widget)
    await expect(card.getByRole('heading', { name: 'مكة المكرمة', exact: true })).toBeInViewport()
    const box = await card.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
    await expect(primarySource(widget)).toHaveAttribute('href', NCVC_ARAK)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if ([390, 1440].includes(width)) await page.screenshot({ path: info.outputPath('map-and-sources.png'), fullPage: true })
  })
}

test('a narrow embedded component reflows its open source card inside a wide host window', async ({ page }) => {
  const [widget] = await mountHost(page)
  await ready(widget, arak.name)
  await shortcut(widget, 'مكة المكرمة').click()
  const card = sourceCard(widget)
  await expect(card).toHaveCSS('position', 'absolute')
  const windowWidth = await page.evaluate(() => innerWidth)
  await widget.evaluate(element => { element.style.width = '390px' })
  await expect(card).toHaveCSS('position', 'relative')
  await expect(card.getByRole('heading', { name: 'مكة المكرمة', exact: true })).toBeVisible()
  await expect.poll(async () => {
    const [cardBox, hostBox] = await Promise.all([card.boundingBox(), widget.boundingBox()])
    return cardBox.x >= hostBox.x && cardBox.x + cardBox.width <= hostBox.x + hostBox.width + 1
  }).toBe(true)
  expect(await page.evaluate(() => innerWidth)).toBe(windowWidth)
  await expect(primarySource(widget)).toHaveAttribute('href', NCVC_ARAK)
})

test('the source card remains reachable after the document scrolls past the top of the map', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 })
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  await widget.locator('.map-stage').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY + 160))
  await hoverRegion(page, widget, 'SA-14')
  await expect(sourceCard(widget).getByRole('heading', { name: 'عسير', exact: true })).toBeInViewport()
  await expect(sourceCard(widget).getByRole('button', { name: 'إغلاق بطاقة المصادر' })).toBeInViewport()
})

test('reduced-motion preference removes map and card animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?uuid=' + ARAK_UUID)
  const widget = page.locator('#plant-map')
  await ready(widget, arak.name)
  await shortcut(widget, 'مكة المكرمة').click()
  await expect(widget.locator('path[data-region="SA-02"]')).toHaveCSS('transition-duration', '0s')
  await expect(sourceCard(widget)).toHaveCSS('animation-name', 'none')
})

test('search shows the scientific identity before selecting its UUID', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'اختيار نبات', exact: true }).click()
  await page.getByRole('searchbox').fill(ARAK_UUID)
  const result = page.locator('#matches button')
  await expect(result).toHaveCount(1)
  await expect(result).toContainText(arak.scientificName)
  await result.click()
  await expect(page.locator('#picker')).not.toBeVisible()
  await ready(page.locator('#plant-map'), arak.name)
  expect(new URL(page.url()).searchParams.get('uuid')).toBe(ARAK_UUID)
})

test('Excel errors never apply, while reviewed local updates preserve pending gates and export provenance', async ({ page }) => {
  await page.goto('/manage.html?uuid=' + ARAK_UUID)
  const widget = page.locator('#managed-map')
  await ready(widget, arak.name)
  await expect(page.locator('#workbook')).toBeEnabled()
  await page.locator('#workbook').setInputFiles({ name: 'broken.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('broken') })
  await expect(page.locator('#workbook')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#apply')).toBeDisabled()
  await expect(documented(widget)).toHaveCount(8)
  await page.locator('#workbook').setInputFiles(template)
  await expect(page.locator('#workbook')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#apply')).toBeDisabled()
  await page.locator('#workbook').setInputFiles({ name: 'reviewed-local-update.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: updateWorkbook })
  await expect(page.locator('#diff')).toBeVisible()
  await expect(page.locator('#diff-list')).toContainText('بانتظار المراجعة')
  await expect(page.locator('#apply')).toBeEnabled()
  await expect(documented(widget)).toHaveCount(8)
  await page.locator('#apply').click()
  await expect(documented(widget)).toHaveCount(7)
  await expect(widget.locator('path[data-region="SA-05"]')).not.toHaveAttribute('role', 'button')
  const downloading = page.waitForEvent('download')
  await page.locator('#download-patch').click()
  const download = await downloading
  expect(download.suggestedFilename()).toMatch(/^flora-map-updates-\d{4}-\d{2}-\d{2}\.json$/)
  const patch = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(patch.changes).toHaveLength(2)
  expect(patch.changes.every(change => change.uuid === ARAK_UUID)).toBe(true)
  const pending = patch.changes.find(change => change.action === 'upsert')
  expect(pending.record.status).toBe('pending')
  expect(pending.provenance).toEqual(expect.objectContaining({ file: 'reviewed-local-update.xlsx', sheet: 'Records', row: 3 }))
  await page.locator('#restore').click()
  await expect(documented(widget)).toHaveCount(8)
  await expect(widget.locator('.local-notice')).toBeHidden()
})

test('automated accessibility checks cover the isolated map and an open source card', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const [widget] = await mountHost(page)
  await ready(widget, arak.name)
  for (const open of [false, true]) {
    if (open) await shortcut(widget, 'مكة المكرمة').click()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([])
  }
})
