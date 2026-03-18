<template>
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent border-bottom d-flex align-items-center gap-2 flex-wrap">
      <span class="fw-semibold">Building Permit Density · 2020–2025</span>

      <div class="d-flex flex-wrap gap-1 ms-2">
        <button
          v-for="t in permitTypes"
          :key="t.key"
          class="pill-btn"
          :class="{ active: activeTypes.has(t.key) }"
          @click="toggleType(t.key)"
        >
          <span class="pill-dot" :style="{ background: t.color }"></span>
          {{ t.label }}
        </button>
      </div>

      <span class="badge text-bg-light border ms-auto">deck.gl ScatterplotLayer</span>
    </div>

    <div class="card-body p-0 position-relative">
      <div ref="mapContainer" class="map-container"></div>

      <div class="legend position-absolute bottom-0 start-0 m-3 p-2
                  bg-white bg-opacity-90 rounded shadow-sm">
        <div class="legend-title mb-2">Permit type</div>
        <div v-for="t in permitTypes" :key="t.key"
             class="d-flex align-items-center gap-2 mb-1 legend-row">
          <span class="legend-dot" :style="{ background: t.color }"></span>
          <span>{{ t.label }}</span>
        </div>
        <div class="mt-2 text-muted" style="font-size:0.7rem">
          {{ visibleCount.toLocaleString() }} permits shown
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

      <!-- Tooltip rendered by deck.gl onHover -->
      <div id="deck-tooltip"></div>
    </div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ScatterplotLayer } from '@deck.gl/layers'
import { PAGE4 } from '../config.js'

// One color per permit type [r, g, b]
const PERMIT_TYPES = [
  { key: 'Bldg-New',          label: 'New Building',   color: '#f97316', rgb: [249, 115,  22] },
  { key: 'Bldg-Alter/Repair', label: 'Alter / Repair', color: '#3b82f6', rgb: [ 59, 130, 246] },
  { key: 'Bldg-Addition',     label: 'Addition',       color: '#22c55e', rgb: [ 34, 197,  94] },
  { key: 'Swimming-Pool/Spa', label: 'Pool / Spa',     color: '#a855f7', rgb: [168,  85, 247] },
  { key: 'Bldg-Demolition',   label: 'Demolition',     color: '#ef4444', rgb: [239,  68,  68] },
]

const COLOR_MAP = Object.fromEntries(PERMIT_TYPES.map(t => [t.key, t.rgb]))

export default {
  name: 'DeckHeatmap',

  data() {
    return {
      overlay:      null,
      map:          null,
      allFeatures:  [],
      activeTypes:  new Set(PERMIT_TYPES.map(t => t.key)),
      permitTypes:  PERMIT_TYPES,
      loading:      true,
      error:        null,
      visibleCount: 0,
    }
  },

  computed: {
    visibleFeatures() {
      return this.allFeatures.filter(
        f => this.activeTypes.has(f.properties.permit_type)
      )
    },
  },

  watch: {
    visibleFeatures(features) {
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

      // ── 1. Fetch data ──────────────────────────────────────────────
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

      // ── 2. Init Mapbox ─────────────────────────────────────────────
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

      // ── 3. Add deck.gl overlay ─────────────────────────────────────
      // interleaved: true shares Mapbox's WebGL context — no canvas fight.
      // ScatterplotLayer is used instead of HeatmapLayer because HeatmapLayer
      // has a confirmed rendering bug in deck.gl v9 with MapboxOverlay.
      this.map.on('load', () => {
        this.overlay = new MapboxOverlay({
          interleaved: true,
          layers: [this.buildScatterLayer(this.visibleFeatures)],
        })
        this.map.addControl(this.overlay)
        this.loading = false
      })

      this.map.on('error', e => {
        console.error('[DeckHeatmap]', e)
        this.error = 'Mapbox error — check your token in config.js'
        this.loading = false
      })
    },

    buildScatterLayer(features) {
      return new ScatterplotLayer({
        id:              'permits',
        data:            features,
        getPosition:     f => f.geometry.coordinates,
        getFillColor:    f => [
          ...(COLOR_MAP[f.properties.permit_type] ?? [200, 200, 200]),
          60,   // alpha — low so overlapping points accumulate visually
        ],
        getRadius:       40,        // metres
        radiusMinPixels: 2,
        radiusMaxPixels: 8,
        pickable:        true,
        stroked:         false,
        onHover: ({ object, x, y }) => {
          const tooltip = document.getElementById('deck-tooltip')
          if (object) {
            const p = object.properties
            tooltip.style.display = 'block'
            tooltip.style.left    = x + 'px'
            tooltip.style.top     = y + 'px'
            tooltip.innerHTML = `
              <div class="tt-title">${p.address}</div>
              <div class="tt-row">${p.permit_type} · ${p.use_desc}</div>
              <div class="tt-row">Issued: ${p.issue_date} · Status: ${p.status}</div>
              <div class="tt-row">Valuation: $${(p.valuation ?? 0).toLocaleString()}</div>
              <div class="tt-desc">${p.work_desc}</div>
            `
          } else {
            tooltip.style.display = 'none'
          }
        },
      })
    },

    updateOverlay(features) {
      if (!this.overlay) return
      this.overlay.setProps({ layers: [this.buildScatterLayer(features)] })
    },

    toggleType(key) {
      const next = new Set(this.activeTypes)
      if (next.has(key)) {
        if (next.size === 1) return
        next.delete(key)
      } else {
        next.add(key)
      }
      this.activeTypes = next
    },
  },
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 580px;
}
.map-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 15, 25, 0.6);
  z-index: 10;
}
.legend {
  min-width: 150px;
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 5;
}
.legend-title {
  font-weight: 600;
  font-size: 0.78rem;
  color: #1e293b;
}
.legend-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.legend-row { font-size: 0.72rem; color: #334155; }

.pill-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.75rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  opacity: 0.45;
}
.pill-btn.active  { opacity: 1; border-color: #94a3b8; }
.pill-btn:hover   { border-color: #94a3b8; color: #1e293b; }
.pill-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>

<style>
#deck-tooltip {
  display: none;
  position: fixed;
  z-index: 999;
  pointer-events: none;
  background: #1e293b;
  color: #f1f5f9;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.78rem;
  max-width: 280px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
#deck-tooltip .tt-title { font-weight:600; margin-bottom:4px; color:#f8fafc; }
#deck-tooltip .tt-row   { color:#94a3b8; margin-bottom:2px; }
#deck-tooltip .tt-desc  { color:#64748b; margin-top:4px; font-size:0.72rem; }
</style>