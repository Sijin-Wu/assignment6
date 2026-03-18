<template>
  <div class="card border-0 shadow-sm">

    <!-- ── Header: title + type pills ─────────────────────────────────── -->
    <div class="card-header bg-transparent border-bottom d-flex align-items-center gap-2 flex-wrap">
      <span class="fw-semibold">Building Permit Density · {{ yearLabel }}</span>

      <div class="d-flex flex-wrap gap-1 ms-2">
        <button
          v-for="t in permitTypes" :key="t.key"
          class="pill-btn" :class="{ active: draft.types.has(t.key) }"
          @click="toggleDraftType(t.key)"
        >
          <span class="pill-dot" :style="{ background: t.color }"></span>
          {{ t.label }}
        </button>
      </div>

      <span class="badge text-bg-light border ms-auto">deck.gl ScatterplotLayer</span>
    </div>

    <!-- ── Filter bar ──────────────────────────────────────────────────── -->
    <div class="filter-bar border-bottom px-3 py-2 d-flex flex-wrap align-items-end gap-3">

      <!-- Year range -->
      <div class="filter-group">
        <label class="filter-label">Year range</label>
        <div class="d-flex align-items-center gap-2">
          <select class="form-select form-select-sm year-select" v-model.number="draft.yearMin">
            <option v-for="y in years" :key="y" :value="y"
                    :disabled="y > draft.yearMax">{{ y }}</option>
          </select>
          <span class="text-muted small">–</span>
          <select class="form-select form-select-sm year-select" v-model.number="draft.yearMax">
            <option v-for="y in years" :key="y" :value="y"
                    :disabled="y < draft.yearMin">{{ y }}</option>
          </select>
        </div>
      </div>

      <!-- Status -->
      <div class="filter-group">
        <label class="filter-label">Status</label>
        <div class="d-flex gap-1">
          <button
            v-for="s in statusGroups" :key="s.key"
            class="pill-btn status-pill"
            :class="{ active: draft.statuses.has(s.key) }"
            @click="toggleDraftStatus(s.key)"
          >{{ s.label }}</button>
        </div>
      </div>

      <!-- Valuation bucket -->
      <div class="filter-group">
        <label class="filter-label">Valuation</label>
        <div class="d-flex gap-1 flex-wrap">
          <button
            v-for="v in valuationBuckets" :key="v.key"
            class="pill-btn val-pill"
            :class="{ active: draft.valuation === v.key }"
            @click="draft.valuation = v.key"
          >{{ v.label }}</button>
        </div>
      </div>

      <!-- Apply + Reset -->
      <div class="filter-group ms-auto d-flex gap-2 align-items-end">
        <button class="btn btn-sm btn-outline-secondary" @click="resetFilters">
          Reset
        </button>
        <button class="btn btn-sm btn-primary" @click="applyFilters">
          Apply
          <span v-if="pendingChanges" class="badge bg-warning text-dark ms-1">●</span>
        </button>
      </div>

    </div>

    <!-- ── Map + legend ────────────────────────────────────────────────── -->
    <div class="card-body p-0 position-relative">
      <div ref="mapContainer" class="map-container"></div>

      <div class="legend position-absolute bottom-0 start-0 m-3 p-2
                  bg-white bg-opacity-90 rounded shadow-sm">
        <div class="legend-title mb-2">Permit type</div>
        <div v-for="t in permitTypes" :key="t.key"
             class="d-flex align-items-center gap-2 mb-1 legend-row"
             :class="{ 'legend-row--dim': !applied.types.has(t.key) }">
          <span class="legend-dot" :style="{ background: t.color }"></span>
          <span>{{ t.label }}</span>
        </div>
        <hr class="my-2">
        <div class="text-muted" style="font-size:0.7rem">
          <strong>{{ visibleCount.toLocaleString() }}</strong> permits shown
        </div>
        <div class="text-muted" style="font-size:0.68rem">
          {{ applied.yearMin }}–{{ applied.yearMax }} ·
          {{ [...applied.statuses].join(', ') }}
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

      <div id="deck-tooltip"></div>
    </div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapboxOverlay }  from '@deck.gl/mapbox'
import { ScatterplotLayer } from '@deck.gl/layers'
import { PAGE4 } from '../config.js'

const PERMIT_TYPES = [
  { key: 'Bldg-New',          label: 'New Building',   color: '#f97316', rgb: [249, 115,  22] },
  { key: 'Bldg-Alter/Repair', label: 'Alter / Repair', color: '#3b82f6', rgb: [ 59, 130, 246] },
  { key: 'Bldg-Addition',     label: 'Addition',       color: '#22c55e', rgb: [ 34, 197,  94] },
  { key: 'Swimming-Pool/Spa', label: 'Pool / Spa',     color: '#a855f7', rgb: [168,  85, 247] },
  { key: 'Bldg-Demolition',   label: 'Demolition',     color: '#ef4444', rgb: [239,  68,  68] },
]
const COLOR_MAP = Object.fromEntries(PERMIT_TYPES.map(t => [t.key, t.rgb]))

