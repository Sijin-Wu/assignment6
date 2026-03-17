<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-1">Page 2: D3 &amp; Vega City Maps</h2>
      <p class="page-description mb-4">
        Net housing units completed per community district · {{ cityName }}
      </p>

      <!-- Controls card -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body pb-2">

          <!-- ── Year timeline ─────────────────────────────────────── -->
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-baseline mb-2">
              <span class="ctrl-label">{{ timeSeriesLabel }}</span>
              <span class="selected-year-badge">{{ selectedYear }}</span>
            </div>

            <div class="timeline-track" role="group" aria-label="Select year">
              <!-- connecting line behind the dots -->
              <div class="timeline-line"></div>

              <button
                v-for="entry in years"
                :key="entry.key"
                class="timeline-stop"
                :class="{ active: selectedKey === entry.key }"
                :aria-pressed="selectedKey === entry.key"
                @click="selectYear(entry)"
              >
                <span class="timeline-dot"></span>
                <span class="timeline-label">{{ entry.year }}</span>
              </button>
            </div>
          </div>

          <!-- ── Snapshot indicator pills ──────────────────────────── -->
          <div class="d-flex flex-wrap align-items-center gap-2 pt-2 border-top">
            <span class="ctrl-label me-1">Snapshot</span>
            <button
              v-for="snap in snapshotIndicators"
              :key="snap.key"
              class="pill-btn"
              :class="{ active: selectedKey === snap.key }"
              @click="selectSnapshot(snap)"
            >
              {{ snap.label }}
            </button>

            <!-- status badge pushed to the right -->
            <span class="ms-auto">
              <span
                class="badge"
                :class="dataLoaded ? 'text-bg-success' : 'text-bg-secondary'"
              >
                {{ dataLoaded ? `${neighborhoodCount} districts loaded` : 'Loading…' }}
              </span>
            </span>
          </div>

        </div>
      </div>

      <!-- ── Map grid ───────────────────────────────────────────────── -->
      <div class="row g-4">
        <div class="col-12 col-xl-6">
          <D3CityMap
            :geo-data="geoData"
            :indicator-data="indicatorData"
            :indicator="currentMeta"
            :join-key="joinKey"
            :name-map="nameMap"
          />
        </div>
        <div class="col-12 col-xl-6">
          <VegaCityMap
            :geo-data="geoData"
            :indicator-data="indicatorData"
            :indicator="currentMeta"
            :join-key="joinKey"
            :name-map="nameMap"
          />
        </div>
      </div>

    </section>
  </div>
</template>

<script>
import D3CityMap  from '../components/D3CityMap.vue'
import VegaCityMap from '../components/VegaCityMap.vue'
import { PAGE2 }  from '../config.js'

