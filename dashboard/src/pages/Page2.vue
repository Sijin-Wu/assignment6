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

          <!-- ── Dataset toggle ────────────────────────────────────── -->
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="ctrl-label me-1">Dataset</span>
            <button
              class="pill-btn"
              :class="{ active: selectedDataset === 'housing' }"
              @click="switchDataset('housing')"
            >Net Housing Units</button>
            <button
              class="pill-btn"
              :class="{ active: selectedDataset === 'population' }"
              @click="switchDataset('population')"
            >Population</button>
          </div>

          <!-- ── Year timeline ─────────────────────────────────────── -->
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-baseline mb-2">
              <span class="ctrl-label">{{ activeTimeSeriesLabel }}</span>
              <span class="selected-year-badge">{{ selectedYear }}</span>
            </div>

            <div class="timeline-track" role="group" aria-label="Select year">
              <!-- connecting line behind the dots -->
              <div class="timeline-line"></div>

              <button
                v-for="entry in activeYears"
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

            <!-- Play / pause controls -->
            <div class="d-flex flex-wrap align-items-center gap-2 gap-sm-3 mt-2">
              <button
                class="btn btn-sm"
                :class="isPlaying ? 'btn-outline-danger' : 'btn-outline-primary'"
                :disabled="activeYears.length < 2 || isSnapshot"
                @click="togglePlayback"
              >
                {{ isPlaying ? 'Pause' : 'Play' }}
              </button>

              <div class="d-flex align-items-center gap-2">
                <label for="p2-speed-select" class="form-label mb-0 fw-semibold">Speed</label>
                <select
                  id="p2-speed-select"
                  class="form-select form-select-sm speed-select"
                  v-model.number="playbackSpeedMs"
                >
                  <option v-for="opt in playbackSpeedOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>

              <span class="small text-muted">
                {{ isPlaying ? 'Animating through years…' : 'Animation paused' }}
              </span>
            </div>
          </div>

          <!-- ── Snapshot indicator pills (housing only) ──────────── -->
          <div v-if="selectedDataset === 'housing'" class="d-flex flex-wrap align-items-center gap-2 pt-2 border-top">
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

      // dataset toggle: 'housing' | 'population'
      selectedDataset: 'housing',

      // active selection — either a year entry or a snapshot entry
      selectedKey:  defaultYear.key,
      selectedYear: defaultYear.year,
      isSnapshot:   false,

      // playback
      isPlaying:         false,
      playbackSpeedMs:   900,
      playbackTimerId:   null,
      playbackSpeedOptions: [
        { label: '0.5x (1800 ms)', value: 1800 },
        { label: '1x (900 ms)',    value: 900  },
        { label: '1.5x (600 ms)', value: 600  },
        { label: '2x (450 ms)',   value: 450  },
        { label: '3x (300 ms)',   value: 300  }
      ],

      // loaded data
      geoData:        null,
      indicatorRows:  [],
      popRows:        [],
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

    activeYears() {
      return this.selectedDataset === 'population' ? PAGE2.popYears : PAGE2.years
    },

    activeTimeSeriesLabel() {
      return this.selectedDataset === 'population' ? PAGE2.popLabel : PAGE2.timeSeriesLabel
    },

    /** Metadata object passed down to map components for legend / tooltip labels. */
    currentMeta() {
      if (this.selectedDataset === 'population') {
        return {
          key:    this.selectedKey,
          label:  `${PAGE2.popLabel} (${this.selectedYear ?? ''})`,
          unit:   PAGE2.popUnit,
          format: PAGE2.popFormat,
        }
      }
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
      const rows = this.selectedDataset === 'population' ? this.popRows : this.indicatorRows
      if (!rows.length) return new Map()
      const key = this.selectedKey
      return new Map(
        rows.map(row => [String(row.id), row[key]])
      )
    },
  },

  async created() {
    await this.loadData()
  },

  watch: {
    playbackSpeedMs() {
      if (this.isPlaying) this.restartPlaybackTimer()
    }
  },

  beforeUnmount() {
    this.stopPlayback()
  },

  methods: {
    selectYear(entry) {
      this.stopPlayback()
      this.selectedKey  = entry.key
      this.selectedYear = entry.year
      this.isSnapshot   = false
    },
    selectSnapshot(snap) {
      this.stopPlayback()
      this.selectedKey  = snap.key
      this.selectedYear = null
      this.isSnapshot   = true
    },
    switchDataset(key) {
      if (this.selectedDataset === key) return
      this.stopPlayback()
      this.selectedDataset = key
      this.isSnapshot      = false
      const defaultYear = key === 'population' ? PAGE2.popYears.at(-1) : PAGE2.years.at(-1)
      this.selectedKey  = defaultYear.key
      this.selectedYear = defaultYear.year
    },

    togglePlayback() {
      if (this.isPlaying) { this.stopPlayback(); return }
      if (this.activeYears.length < 2) return
      // Loop back to start if at the last year
      if (this.selectedYear === this.activeYears.at(-1)?.year) {
        this.selectedKey  = this.activeYears[0].key
        this.selectedYear = this.activeYears[0].year
      }
      this.isPlaying = true
      this.restartPlaybackTimer()
    },
    restartPlaybackTimer() {
      if (this.playbackTimerId != null) clearInterval(this.playbackTimerId)
      this.playbackTimerId = setInterval(() => this.stepYearForward(), this.playbackSpeedMs)
    },
    stepYearForward() {
      const years = this.activeYears
      if (years.length < 2) { this.stopPlayback(); return }
      const idx = years.findIndex(e => e.key === this.selectedKey)
      if (idx < 0) { this.selectedKey = years[0].key; this.selectedYear = years[0].year; return }
      if (idx >= years.length - 1) { this.stopPlayback(); return }
      this.selectedKey  = years[idx + 1].key
      this.selectedYear = years[idx + 1].year
    },
    stopPlayback() {
      this.isPlaying = false
      if (this.playbackTimerId != null) { clearInterval(this.playbackTimerId); this.playbackTimerId = null }
    },

    async loadData() {
      this.loading = true
      this.error   = null
      try {
        const [geoRes, csvRes, cwRes, popRes] = await Promise.all([
          fetch(PAGE2.geoJSONPath),
          fetch(PAGE2.csvPath),
          fetch(PAGE2.crosswalkPath),
          fetch(PAGE2.popCsvPath),
        ])
        if (!geoRes.ok) throw new Error(`GeoJSON fetch failed: ${geoRes.status}`)
        if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`)
        if (!cwRes.ok)  throw new Error(`Crosswalk fetch failed: ${cwRes.status}`)
        if (!popRes.ok) throw new Error(`Population CSV fetch failed: ${popRes.status}`)

        this.geoData       = await geoRes.json()
        this.indicatorRows = this.parseCSV(await csvRes.text())
        this.crosswalkRows = this.parseCrosswalkCSV(await cwRes.text())
        this.popRows       = this.parsePopulationCSV(await popRes.text())
      } catch (err) {
        console.error('[Page2] data load error:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Parse the population-by-community-district CSV.
     * Computes boro_cd (e.g. Bronx CD 1 → 201) from Borough + CD Number.
     * Produces rows like: { id: '201', pop1970: 138557, pop1980: 78441, ... }
     */
    parsePopulationCSV(text) {
      const BORO_PREFIX = {
        'Manhattan': 100, 'Bronx': 200, 'Brooklyn': 300,
        'Queens': 400, 'Staten Island': 500
      }
      const lines = text.trim().split('\n')
      // headers are quoted: "Borough","CD Number","CD Name","1970 Population",...
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').replace(/\r$/, ''))
      return lines.slice(1).map(line => {
        // parse quoted fields (quoted numbers contain commas, e.g. "138,557")
        const vals = []
        let inQ = false, cur = ''
        for (const ch of line) {
          if (ch === '"')           { inQ = !inQ }
          else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
          else                       { cur += ch }
        }
        vals.push(cur.trim())

        const borough = vals[0] ?? ''
        const cdNum   = parseInt(vals[1] ?? '0', 10)
        const prefix  = BORO_PREFIX[borough] ?? 0
        if (!prefix) return null

        const row = { id: String(prefix + cdNum) }
        headers.forEach((h, i) => {
          if (i < 3) return  // skip Borough, CD Number, CD Name
          const yearMatch = h.match(/(\d{4})/)
          if (yearMatch) {
            const raw = (vals[i] ?? '').replace(/,/g, '')
            row[`pop${yearMatch[1]}`] = raw === '' ? NaN : Number(raw)
          }
        })
        return row
      }).filter(Boolean)
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

.speed-select { width: 9.2rem; }

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