const STATUS_GROUPS = [
  {
    key: 'Active', label: 'Active',
    statuses: new Set(['Issued','CofO in Progress','Re-Activate Permit',
                       'OK for CofC','OK to Issue CofC','CofO Reactivated',
                       'Refund in Progress']),
  },
  {
    key: 'Completed', label: 'Completed',
    statuses: new Set(['Permit Finaled','CofO Issued','CofC Issued',
                       'CofO Corrected','Intent to Correct CofC']),
  },
  {
    key: 'Closed', label: 'Closed',
    statuses: new Set(['Permit Expired','Permit Closed','Intent to Revoke']),
  },
]

const VALUATION_BUCKETS = [
  { key: 'any',  label: 'Any',       min: 0,         max: Infinity },
  { key: 'xs',   label: '< $10k',    min: 0,         max: 10_000   },
  { key: 'sm',   label: '$10k–100k', min: 10_000,    max: 100_000  },
  { key: 'md',   label: '$100k–1M',  min: 100_000,   max: 1_000_000},
  { key: 'lg',   label: '> $1M',     min: 1_000_000, max: Infinity },
]

const buildYearOptions = () => {
  const min = Number(PAGE4?.yearRange?.min)
  const max = Number(PAGE4?.yearRange?.max)
  const safeMin = Number.isFinite(min) ? min : 2022
  const safeMax = Number.isFinite(max) ? max : 2025
  const lo = Math.min(safeMin, safeMax)
  const hi = Math.max(safeMin, safeMax)
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
}

const YEARS = buildYearOptions()

function defaultDraft() {
  const firstYear = YEARS[0]
  const lastYear = YEARS[YEARS.length - 1]
  return {
    types:     new Set(PERMIT_TYPES.map(t => t.key)),
    yearMin:   firstYear,
    yearMax:   lastYear,
    statuses:  new Set(['Active', 'Completed', 'Closed']),
    valuation: 'any',
  }
}

export default {
  name: 'DeckHeatmap',

  data() {
    const d = defaultDraft()
    return {
      overlay:      null,
      map:          null,
      allFeatures:  [],
      loading:      true,
      error:        null,
      visibleCount: 0,

      permitTypes:      PERMIT_TYPES,
      statusGroups:     STATUS_GROUPS,
      valuationBuckets: VALUATION_BUCKETS,
      years:            YEARS,

      // draft = what the user is editing in the filter bar (not yet applied)
      draft:   d,
      // applied = what's currently rendered on the map
      applied: { ...d, types: new Set(d.types), statuses: new Set(d.statuses) },
    }
  },

  computed: {
    yearLabel() {
      return `${this.years[0]}–${this.years[this.years.length - 1]}`
    },

    // True when draft differs from applied — shows the ● badge on Apply
    pendingChanges() {
      const a = this.applied, d = this.draft
      if (a.yearMin !== d.yearMin || a.yearMax !== d.yearMax) return true
      if (a.valuation !== d.valuation) return true
      if ([...d.types].some(t => !a.types.has(t)))    return true
      if ([...a.types].some(t => !d.types.has(t)))    return true
      if ([...d.statuses].some(s => !a.statuses.has(s))) return true
      if ([...a.statuses].some(s => !d.statuses.has(s))) return true
      return false
    },

    filteredFeatures() {
      const { types, yearMin, yearMax, statuses, valuation } = this.applied
      const bucket = VALUATION_BUCKETS.find(b => b.key === valuation)
                     ?? VALUATION_BUCKETS[0]

      // Build a flat Set of raw status strings that match selected groups
      const statusSet = new Set()
      STATUS_GROUPS.forEach(g => {
        if (statuses.has(g.key)) g.statuses.forEach(s => statusSet.add(s))
      })

      return this.allFeatures.filter(f => {
        const p = f.properties

        // Type filter
        if (!types.has(p.permit_type)) return false

        // Year filter — issue_date is MM/DD/YYYY
        const yr = parseInt(p.issue_date?.split('/')?.[2] ?? '0', 10)
        if (yr < yearMin || yr > yearMax) return false

        // Status filter
        if (!statusSet.has(p.status)) return false

        // Valuation filter
        const val = p.valuation ?? 0
        if (val < bucket.min || val >= bucket.max) return false

        return true
      })
    },
  },

  watch: {
    filteredFeatures(features) {
      this.visibleCount = features.length
      this.updateOverlay(features)
    },
  },

  mounted() {
    this.init()
  },

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

      let geojson
      try {
        const res = await fetch(PAGE4.dataPath)
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        geojson = await res.json()
      } catch (err) {
        this.error   = err.message
        this.loading = false
        return
      }

      this.allFeatures  = geojson.features ?? []
      this.visibleCount = this.allFeatures.length

      mapboxgl.accessToken = PAGE4.mapboxToken
      this.map = new mapboxgl.Map({
        container: this.$refs.mapContainer,
        style:     'mapbox://styles/mapbox/dark-v11',
        center:    PAGE4.center,
        zoom:      PAGE4.zoom,
        antialias: true,
      })
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-right')

      this.map.on('load', () => {
        this.overlay = new MapboxOverlay({
          interleaved: true,
          layers: [this.buildLayer(this.filteredFeatures)],
        })
        this.map.addControl(this.overlay)
        this.visibleCount = this.filteredFeatures.length
        this.loading = false
      })

      this.map.on('error', e => {
        console.error('[DeckHeatmap]', e)
        this.error = 'Mapbox error — check your token in config.js'
        this.loading = false
      })
    },

    buildLayer(features) {
      return new ScatterplotLayer({
        id:              'permits',
        data:            features,
        getPosition:     f => f.geometry.coordinates,
        getFillColor:    f => [...(COLOR_MAP[f.properties.permit_type] ?? [200,200,200]), 70],
        getRadius:       40,
        radiusMinPixels: 2,
        radiusMaxPixels: 8,
        pickable:        true,
        stroked:         false,
        onHover: ({ object, x, y }) => {
          const el = document.getElementById('deck-tooltip')
          if (!el) return
          if (object) {
            const p = object.properties
            el.style.display = 'block'
            el.style.left    = x + 'px'
            el.style.top     = y + 'px'
            el.innerHTML = `
              <div class="tt-title">${p.address}</div>
              <div class="tt-row">${p.permit_type} · ${p.use_desc}</div>
              <div class="tt-row">Issued: ${p.issue_date} · ${p.status}</div>
              <div class="tt-row">Valuation: $${(p.valuation ?? 0).toLocaleString()}</div>
              <div class="tt-desc">${p.work_desc}</div>
            `
          } else {
            el.style.display = 'none'
          }
        },
      })
    },

    updateOverlay(features) {
      if (!this.overlay) return
      this.overlay.setProps({ layers: [this.buildLayer(features)] })
    },

    // ── Draft manipulation ─────────────────────────────────────────────
    toggleDraftType(key) {
      const next = new Set(this.draft.types)
      if (next.has(key)) { if (next.size === 1) return; next.delete(key) }
      else next.add(key)
      this.draft = { ...this.draft, types: next }
    },

    toggleDraftStatus(key) {
      const next = new Set(this.draft.statuses)
      if (next.has(key)) { if (next.size === 1) return; next.delete(key) }
      else next.add(key)
      this.draft = { ...this.draft, statuses: next }
    },

    // ── Apply / Reset ──────────────────────────────────────────────────
    applyFilters() {
      this.applied = {
        ...this.draft,
        types:    new Set(this.draft.types),
        statuses: new Set(this.draft.statuses),
      }
    },

    resetFilters() {
      const d = defaultDraft()
      this.draft   = d
      this.applied = { ...d, types: new Set(d.types), statuses: new Set(d.statuses) }
    },
  },
}
</script>

