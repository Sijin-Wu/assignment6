<template>
  <div class="map-card card border-0 shadow-sm">
    <div class="card-header bg-transparent border-bottom d-flex align-items-center gap-2">
      <span class="fw-semibold">{{ valueLabel }} · Census Tracts</span>
      <span class="badge text-bg-light border ms-auto">Mapbox GL JS</span>
    </div>

    <div class="card-body p-0 position-relative">
      <!-- Map container -->
      <div ref="mapContainer" class="map-container"></div>

      <!-- Legend -->
      <div class="legend position-absolute bottom-0 start-0 m-3 p-2 bg-white bg-opacity-90 rounded shadow-sm">
        <div class="legend-title mb-1">{{ valueLabel }}</div>
        <div class="legend-subtitle mb-1">Benchmark: {{ affordabilityBaseline }} (tolerant standard)</div>
        <div class="legend-bar"></div>
        <div class="legend-labels d-flex justify-content-between">
          <span>{{ domainMin }} (higher cost pressure)</span>
          <span>{{ domainMax }} (higher affordability)</span>
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
import { geoCentroid } from 'd3-geo'
import { PAGE3 } from '../config.js'

const RAMP_COLORS = [
  '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf',
  '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850'
]

// Planar point-in-polygon tests (lon/lat), robust to ring winding direction.
const pointInRing = (point, ring) => {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-12) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

const pointInPolygonCoordinates = (point, polygonCoords) => {
  if (!polygonCoords?.length) return false
  if (!pointInRing(point, polygonCoords[0])) return false
  // Holes exclude a point.
  for (let i = 1; i < polygonCoords.length; i += 1) {
    if (pointInRing(point, polygonCoords[i])) return false
  }
  return true
}

const containsPoint = (feature, point) => {
  const geom = feature?.geometry
  if (!geom) return false
  if (geom.type === 'Polygon') {
    return pointInPolygonCoordinates(point, geom.coordinates)
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some((poly) => pointInPolygonCoordinates(point, poly))
  }
  return false
}

