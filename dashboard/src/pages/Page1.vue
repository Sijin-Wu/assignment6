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
      requestCounter: 0
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
        this.loadSelectedIndicator()
      }
    },
    selectedYear() {
      this.applyYearValues()
    }
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
    }
  }
}
</script>

<style scoped>
.year-hints {
  color: #64748b;
  font-size: 0.85rem;
}
</style>