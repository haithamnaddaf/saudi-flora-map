import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
const workbook = fileURLToPath(new URL('../../public/templates/distribution.xlsx',import.meta.url))

test('map, region, locality, sources and controls agree',async ({page}) => {
  await page.goto('/')
  await expect(page.locator('.province')).toHaveCount(13)
  await expect(page.locator('.province.documented')).toHaveCount(3)
  await expect(page.locator('#photo')).toHaveJSProperty('complete',true)
  await page.locator('#place').selectOption('الشفا')
  await expect(page.locator('#region')).toHaveValue('SA-02')
  const asir = page.locator('[data-region="SA-14"]')
  await asir.focus(); await page.keyboard.press('Enter')
  await expect(page.locator('#region')).toHaveValue('SA-14')
  await expect(page.locator('#records li')).toHaveCount(2)
  await page.locator('#place').selectOption('تنومة')
  await expect(page.locator('#records li')).toHaveCount(1)
  await expect(page.locator('#records a')).toHaveAttribute('href','https://doi.org/10.1038/s41598-025-13677-x')
  await page.locator('#region').selectOption('SA-01')
  await expect(page.locator('#records li')).toHaveCount(0)
  await expect(page.locator('#place')).toBeDisabled()
  await expect(page.locator('#evidence-summary')).toContainText('لا يتضمن')
  await page.locator('#reset').click()
  await expect(page.locator('#records li')).toHaveCount(4)
})

test('Arabic and scientific-name search interoperate with keyboard and modal focus',async ({page}) => {
  await page.goto('/'); await page.locator('#choose').click()
  await expect(page.locator('#query')).toBeFocused()
  await page.locator('#query').fill('zzzz'); await expect(page.locator('#matches li')).toHaveCount(0)
  await page.keyboard.press('Escape'); await expect(page.locator('#query')).toHaveValue('')
  await page.locator('#query').fill('القَرْم'); await expect(page.locator('#matches li')).toHaveCount(1)
  await page.locator('#query').fill('AVICENNIA'); await page.keyboard.press('Enter')
  await expect(page.locator('#matches button')).toBeFocused(); await page.keyboard.press('Enter')
  await expect(page.locator('#choose')).toBeFocused()
  await expect(page.locator('#latin')).toHaveText('Avicennia marina')
  await expect(page.locator('.province.documented')).toHaveCount(2)
  await expect(page.locator('#records li')).toHaveCount(2)
})

test('isolated embed resolves a pair and provides an explicit unmatched state',async ({page}) => {
  await page.goto('/?embed=1&entryId=demo-mangrove&senseId=botanical')
  await expect(page.locator('#latin')).toHaveText('Avicennia marina')
  await expect(page.locator('.site-header')).toBeHidden()
  await expect(page.locator('#choose')).toBeHidden()
  await page.goto('/?entryId=demo-mangrove&senseId=bad')
  await expect(page.locator('#unbound')).toBeVisible()
  await expect(page.locator('#explorer')).toBeHidden()
  await page.locator('#unbound a').click()
  await expect(page.locator('#plant-name')).toHaveText('العرعر')
})