<style scoped>
.map-container { width:100%; height:540px; }

.map-overlay {
  position:absolute; inset:0;
  background:rgba(15,15,25,0.6);
  z-index:10;
}

/* Filter bar */
.filter-bar { background:#f8fafc; }
.filter-group { display:flex; flex-direction:column; gap:4px; }
.filter-label {
  font-size:0.72rem; font-weight:600;
  text-transform:uppercase; letter-spacing:0.05em;
  color:#64748b;
}

/* Shared pill base */
.pill-btn {
  display:inline-flex; align-items:center; gap:5px;
  padding:3px 11px; border-radius:999px;
  border:1.5px solid #e2e8f0; background:#fff;
  font-size:0.75rem; font-weight:500; color:#475569;
  cursor:pointer; transition:all 0.15s; white-space:nowrap;
  opacity:0.5;
}
.pill-btn.active  { opacity:1; }
.pill-btn:hover   { border-color:#94a3b8; color:#1e293b; opacity:1; }
.pill-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

/* Status pills */
.status-pill.active { border-color:#0ea5e9; background:#f0f9ff; color:#0369a1; }

/* Valuation pills */
.val-pill.active { border-color:#8b5cf6; background:#f5f3ff; color:#6d28d9; }

/* Legend */
.legend {
  min-width:160px; font-size:0.75rem;
  pointer-events:none; z-index:5;
}
.legend-title { font-weight:600; font-size:0.78rem; color:#1e293b; }
.legend-dot { width:10px; height:10px; border-radius:50%; display:inline-block; flex-shrink:0; }
.legend-row { font-size:0.72rem; color:#334155; transition:opacity 0.2s; }
.legend-row--dim { opacity:0.3; }
</style>

<style>
#deck-tooltip {
  display:none; position:fixed; z-index:999; pointer-events:none;
  background:#1e293b; color:#f1f5f9; border-radius:8px;
  padding:10px 14px; font-size:0.78rem; max-width:280px;
  box-shadow:0 4px 16px rgba(0,0,0,0.4);
}
#deck-tooltip .tt-title { font-weight:600; margin-bottom:4px; color:#f8fafc; }
#deck-tooltip .tt-row   { color:#94a3b8; margin-bottom:2px; }
#deck-tooltip .tt-desc  { color:#64748b; margin-top:4px; font-size:0.72rem; }
</style>