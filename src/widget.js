import tokens from '../.design-system/uds-tokens.css?inline'
import mapStyles from './map.css?inline'
import styles from './widget.css?inline'
import arabicRegular from '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2?url'
import arabicSemibold from '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2?url'
import { mountMap } from './map.js'
import { getDataBase, loadRegions, loadPlant, allowedRecords, safeSourceUrl } from './data-client.js'
import { STORAGE_KEY, UPDATE_EVENT, readStoredPatch, applyOverrides } from './updates.js'

const number = value => new Intl.NumberFormat('ar-SA-u-nu-arab').format(value)
const sourceKinds = {
  official_distribution_statement: 'مصدر رسمي', regional_checklist: 'قائمة نباتية إقليمية',
  local_checklist: 'قائمة نباتية محلية', occurrence_records: 'سجل رصد أو عينة',
  research_paper: 'بحث علمي', academic_paper: 'بحث علمي', study: 'بحث علمي',
  book: 'كتاب', dictionary: 'معجم', encyclopedia: 'موسوعة', website: 'مصدر إلكتروني',
  official: 'مصدر رسمي', observation: 'سجل رصد', paper: 'بحث علمي', excel: 'بيانات مستوردة'
}
const sourceRank = record => record.sourceKind === 'official_distribution_statement' ? 0
  : record.sourceKind === 'occurrence_records' ? 3 : 1
const create = (tag, value = '', className = '') => {
  const element = document.createElement(tag)
  if (value) element.textContent = value
  if (className) element.className = className
  return element
}
const unique = values => [...new Set(values.filter(Boolean))]

// Font faces are shared; component selectors and tokens stay inside each shadow root.
let fontsInstalled = false
function installFonts() {
  if (fontsInstalled || !('FontFace' in window)) return
  fontsInstalled = true
  for (const [weight, url] of [['400', arabicRegular], ['600', arabicSemibold]]) {
    const face = new FontFace('IBM Plex Sans Arabic', `url("${url}")`, { weight, display: 'swap' })
    document.fonts.add(face)
    face.load().catch(() => { /* The accessible system-font fallback remains available. */ })
  }
}

function sourceTitle(value) {
  return value.startsWith('NCVC — ') ? value.replace('NCVC — ', 'المركز الوطني لتنمية الغطاء النباتي — ') : value
}

function locatorText(value) {
  if (/Regional flora checklist/i.test(value)) return 'قائمة النباتات الإقليمية في الصفحة'
  if (/Local flora checklist/i.test(value)) return 'قائمة نباتات الموقع في الصفحة'
  return ({ HUMAN_OBSERVATION: 'سجل رصد', PRESERVED_SPECIMEN: 'عينة محفوظة',
    OBSERVATION: 'سجل رصد', MACHINE_OBSERVATION: 'رصد آلي' })[value] || value
}

function appendLink(parent, label, url) {
  const href = safeSourceUrl(url)
  if (!href) return
  const link = create('a', label)
  link.href = href
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.setAttribute('aria-label', label + '، يفتح في نافذة جديدة')
  link.append(create('span', ' ↗', 'external-icon'))
  link.lastElementChild.setAttribute('aria-hidden', 'true')
  parent.append(link)
}

