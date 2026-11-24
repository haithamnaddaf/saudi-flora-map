import tokens from '../.design-system/uds-tokens.css?inline'
import mapStyles from './map.css?inline'
import styles from './widget.css?inline'
import arabicRegular from '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2?url'
import arabicSemibold from '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2?url'
import { mountMap } from './map.js'
import { getDataBase, loadRegions, loadGovernorates, loadPlant, allowedRecords, safeSourceUrl } from './data-client.js'
import { loadSpatial, spatialForPlant } from './spatial-client.js'
import { presentSource, presentEvidence, presentAreaName } from './presentation.js'
import { coverageByNamedPlace } from './named-places.js'
import { STORAGE_KEY, UPDATE_EVENT, readStoredPatch, applyOverrides } from './updates.js'

const number = value => new Intl.NumberFormat('ar-SA-u-nu-arab').format(value)
const unique = values => [...new Set(values.filter(Boolean))]
const rank = record => /book|dictionary|encyclop|كتاب|معجم|موسوع/i.test(record.sourceKind) ? 0
  : record.sourceKind === 'official_distribution_statement' ? 1 : record.sourceKind === 'occurrence_records' ? 3 : 2
const create = (tag, value = '', className = '') => {
  const element = document.createElement(tag)
  if (value) element.textContent = value
  if (className) element.className = className
  return element
}
const pointInTriangle = (p, a, b, c) => {
  const cross = (x, y, z) => (x.x - z.x) * (y.y - z.y) - (y.x - z.x) * (x.y - z.y)
  const d = [cross(p, a, b), cross(p, b, c), cross(p, c, a)]
  return !(d.some(value => value < 0) && d.some(value => value > 0))
}
let fontsInstalled = false
function installFonts() {
  if (fontsInstalled || !('FontFace' in window)) return
  fontsInstalled = true
  for (const [weight, url] of [['400', arabicRegular], ['600', arabicSemibold]]) {
    const face = new FontFace('IBM Plex Sans Arabic', `url("${url}")`, { weight, display: 'swap' })
    document.fonts.add(face)
    face.load().catch(() => {})
  }
}
function appendLink(parent, label, url, className = '') {
  const href = safeSourceUrl(url)
  if (!href) return
  const link = create('a', label, className)
  link.href = href
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.setAttribute('aria-label', label + '، يفتح في نافذة جديدة')
  parent.append(link)
}
function licenseLink(value) {
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' && url.hostname === 'creativecommons.org' && !url.username && !url.password) url.protocol = 'https:'
    return safeSourceUrl(url.href)
  } catch { return null }
}
function evidenceType(record, observation) {
  return String(observation?.basisOfRecord || record?.locator || '').replace(/[_\s]/g, '').toUpperCase()
}
function eventLabel(record, observation) {
  return evidenceType(record, observation) === 'PRESERVEDSPECIMEN' ? 'تاريخ جمع العينة' : evidenceType(record, observation) === 'MATERIALCITATION' ? 'التاريخ الوارد في السجل' : 'تاريخ المشاهدة'
}
function dateText(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value.slice(0, 10) + 'T12:00:00Z')
    if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date)
  }
  return value
}

