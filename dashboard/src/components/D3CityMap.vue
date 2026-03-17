<template>
  <div class="card border-0 shadow-sm h-100">
    <div class="card-header bg-transparent border-bottom d-flex align-items-center gap-2">
      <span class="fw-semibold">D3 City Choropleth</span>
      <span class="badge text-bg-light border ms-auto">D3</span>
    </div>
    <div class="card-body p-0 position-relative">
      <!-- Loading overlay -->
      <div v-if="!geoData" class="map-placeholder d-flex align-items-center justify-content-center">
        <span class="text-muted">Waiting for data…</span>
      </div>

      <!-- Map wrapper (tooltip positioned relative to this) -->
      <div ref="mapWrap" class="map-wrap">
        <svg ref="svg" class="d3-city-svg w-100"></svg>
        <div ref="tooltipEl" class="d3city-tooltip"></div>
      </div>

      <!-- Legend -->
      <div ref="legend" class="map-legend position-absolute bottom-0 start-0 m-3 p-2 bg-white bg-opacity-90 rounded shadow-sm"></div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'

export default {
  name: 'D3CityMap',

  props: {
    /** GeoJSON FeatureCollection */
    geoData: { type: Object, default: null },
    /** Map<id, number> */
    indicatorData: { type: Map, default: () => new Map() },
    /** { key, label, unit, format } */
    indicator: { type: Object, default: () => ({}) },
    /** GeoJSON property key used for joining */
    joinKey: { type: String, default: 'id' },
    /** Map<String(boro_cd), crosswalk row> for tooltip labels */
    nameMap: { type: Map, default: () => new Map() }
  },

  data() {
    return {
      resizeObserver: null,
      tooltip: null
    }
  },

  watch: {
    geoData()      { this.draw() },
    indicatorData(){ this.draw() },
    indicator()    { this.draw() },
    nameMap()      { this.draw() }
  },

  mounted() {
    this.tooltip = d3.select(this.$refs.tooltipEl)
    this.resizeObserver = new ResizeObserver(() => this.draw())
    this.resizeObserver.observe(this.$refs.svg)
    if (this.geoData) this.draw()
  },

  beforeUnmount() {
    this.resizeObserver?.disconnect()
  },

  methods: {
    moveTooltip(event) {
      if (!this.tooltip || !this.$refs.mapWrap) return
      const [x, y] = d3.pointer(event, this.$refs.mapWrap)
      this.tooltip.style('left', `${x + 14}px`).style('top', `${y - 10}px`)
    },

    draw() {
      const svg = d3.select(this.$refs.svg)
      svg.selectAll('*').remove()

      if (!this.geoData || !this.indicatorData.size) return

      const el    = this.$refs.svg
      const W     = el.clientWidth  || 500
      const H     = Math.round(W * 0.75)
      svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H)

      // ------------------------------------------------------------------
      // Projection — fit to bounds of the GeoJSON
      // ------------------------------------------------------------------
      const projection = d3.geoMercator().fitSize([W, H], this.geoData)
      const path       = d3.geoPath(projection)

      // ------------------------------------------------------------------
      // Color scale
      // ------------------------------------------------------------------
      const values = [...this.indicatorData.values()].filter(v => isFinite(v))
      const [vMin, vMax] = d3.extent(values)
      const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([vMin, vMax])

      // ------------------------------------------------------------------
      // Draw neighborhoods
      // ------------------------------------------------------------------
      const self = this
      svg.append('g')
        .selectAll('path')
        .data(this.geoData.features)
        .join('path')
          .attr('d', path)
          .attr('fill', d => {
            const id  = String(d.properties[this.joinKey])
            const val = this.indicatorData.get(id)
            return val != null ? colorScale(val) : '#e2e8f0'
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .attr('cursor', 'pointer')
          .on('mouseenter', function (event, d) {
            const id   = String(d.properties[self.joinKey])
            const val  = self.indicatorData.get(id)
            const info = self.nameMap?.get(id)
            const name    = info?.cd_name    ?? ('CD ' + id)
            const borough = info?.borough    ?? ''
            const fmt  = d3.format(self.indicator?.format ?? ',.0f')
            const valStr = (val != null && isFinite(val)) ? fmt(val) : 'N/A'

            d3.select(this).raise().transition().duration(100)
              .attr('stroke', '#1e293b').attr('stroke-width', 1.5)

            if (self.tooltip) {
              self.tooltip
                .html(`
                  <div class="tt-title">${name}</div>
                  ${borough ? `<div class="tt-row"><span>Borough</span><strong>${borough}</strong></div>` : ''}
                  <div class="tt-row"><span>${self.indicator?.label ?? 'Value'}</span><strong>${valStr}</strong></div>
                `)
                .style('opacity', 1)
              self.moveTooltip(event)
            }
          })
          .on('mousemove', function (event) {
            self.moveTooltip(event)
          })
          .on('mouseleave', function () {
            d3.select(this).transition().duration(120)
              .attr('stroke', '#fff').attr('stroke-width', 0.5)
            if (self.tooltip) self.tooltip.style('opacity', 0)
          })

      // ------------------------------------------------------------------
      // Legend (linear gradient)
      // ------------------------------------------------------------------
      this.drawLegend(colorScale, vMin, vMax, W)
    },

    drawLegend(scale, min, max, W) {
      const legendW = Math.min(180, W * 0.35)
      const legendH = 10
      const svg     = d3.select(this.$refs.svg)

      const defs = svg.append('defs')
      const grad = defs.append('linearGradient').attr('id', 'd3city-gradient')
      const stops = d3.range(0, 1.01, 0.1)
      stops.forEach(t => {
        grad.append('stop')
          .attr('offset', `${t * 100}%`)
          .attr('stop-color', scale(min + t * (max - min)))
      })

      const lx = 12
      const ly = parseInt(d3.select(this.$refs.svg).attr('height')) - 34

      const lg = svg.append('g').attr('transform', `translate(${lx},${ly})`)
      lg.append('rect')
        .attr('width', legendW).attr('height', legendH)
        .attr('rx', 2)
        .attr('fill', 'url(#d3city-gradient)')

      const fmt = d3.format(this.indicator?.format ?? ',.0f')
      ;[
        { x: 0,        anchor: 'start', val: min },
        { x: legendW,  anchor: 'end',   val: max }
      ].forEach(({ x, anchor, val }) => {
        lg.append('text')
          .attr('x', x).attr('y', legendH + 13)
          .attr('text-anchor', anchor)
          .attr('font-size', 10)
          .attr('fill', '#334155')
          .text(fmt(val))
      })

      lg.append('text')
        .attr('x', legendW / 2).attr('y', -4)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('fill', '#334155')
        .text(this.indicator?.label ?? '')
    }
  }
}
</script>

<style scoped>
.d3-city-svg { display: block; }
.map-placeholder {
  min-height: 340px;
  color: #94a3b8;
}
.map-legend { pointer-events: none; }

.map-wrap {
  position: relative;
}

.d3city-tooltip {
  position: absolute;
  z-index: 20;
  min-width: 200px;
  max-width: 280px;
  padding: 0.5rem 0.65rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.93);
  color: #e2e8f0;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.35);
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease;
  font-size: 0.82rem;
}

.d3city-tooltip :deep(.tt-title) {
  font-weight: 700;
  font-size: 0.88rem;
  margin-bottom: 0.4rem;
  line-height: 1.3;
}

.d3city-tooltip :deep(.tt-row) {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.15rem;
}
</style>