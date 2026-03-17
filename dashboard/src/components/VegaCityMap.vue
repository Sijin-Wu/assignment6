<template>
  <div class="card border-0 shadow-sm h-100">
    <div class="card-header bg-transparent border-bottom d-flex align-items-center gap-2">
      <span class="fw-semibold">Vega City Choropleth</span>
      <span class="badge text-bg-warning border ms-auto">Vega-Embed</span>
    </div>
    <div class="card-body p-2 position-relative">
      <div v-if="!geoData" class="map-placeholder d-flex align-items-center justify-content-center">
        <span class="text-muted">Waiting for data…</span>
      </div>
      <!-- vega-embed mounts here -->
      <div ref="vegaContainer" class="vega-container"></div>
    </div>
  </div>
</template>

<script>
import embed from 'vega-embed'

export default {
  name: 'VegaCityMap',

  props: {
    /** GeoJSON FeatureCollection */
    geoData: { type: Object, default: null },
    /** Map<id, number> */
    indicatorData: { type: Map, default: () => new Map() },
    /** { key, label, unit, format } */
    indicator: { type: Object, default: () => ({}) },
    /** GeoJSON property key used for joining */
    joinKey: { type: String, default: 'id' }
  },

  data() {
    return {
      vegaView: null,
      resizeObserver: null
    }
  },

  watch: {
    geoData()       { this.render() },
    indicatorData() { this.render() },
    indicator()     { this.render() }
  },

  mounted() {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.geoData) this.render()
    })
    this.resizeObserver.observe(this.$refs.vegaContainer)
    if (this.geoData) this.render()
  },

  beforeUnmount() {
    this.resizeObserver?.disconnect()
    this.vegaView?.finalize()
  },

  methods: {
    render() {
      if (!this.geoData || !this.indicatorData.size) return

      // -------------------------------------------------------------------
      // Build a flat lookup array from indicatorData so Vega can join it
      // -------------------------------------------------------------------
      const lookupRows = [...this.indicatorData.entries()].map(([id, value]) => ({
        id: String(id),
        value
      }))

      const containerW = this.$refs.vegaContainer.clientWidth || 500

      // -------------------------------------------------------------------
      // Vega-Lite spec — choropleth via lookup transform
      // -------------------------------------------------------------------
      const spec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: containerW - 24,
        height: Math.round((containerW - 24) * 0.75),
        config: { view: { stroke: null } },

        // Inline the GeoJSON directly so no external fetch is needed
        data: {
          values: this.geoData.features,
          format: { type: 'json', property: 'features' }
        },

        transform: [
          // Lookup numeric value for each feature
          {
            lookup: `properties.${this.joinKey}`,
            from: {
              data: { values: lookupRows },
              key: 'id',
              fields: ['value']
            }
          }
        ],

        projection: { type: 'mercator' },

        mark: { type: 'geoshape', stroke: 'white', strokeWidth: 0.5 },

        encoding: {
          color: {
            field: 'value',
            type: 'quantitative',
            scale: { scheme: 'blues' },
            legend: {
              title: this.indicator?.label ?? '',
              orient: 'bottom-left',
              gradientLength: 150
            },
            condition: {
              test: '!isValid(datum.value)',
              value: '#e2e8f0'
            }
          },
          tooltip: [
            {
              field: `properties.${this.joinKey}`,
              type: 'nominal',
              title: 'Community District'
            },
            {
              field: 'value',
              type: 'quantitative',
              title: this.indicator?.label ?? 'Value',
              format: this.indicator?.format ?? ',.0f'
            }
          ]
        }
      }

      // -------------------------------------------------------------------
      // Mount / update vega-embed
      // -------------------------------------------------------------------
      this.vegaView?.finalize()
      embed(this.$refs.vegaContainer, spec, {
        actions: false,
        renderer: 'svg'
      }).then(result => {
        this.vegaView = result.view
      }).catch(err => {
        console.error('[VegaCityMap] vega-embed error:', err)
      })
    }
  }
}
</script>

<style scoped>
.vega-container { width: 100%; min-height: 340px; }
.map-placeholder { min-height: 340px; color: #94a3b8; }
</style>