export class SaudiFloraMap extends HTMLElement {
  static observedAttributes = ['uuid', 'sense-id', 'data-base-url', 'local-preview']
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.sequence = 0
    this.queued = false
    this.region = ''
    this.pointId = ''
    this.pinned = false
    this.records = []
    this.observations = []
    this.coverage = { governorates: [], regions: [], unresolved: [] }
    this.places = new Map()
    this._mapAvailable = false
    this.shadowRoot.innerHTML = `
      <style>${tokens.replace(':root', ':host')}\n${styles}\n${mapStyles}</style>
      <section class="flora-widget no-map" lang="ar" dir="rtl" aria-label="انتشار النبات">
        <header class="map-heading" hidden>
          <div><p class="eyebrow">مواضع النبات في المملكة العربية السعودية</p><h2 id="flora-heading">خريطة النبات</h2><p class="scientific" lang="la" dir="ltr"></p></div>
          <div class="map-summary" hidden><span class="governorate-count"></span><span class="region-count"></span></div>
        </header>
        <p class="map-status" role="status" aria-live="polite"></p>
        <p class="local-notice" hidden>تُعرض تعديلات محفوظة في هذا المتصفح.</p>
        <div class="empty-state" hidden><p></p><button type="button" class="retry" hidden>إعادة المحاولة</button></div>
        <div class="map-stage" hidden>
          <div class="map-toolbar">
            <button type="button" class="fit-places">التركيز على الأماكن المذكورة</button>
            <span class="map-caption">المملكة العربية السعودية</span>
          </div>
          <div class="map-canvas" part="map"></div>
          <div class="map-navigation" role="group" aria-label="التحكم في تكبير الخريطة">
            <button type="button" class="zoom-in" aria-label="تكبير الخريطة" title="تكبير الخريطة">+</button>
            <button type="button" class="zoom-out" aria-label="تصغير الخريطة" title="تصغير الخريطة">−</button>
            <button type="button" class="reset-map" aria-label="عرض المملكة كاملة" title="عرض المملكة كاملة">الكل</button>
          </div>
          <p class="map-hint">اختر مكانًا على الخريطة أو من الأسماء أدناه لعرض مصادره.</p>
          <section id="source-card" class="source-card" part="source-card" role="region" aria-labelledby="source-heading" hidden>
            <div class="source-card-head"><div><p class="location-level eyebrow"></p><h3 id="source-heading"></h3></div><button type="button" class="card-close" aria-label="إغلاق بطاقة المصادر">×</button></div>
            <p class="location-context"></p>
            <p class="source-count"></p>
            <ul class="source-list" data-uds-component="list"></ul>
            <button type="button" class="more-sources" hidden aria-expanded="false">عرض بقية المصادر</button>
            <div class="card-actions"><button type="button" class="pin-card">تثبيت البطاقة</button><button type="button" class="zoom-place" hidden>تكبير المكان</button></div>
          </section>
        </div>
        <div class="map-bottom" hidden>
          <div class="legend"><span><i class="swatch governorate" aria-hidden="true"></i>محافظة مذكورة</span><span><i class="swatch regional" aria-hidden="true"></i>منطقة دون تحديد المحافظة</span><span><i class="swatch neutral" aria-hidden="true"></i>لا بيانات معروضة</span></div>
          <div class="region-shortcuts" role="group" aria-label="فتح مصادر الأماكن المذكورة"></div>
          <p class="scope-note">ملاحظة: التظليل يوضح المكان المذكور في المصدر، ولا يعني انتشار النبات في كامل مساحته.</p><p class="detail-notice" hidden></p>
          <div class="map-meta"><span class="data-version"></span><details class="boundaries"><summary>المصادر وحقوق البيانات</summary><p>يعتمد العرض على أسماء الأماكن في المصادر. تُعرض المحافظة إن اتضحت، وإلا المنطقة المذكورة. الحدود الجغرافية مبسطة من geoBoundaries؛ مرجع المحافظات ٢٠٢١ والمناطق ٢٠١٧. عدم التظليل لا يعني غياب النبات.</p><a class="boundary-link" target="_blank" rel="noopener noreferrer">توثيق الحدود والترخيص (نص، نافذة جديدة)</a><a class="governorate-boundary-link" target="_blank" rel="noopener noreferrer">توثيق حدود المحافظات (نص، نافذة جديدة)</a><ul class="source-rights"></ul></details></div>
        </div>
      </section>`
    this.onOutside = event => { if (this.region && !event.composedPath().includes(this)) this.closeCard() }
    this.onEscape = event => {
      if (event.key !== 'Escape' || !this.region) return
      const restore = this.$('.source-card').contains(this.shadowRoot.activeElement)
      this.closeCard(restore)
    }
    this.onStorage = event => { if (this.hasAttribute('local-preview') && (!event.key || event.key === STORAGE_KEY)) this.refresh() }
    this.onUpdate = event => { if (this.hasAttribute('local-preview') && (!event.detail?.uuids?.length || event.detail.uuids.includes(this.uuid))) this.refresh() }
    this.onViewport = () => { if (this.region) this.positionCard() }
    this.$('.card-close').addEventListener('click', () => this.closeCard(true))
    this.$('.retry').addEventListener('click', () => this.refresh())
    this.$('.pin-card').addEventListener('click', () => this.pinCard())
    this.$('.more-sources').addEventListener('click', () => {
      this.pinCard()
      const show = this.$('.more-sources').getAttribute('aria-expanded') !== 'true'
      this.$('.more-sources').setAttribute('aria-expanded', String(show))
      this.$('.more-sources').textContent = show ? 'اكتفِ بالمصدر الأول' : 'عرض بقية المصادر'
      for (const node of this.shadowRoot.querySelectorAll('.source-list>li')) node.hidden = !show && node.dataset.secondary === 'true'
      this.positionCard()
    })
    this.$('.zoom-place').addEventListener('click', () => {
      this.pinCard()
      this.map.fitArea(this.region)
      this.positionCard()
      if (getComputedStyle(this.$('.source-card')).position !== 'absolute') this.$('.map-canvas').scrollIntoView({ block: 'center', behavior: 'auto' })
    })
    this.$('.zoom-in').addEventListener('click', () => { this.closeCard(); this.map?.zoomIn() })
    this.$('.zoom-out').addEventListener('click', () => { this.closeCard(); this.map?.zoomOut() })
    this.$('.reset-map').addEventListener('click', () => { this.closeCard(); this.map?.reset() })
    this.$('.fit-places').addEventListener('click', () => { this.closeCard(); this.map?.fitAreas(this.places.keys()) })
    this.$('.source-card').addEventListener('pointerenter', () => { this.cardHovered = true; this.cancelIntent() })
    this.$('.source-card').addEventListener('pointerleave', () => { this.cardHovered = false })
    this.$('.source-card').addEventListener('focusin', () => this.cancelIntent())
    this.$('.source-card').addEventListener('pointerdown', () => this.pinCard())
    this.$('.map-stage').addEventListener('click', event => {
      if (event.target.closest('[data-area], .source-card, button')) return
      this.closeCard()
    })
  }
  $(selector) { return this.shadowRoot.querySelector(selector) }
  get uuid() { return this.getAttribute('uuid') || '' }
  set uuid(value) { value ? this.setAttribute('uuid', value) : this.removeAttribute('uuid') }
  get mapAvailable() { return this._mapAvailable }
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
    document.addEventListener('keydown', this.onEscape)
    window.addEventListener('resize', this.onViewport)
    window.addEventListener('scroll', this.onViewport, true)
    this.scheduleRefresh()
  }
  disconnectedCallback() {
    ++this.sequence
    this.cancelIntent()
    this.map?.destroy()
    this.map = null
    this.mapBase = null
    window.removeEventListener('storage', this.onStorage)
    window.removeEventListener(UPDATE_EVENT, this.onUpdate)
    document.removeEventListener('pointerdown', this.onOutside)
    document.removeEventListener('keydown', this.onEscape)
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
    const request = ++this.sequence, uuid = this.uuid
    this.closeCard()
    this.setMapAvailability(false)
    this.dismissedFeature = null
    this.records = []; this.observations = []; this.plant = null
    this.coverage = { governorates: [], regions: [], unresolved: [] }; this.places.clear()
    this.$('.source-list').replaceChildren()
    this.map?.update({ documented: new Set(), selected: '' })
    this.map?.reset()
    this.$('.region-shortcuts').replaceChildren()
    this.$('.scientific').textContent = ''
    this.$('#flora-heading').textContent = 'خريطة النبات'
    this.$('.map-heading').hidden = true
    this.$('.map-summary').hidden = true
    this.$('.local-notice').hidden = true
    this.$('.detail-notice').hidden = true
    this.$('.local-notice').textContent = 'تُعرض تعديلات محفوظة في هذا المتصفح.'
    this.$('.data-version').textContent = ''
    this.$('.map-hint').hidden = true
    this.$('.empty-state').hidden = true
    this.$('.map-toolbar').hidden = true
    this.$('.map-navigation').hidden = true
    this.$('.map-status').textContent = uuid ? 'جارٍ تحميل مواضع النبات ومصادره…' : ''
    if (uuid) {
      this.$('.empty-state p').textContent = 'جارٍ تحميل مواضع النبات ومصادره…'
      this.$('.empty-state').hidden = false
      this.$('.retry').hidden = true
    }
    this.$('.flora-widget').setAttribute('aria-busy', 'true')
    this.emitState('loading')
    try {
      const base = getDataBase(this.getAttribute('data-base-url') || undefined)
      const [geometry, governorateGeometry, identity, spatial] = await Promise.allSettled([
        loadRegions(base), loadGovernorates(base), uuid ? Promise.resolve().then(() => loadPlant(uuid, base)) : Promise.resolve(null),
        uuid ? Promise.resolve().then(() => loadSpatial(uuid, base)) : Promise.resolve(null)
      ])
      if (request !== this.sequence || !this.isConnected) return
      if (identity.status === 'rejected') throw identity.reason
      const original = identity.value
      if (!original) { this.showEmpty('اختر نباتًا لعرض مواضعه في المملكة ومصادرها.'); this.emitState('empty'); return }
      if (this.hasAttribute('sense-id') && this.getAttribute('sense-id') !== original.senseId) {
        this.showEmpty('غير متوفر')
        this.emitState('sense_mismatch'); return
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
      this.$('#flora-heading').textContent = plant.name
      this.$('.map-heading').hidden = false
      if (!this.records.length) { this.showEmpty('غير متوفر'); this.emitState('empty'); return }
      let spatialUnavailable = false
      if (spatial.status === 'fulfilled') {
        try { this.observations = spatialForPlant(plant, spatial.value) } catch { spatialUnavailable = true; this.showSpatialError() }
      } else { spatialUnavailable = true; this.showSpatialError() }
      if (geometry.status === 'rejected' || governorateGeometry.status === 'rejected') throw Object.assign(new Error('Map boundaries unavailable'), { code: 'geometry' })
      this.regions = geometry.value
      this.governorates = governorateGeometry.value
      this.coverage = coverageByNamedPlace(plant, this.observations, this.governorates, this.regions)
      this.places = new Map([
        ...this.coverage.regions.map(place => [place.id, { ...place, level: 'region' }]),
        ...this.coverage.governorates.map(place => [place.id, { ...place, level: 'governorate' }]),
      ])
      const documented = new Set(this.places.keys())
      if (!documented.size) {
        if (this.records.length && spatialUnavailable) throw Object.assign(new Error('Spatial details unavailable'), { code: 'spatial' })
        this.showEmpty('غير متوفر')
        this.emitState('empty'); return
      }
      if (!this.map || this.mapBase !== base) {
        this.map?.destroy()
        this.areas = [...this.regions.map(area => ({ ...area, level: 'region' })), ...this.governorates.map(area => ({ ...area, level: 'governorate' }))]
        this.map = mountMap(this.$('.map-canvas'), this.areas, {
          onPlaceEnter: (id, event) => this.hoverFeature(id, event, 'region'),
          onPlaceMove: (id, event) => this.hoverFeature(id, event, 'region'),
          onPlaceLeave: (id, event) => this.leaveFeature(id, event, 'region'),
          onPlaceFocus: (id, event) => this.focusFeature(id, event, 'region'),
          onPlaceSelect: (id, event) => this.openCard(id, event, true),
          onViewChange: view => {
            this.$('.zoom-in').disabled = !view.canZoomIn
            this.$('.zoom-out').disabled = !view.canZoomOut
            this.$('.reset-map').disabled = view.isOverview
            if (this.region) this.positionCard()
          }
        })
        this.mapBase = base
      }
      this.$('.boundary-link').href = new URL('BOUNDARIES.txt', base).href
      this.$('.governorate-boundary-link').href = new URL('GOVERNORATE-BOUNDARIES.txt', base).href
      this.$('.empty-state').hidden = true
      this.setMapAvailability(true)
      this.map.update({ documented, selected: '' })
      this.$('#flora-heading').textContent = plant.name
      this.$('.scientific').textContent = plant.scientificName
      this.$('.data-version').textContent = 'إصدار البيانات ' + plant.version
      this.$('.map-status').textContent = ''
      this.$('.map-summary').hidden = !this.records.length
      this.$('.governorate-count').hidden = !this.coverage.governorates.length
      this.$('.governorate-count').textContent = 'محافظات مذكورة: ' + number(this.coverage.governorates.length)
      this.$('.region-count').hidden = !this.coverage.regions.length
      this.$('.region-count').textContent = 'مناطق دون تحديد المحافظة: ' + number(this.coverage.regions.length)
      for (const place of [...this.places.values()].sort((a, b) => a.level.localeCompare(b.level) || a.name.localeCompare(b.name, 'ar'))) this.addRegionButton(place.id, this.placeTitle(place))
      this.renderRights()
      this.$('.map-toolbar').hidden = false
      this.$('.map-navigation').hidden = false
      this.$('.map-hint').hidden = false
      this.emitState('ready')
    } catch (error) {
      if (request !== this.sequence || !this.isConnected) return
      const unknown = ['not_found', 'invalid_uuid'].includes(error.code)
      this.showEmpty(unknown ? 'غير متوفر' : 'تعذر تحميل بيانات الخريطة. أعد المحاولة.', !unknown)
      this.emitState(unknown ? 'unknown_uuid' : 'error')
    } finally {
      if (request === this.sequence && this.isConnected) this.$('.flora-widget').setAttribute('aria-busy', 'false')
    }
  }
  showSpatialError() {
    this.$('.detail-notice').textContent = 'تعذّر تحميل تفاصيل مواقع الرصد. تبقى المواضع والمصادر النصية متاحة؛ أعد تحميل الخريطة للمحاولة.'
    this.$('.detail-notice').hidden = false
  }
  setMapAvailability(available) {
    this._mapAvailable = Boolean(available)
    this.setAttribute('data-map-available', String(this._mapAvailable))
    this.$('.flora-widget').classList.toggle('no-map', !this._mapAvailable)
    this.$('.map-stage').hidden = !this._mapAvailable
    this.$('.map-bottom').hidden = !this._mapAvailable
  }
  emitState(state) { this.dispatchEvent(new CustomEvent('flora-map:state', { bubbles: true, composed: true, detail: { uuid: this.uuid, state, mapAvailable: this.mapAvailable } })) }
  showEmpty(message, retry = false) {
    this.setMapAvailability(false)
    this.$('.map-status').textContent = message
    this.$('.empty-state p').textContent = message
    this.$('.empty-state').hidden = false
    this.$('.retry').hidden = !retry
    this.$('.map-hint').hidden = true
  }
  addRegionButton(id, label) {
    const button = create('button', label, 'region-chip' + (id === 'unlocated' ? ' unlocated-chip' : ''))
    button.type = 'button'; button.dataset.regionButton = id
    button.setAttribute('aria-label', 'عرض مصادر ' + label)
    button.setAttribute('aria-controls', 'source-card'); button.setAttribute('aria-expanded', 'false')
    button.addEventListener('click', event => this.openCard(id, event, true))
    this.$('.region-shortcuts').append(button)
  }
  cancelIntent() { clearTimeout(this.hoverTimer); this.hoverCandidate = null }
  cardProtected() { return this.pinned || this.cardHovered || this.$('.source-card').contains(this.shadowRoot.activeElement) }
  safeTransit(event) {
    if (!this.region || !this.transitAnchor || getComputedStyle(this.$('.source-card')).position !== 'absolute') return false
    const rect = this.$('.source-card').getBoundingClientRect(), p = { x: event.clientX, y: event.clientY }
    const pad = 12, a = this.transitAnchor
    if (p.x >= rect.left - pad && p.x <= rect.right + pad && p.y >= rect.top - pad && p.y <= rect.bottom + pad) return true
    if (a.x <= rect.left) return pointInTriangle(p, { x: a.x - pad, y: a.y }, { x: rect.left + pad, y: rect.top - pad }, { x: rect.left + pad, y: rect.bottom + pad })
    if (a.x >= rect.right) return pointInTriangle(p, { x: a.x + pad, y: a.y }, { x: rect.right - pad, y: rect.top - pad }, { x: rect.right - pad, y: rect.bottom + pad })
    const y = a.y < rect.top ? rect.top + pad : rect.bottom - pad
    return pointInTriangle(p, a, { x: rect.left - pad, y }, { x: rect.right + pad, y })
  }
  hoverFeature(id, event, kind) {
    if (event?.pointerType === 'touch' || this.cardProtected()) return
    if (this.dismissedFeature?.id === id && this.dismissedFeature.kind === kind) return
    const current = kind === 'point' ? this.pointId === id : !this.pointId && this.region === id
    if (current) { this.transitAnchor = { x: event.clientX, y: event.clientY }; this.cancelIntent(); return }
    if (this.safeTransit(event)) { this.cancelIntent(); return }
    const candidate = { id, kind, event: { clientX: event.clientX, clientY: event.clientY, currentTarget: event.currentTarget, type: event.type } }
    if (this.hoverCandidate?.id === id && this.hoverCandidate.kind === kind) { this.hoverCandidate.event = candidate.event; return }
    this.cancelIntent(); this.hoverCandidate = candidate
    this.hoverTimer = setTimeout(() => {
      const next = this.hoverCandidate
      this.hoverCandidate = null
      if (next && !this.cardProtected()) this.openCard(next.id, next.event, false, next.kind)
    }, 150)
  }
  leaveFeature(id, event, kind) {
    if (this.dismissedFeature?.id === id && this.dismissedFeature.kind === kind) this.dismissedFeature = null
    if (this.hoverCandidate?.id === id && this.hoverCandidate.kind === kind) this.cancelIntent()
    if ((kind === 'point' ? this.pointId === id : !this.pointId && this.region === id) && Number.isFinite(event?.clientX)) this.transitAnchor = { x: event.clientX, y: event.clientY }
    // The card persists while reading and through the pointer's travel corridor.
    // A deliberate different feature, Escape, close or outside click dismisses it.
  }
  focusFeature(id, event, kind) { if (!this.suppressFocus && !this.cardProtected()) this.openCard(id, event, false, kind) }
  placeTitle(place) { return presentAreaName(place) }
  openCard(id, event, pin = false) {
    const place = this.places.get(id)
    if (!place?.evidence.length) return
    this.dismissedFeature = null; this.cancelIntent()
    const changed = this.region !== id
    this.region = id; this.pointId = ''; this.cardHovered = false
    this.pinned = pin || (!changed && this.pinned)
    const candidateTrigger = event?.currentTarget || event?.target
    if (candidateTrigger && !this.$('.source-card').contains(candidateTrigger)) this.trigger = candidateTrigger
    const parent = this.regions.find(item => item.id === place.regionId)
    this.$('#source-heading').textContent = this.placeTitle(place)
    this.$('.location-level').textContent = place.level === 'governorate' && parent ? presentAreaName(parent) : 'المكان المذكور في المصدر'
    this.$('.location-context').hidden = false
    this.$('.location-context').textContent = place.level === 'governorate'
      ? 'ذُكرت مواضع ضمن هذه المحافظة في المصادر التالية.'
      : 'المصدر يذكر المنطقة دون تحديد المحافظة.'
    this.renderSources(place)
    this.$('.source-card').hidden = false
    this.$('.map-hint').hidden = true
    this.$('.zoom-place').hidden = false
    this.$('.zoom-place').textContent = place.level === 'governorate' ? 'تكبير المحافظة' : 'تكبير المنطقة'
    this.updatePinLabel()
    this.map.update({ selected: id })
    for (const button of this.shadowRoot.querySelectorAll('[data-region-button]')) button.setAttribute('aria-expanded', String(button.dataset.regionButton === id))
    const target = event?.currentTarget?.getBoundingClientRect?.()
    this.anchor = Number.isFinite(event?.clientX) && event.clientX !== 0 ? { x: event.clientX, y: event.clientY }
      : target ? { x: target.left + target.width / 2, y: target.top + target.height / 2 } : null
    this.transitAnchor = this.anchor; this.positionCard()
    if (pin && getComputedStyle(this.$('.source-card')).position !== 'absolute') this.$('.source-card-head').scrollIntoView({ block: 'start', behavior: 'auto' })
    if (pin && (event?.type === 'keydown' || event?.detail === 0)) this.$('.card-close').focus({ preventScroll: true })
  }
  updatePinLabel() { this.$('.pin-card').textContent = this.pinned ? 'البطاقة مثبتة' : 'تثبيت البطاقة'; this.$('.pin-card').disabled = this.pinned }
  pinCard() { this.pinned = true; this.cancelIntent(); this.updatePinLabel() }
  positionCard() {
    const card = this.$('.source-card')
    if (card.hidden) return
    if (getComputedStyle(card).position !== 'absolute') { card.style.left = ''; card.style.top = ''; card.style.maxHeight = ''; return }
    const stage = this.$('.map-stage').getBoundingClientRect()
    const gutter = parseFloat(getComputedStyle(card).getPropertyValue('--uds-space-lg')) || 12
    const anchor = this.anchor || { x: stage.left + stage.width / 2, y: stage.top + stage.height / 2 }
    const minY = Math.max(gutter, -stage.top + gutter), maxY = Math.min(stage.height - gutter, window.innerHeight - stage.top - gutter)
    card.style.maxHeight = Math.max(180, maxY - minY) + 'px'
    const width = card.getBoundingClientRect().width, height = card.getBoundingClientRect().height
    let left = anchor.x - stage.left + gutter
    if (left + width > stage.width - gutter) left = anchor.x - stage.left - width - gutter
    left = Math.max(gutter, Math.min(left, stage.width - width - gutter))
    const top = Math.max(minY, Math.min(anchor.y - stage.top - 36, maxY - height))
    card.style.left = left + 'px'; card.style.top = top + 'px'
  }
  closeCard(restoreFocus = false) {
    this.cancelIntent()
    const trigger = this.trigger
    const inFlow = !this.$('.source-card').hidden && getComputedStyle(this.$('.source-card')).position !== 'absolute'
    if (this.region) this.dismissedFeature = { id: this.pointId || this.region, kind: this.pointId ? 'point' : 'region' }
    this.region = ''; this.pointId = ''; this.pinned = false; this.cardHovered = false; this.anchor = null; this.transitAnchor = null
    this.$('.source-card').hidden = true
    for (const button of this.shadowRoot.querySelectorAll('[data-region-button]')) button.setAttribute('aria-expanded', 'false')
    this.map?.update({ selected: '' })
    this.$('.map-hint').hidden = !this.places.size
    if (restoreFocus && trigger?.isConnected && typeof trigger.focus === 'function') {
      this.suppressFocus = true; trigger.focus({ preventScroll: true }); this.suppressFocus = false
      if (inFlow) trigger.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
  }
  renderSources(place) {
    const groups = new Map()
    for (const evidence of place.evidence) {
      const record = evidence.record, key = record.sourceId || record.sourceTitle + '|' + record.sourceUrl
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(evidence)
    }
    const items = [...groups.values()].sort((a, b) => rank(a[0].record) - rank(b[0].record))
    this.$('.source-count').hidden = groups.size < 2
    this.$('.source-count').textContent = 'المصادر: ' + number(groups.size)
    this.$('.source-list').replaceChildren(...items.map((group, index) => {
      const { record, observation } = group[0], info = presentSource(record)
      const li = create('li', '', 'source-entry')
      li.dataset.secondary = String(index > 0); li.hidden = index > 0
      li.append(create('span', info.kindLabel, 'source-kind'), create('p', info.titleAr, 'source-title'))
      const summary = observation
        ? (evidenceType(record, observation) === 'PRESERVEDSPECIMEN'
          ? 'سجل عينة نباتية يذكر هذا المكان.'
          : evidenceType(record, observation) === 'MATERIALCITATION'
            ? 'مرجع لعينة نباتية يذكر هذا المكان.'
            : 'مشاهدة للنبات تذكر هذا المكان.')
        : presentEvidence(record, this.plant.name)
      li.append(create('p', summary, 'evidence-summary'))
      if (info.automated) li.append(create('p', 'تحديد نوع النبات في هذا المصدر آلي.', 'automation-note'))
      const book = /book|dictionary|encyclop|كتاب|معجم|موسوع/i.test(record.sourceKind)
      if (book) {
        const citation = [record.sourceAuthor, record.year, record.sourceEdition].filter(Boolean)
        if (citation.length) li.append(create('p', citation.join(' · '), 'source-locator'))
        li.append(create('p', 'الصفحة أو الموضع: ' + record.locator, 'source-locator'))
      }
      const referenceUrl = evidence => evidence.observation?.referenceUrl || evidence.record.recordUrls?.[0] || evidence.record.sourceUrl
      const primaryUrl = referenceUrl(group[0])
      appendLink(li, 'عرض المصدر في نافذة جديدة', primaryUrl, 'primary-source-link')
      if (observation?.eventDate) li.append(create('p', eventLabel(record, observation) + ': ' + dateText(observation.eventDate), 'source-locator'))
      // Only links attached to this named place are shown. Never expand the
      // aggregate record's URLs into evidence for other governorates.
      const extra = new Map()
      for (const evidence of group) {
        const urls = evidence.observation ? [evidence.observation.referenceUrl]
          : evidence.record.recordUrls?.length ? evidence.record.recordUrls : [evidence.record.sourceUrl]
        for (const url of urls) if (url && url !== primaryUrl && safeSourceUrl(url)) extra.set(url, evidence)
      }
      if (extra.size) {
        const details = create('details', '', 'citation-details')
        details.append(create('summary', 'إحالات أخرى لهذا المكان (' + number(extra.size) + ')'))
        details.addEventListener('toggle', () => { if (details.open) this.pinCard(); this.positionCard() })
        let ordinal = 0
        for (const [url, evidence] of extra) {
          const date = evidence.observation?.eventDate
          appendLink(details, date ? 'مشاهدة بتاريخ ' + dateText(date) + ' ↗' : 'عرض الإحالة ' + number(++ordinal) + ' ↗', url)
        }
        li.append(details)
      }
      return li
    }))
    this.$('.more-sources').hidden = items.length < 2
    this.$('.more-sources').setAttribute('aria-expanded', 'false')
    this.$('.more-sources').textContent = 'عرض بقية المصادر (' + number(Math.max(0, items.length - 1)) + ')'
  }
  renderRights() {
    const rights = new Map()
    for (const place of this.places.values()) for (const evidence of place.evidence) {
      const url = licenseLink(evidence.observation?.license)
      if (!url) continue
      const source = presentSource(evidence.record)
      rights.set(source.titleAr + '|' + url, { title: source.titleAr, url })
    }
    this.$('.source-rights').replaceChildren(...[...rights.values()].map(item => {
      const li = create('li')
      appendLink(li, 'ترخيص بيانات ' + item.title + ' ↗', item.url)
      return li
    }))
  }
}
if (!customElements.get('saudi-flora-map')) customElements.define('saudi-flora-map', SaudiFloraMap)
