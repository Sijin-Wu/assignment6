<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-2">Page 2: D3 &amp; Vega City Maps</h2>
      <p class="page-description mb-3">
        Neighborhood-level choropleth maps of {{ cityName }} powered by local GeoJSON and indicator data.
      </p>

      <!-- Controls Card -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-12 col-lg-5">
              <label for="city-indicator-select" class="form-label fw-semibold">Indicator</label>
              <select
                id="city-indicator-select"
                class="form-select"
                v-model="selectedIndicator"
              >
                <option
                  v-for="opt in indicatorOptions"
                  :key="opt.key"
                  :value="opt.key"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="col-12 col-lg-7 d-flex align-items-end gap-3">
              <div class="flex-grow-1">
                <label class="form-label fw-semibold mb-1">Status</label>
                <div class="d-flex gap-2 align-items-center">
                  <span
                    class="badge"
                    :class="dataLoaded ? 'text-bg-success' : 'text-bg-secondary'"
                  >
                    {{ dataLoaded ? 'Data loaded' : 'Loading…' }}
                  </span>
                  <span v-if="dataLoaded" class="text-muted small">
                    {{ neighborhoodCount }} neighborhoods · {{ cityName }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Map Grid -->
      <div class="row g-4">
        <!-- D3 City Choropleth -->
        <div class="col-12 col-xl-6">
          <D3CityMap
            :geo-data="geoData"
            :indicator-data="indicatorData"
            :indicator="currentIndicatorMeta"
            :join-key="joinKey"
          />
        </div>

        <!-- Vega-Embed City Choropleth -->
        <div class="col-12 col-xl-6">
          <VegaCityMap
            :geo-data="geoData"
            :indicator-data="indicatorData"
            :indicator="currentIndicatorMeta"
            :join-key="joinKey"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import D3CityMap from '../components/D3CityMap.vue'
import VegaCityMap from '../components/VegaCityMap.vue'

// ---------------------------------------------------------------------------
// NYC Community Districts — Housing Database
// GeoJSON join key: 'commntydst'  (matches CSV column of same name)
// Data files live in /public/data/nyc/
// ---------------------------------------------------------------------------
const CITY_NAME = 'New York City'
const JOIN_KEY  = 'commntydst'   // property in the cleaned GeoJSON features

const INDICATOR_OPTIONS = [
  // Annual housing unit completions (net class A units)
  { key: 'comp2024', label: 'Units Completed 2024',        unit: 'units', format: ',.0f' },
  { key: 'comp2023', label: 'Units Completed 2023',        unit: 'units', format: ',.0f' },
  { key: 'comp2022', label: 'Units Completed 2022',        unit: 'units', format: ',.0f' },
  { key: 'comp2021', label: 'Units Completed 2021',        unit: 'units', format: ',.0f' },
  { key: 'comp2020', label: 'Units Completed 2020',        unit: 'units', format: ',.0f' },
  { key: 'comp2019', label: 'Units Completed 2019',        unit: 'units', format: ',.0f' },
  { key: 'comp2018', label: 'Units Completed 2018',        unit: 'units', format: ',.0f' },
  { key: 'comp2017', label: 'Units Completed 2017',        unit: 'units', format: ',.0f' },
  { key: 'comp2016', label: 'Units Completed 2016',        unit: 'units', format: ',.0f' },
  { key: 'comp2015', label: 'Units Completed 2015',        unit: 'units', format: ',.0f' },
  // Pipeline status (as of latest data)
  { key: 'cenunits20', label: 'Census Housing Units 2020', unit: 'units', format: ',.0f' },
  { key: 'filed',      label: 'Filed Applications',        unit: 'units', format: ',.0f' },
  { key: 'permitted',  label: 'Permitted Units',           unit: 'units', format: ',.0f' },
]
// ---------------------------------------------------------------------------

export default {
  name: 'Page2',
  components: {
    D3CityMap,
    VegaCityMap
  },

  data() {
    return {
      cityName: CITY_NAME,
      joinKey: JOIN_KEY,
      indicatorOptions: INDICATOR_OPTIONS,
      selectedIndicator: INDICATOR_OPTIONS[0].key,

      // Raw loaded data
      geoData: null,       // parsed GeoJSON FeatureCollection
      indicatorRows: [],   // array of { id, median_income, population, … }

      loading: false,
      error: null
    }
  },

  computed: {
    dataLoaded() {
      return this.geoData !== null && this.indicatorRows.length > 0
    },
    neighborhoodCount() {
      return this.geoData?.features?.length ?? 0
    },
    currentIndicatorMeta() {
      return this.indicatorOptions.find(o => o.key === this.selectedIndicator)
        ?? this.indicatorOptions[0]
    },
    /**
     * indicatorData: Map<id, number> — keyed by the JOIN_KEY value,
     * value is the numeric indicator for the currently selected column.
     */
    indicatorData() {
      if (!this.indicatorRows.length) return new Map()
      const key = this.selectedIndicator
      return new Map(
        this.indicatorRows.map(row => [String(row.id), +row[key]])
      )
    }
  },

  async created() {
    await this.loadData()
  },

  methods: {
    async loadData() {
      this.loading = true
      this.error = null
      try {
        // Files must be placed at:
        //   <project-root>/public/data/nyc/city-neighborhoods.geojson
        //   <project-root>/public/data/nyc/city-indicator.csv
        const [geoRes, csvRes] = await Promise.all([
          fetch('/data/nyc/city-neighborhoods.geojson'),
          fetch('/data/nyc/housing-units.csv')
        ])

        if (!geoRes.ok) throw new Error(`GeoJSON fetch failed: ${geoRes.status}`)
        if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`)

        this.geoData = await geoRes.json()

        const csvText = await csvRes.text()
        this.indicatorRows = this.parseCSV(csvText)
      } catch (err) {
        console.error('[Page2] data load error:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * CSV parser that handles comma-formatted numbers (e.g. "1,598").
     * The NYC housing CSV uses quoted or unquoted comma-thousands separators.
     * Uses d3.csvParse if available, otherwise falls back to a manual split.
     */
    parseCSV(text) {
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      return lines.slice(1).map(line => {
        // Handle quoted fields (e.g. "41,977") by parsing properly
        const vals = []
        let inQuotes = false
        let cur = ''
        for (const ch of line) {
          if (ch === '"') { inQuotes = !inQuotes }
          else if (ch === ',' && !inQuotes) { vals.push(cur.trim()); cur = '' }
          else { cur += ch }
        }
        vals.push(cur.trim())

        const row = {}
        headers.forEach((h, i) => {
          const raw = vals[i] ?? ''
          if (i === 0) {
            row[h] = raw  // commntydst — keep as string for join
          } else {
            // Strip thousands commas, then cast to number
            row[h] = raw === '' ? NaN : Number(raw.replace(/,/g, ''))
          }
        })
        row.id = row[headers[0]]  // alias first col as "id" for the join
        return row
      })
    }
  }
}
</script>

<style scoped>
.page-description {
  color: #57534e;
}
</style>