export class SaudiFloraMap extends HTMLElement {
  static observedAttributes = ['uuid', 'sense-id', 'data-base-url', 'local-preview']

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.sequence = 0
    this.queued = false
    this.region = ''
    this.pinned = false
    this.records = []
    this.shadowRoot.innerHTML = `
      <style>${tokens.replace(':root', ':host')}\n${styles}\n${mapStyles}</style>
      <section class="flora-widget" lang="ar" dir="rtl" aria-labelledby="flora-heading">
        <header class="map-heading">
          <div><p class="eyebrow">الانتشار الجغرافي · المملكة العربية السعودية</p>
            <h2 id="flora-heading">خريطة النبات</h2><p class="scientific" lang="la" dir="ltr"></p></div>
          <span class="region-count" hidden></span>
        </header>
        <p class="map-status" role="status" aria-live="polite"></p>
        <p class="local-notice" hidden>تُعرض تعديلات محفوظة في هذا المتصفح.</p>
        <div class="map-stage">
          <div class="map-canvas" part="map"></div>
          <div class="empty-state" hidden><p></p><button type="button" class="retry" hidden>إعادة المحاولة</button></div>
          <p class="map-hint"><span aria-hidden="true">↖</span> مرّر المؤشر على منطقة ملوّنة، أو اضغط عليها لقراءة مصادرها.</p>
          <section id="source-card" class="source-card" part="source-card" role="region" aria-labelledby="source-heading" hidden>
            <div class="source-card-head"><div><p class="eyebrow">المكان ومصادره</p><h3 id="source-heading"></h3></div>
              <button type="button" class="card-close" aria-label="إغلاق بطاقة المصادر">×</button></div>
            <p class="source-count"></p>
            <div class="place-control"><label for="source-place">المكان المذكور في المصدر</label><select id="source-place"></select></div>
            <ul class="source-list" data-uds-component="list"></ul>
            <p class="source-note">العبارات المعروضة ملخصات للأدلة. افتح المرجع للاطلاع على أصله. تفتح الروابط في نافذة جديدة.</p>
          </section>
        </div>
        <div class="map-bottom">
          <div class="legend"><span><i class="swatch documented" aria-hidden="true"></i>ورد ذكره في المصادر</span>
            <span><i class="swatch" aria-hidden="true"></i>لا بيانات في هذا الإصدار</span></div>
          <div class="region-shortcuts" role="group" aria-label="فتح مصادر المناطق"></div>
          <p class="scope-note">التظليل يعني ورود النبات في مواقع ضمن المنطقة، ولا يعني انتشاره في كامل مساحتها.</p>
          <div class="map-meta"><span class="data-version"></span><details class="boundaries"><summary>مصدر رسم الحدود</summary>
            <p>حدود إدارية مبسطة من geoBoundaries، إصدار ٢٠١٧. هذا مرجع رسم الخريطة، وتظهر مراجع النبات عند اختيار منطقة.</p>
            <a class="boundary-link" target="_blank" rel="noopener noreferrer">توثيق الحدود والترخيص (نص، نافذة جديدة)</a></details></div>
        </div>
      </section>`
    this.onOutside = event => {
      if (this.region && !event.composedPath().includes(this)) this.closeCard()
    }
    this.onStorage = event => {
      if (this.hasAttribute('local-preview') && (!event.key || event.key === STORAGE_KEY)) this.refresh()
    }
    this.onUpdate = event => {
      if (this.hasAttribute('local-preview') && (!event.detail?.uuids?.length || event.detail.uuids.includes(this.uuid))) this.refresh()
    }
    this.onViewport = () => { if (this.region) this.positionCard() }
    this.shadowRoot.querySelector('.card-close').addEventListener('click', () => this.closeCard(true))
    this.shadowRoot.querySelector('.retry').addEventListener('click', () => this.refresh())
    this.shadowRoot.querySelector('#source-place').addEventListener('change', () => this.renderSources())
    this.shadowRoot.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.region) {
        event.preventDefault()
        event.stopPropagation()
        this.closeCard(true)
      }
    })
    this.$('.source-card').addEventListener('pointerenter', () => clearTimeout(this.closeTimer))
    this.$('.source-card').addEventListener('pointerleave', () => this.scheduleClose())
    this.$('.source-card').addEventListener('focusin', () => clearTimeout(this.closeTimer))
    this.$('.source-card').addEventListener('focusout', event => this.scheduleClose(event))
    this.$('.map-stage').addEventListener('click', event => {
      if (event.target.closest('path[data-region], .source-card')) return
      this.closeCard()
    })
  }

  $(selector) { return this.shadowRoot.querySelector(selector) }
  get uuid() { return this.getAttribute('uuid') || '' }
  set uuid(value) { value ? this.setAttribute('uuid', value) : this.removeAttribute('uuid') }
  setPlant(uuid, senseId = null) {
    this.uuid = uuid
    if (senseId) this.setAttribute('sense-id', senseId)
    else this.removeAttribute('sense-id')
  }

  connectedCallback() {
    installFonts()
    window.addEventListener('storage', this.onStorage)
    window.addEventListener(UPDATE_EVENT, this.onUpdate)
    document.addEventListener('pointerdown', this.onOutside)
    window.addEventListener('resize', this.onViewport)
    window.addEventListener('scroll', this.onViewport, true)
    this.scheduleRefresh()
  }

  disconnectedCallback() {
    ++this.sequence
    clearTimeout(this.closeTimer)
    this.map?.destroy()
    this.map = null
    this.mapBase = null
    window.removeEventListener('storage', this.onStorage)
    window.removeEventListener(UPDATE_EVENT, this.onUpdate)
    document.removeEventListener('pointerdown', this.onOutside)
    window.removeEventListener('resize', this.onViewport)
    window.removeEventListener('scroll', this.onViewport, true)
  }

  attributeChangedCallback() { if (this.isConnected) this.scheduleRefresh() }
  scheduleRefresh() {
    if (this.queued) return
    this.queued = true
    queueMicrotask(() => { this.queued = false; if (this.isConnected) this.refresh() })
  }

  async refresh() {
    const request = ++this.sequence
    const uuid = this.uuid
    this.closeCard()
    this.records = []
    this.plant = null
    this.map?.update({ documented: new Set(), selected: '' })
    this.$('.region-shortcuts').replaceChildren()
    this.$('.scientific').textContent = ''
    this.$('#flora-heading').textContent = 'خريطة النبات'
    this.$('.region-count').hidden = true
    this.$('.local-notice').hidden = true
    this.$('.local-notice').textContent = 'تُعرض تعديلات محفوظة في هذا المتصفح.'
    this.$('.data-version').textContent = ''
    this.$('.map-hint').hidden = true
    this.$('.empty-state').hidden = true
    this.$('.map-status').textContent = uuid ? 'جارٍ تحميل مواضع النبات ومصادره…' : ''
    if (uuid) {
      this.$('.empty-state p').textContent = 'جارٍ تحميل مواضع النبات ومصادره…'
      this.$('.empty-state').hidden = false
      this.$('.retry').hidden = true
    }
    this.$('.flora-widget').setAttribute('aria-busy', 'true')
    try {
      const base = getDataBase(this.getAttribute('data-base-url') || undefined)
      const [geometry, identity] = await Promise.allSettled([
        loadRegions(base), uuid ? Promise.resolve().then(() => loadPlant(uuid, base)) : Promise.resolve(null)
      ])
      if (request !== this.sequence || !this.isConnected) return
      if (geometry.status === 'rejected') throw Object.assign(new Error('Map boundaries unavailable', { cause: geometry.reason }), { code: 'geometry' })
      const regions = geometry.value
      if (!this.map || this.mapBase !== base) {
        this.map?.destroy()
        this.regions = regions
        this.map = mountMap(this.$('.map-canvas'), regions, {
          onRegionEnter: (id, event) => { if (!this.pinned) this.openCard(id, event) },
          onRegionLeave: (_id, event) => this.scheduleClose(event),
          onRegionFocus: (id, event) => { if (!this.pinned) this.openCard(id, event) },
          onRegionSelect: (id, event) => this.openCard(id, event, true)
        })
        this.mapBase = base
      }
      this.$('.boundary-link').href = new URL('BOUNDARIES.txt', base).href
      this.$('.empty-state').hidden = true
      if (identity.status === 'rejected') throw identity.reason
      const original = identity.value
      if (!original) {
        this.showEmpty('اختر نباتًا لعرض مواضعه في المملكة ومصادرها.')
        return
      }
      if (this.hasAttribute('sense-id') && this.getAttribute('sense-id') !== original.senseId) {
        this.showEmpty('معرّف المعنى لا يطابق هذا النبات. تحقق من UUID ومعرّف المعنى المرسلين.')
        this.emitState('sense_mismatch')
        return
      }
      let plant = original
      if (this.hasAttribute('local-preview')) {
        try {
          const patch = readStoredPatch(window.localStorage, original.version)
          if (patch) {
            plant = applyOverrides(original, patch)
            this.$('.local-notice').hidden = !patch.changes.some(change => change.uuid === uuid)
          }
        } catch (error) {
          this.$('.local-notice').textContent = 'تعذر تطبيق التعديلات المحلية: ' + error.message + ' تُعرض بيانات الإصدار الأصلي.'
          this.$('.local-notice').hidden = false
        }
      }
      this.plant = plant
      this.records = allowedRecords(plant)
      const documented = new Set(this.records.map(record => record.regionId).filter(Boolean))
      this.map.update({ documented, selected: '' })
      this.$('#flora-heading').textContent = plant.name
      this.$('.scientific').textContent = plant.scientificName
      this.$('.data-version').textContent = 'إصدار البيانات ' + plant.version
      this.$('.map-status').textContent = ''
      this.$('.region-count').hidden = !documented.size
      this.$('.region-count').textContent = 'المناطق: ' + number(documented.size)
      for (const region of this.regions.filter(region => documented.has(region.id))) {
        const button = create('button', region.name, 'region-chip')
        button.type = 'button'
        button.dataset.regionButton = region.id
        button.setAttribute('aria-label', 'عرض مصادر ' + region.name)
        button.setAttribute('aria-controls', 'source-card')
        button.setAttribute('aria-expanded', 'false')
        button.addEventListener('click', event => this.openCard(region.id, event, true))
        this.$('.region-shortcuts').append(button)
      }
      if (this.records.some(record => !record.regionId)) {
        const button = create('button', 'مواضع غير محددة إداريًا', 'region-chip unlocated-chip')
        button.type = 'button'
        button.dataset.regionButton = 'unlocated'
        button.setAttribute('aria-controls', 'source-card')
        button.setAttribute('aria-expanded', 'false')
        button.addEventListener('click', event => this.openCard('unlocated', event, true))
        this.$('.region-shortcuts').append(button)
      }
      if (!documented.size) {
        const held = ['identity_review_required', 'taxonomic_review_required', 'cultivar_or_form_review_required', 'geographic_evidence_review_required'].includes(plant.status)
        this.showEmpty(held ? 'تحتاج هوية هذا المدخل أو أدلته إلى مراجعة قبل عرض انتشاره.'
          : this.records.length ? 'وردت مواضع في المصادر، لكنها لا تحدد منطقة إدارية يمكن تلوينها بدقة.'
          : 'لا تتوافر مواضع قابلة للعرض لهذا النبات في الإصدار الحالي. هذا لا يعني عدم وجوده في المملكة.')
      } else this.$('.map-hint').hidden = false
      this.emitState(documented.size ? 'ready' : 'empty')
    } catch (error) {
      if (request !== this.sequence || !this.isConnected) return
      const unknown = ['not_found', 'invalid_uuid'].includes(error.code)
      this.showEmpty(unknown ? 'لم نعثر على نبات بهذا المعرّف. تحقق من UUID المرسل من بطاقة النبات.'
        : 'تعذر تحميل بيانات الخريطة. أعد المحاولة أو تحقق من رابط البيانات.', !unknown)
      this.emitState(unknown ? 'unknown_uuid' : 'error')
    } finally {
      if (request === this.sequence && this.isConnected) this.$('.flora-widget').setAttribute('aria-busy', 'false')
    }
  }

  emitState(state) {
    this.dispatchEvent(new CustomEvent('flora-map:state', { bubbles: true, composed: true, detail: { uuid: this.uuid, state } }))
  }

  showEmpty(message, retry = false) {
    this.$('.map-status').textContent = message
    this.$('.empty-state p').textContent = message
    this.$('.empty-state').hidden = false
    this.$('.retry').hidden = !retry
    this.$('.map-hint').hidden = true
  }

  openCard(id, event, pin = false) {
    const records = this.records.filter(record => id === 'unlocated' ? !record.regionId : record.regionId === id)
    if (!records.length) return
    clearTimeout(this.closeTimer)
    this.pinned = pin || (this.region === id && this.pinned)
    this.trigger = event?.currentTarget || event?.target || this.trigger
    if (this.region !== id) {
      this.region = id
      this.$('#source-heading').textContent = id === 'unlocated' ? 'مواضع تحتاج تحديدًا إداريًا' : this.regions.find(region => region.id === id).name
      const places = unique(records.map(record => record.place))
      const select = this.$('#source-place')
      select.replaceChildren(new Option('جميع المواضع المذكورة', ''), ...places.map(place => new Option(place, place)))
      this.$('.place-control').hidden = places.length < 2
      this.renderSources()
    }
    this.$('.source-card').hidden = false
    this.$('.map-hint').hidden = true
    this.map.update({ documented: new Set(this.records.map(record => record.regionId).filter(Boolean)), selected: id })
    for (const button of this.shadowRoot.querySelectorAll('[data-region-button]')) {
      button.setAttribute('aria-expanded', String(button.dataset.regionButton === id))
    }
    this.positionCard(event)
    if (pin && getComputedStyle(this.$('.source-card')).position !== 'absolute') {
      this.$('.source-card-head').scrollIntoView({ block: 'start', behavior: 'auto' })
    }
    if (pin && (event?.type === 'keydown' || !event?.detail)) this.$('.card-close').focus({ preventScroll: true })
  }

  positionCard(event) {
    const stage = this.$('.map-stage').getBoundingClientRect()
    const card = this.$('.source-card')
    const gutter = parseFloat(getComputedStyle(card).getPropertyValue('--uds-space-xl')) || 16
    if (event) {
      const target = event.currentTarget?.getBoundingClientRect?.() || event.target?.getBoundingClientRect?.()
      const x = event.clientX || (target ? target.left + target.width / 2 : stage.left + stage.width * .7)
      card.dataset.side = x - stage.left > stage.width / 2 ? 'left' : 'right'
    }
    // Keep the whole source panel in the visible intersection of map and viewport.
    if (getComputedStyle(card).position === 'absolute') {
      const top = Math.max(gutter, -stage.top + gutter)
      const bottom = Math.min(stage.height - gutter, window.innerHeight - stage.top - gutter)
      card.style.insetBlockStart = top + 'px'
      card.style.maxBlockSize = Math.max(120, bottom - top) + 'px'
    } else {
      card.style.insetBlockStart = ''
      card.style.maxBlockSize = ''
    }
  }

  scheduleClose(event) {
    if (this.pinned) return
    const card = this.$('.source-card')
    if (event?.relatedTarget && card.contains(event.relatedTarget)) return
    clearTimeout(this.closeTimer)
    this.closeTimer = setTimeout(() => {
      if (!this.pinned && !card.matches(':hover') && !card.contains(this.shadowRoot.activeElement)) this.closeCard()
    }, 420)
  }

  closeCard(restoreFocus = false) {
    clearTimeout(this.closeTimer)
    const trigger = this.trigger
    this.region = ''
    this.pinned = false
    this.$('.source-card').hidden = true
    for (const button of this.shadowRoot.querySelectorAll('[data-region-button]')) button.setAttribute('aria-expanded', 'false')
    this.map?.update({ documented: new Set(this.records.map(record => record.regionId).filter(Boolean)), selected: '' })
    this.$('.map-hint').hidden = !this.records.some(record => record.regionId)
    if (restoreFocus && trigger?.isConnected && typeof trigger.focus === 'function') {
      // Prevent focus restoration from immediately reopening the just-dismissed card.
      this.pinned = true
      trigger.focus({ preventScroll: true })
      this.pinned = false
    }
  }

  renderSources() {
    const selectedPlace = this.$('#source-place').value
    const records = this.records.filter(record => (this.region === 'unlocated' ? !record.regionId : record.regionId === this.region)
      && (!selectedPlace || record.place === selectedPlace))
    const groups = new Map()
    for (const record of records) {
      const key = record.sourceId || record.sourceTitle + '|' + record.sourceUrl
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(record)
    }
    this.$('.source-count').textContent = number(groups.size) + ' مصادر · ' + number(unique(records.map(record => record.place)).length) + ' مواضع مذكورة'
    const items = [...groups.values()].sort((a, b) => sourceRank(a[0]) - sourceRank(b[0]))
    this.$('.source-list').replaceChildren(...items.map((group, index) => {
      const record = group[0]
      const li = create('li')
      const details = create('details', '', 'source-entry')
      details.open = index === 0
      const summary = create('summary')
      summary.append(create('span', sourceKinds[record.sourceKind] || 'مرجع نباتي', 'source-kind'), create('span', sourceTitle(record.sourceTitle), 'source-title'))
      details.append(summary)
      const body = create('div', '', 'source-body')
      const bibliography = [record.sourceAuthor, record.sourceKind === 'occurrence_records' ? '' : record.year, record.sourceEdition].filter(Boolean)
      if (bibliography.length) body.append(create('p', bibliography.join(' · '), 'bibliography'))
      const evidenceList = create('ul', '', 'evidence-list')
      for (const item of group) {
        const itemNode = create('li')
        const place = create('p', '', 'source-place')
        place.append(create('span', 'الموضع: '), create('bdi', item.place))
        itemNode.append(place, create('p', item.evidence, 'evidence-summary'))
        if (item.sourceKind === 'occurrence_records' && item.year) itemNode.append(create('p', 'سنة أو سنوات الرصد: ' + item.year, 'source-locator'))
        if (item.sourceScientificName) {
          const identity = create('p', 'الاسم في المصدر: ', 'source-locator')
          const name = create('bdi', item.sourceScientificName)
          name.dir = 'ltr'
          identity.append(name)
          itemNode.append(identity)
        }
        if (item.locator) itemNode.append(create('p', locatorText(item.locator), 'source-locator'))
        const links = unique(item.recordUrls?.length ? item.recordUrls : [item.sourceUrl])
        const linkList = create('div', '', 'reference-links')
        links.forEach((url, i) => appendLink(linkList, item.recordUrls?.length ? 'سجل الرصد ' + number(i + 1) : 'الاطلاع على المصدر', url))
        itemNode.append(linkList)
        if (item.provenance && typeof item.provenance === 'object') {
          itemNode.append(create('p', 'إدخال من Excel: ' + item.provenance.file + ' · ' + item.provenance.sheet + ' · الصف ' + number(item.provenance.row), 'source-locator'))
        }
        evidenceList.append(itemNode)
      }
      body.append(evidenceList)
      const accessed = unique(group.map(item => item.accessedOn))
      if (accessed.length === 1) body.append(create('p', 'تاريخ الاطلاع: ' + accessed[0], 'accessed'))
      details.append(body)
      li.append(details)
      return li
    }))
  }
}

if (!customElements.get('saudi-flora-map')) customElements.define('saudi-flora-map', SaudiFloraMap)