export default {
  name: 'MapboxChoropleth',

  data() {
    return {
      map: null,
      loading: true,
      error: null,
      domainMin: 13,
      domainMax: 126,
      valueLabel: PAGE3.valueLabel,
      affordabilityBaseline: PAGE3.affordabilityBaseline ?? 85,
    }
  },

  mounted() {
    this.initMap()
  },

  beforeUnmount() {
    this.map?.remove()
  },

  methods: {
    async initMap() {
      this.loading = true
      this.error = null

      // ── 1. Load GeoJSON ──────────────────────────────────────────────
      let geojson
      let councilsGeojson
      try {
        const [res, ncRes] = await Promise.all([
          fetch(PAGE3.geoJSONPath),
          fetch(PAGE3.neighborhoodGeoJSONPath),
        ])
        if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`)
        if (!ncRes.ok) throw new Error(`Neighborhood councils fetch failed: ${ncRes.status}`)
        geojson = await res.json()
        councilsGeojson = await ncRes.json()
      } catch (err) {
        this.error = `Data load error: ${err.message}`
        this.loading = false
        return
      }

      // Stamp a numeric top-level id on every feature —
      // required by Mapbox setFeatureState (feature.id must be defined)
      geojson.features.forEach((f, i) => { f.id = i })

      // Spatially enrich each tract with the containing neighborhood council name.
      // If no polygon contains the tract centroid, fallback to 'Not matched'.
      const councils = councilsGeojson?.features ?? []
      geojson.features.forEach((f) => {
        const centroid = geoCentroid(f)
        const match = councils.find((nc) => containsPoint(nc, centroid))
        f.properties.neighborhood_council =
          match?.properties?.NAME ??
          match?.properties?.TOOLTIP ??
          'Not matched'
      })

      // Compute actual domain from data
      const vals = geojson.features
        .map(f => Number(f.properties[PAGE3.valueProperty]))
        .filter(v => Number.isFinite(v) && v > 0)
        .sort((a, b) => a - b)
      this.domainMin = Math.floor(Math.min(...vals))
      this.domainMax = Math.ceil(Math.max(...vals))

      const quantiles = [0.03, 0.12, 0.24, 0.38, 0.5, 0.64, 0.78, 0.9, 0.98]
      const stops = quantiles.map(q => {
        const v = vals[Math.max(0, Math.min(vals.length - 1, Math.floor(q * (vals.length - 1))))]
        return Number(v)
      })

      // ── 2. Init Mapbox ───────────────────────────────────────────────
      mapboxgl.accessToken = PAGE3.mapboxToken

      this.map = new mapboxgl.Map({
        container: this.$refs.mapContainer,
        style: 'mapbox://styles/mapbox/light-v11',
        center: PAGE3.center,
        zoom: PAGE3.zoom,
        attributionControl: true,
      })

      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-right')

      // ── 3. Add data once style is loaded ────────────────────────────
      this.map.on('load', () => {
        // Add GeoJSON source
        this.map.addSource('hai-tracts', {
          type: 'geojson',
          data: geojson,
          promoteId: { 'hai-tracts': 'id' },  // tell Mapbox to use feature.id for state
        })

        // Fill layer — color driven by hai_cy value
        this.map.addLayer({
          id: 'hai-fill',
          type: 'fill',
          source: 'hai-tracts',
          paint: {
            'fill-color': [
              'interpolate', ['linear'],
              ['get', PAGE3.valueProperty],
              ...stops.flatMap((s, i) => [s, RAMP_COLORS[i]]),
            ],
            'fill-opacity': 0.8,
          },
        })

        // Outline layer
        this.map.addLayer({
          id: 'hai-outline',
          type: 'line',
          source: 'hai-tracts',
          paint: {
            'line-color': '#ffffff',
            'line-width': 0.4,
            'line-opacity': 0.6,
          },
        })

        // Hover highlight layer (initially hidden)
        this.map.addLayer({
          id: 'hai-hover',
          type: 'fill',
          source: 'hai-tracts',
          paint: {
            'fill-color': '#000000',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.15,
              0,
            ],
          },
        })

        this.loading = false
        this.setupInteractions()
      })

      this.map.on('error', e => {
        console.error('[MapboxChoropleth]', e)
        this.error = 'Mapbox error — check your token in config.js'
        this.loading = false
      })
    },

    setupInteractions() {
      const map = this.map
      let hoveredId = null

      // Popup
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'hai-popup',
      })

      map.on('mousemove', 'hai-fill', e => {
        map.getCanvas().style.cursor = 'pointer'

        const f   = e.features[0]
        const p   = f.properties
        const hai = Number(p[PAGE3.valueProperty])
        const placeName =
          p.neighborhood_name ??
          p.neighborhood_council ??
          p.tract_name ??
          p.NAMELSAD ??
          (p.NAME && p.NAME !== p.TRACTCE ? p.NAME : null) ??
          null
        const tractName = placeName ?? 'LA Census Tract'
        const tractId = p.geoid ?? p.GEOID ?? 'N/A'
        const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

        // Feature state for hover highlight (id must be a valid number)
        if (hoveredId !== null && hoveredId !== undefined) {
          map.setFeatureState({ source: 'hai-tracts', id: hoveredId }, { hover: false })
        }
        hoveredId = f.id
        if (hoveredId !== null && hoveredId !== undefined) {
          map.setFeatureState({ source: 'hai-tracts', id: hoveredId }, { hover: true })
        }

        // Affordability label with a more tolerant benchmark.
        const baseline = PAGE3.affordabilityBaseline ?? 85
        let affordLabel = ''
        if (hai >= baseline + 10)      affordLabel = 'Higher affordability'
        else if (hai >= baseline - 10) affordLabel = 'Moderate affordability'
        else                           affordLabel = 'Higher cost pressure'

        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="popup-content">
              <div class="popup-name">${tractName}</div>
              <div class="popup-value">${PAGE3.valueLabel}: <strong>${Number.isFinite(hai) ? fmt.format(hai) : 'N/A'}</strong></div>
              <div class="popup-label">${affordLabel}</div>
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseleave', 'hai-fill', () => {
        map.getCanvas().style.cursor = ''
        if (hoveredId !== null && hoveredId !== undefined) {
          map.setFeatureState({ source: 'hai-tracts', id: hoveredId }, { hover: false })
          hoveredId = null
        }
        popup.remove()
      })
    },
  },
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 560px;
}

.map-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.7);
  z-index: 10;
}

/* Legend */
.legend {
  min-width: 260px;
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 5;
}
.legend-title {
  font-weight: 600;
  font-size: 0.78rem;
  color: #1e293b;
}
.legend-subtitle {
  font-size: 0.68rem;
  color: #64748b;
}
.legend-bar {
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(to right,
    #d73027 0%,
    #f46d43 15%,
    #fdae61 28%,
    #fee08b 43%,
    #ffffbf 58%,
    #d9ef8b 65%,
    #a6d96a 76%,
    #66bd63 87%,
    #1a9850 100%
  );
  margin-bottom: 4px;
}
.legend-labels {
  color: #64748b;
  font-size: 0.68rem;
}
</style>

<!-- Global styles for the Mapbox popup (not scoped) -->
<style>
.hai-popup .mapboxgl-popup-content {
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  font-family: system-ui, sans-serif;
  min-width: 200px;
}
.popup-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}
.popup-value {
  font-size: 0.82rem;
  color: #334155;
  margin-bottom: 2px;
}
.popup-label {
  font-size: 0.75rem;
  color: #64748b;
}
</style>