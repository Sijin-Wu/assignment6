<template>
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent border-bottom d-flex align-items-center gap-2 flex-wrap">
      <span class="fw-semibold">Building Permit Density · 2022–2024</span>

      <!-- Permit type filter pills -->
      <div class="d-flex flex-wrap gap-1 ms-2">
        <button
          v-for="t in permitTypes"
          :key="t.key"
          class="pill-btn"
          :class="{ active: activeTypes.has(t.key) }"
          @click="toggleType(t.key)"
        >
          {{ t.label }}
        </button>
      </div>

      <span class="badge text-bg-light border ms-auto">deck.gl HeatmapLayer</span>
    </div>

    <div class="card-body p-0 position-relative">
      <!-- Map container — deck.gl renders into this via the Mapbox overlay -->
      <div ref="mapContainer" class="map-container"></div>

      <!-- Custom legend -->
      <div class="legend position-absolute bottom-0 start-0 m-3 p-2
                  bg-white bg-opacity-90 rounded shadow-sm">
        <div class="legend-title mb-1">Permit density</div>
        <div class="legend-bar"></div>
        <div class="d-flex justify-content-between legend-labels">
          <span>Low</span>
          <span>High</span>
        </div>
        <div class="mt-2 text-muted" style="font-size:0.7rem">
          {{ visibleCount.toLocaleString() }} points rendered (from {{ rawCount.toLocaleString() }} permits)
        </div>
      </div>

      <!-- Loading overlay -->
      <div v-if="loading" class="map-overlay d-flex align-items-center justify-content-center">
        <div class="spinner-border text-secondary" role="status">
          <span class="visually-hidden">Loading…</span>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="map-overlay d-flex align-items-center justify-content-center">
        <div class="alert alert-danger m-3">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { PAGE4 } from '../config.js'

const PERMIT_TYPES = [
  { key: 'Bldg-New',         label: 'New Building' },
  { key: 'Bldg-Alter/Repair',label: 'Alter / Repair' },
  { key: 'Bldg-Addition',    label: 'Addition' },
  { key: 'Swimming-Pool/Spa',label: 'Pool / Spa' },
  { key: 'Bldg-Demolition',  label: 'Demolition' },
]