export default {
  name: 'Page2',
  components: { D3CityMap, VegaCityMap },

  data() {
    const defaultYear = PAGE2.years.at(-1)   // start on most recent year
    return {
      cityName:           PAGE2.cityName,
      joinKey:            PAGE2.joinKey,
      timeSeriesLabel:    PAGE2.timeSeriesLabel,
      years:              PAGE2.years,
      snapshotIndicators: PAGE2.snapshotIndicators,

      // active selection — either a year entry or a snapshot entry
      selectedKey:  defaultYear.key,
      selectedYear: defaultYear.year,   // null when a snapshot is active
      isSnapshot:   false,

      // loaded data
      geoData:        null,
      indicatorRows:  [],
      crosswalkRows:  [],
      loading:        false,
      error:          null,
    }
  },

  computed: {
    dataLoaded() {
      return this.geoData !== null && this.indicatorRows.length > 0
    },
    neighborhoodCount() {
      return this.geoData?.features?.length ?? 0
    },

    /** Metadata object passed down to map components for legend / tooltip labels. */
    currentMeta() {
      if (this.isSnapshot) {
        return this.snapshotIndicators.find(s => s.key === this.selectedKey)
          ?? this.snapshotIndicators[0]
      }
      return {
        key:    this.selectedKey,
        label:  `${PAGE2.timeSeriesLabel} (${this.selectedYear})`,
        unit:   PAGE2.timeSeriesUnit,
        format: PAGE2.timeSeriesFormat,
      }
    },

    /** Map<String(boro_cd), crosswalk row> for tooltip labels. */
    nameMap() {
      const map = new Map()
      for (const row of this.crosswalkRows) {
        map.set(String(row.boro_cd), row)
      }
      return map
    },

    /** Map<districtId, number> for the currently selected column. */
    indicatorData() {
      if (!this.indicatorRows.length) return new Map()
      const key = this.selectedKey
      return new Map(
        this.indicatorRows.map(row => [String(row.id), row[key]])
      )
    },
  },

  async created() {
    await this.loadData()
  },

  methods: {
    selectYear(entry) {
      this.selectedKey  = entry.key
      this.selectedYear = entry.year
      this.isSnapshot   = false
    },
    selectSnapshot(snap) {
      this.selectedKey  = snap.key
      this.selectedYear = null
      this.isSnapshot   = true
    },

    async loadData() {
      this.loading = true
      this.error   = null
      try {
        const [geoRes, csvRes, cwRes] = await Promise.all([
          fetch(PAGE2.geoJSONPath),
          fetch(PAGE2.csvPath),
          fetch(PAGE2.crosswalkPath),
        ])
        if (!geoRes.ok) throw new Error(`GeoJSON fetch failed: ${geoRes.status}`)
        if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`)
        if (!cwRes.ok)  throw new Error(`Crosswalk fetch failed: ${cwRes.status}`)

        this.geoData       = await geoRes.json()
        this.indicatorRows = this.parseCSV(await csvRes.text())
        this.crosswalkRows = this.parseCrosswalkCSV(await cwRes.text())
      } catch (err) {
        console.error('[Page2] data load error:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Simple string-preserving CSV parser for the crosswalk (no numeric coercion).
     */
    parseCrosswalkCSV(text) {
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''))
      return lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/\r$/, ''))
        const row = {}
        headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
        return row
      })
    },

    /**
     * CSV parser that handles comma-formatted numbers (e.g. "1,598").
     * The NYC housing CSV uses quoted comma-separated thousands.
     */
    parseCSV(text) {
      const lines   = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      return lines.slice(1).map(line => {
        const vals = []
        let inQuotes = false, cur = ''
        for (const ch of line) {
          if (ch === '"')                   { inQuotes = !inQuotes }
          else if (ch === ',' && !inQuotes) { vals.push(cur.trim()); cur = '' }
          else                              { cur += ch }
        }
        vals.push(cur.trim())

        const row = {}
        headers.forEach((h, i) => {
          const raw = vals[i] ?? ''
          row[h] = i === 0 ? raw : (raw === '' ? NaN : Number(raw.replace(/,/g, '')))
        })
        row.id = row[headers[0]]
        return row
      })
    },
  },
}
</script>

<style scoped>
.page-description { color: #57534e; }

/* ── shared label ─────────────────────────────────────────────────── */
.ctrl-label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

/* ── year badge (top-right of timeline) ──────────────────────────── */
.selected-year-badge {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
  min-width: 3.5ch;
  text-align: right;
}

/* ── timeline ─────────────────────────────────────────────────────── */
.timeline-track {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px 0 0;
}

.timeline-line {
  position: absolute;
  top: 16px;           /* vertically centres on the dot */
  left: 0;
  right: 0;
  height: 2px;
  background: #e2e8f0;
  pointer-events: none;
  z-index: 0;
}

.timeline-stop {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  flex: 1;
}

.timeline-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #cbd5e1;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px #cbd5e1;
  transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
}

.timeline-stop:hover .timeline-dot {
  background: #94a3b8;
  box-shadow: 0 0 0 2px #94a3b8;
  transform: scale(1.2);
}

.timeline-stop.active .timeline-dot {
  background: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  transform: scale(1.25);
}

.timeline-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: #94a3b8;
  transition: color 0.15s, font-weight 0.15s;
  white-space: nowrap;
}

.timeline-stop:hover .timeline-label  { color: #475569; }
.timeline-stop.active .timeline-label {
  color: #1d4ed8;
  font-weight: 700;
}

/* ── snapshot pills ────────────────────────────────────────────────── */
.pill-btn {
  padding: 3px 12px;
  border-radius: 999px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.8rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
}
.pill-btn:hover {
  border-color: #94a3b8;
  background: #f1f5f9;
  color: #1e293b;
}
.pill-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}
</style>