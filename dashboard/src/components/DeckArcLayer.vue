<template>
  <div class="card border-0 shadow-sm">

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <div class="card-header bg-transparent border-bottom d-flex align-items-center gap-2 flex-wrap">
      <span class="fw-semibold">311 Requests → Council District Offices</span>

      <!-- Request type toggles -->
      <div class="d-flex flex-wrap gap-1 ms-2">
        <button
          v-for="t in requestTypes" :key="t.key"
          class="pill-btn" :class="{ active: activeTypes.has(t.key) }"
          @click="toggleType(t.key)"
        >
          <span class="pill-dot" :style="{ background: t.color }"></span>
          {{ t.label }}
        </button>
      </div>

      <span class="badge text-bg-light border ms-auto">deck.gl ArcLayer</span>
    </div>

    <!-- ── Filter bar ───────────────────────────────────────────────────── -->
    <div class="filter-bar border-bottom px-3 py-2 d-flex flex-wrap align-items-end gap-3">

      <!-- Month range -->
      <div class="filter-group">
        <label class="filter-label">Month</label>
        <div class="d-flex align-items-center gap-2">
          <select class="form-select form-select-sm month-select"
                  v-model.number="draft.monthMin">
            <option v-for="m in months" :key="m.val" :value="m.val"
                    :disabled="m.val > draft.monthMax">{{ m.label }}</option>
          </select>
          <span class="text-muted small">–</span>
          <select class="form-select form-select-sm month-select"
                  v-model.number="draft.monthMax">
            <option v-for="m in months" :key="m.val" :value="m.val"
                    :disabled="m.val < draft.monthMin">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <!-- Status -->
      <div class="filter-group">
        <label class="filter-label">Status</label>
        <div class="d-flex gap-1">
          <button
            v-for="s in statusOptions" :key="s"
            class="pill-btn status-pill"
            :class="{ active: draft.statuses.has(s) }"
            @click="toggleDraftStatus(s)"
          >{{ s }}</button>
        </div>
      </div>

      <!-- Arc width -->
      <div class="filter-group">
        <label class="filter-label">Arc width</label>
        <div class="d-flex align-items-center gap-2">
          <input type="range" class="form-range" style="width:100px"
                 min="0.5" max="5" step="0.5" v-model.number="draft.arcWidth">
          <span class="small text-muted">{{ draft.arcWidth }}px</span>
        </div>
      </div>

      <!-- Apply / Reset -->
      <div class="filter-group ms-auto d-flex gap-2 align-items-end">
        <button class="btn btn-sm btn-outline-secondary" @click="resetFilters">Reset</button>
        <button class="btn btn-sm btn-primary" @click="applyFilters">
          Apply
          <span v-if="pendingChanges" class="badge bg-warning text-dark ms-1">●</span>
        </button>
      </div>
    </div>

    <!-- ── Map ─────────────────────────────────────────────────────────── -->
    <div class="card-body p-0 position-relative">
      <div ref="mapContainer" class="map-container"></div>

      <!-- Legend -->
      <div class="legend position-absolute bottom-0 start-0 m-3 p-2
                  bg-white bg-opacity-90 rounded shadow-sm">
        <div class="legend-title mb-2">Request type</div>
        <div v-for="t in requestTypes" :key="t.key"
             class="d-flex align-items-center gap-2 mb-1 legend-row"
             :class="{ 'legend-row--dim': !activeTypes.has(t.key) }">
          <span class="legend-arc" :style="{ background: t.color }"></span>
          {{ t.label }}
        </div>
        <div class="legend-row mt-2 d-flex align-items-center gap-2">
          <span class="legend-dot-cd"></span>
          CD Office (arc target)
        </div>
        <hr class="my-2">
        <div class="text-muted" style="font-size:0.7rem">
          <strong>{{ visibleCount.toLocaleString() }}</strong> requests shown
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
import mapboxgl    from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ArcLayer }      from '@deck.gl/layers'
import { ScatterplotLayer } from '@deck.gl/layers'
import { PAGE5 } from '../config.js'

