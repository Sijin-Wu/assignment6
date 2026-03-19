<template>
  <div class="card border-0 shadow-sm">

    <div class="card-header bg-transparent border-bottom d-flex align-items-center gap-2 flex-wrap">
      <span class="fw-semibold">311 Requests → Council District Offices</span>
      <div class="d-flex flex-wrap gap-1 ms-2">
        <button v-for="t in requestTypes" :key="t.key"
          class="pill-btn" :class="{ active: activeTypes.has(t.key) }"
          @click="toggleType(t.key)">
          <span class="pill-dot" :style="{ background: t.color }"></span>
          {{ t.label }}
        </button>
      </div>
      <span class="badge text-bg-light border ms-auto">deck.gl ArcLayer</span>
    </div>

    <div class="filter-bar border-bottom px-3 py-2 d-flex flex-wrap align-items-end gap-3">
      <div class="filter-group">
        <label class="filter-label">Week</label>
        <div class="d-flex align-items-center gap-2">
          <select class="form-select form-select-sm week-select" v-model.number="draft.weekMin">
            <option v-for="w in weeks" :key="w.val" :value="w.val" :disabled="w.val > draft.weekMax">
              {{ w.label }}
            </option>
          </select>
          <span class="text-muted small">–</span>
          <select class="form-select form-select-sm week-select" v-model.number="draft.weekMax">
            <option v-for="w in weeks" :key="w.val" :value="w.val" :disabled="w.val < draft.weekMin">
              {{ w.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">Status</label>
        <div class="d-flex gap-1">
          <button v-for="s in statusOptions" :key="s"
            class="pill-btn status-pill" :class="{ active: draft.statuses.has(s) }"
            @click="toggleDraftStatus(s)">{{ s }}</button>
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">Arc width</label>
        <div class="d-flex align-items-center gap-2">
          <input type="range" class="form-range" style="width:100px"
            min="1" max="8" step="0.5" v-model.number="draft.arcWidth">
          <span class="small text-muted">{{ draft.arcWidth }}px</span>
        </div>
      </div>

      <div class="filter-group ms-auto d-flex gap-2 align-items-end">
        <button class="btn btn-sm btn-outline-secondary" @click="resetFilters">Reset</button>
        <button class="btn btn-sm btn-primary" @click="applyFilters">
          Apply
          <span v-if="pendingChanges" class="badge bg-warning text-dark ms-1">●</span>
        </button>
      </div>
    </div>

    <div class="card-body p-0 position-relative">
      <!-- Mapbox renders here as background -->
      <div ref="mapContainer" class="map-container"></div>

      <!-- deck.gl canvas is appended here by Deck constructor -->
      <div ref="deckContainer" class="deck-container"></div>

      <div class="legend position-absolute bottom-0 start-0 m-3 p-2
                  bg-white bg-opacity-90 rounded shadow-sm">
        <div class="legend-title mb-2">Request type</div>
        <div v-for="t in requestTypes" :key="t.key"
          class="d-flex align-items-center gap-2 mb-1 legend-row"
          :class="{ 'legend-row--dim': !activeTypes.has(t.key) }">
          <span class="legend-arc" :style="{ background: t.color }"></span>
          {{ t.label }}
        </div>
        <div class="d-flex align-items-center gap-2 mt-1 legend-row">
          <span class="legend-dot-cd"></span>CD Office · arc target
        </div>
        <hr class="my-2">
        <div class="text-muted" style="font-size:0.7rem">
          <strong>{{ visibleCount.toLocaleString() }}</strong> requests shown
        </div>
        <div class="text-muted mt-1" style="font-size:0.68rem">
          Right-click drag to tilt
        </div>
      </div>

      <div v-if="loading" class="map-overlay d-flex align-items-center justify-content-center">
        <div class="spinner-border text-secondary" role="status">
          <span class="visually-hidden">Loading…</span>
        </div>
      </div>
      <div v-if="error" class="map-overlay d-flex align-items-center justify-content-center">
        <div class="alert alert-danger m-3">{{ error }}</div>
      </div>

      <div id="arc-tooltip"></div>
    </div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Deck }                              from '@deck.gl/core'
import { ArcLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { PAGE5 } from '../config.js'

const TYPE_COLOR = Object.fromEntries(PAGE5.requestTypes.map(t => [t.key, t.rgb]))

const MONTHS = [
  { val:1,label:'Jan'},{val:2,label:'Feb'},{val:3,label:'Mar'},
  {val:4,label:'Apr'},{val:5,label:'May'},{val:6,label:'Jun'},
  {val:7,label:'Jul'},{val:8,label:'Aug'},{val:9,label:'Sep'},
  {val:10,label:'Oct'},{val:11,label:'Nov'},{val:12,label:'Dec'},
]

function defaultDraft() {
  return { weekMin:1, weekMax:60, statuses: new Set(['Open','Closed']), arcWidth:3 }
}

const WEEK_ORDINAL = ['First', 'Second', 'Third', 'Fourth', 'Fifth']

function parseWeekIndex(createdDate) {
  if (!createdDate) return null
  const dt = new Date(createdDate)
  if (Number.isNaN(dt.getTime())) return null
  const month = dt.getMonth() + 1
  const weekOfMonth = Math.min(5, Math.floor((dt.getDate() - 1) / 7) + 1)
  return (month - 1) * 5 + weekOfMonth
}

function weekLabel(weekIndex) {
  const month = Math.floor((weekIndex - 1) / 5) + 1
  const weekOfMonth = ((weekIndex - 1) % 5) + 1
  const monthName = MONTHS.find(m => m.val === month)?.label ?? `M${month}`
  const ordinal = WEEK_ORDINAL[Math.max(0, Math.min(4, weekOfMonth - 1))] ?? `Week ${weekOfMonth}`
  return `${ordinal} week of ${monthName}`
}

export default {
  name: 'DeckArcLayer',

  data() {
    const d = defaultDraft()
    return {
      deck: null, map: null,
      allFeatures: [], cdFeatures: [],
      activeTypes:  new Set(PAGE5.requestTypes.map(t => t.key)),
      requestTypes: PAGE5.requestTypes,
      statusOptions: ['Open','Closed'],
      weeks: [],
      loading: true, error: null, visibleCount: 0,
      draft: d,
      applied: { ...d, statuses: new Set(d.statuses) },
    }
  },

  computed: {
    pendingChanges() {
      const a = this.applied, d = this.draft
      return a.weekMin !== d.weekMin || a.weekMax !== d.weekMax
          || a.arcWidth !== d.arcWidth
          || [...d.statuses].some(s => !a.statuses.has(s))
          || [...a.statuses].some(s => !d.statuses.has(s))
    },
    filteredFeatures() {
      const { weekMin, weekMax, statuses } = this.applied
      return this.allFeatures.filter(f => {
        const p = f.properties
        if (!this.activeTypes.has(p.request_type)) return false
        if (p._weekIndex == null || p._weekIndex < weekMin || p._weekIndex > weekMax) return false
        if (!statuses.has(p.status)) return false
        return true
      })
    },
  },

  watch: {
    filteredFeatures(features) {
      this.visibleCount = features.length
      this.updateLayers(features)
    },
    activeTypes() {
      const features = this.filteredFeatures
      this.visibleCount = features.length
      this.updateLayers(features)
    },
  },

  mounted()      { this.init() },
  beforeUnmount(){ this.deck?.finalize(); this.map?.remove() },

  methods: {
    async init() {
      this.loading = true; this.error = null

      try {
        const [arcRes, cdRes] = await Promise.all([
          fetch(PAGE5.dataPath), fetch(PAGE5.cdOfficesPath)
        ])
        if (!arcRes.ok) throw new Error(`Arc data: ${arcRes.status}`)
        if (!cdRes.ok)  throw new Error(`CD offices: ${cdRes.status}`)
        const [arcGeo, cdGeo] = await Promise.all([arcRes.json(), cdRes.json()])
        this.allFeatures = arcGeo.features ?? []
        const availableWeekSet = new Set()
        this.allFeatures.forEach((f) => {
          const idx = parseWeekIndex(f?.properties?.created_date)
          f.properties._weekIndex = idx
          if (idx != null) availableWeekSet.add(idx)
        })
        const orderedWeeks = [...availableWeekSet].sort((a, b) => a - b)
        this.weeks = orderedWeeks.map((idx) => ({ val: idx, label: weekLabel(idx) }))
        if (orderedWeeks.length) {
          const weekMin = orderedWeeks[0]
          const weekMax = orderedWeeks[orderedWeeks.length - 1]
          this.draft = { ...this.draft, weekMin, weekMax }
          this.applied = { ...this.applied, weekMin, weekMax }
        }
        this.cdFeatures  = cdGeo.features  ?? []
        this.visibleCount = this.allFeatures.length
      } catch(err) {
        this.error = err.message; this.loading = false; return
      }

      // ── Mapbox as background (non-interactive — deck.gl drives all input) ──
      mapboxgl.accessToken = PAGE5.mapboxToken
      this.map = new mapboxgl.Map({
        container:   this.$refs.mapContainer,
        style:       'mapbox://styles/mapbox/dark-v11',
        center:      PAGE5.center,
        zoom:        PAGE5.zoom,
        pitch:       45,
        bearing:     -15,
        interactive: false,   // deck.gl handles all interaction
      })

      // ── Standalone Deck owns its own canvas + viewState (incl. pitch) ──────
      // This is the ONLY reliable way to control pitch with deck.gl layers.
      // MapboxOverlay ignores Mapbox's pitch when interleaved:false.
      const deckCanvas = document.createElement('canvas')
      deckCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'
      this.$refs.deckContainer.appendChild(deckCanvas)

      this.deck = new Deck({
        canvas: deckCanvas,
        width:  '100%',
        height: '100%',
        initialViewState: {
          longitude: PAGE5.center[0],
          latitude:  PAGE5.center[1],
          zoom:      PAGE5.zoom,
          pitch:     45,    // MUST be set here — this is what makes arcs visible
          bearing:   -15,
        },
        controller: true,

        // Keep Mapbox camera in sync with deck.gl viewport on every frame
        onViewStateChange: ({ viewState }) => {
          this.map.jumpTo({
            center:  [viewState.longitude, viewState.latitude],
            zoom:     viewState.zoom,
            bearing:  viewState.bearing,
            pitch:    viewState.pitch,
          })
        },

        layers: [],
        getTooltip: null,
      })

      // Draw initial layers once Mapbox style loads
      this.map.on('load', () => {
        this.updateLayers(this.filteredFeatures)
        this.loading = false
      })

      this.map.on('error', e => {
        console.error('[DeckArcLayer]', e)
        this.error = 'Mapbox error — check your token in config.js'
        this.loading = false
      })
    },

    buildLayers(features) {
      const w = this.applied.arcWidth

      // CD office dots
      const cdDots = new ScatterplotLayer({
        id:              'cd-dots',
        data:            this.cdFeatures,
        getPosition:     f => f.geometry.coordinates,
        getFillColor:    [255, 215, 60, 240],
        getRadius:       120,
        radiusMinPixels: 5,
        radiusMaxPixels: 10,
        stroked:         true,
        getLineColor:    [255, 255, 255, 200],
        lineWidthMinPixels: 1.5,
        pickable:        true,
        onHover: ({ object, x, y }) => {
          const el = document.getElementById('arc-tooltip')
          if (!el) return
          if (object) {
            el.style.display = 'block'
            el.style.left = (x + 12) + 'px'; el.style.top = (y + 12) + 'px'
            el.innerHTML = `<div class="tt-title">${object.properties.name}</div>
                            <div class="tt-row">Council District Office</div>`
          } else { el.style.display = 'none' }
        },
      })

      // CD office text labels
      const cdLabels = new TextLayer({
        id:          'cd-labels',
        data:        this.cdFeatures,
        getPosition: f => f.geometry.coordinates,
        getText:     f => 'CD ' + f.properties.cd,
        getSize:     13,
        getColor:    [255, 215, 60, 240],
        getAnchor:   'start',
        getAlignmentBaseline: 'center',
        getPixelOffset: [12, 0],
        fontFamily:  'system-ui, sans-serif',
        fontWeight:  '700',
        billboard:   true,
        pickable:    false,
      })

      // Arc layer — source=request location, target=CD office
      const arcs = new ArcLayer({
        id:                'arcs',
        data:              features,
        getSourcePosition: f => [f.properties.src_lon, f.properties.src_lat],
        getTargetPosition: f => [f.properties.tgt_lon, f.properties.tgt_lat],
        getSourceColor:    f => [...(TYPE_COLOR[f.properties.request_type] ?? [200,200,200]), 220],
        getTargetColor:    f => [...(TYPE_COLOR[f.properties.request_type] ?? [200,200,200]),  60],
        getWidth:          w,
        getHeight:         0.5,  // clearly visible at pitch:45
        pickable:          true,
        onHover: ({ object, x, y }) => {
          const el = document.getElementById('arc-tooltip')
          if (!el) return
          if (object) {
            const p = object.properties
            el.style.display = 'block'
            el.style.left = (x + 12) + 'px'; el.style.top = (y + 12) + 'px'
            el.innerHTML = `
              <div class="tt-title">${p.request_type}</div>
              <div class="tt-row">📍 ${p.address}</div>
              <div class="tt-row">🏛 CD ${p.cd}</div>
              <div class="tt-row">📅 ${p.created_date} · ${p.status}</div>
              ${p.nc_name ? `<div class="tt-row">🏘 ${p.nc_name}</div>` : ''}
              <div class="tt-row">↔ ${p.dist_km} km</div>
            `
          } else { el.style.display = 'none' }
        },
      })

      return [cdDots, cdLabels, arcs]
    },

    updateLayers(features) {
      if (!this.deck) return
      this.deck.setProps({ layers: this.buildLayers(features) })
    },

    toggleType(key) {
      const next = new Set(this.activeTypes)
      if (next.has(key)) { if (next.size === 1) return; next.delete(key) }
      else next.add(key)
      this.activeTypes = next
    },
    toggleDraftStatus(s) {
      const next = new Set(this.draft.statuses)
      if (next.has(s)) { if (next.size === 1) return; next.delete(s) }
      else next.add(s)
      this.draft = { ...this.draft, statuses: next }
    },
    applyFilters() {
      this.applied = { ...this.draft, statuses: new Set(this.draft.statuses) }
    },
    resetFilters() {
      const d = defaultDraft()
      this.draft   = d
      this.applied = { ...d, statuses: new Set(d.statuses) }
      this.activeTypes = new Set(PAGE5.requestTypes.map(t => t.key))
    },
  },
}
</script>

<style scoped>
.map-container {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}
.deck-container {
  position: relative;
  width: 100%;
  height: 580px;
}
.card-body { overflow: hidden; }

.map-overlay {
  position: absolute; inset: 0;
  background: rgba(15,15,25,0.6); z-index: 10;
}
.filter-bar { background: #f8fafc; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-label {
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;
}
.week-select { width: 160px; }

.pill-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 11px; border-radius: 999px;
  border: 1.5px solid #e2e8f0; background: #fff;
  font-size: 0.75rem; font-weight: 500; color: #475569;
  cursor: pointer; transition: all 0.15s; white-space: nowrap; opacity: 0.45;
}
.pill-btn.active { opacity: 1; }
.pill-btn:hover  { border-color: #94a3b8; color: #1e293b; opacity: 1; }
.pill-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-pill.active { border-color: #0ea5e9; background: #f0f9ff; color: #0369a1; }

.legend {
  min-width: 170px; font-size: 0.75rem; pointer-events: none; z-index: 5;
}
.legend-title { font-weight: 600; font-size: 0.78rem; color: #1e293b; }
.legend-row { font-size: 0.72rem; color: #334155; transition: opacity 0.2s; }
.legend-row--dim { opacity: 0.25; }
.legend-arc {
  display: inline-block; width: 20px; height: 3px;
  border-radius: 2px; flex-shrink: 0;
}
.legend-dot-cd {
  display: inline-block; width: 10px; height: 10px;
  border-radius: 50%; background: #ffd73c;
  border: 1.5px solid white; flex-shrink: 0;
}
</style>

<style>
#arc-tooltip {
  display:none; position:absolute; z-index:999; pointer-events:none;
  background:#1e293b; color:#f1f5f9; border-radius:8px;
  padding:10px 14px; font-size:0.78rem; max-width:280px;
  box-shadow:0 4px 16px rgba(0,0,0,0.4);
}
#arc-tooltip .tt-title { font-weight:600; margin-bottom:6px; color:#f8fafc; }
#arc-tooltip .tt-row   { color:#94a3b8; margin-bottom:3px; }
</style>