export default {
  name: 'DeckHeatmap',

  data() {
    return {
      map:          null,
      deckOverlay:  null,
      allFeatures:  [],       // filtered + normalized point rows
      rawCount:     0,
      activeTypes:  new Set(PERMIT_TYPES.map(t => t.key)),  // all on by default
      permitTypes:  PERMIT_TYPES,
      loading:      true,
      error:        null,
      visibleCount: 0,
    }
  },

  computed: {
    // Filter features to only the active permit types
    visibleFeatures() {
      return this.allFeatures.filter(
        f => this.activeTypes.has(f.permitType)
      )
    },
  },

  watch: {
    visibleFeatures(features) {
      this.visibleCount = features.length
      this.updateDeckLayer(features)
    },
  },

  mounted() {
    this.initMap()
  },

  beforeUnmount() {
    this.deckOverlay?.finalize()
    this.map?.remove()
  },

  methods: {
    async initMap() {
      this.loading = true
      this.error   = null

      // ── 1. Load GeoJSON ─────────────────────────────────────────────
      let geojson
      try {
        const res = await fetch(PAGE4.dataPath)
        if (!res.ok) throw new Error(`Fetch failed: ${res.status} — check dataPath in config.js`)
        geojson = await res.json()
      } catch (err) {
        this.error   = err.message
        this.loading = false
        return
      }

      const source = geojson.features ?? []
      this.rawCount = source.length

      // Normalize/validate input points for deck.gl (avoids silent no-render cases).
      const normalized = source
        .map((f) => {
          const c = f?.geometry?.coordinates
          const permitType = f?.properties?.permit_type
          if (!Array.isArray(c) || c.length < 2) return null
          const lng = Number(c[0])
          const lat = Number(c[1])
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
          if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null

          const w = PAGE4.weightProperty
            ? Number(f?.properties?.[PAGE4.weightProperty])
            : 1

          return {
            position: [lng, lat],
            permitType,
            weight: Number.isFinite(w) && w > 0 ? w : 1,
          }
        })
        .filter(Boolean)

      // GPU heatmap can fail silently on very large point sets on some machines.
      // Keep a representative sample for rendering stability.
      const MAX_RENDER_POINTS = 80000
      const step = normalized.length > MAX_RENDER_POINTS
        ? Math.ceil(normalized.length / MAX_RENDER_POINTS)
        : 1
      this.allFeatures = step === 1
        ? normalized
        : normalized.filter((_, idx) => idx % step === 0)

      this.visibleCount = this.allFeatures.length

      // ── 2. Init Mapbox ──────────────────────────────────────────────
      mapboxgl.accessToken = PAGE4.mapboxToken

      this.map = new mapboxgl.Map({
        container:  this.$refs.mapContainer,
        style:      'mapbox://styles/mapbox/dark-v11',  // dark base suits heatmap
        center:     PAGE4.center,
        zoom:       PAGE4.zoom,
        antialias:  true,
      })

      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      this.map.addControl(new mapboxgl.ScaleControl(),      'bottom-right')

      // ── 3. Mount deck.gl overlay once map style is ready ───────────
      this.map.on('load', () => {
        // Pass the initial layer directly into the constructor — this ensures
        // deck.gl has the layer registered before the control is added to Mapbox
        const initialLayer = this.buildHeatmapLayer(this.visibleFeatures)
        this.deckOverlay = new MapboxOverlay({ interleaved: true, layers: [initialLayer] })
        this.map.addControl(this.deckOverlay)
        this.visibleCount = this.visibleFeatures.length
        this.loading = false
      })

      this.map.on('error', e => {
        console.error('[DeckHeatmap]', e)
        this.error   = 'Mapbox error — check your token in config.js'
        this.loading = false
      })
    },

    // Build a fresh HeatmapLayer from a feature array
    buildHeatmapLayer(features) {
      return new HeatmapLayer({
        id:           'building-heatmap',
        data:         features,
        getPosition:  d => d.position,
        getWeight:    d => d.weight,
        radiusPixels: 52,
        intensity:    1.45,
        threshold:    0,
        colorDomain:  [0, 1],
        aggregation:  'SUM',
        colorRange: [
          [0,   0,   255],
          [0,   255, 200],
          [255, 220, 0  ],
          [255, 80,  0  ],
          [255, 0,   0  ],
        ],
      })
    },

    updateDeckLayer(features) {
      if (!this.deckOverlay) return
      this.deckOverlay.setProps({ layers: [this.buildHeatmapLayer(features)] })
    },

    toggleType(key) {
      // Vue can't detect Set mutations directly — rebuild the Set
      const next = new Set(this.activeTypes)
      if (next.has(key)) {
        if (next.size === 1) return   // keep at least one type active
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

/* Legend */
.legend {
  min-width: 160px;
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 5;
}
.legend-title {
  font-weight: 600;
  font-size: 0.78rem;
  color: #1e293b;
}
.legend-bar {
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(to right,
    rgba(0,128,255,0.7),
    rgba(0,255,200,0.8),
    rgba(255,220,0,0.9),
    rgba(255,80,0,0.95),
    rgba(255,0,0,1)
  );
  margin-bottom: 4px;
}
.legend-labels {
  color: #64748b;
  font-size: 0.68rem;
}

/* Permit type filter pills */
.pill-btn {
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
}
.pill-btn:hover {
  border-color: #94a3b8;
  color: #1e293b;
}
.pill-btn.active {
  border-color: #f97316;
  background: #fff7ed;
  color: #c2410c;
  font-weight: 600;
}
</style>