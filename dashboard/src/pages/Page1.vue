<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-2">Page 1: D3 World Maps</h2>
      <p class="page-description mb-3">
        Interactive world maps powered by real country indicators from the local data folder.
      </p>

      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-12 col-lg-5">
              <label for="indicator-select" class="form-label fw-semibold">Indicator</label>
              <select
                id="indicator-select"
                class="form-select"
                v-model="indicatorKey"
              >
                <option
                  v-for="option in indicatorOptions"
                  :key="option.key"
                  :value="option.key"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div class="col-12 col-lg-7">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label for="year-range" class="form-label fw-semibold mb-0">Year</label>
                <span class="badge text-bg-light border">{{ selectedYearLabel }}</span>
              </div>
              <input
                id="year-range"
                class="form-range"
                type="range"
                min="0"
                :max="Math.max(0, availableYears.length - 1)"
                :value="yearIndex"
                @input="updateYearFromIndex"
                :disabled="availableYears.length === 0"
              >
              <div class="d-flex justify-content-between mt-1 year-hints">
                <span>{{ availableYears[0] ?? '-' }}</span>
                <span>{{ availableYears.at(-1) ?? '-' }}</span>
              </div>
            </div>

            <div class="col-12 d-flex flex-wrap align-items-center gap-2 gap-sm-3 pt-1">
              <button
                class="btn btn-sm"
                :class="isPlaying ? 'btn-outline-danger' : 'btn-outline-primary'"
                :disabled="availableYears.length < 2"
                @click="togglePlayback"
              >
                {{ isPlaying ? 'Pause' : 'Play' }}
              </button>

              <div class="d-flex align-items-center gap-2">
                <label for="speed-select" class="form-label mb-0 fw-semibold">Speed</label>
                <select
                  id="speed-select"
                  class="form-select form-select-sm speed-select"
                  v-model.number="playbackSpeedMs"
                >
                  <option
                    v-for="opt in playbackSpeedOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <span class="small text-muted">
                {{ isPlaying ? 'Animating through years...' : 'Animation paused' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-12 col-xl-6">
          <D3WorldChoropleth
            :values-by-code="valuesByCode"
            :selected-year="selectedYear"
            :indicator="selectedIndicator"
          />
        </div>

        <div class="col-12 col-xl-6">
          <D3WorldSymbolMap
            :values-by-code="valuesByCode"
            :selected-year="selectedYear"
            :indicator="selectedIndicator"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import D3WorldChoropleth from '../components/D3WorldChoropleth.vue'
import D3WorldSymbolMap from '../components/D3WorldSymbolMap.vue'
import { INDICATOR_OPTIONS, loadIndicatorDataset } from '../utils/worldIndicatorData'

export default {
  name: 'Page1',
  components: {
    D3WorldChoropleth,
    D3WorldSymbolMap
  },
  data() {
    return {
      indicatorOptions: INDICATOR_OPTIONS,
      indicatorKey: 'gdp',
      selectedYear: null,
      availableYears: [],
      valuesByCode: {},
      selectedIndicator: INDICATOR_OPTIONS[0],
      requestCounter: 0,
      isPlaying: false,
      playbackSpeedMs: 900,
      playbackTimerId: null,
      playbackSpeedOptions: [
        { label: '0.5x (1800 ms)', value: 1800 },
        { label: '1x (900 ms)', value: 900 },
        { label: '1.5x (600 ms)', value: 600 },
        { label: '2x (450 ms)', value: 450 },
        { label: '3x (300 ms)', value: 300 }
      ]
    }
  },
  computed: {
    yearIndex() {
      return this.availableYears.indexOf(this.selectedYear)
    },
    selectedYearLabel() {
      return this.selectedYear ?? 'N/A'
    }
  },
  watch: {
    indicatorKey: {
      immediate: true,
      handler() {
        this.stopPlayback()
        this.loadSelectedIndicator()
      }
    },
    selectedYear() {
      this.applyYearValues()
    },
    playbackSpeedMs() {
      if (this.isPlaying) {
        this.restartPlaybackTimer()
      }
    }
  },
  beforeUnmount() {
    this.stopPlayback()
  },
  methods: {
    async loadSelectedIndicator() {
      this.requestCounter += 1
      const requestId = this.requestCounter

      const dataset = await loadIndicatorDataset(this.indicatorKey)
      if (requestId !== this.requestCounter) {
        return
      }

      this.selectedIndicator = dataset.indicator
      this.availableYears = dataset.years

      const latestYear = dataset.years.at(-1) ?? null
      this.selectedYear = dataset.years.includes(this.selectedYear)
        ? this.selectedYear
        : latestYear

      this.applyYearValues(dataset)
    },
    applyYearValues(existingDataset = null) {
      if (this.selectedYear == null) {
        this.valuesByCode = {}
        return
      }

      const loader = existingDataset
        ? Promise.resolve(existingDataset)
        : loadIndicatorDataset(this.indicatorKey)

      loader.then((dataset) => {
        const yearValues = dataset.valuesByYear.get(this.selectedYear)
        this.valuesByCode = yearValues ? Object.fromEntries(yearValues.entries()) : {}
      })
    },
    updateYearFromIndex(event) {
      const idx = Number.parseInt(event.target.value, 10)
      this.selectedYear = this.availableYears[idx] ?? this.selectedYear
    },
    togglePlayback() {
      if (this.isPlaying) {
        this.stopPlayback()
        return
      }

      if (this.availableYears.length < 2) {
        return
      }

      if (this.selectedYear == null) {
        this.selectedYear = this.availableYears[0]
      }

      // If selected the last year, loop back to the start on play
      if (this.selectedYear === this.availableYears.at(-1)) {
        this.selectedYear = this.availableYears[0]
      }

      this.isPlaying = true
      this.restartPlaybackTimer()
    },
    restartPlaybackTimer() {
      if (this.playbackTimerId != null) {
        clearInterval(this.playbackTimerId)
      }

      this.playbackTimerId = setInterval(() => {
        this.stepYearForward()
      }, this.playbackSpeedMs)
    },
    stepYearForward() {
      if (this.availableYears.length < 2) {
        this.stopPlayback()
        return
      }

      const currentIndex = this.availableYears.indexOf(this.selectedYear)
      if (currentIndex < 0) {
        this.selectedYear = this.availableYears[0]
        return
      }

      if (currentIndex >= this.availableYears.length - 1) {
        this.stopPlayback()
        return
      }

      this.selectedYear = this.availableYears[currentIndex + 1]
    },
    stopPlayback() {
      this.isPlaying = false
      if (this.playbackTimerId != null) {
        clearInterval(this.playbackTimerId)
        this.playbackTimerId = null
      }
    }
  }
}
</script>

<style scoped>
.year-hints {
  color: #64748b;
  font-size: 0.85rem;
}

.speed-select {
  width: 9.2rem;
}
</style>