test('Excel validation and export operate locally and preserve published records',async ({page}) => {
  await page.goto('/'); await page.locator('#import-open').click()
  await page.locator('#workbook').setInputFiles({name:'bad.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from('broken')})
  await expect(page.locator('#workbook')).toHaveAttribute('aria-invalid','true')
  await expect(page.locator('#export')).toBeDisabled()
  await page.locator('#workbook').setInputFiles(workbook)
  await expect(page.locator('#export')).toBeEnabled()
  await expect(page.locator('#import-report')).toContainText('بانتظار المراجعة')
  const getting = page.waitForEvent('download')
  await page.locator('#export').click()
  const download = await getting
  expect(download.suggestedFilename()).toBe('distribution.v1.0.1-draft.1.json')
  const draft = JSON.parse(await readFile(await download.path()))
  expect(draft.records.at(-1).status).toBe('pending')
  await page.keyboard.press('Escape')
  await expect(page.locator('#import-open')).toBeFocused()
  await expect(page.locator('#records li')).toHaveCount(4)
})

test('dataset loading failures expose a working retry',async ({page}) => {
  const pattern = '**/distribution.v1.0.0.json'
  await page.route(pattern,route => route.fulfill({status:503,body:'unavailable'}))
  await page.goto('/')
  await expect(page.getByRole('button',{name:'إعادة تحميل الأطلس'})).toBeVisible()
  await page.unroute(pattern)
  await page.getByRole('button',{name:'إعادة تحميل الأطلس'}).click()
  await expect(page.locator('#plant-name')).toBeVisible()
})

for (const width of [320,390,768,1024,1440]) {
  test('RTL reflow and controls at ' + width + 'px',async ({page},info) => {
    await page.setViewportSize({width,height:width === 768 ? 480 : 900})
    await page.goto('/')
    await expect(page.locator('#plant-name')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const s of ['#choose','#region','#place','#import-open']) {
      const box = await page.locator(s).boundingBox()
      expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44)
    }
    const hits = page.locator('.province rect')
    await expect(hits.first()).toHaveAttribute('width',/.+/)
    for (const target of await hits.all()) {
      const box = await target.boundingBox()
      expect(box.width).toBeGreaterThan(43.9); expect(box.height).toBeGreaterThan(43.9)
    }
    if ([390,1440].includes(width)) await page.screenshot({path:info.outputPath('atlas.png'),fullPage:true})
    await page.locator('#region').selectOption('SA-11')
    await expect(page.locator('#evidence-summary')).toContainText('الباحة')
  })
}

test('WCAG A/AA automated checks cover the explorer and both dialogs',async ({page}) => {
  await page.goto('/'); await expect(page.locator('#plant-name')).toBeVisible()
  for (const trigger of [null,'#choose','#import-open']) {
    if (trigger) await page.locator(trigger).click()
    const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()
    expect(result.violations.map(v => [v.id,v.nodes.map(n => n.target)])).toEqual([])
    if (trigger) await page.keyboard.press('Escape')
  }
})

test('all compact callouts point into the matching province and select it by touch',async ({browser}) => {
  const context = await browser.newContext({viewport:{width:320,height:720},hasTouch:true})
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4181/')
  await expect(page.locator('.province')).toHaveCount(13)
  for (const button of await page.locator('.province').all()) {
    const id = await button.getAttribute('data-region')
    await expect(button).toHaveClass(/compact/)
    const inside = await button.evaluate(element => {
      const line = element.querySelector('.leader')
      const endpoint = line.getPointAtLength(line.getTotalLength())
      return document.querySelector('[data-geometry="' + element.dataset.region + '"]').isPointInFill(endpoint)
    })
    expect(inside,id).toBe(true)
    await button.locator('rect').tap()
    await expect(page.locator('#region')).toHaveValue(id)
  }
  await expect(page.locator('.province')).toHaveCount(13)
  await context.close()
})

test('the atlas runs in an iframe on another origin with only the public URL contract',async ({page}) => {
  const host = createServer((_req,res) => {
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'})
    res.end('<iframe title="Botanical atlas" src="http://127.0.0.1:4181/?embed=1&amp;entryId=demo-juniper&amp;senseId=botanical"></iframe>')
  })
  host.listen(0,'127.0.0.1')
  await once(host,'listening')
  try {
    await page.goto('http://127.0.0.1:' + host.address().port)
    const frame = page.frameLocator('iframe')
    await expect(frame.locator('#latin')).toHaveText('Juniperus procera')
    await frame.locator('#region').selectOption('SA-11')
    await expect(frame.locator('#records li')).toHaveCount(1)
  } finally {
    host.closeAllConnections()
    host.close()
  }
})