const MONTHS = [
  { val: 1, label: 'Jan' }, { val: 2, label: 'Feb' },
  { val: 3, label: 'Mar' }, { val: 4, label: 'Apr' },
  { val: 5, label: 'May' }, { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' }, { val: 8, label: 'Aug' },
  { val: 9, label: 'Sep' }, { val: 10, label: 'Oct' },
  { val: 11, label: 'Nov' }, { val: 12, label: 'Dec' },
]

const TYPE_COLOR = Object.fromEntries(
  PAGE5.requestTypes.map(t => [t.key, t.rgb])
)

function defaultDraft() {
  return {
    monthMin:  1,
    monthMax:  12,
    statuses:  new Set(['Open', 'Closed']),
    arcWidth:  1.5,
  }
}

export default {
  name: 'DeckArcLayer',

  data() {
    const d = defaultDraft()
    return {
      map:          null,
      overlay:      null,
      allFeatures:  [],
      cdFeatures:   [],
      activeTypes:  new Set(PAGE5.requestTypes.map(t => t.key)),
      requestTypes: PAGE5.requestTypes,
      statusOptions: ['Open', 'Closed'],
      months:       MONTHS,
      loading:      true,
      error:        null,
      visibleCount: 0,
      draft:        d,
      applied:      { ...d, statuses: new Set(d.statuses) },
    }
  },

  computed: {
    pendingChanges() {
      const a = this.applied, d = this.draft
      if (a.monthMin !== d.monthMin || a.monthMax !== d.monthMax) return true
      if (a.arcWidth !== d.arcWidth) return true
      if ([...d.statuses].some(s => !a.statuses.has(s))) return true
      if ([...a.statuses].some(s => !d.statuses.has(s))) return true
      return false
    },

    filteredFeatures() {
      const { monthMin, monthMax, statuses } = this.applied
      return this.allFeatures.filter(f => {
        const p = f.properties
        if (!this.activeTypes.has(p.request_type)) return false
        if (p.month < monthMin || p.month > monthMax) return false
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
    // Re-render immediately when type pills change (no Apply needed for types)
    activeTypes() {
      this.visibleCount = this.filteredFeatures.length
      this.updateLayers(this.filteredFeatures)
    },
  },

  mounted() { this.init() },

  beforeUnmount() {
    if (this.map && this.overlay) {
      try { this.map.removeControl(this.overlay) } catch (_) {}
    }
    this.map?.remove()
  },

  methods: {
    async init() {
      this.loading = true
      this.error   = null

      // ── 1. Fetch both data files in parallel ───────────────────────
      try {
        const [arcRes, cdRes] = await Promise.all([
          fetch(PAGE5.dataPath),
          fetch(PAGE5.cdOfficesPath),
        ])
        if (!arcRes.ok) throw new Error(`Arc data fetch failed: ${arcRes.status}`)
        if (!cdRes.ok)  throw new Error(`CD offices fetch failed: ${cdRes.status}`)

        const [arcGeo, cdGeo] = await Promise.all([arcRes.json(), cdRes.json()])
        this.allFeatures = arcGeo.features ?? []
        this.cdFeatures  = cdGeo.features  ?? []
        this.visibleCount = this.allFeatures.length
      } catch (err) {
        this.error   = err.message
        this.loading = false
        return
      }

      // ── 2. Init Mapbox ─────────────────────────────────────────────
      mapboxgl.accessToken = PAGE5.mapboxToken

      this.map = new mapboxgl.Map({
        container: this.$refs.mapContainer,
        style:     'mapbox://styles/mapbox/dark-v11',
        center:    PAGE5.center,
        zoom:      PAGE5.zoom,
        antialias: true,
      })
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-right')

      // ── 3. deck.gl overlay ─────────────────────────────────────────
      this.map.on('load', () => {
        this.overlay = new MapboxOverlay({
          interleaved: true,
          layers: this.buildLayers(this.filteredFeatures),
        })
        this.map.addControl(this.overlay)
        this.loading = false
      })

      this.map.on('error', e => {
        console.error('[DeckArcLayer]', e)
        this.error = 'Mapbox error — check your token in config.js'
        this.loading = false
      })
    },

    buildLayers(features) {
      const arcWidth = this.applied.arcWidth

      // Layer 1: CD office dots (always shown as white dots)
      const cdLayer = new ScatterplotLayer({
        id:              'cd-offices',
        data:            this.cdFeatures,
        getPosition:     f => f.geometry.coordinates,
        getFillColor:    [255, 255, 255, 220],
        getRadius:       400,
        radiusMinPixels: 5,
        radiusMaxPixels: 12,
        stroked:         true,
        getLineColor:    [255, 255, 255, 255],
        lineWidthMinPixels: 2,
        pickable:        true,
        onHover: ({ object, x, y }) => {
          const el = document.getElementById('arc-tooltip')
          if (!el) return
          if (object) {
            el.style.display = 'block'
            el.style.left = x + 'px'
            el.style.top  = y + 'px'
            el.innerHTML = `
              <div class="tt-title">${object.properties.name}</div>
              <div class="tt-row">Council District Office</div>
            `
          } else { el.style.display = 'none' }
        },
      })

      // Layer 2: Arcs from request location to CD office
      const arcLayer = new ArcLayer({
        id:             'requests-arc',
        data:           features,

        // Source: the 311 request location
        getSourcePosition: f => [f.properties.src_lon, f.properties.src_lat],

        // Target: the assigned CD office
        getTargetPosition: f => [f.properties.tgt_lon, f.properties.tgt_lat],

        // Color source end by request type
        getSourceColor: f => [
          ...(TYPE_COLOR[f.properties.request_type] ?? [200, 200, 200]),
          160,
        ],

        // Color target end white so all arcs converge visibly at offices
        getTargetColor: [255, 255, 255, 80],

        getWidth:   arcWidth,
        getHeight:  0.3,     // arc curvature (0 = straight, 1 = very curved)
        pickable:   true,

        onHover: ({ object, x, y }) => {
          const el = document.getElementById('arc-tooltip')
          if (!el) return
          if (object) {
            const p = object.properties
            el.style.display = 'block'
            el.style.left = x + 'px'
            el.style.top  = y + 'px'
            el.innerHTML = `
              <div class="tt-title">${p.request_type}</div>
              <div class="tt-row">📍 ${p.address}</div>
              <div class="tt-row">🏛 ${p.cd_name}</div>
              <div class="tt-row">📅 ${p.created_date} · ${p.status}</div>
              ${p.nc_name ? `<div class="tt-row">🏘 ${p.nc_name}</div>` : ''}
            `
          } else { el.style.display = 'none' }
        },
      })

      return [cdLayer, arcLayer]
    },

    updateLayers(features) {
      if (!this.overlay) return
      this.overlay.setProps({ layers: this.buildLayers(features) })
    },

    // ── Controls ────────────────────────────────────────────────────
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
.map-container { width: 100%; height: 560px; }

.map-overlay {
  position: absolute; inset: 0;
  background: rgba(15, 15, 25, 0.6);
  z-index: 10;
}

.filter-bar { background: #f8fafc; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-label {
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: #64748b;
}
.month-select { width: 72px; }

.pill-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 11px; border-radius: 999px;
  border: 1.5px solid #e2e8f0; background: #fff;
  font-size: 0.75rem; font-weight: 500; color: #475569;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
  opacity: 0.45;
}
.pill-btn.active  { opacity: 1; }
.pill-btn:hover   { border-color: #94a3b8; color: #1e293b; opacity: 1; }
.pill-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-pill.active { border-color: #0ea5e9; background: #f0f9ff; color: #0369a1; }

.legend {
  min-width: 170px; font-size: 0.75rem;
  pointer-events: none; z-index: 5;
}
.legend-title { font-weight: 600; font-size: 0.78rem; color: #1e293b; }
.legend-row { font-size: 0.72rem; color: #334155; transition: opacity 0.2s; }
.legend-row--dim { opacity: 0.25; }

.legend-arc {
  display: inline-block;
  width: 20px; height: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-dot-cd {
  display: inline-block;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: white;
  border: 2px solid white;
  flex-shrink: 0;
}
</style>

<style>
#arc-tooltip {
  display: none; position: fixed; z-index: 999; pointer-events: none;
  background: #1e293b; color: #f1f5f9; border-radius: 8px;
  padding: 10px 14px; font-size: 0.78rem; max-width: 280px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
#arc-tooltip .tt-title { font-weight: 600; margin-bottom: 6px; color: #f8fafc; }
#arc-tooltip .tt-row   { color: #94a3b8; margin-bottom: 3px; }
</style>