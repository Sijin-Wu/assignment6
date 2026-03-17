<template>
  <MapFrame
    title="D3 World Choropleth"
    description="Quantile choropleth using selected indicator and year from dashboard/data."
    :data-files="[worldGeoJSONPath, ...(indicator.dataFiles || [indicator.dataFile]).filter(Boolean)]"
  >
    <div ref="wrapRef" class="choropleth-wrap">
      <svg ref="svgRef" class="w-100"></svg>
      <div ref="tooltipRef" class="map-tooltip"></div>
      <div class="zoom-controls">
        <button class="zoom-btn" title="Zoom in" @click="zoomIn">+</button>
        <button class="zoom-btn" title="Zoom out" @click="zoomOut">−</button>
        <button class="zoom-btn zoom-reset" title="Reset view" @click="resetZoom">⌂</button>
      </div>
      <div class="zoom-hint">Scroll to zoom · Drag to pan</div>
    </div>
  </MapFrame>
</template>

<script setup>
import * as d3 from 'd3'
import { onMounted, ref, watch } from 'vue'
import MapFrame from './MapFrame.vue'

const props = defineProps({
  valuesByCode: {
    type: Object,
    default: () => ({})
  },
  selectedYear: {
    type: Number,
    default: null
  },
  worldGeoJSONPath: {
    type: String,
    default: '/data/world/world.geojson'
  },
  indicator: {
    type: Object,
    default: () => ({
      key: 'gdp',
      label: 'GDP (current US$)',
      unit: 'US$ current',
      dataFile: 'data/gdp.csv'
    })
  }
})

const svgRef = ref(null)
const wrapRef = ref(null)
const tooltipRef = ref(null)

let svg
let mapGroup
let countriesLayer
let legendLayer
let geoFeatures = []
let tooltip
let zoomBehavior

const zoomIn = () => svg && svg.transition().duration(350).call(zoomBehavior.scaleBy, 2)
const zoomOut = () => svg && svg.transition().duration(350).call(zoomBehavior.scaleBy, 0.5)
const resetZoom = () => svg && svg.transition().duration(400).call(zoomBehavior.transform, d3.zoomIdentity)

const width = 840
const height = 500

const hideTooltip = () => {
  if (!tooltip) return
  tooltip.style('opacity', 0)
}

const moveTooltip = (event) => {
  if (!tooltip || !wrapRef.value) return
  const [x, y] = d3.pointer(event, wrapRef.value)
  tooltip
    .style('left', `${x + 14}px`)
    .style('top', `${y - 10}px`)
}

const showTooltip = (event, feature) => {
  if (!tooltip) return
  const value = props.valuesByCode[feature.id]
  const name = feature.properties.name
  const valueStr = formatValue(value)
  const unitStr = Number.isFinite(value) ? props.indicator.unit : ''
  tooltip
    .html(`
      <div class="tooltip-title">${name}</div>
      <div class="tooltip-row"><span>Year</span><strong>${props.selectedYear ?? 'N/A'}</strong></div>
      <div class="tooltip-row"><span>${props.indicator.label}</span><strong>${valueStr}${unitStr ? ' ' + unitStr : ''}</strong></div>
    `)
    .style('opacity', 1)
  moveTooltip(event)
}

const formatValue = (value) => {
  if (value == null || !Number.isFinite(value)) {
    return 'No data'
  }

  if (props.indicator.key === 'gdp' || props.indicator.key === 'gdp_per_capita') {
    return `$${d3.format('.3s')(value)}`
  }

  if (props.indicator.key === 'population') {
    return d3.format(',')(Math.round(value))
  }

  return d3.format('.2f')(value)
}

const drawLegend = (colorScale) => {
  legendLayer.selectAll('*').remove()

  const colors = colorScale.range()
  const legendWidth = 390
  const legendX = width / 2 - legendWidth / 2

  const blockWidth = legendWidth / colors.length
  const entries = colors.map((color) => ({ color, extent: colorScale.invertExtent(color) }))

  legendLayer
    .append('text')
    .attr('x', legendX)
    .attr('y', -10)
    .attr('font-size', 12)
    .attr('fill', '#334155')
    .text(`${props.indicator.label} (${props.selectedYear ?? 'N/A'})`)

  legendLayer
    .selectAll('rect')
    .data(entries)
    .join('rect')
    .attr('x', (_, index) => legendX + index * blockWidth)
    .attr('y', 0)
    .attr('width', blockWidth)
    .attr('height', 10)
    .attr('fill', (entry) => entry.color)

  legendLayer
    .selectAll('.legend-label')
    .data(entries)
    .join('text')
    .attr('class', 'legend-label')
    .attr('x', (_, index) => legendX + index * blockWidth)
    .attr('y', 24)
    .attr('font-size', 10)
    .attr('fill', '#475569')
    .text((entry) => {
      if (!entry.extent[0] || !entry.extent[1]) {
        return ''
      }

      if (props.indicator.key === 'population') {
        return d3.format('.2s')(entry.extent[0])
      }

      if (props.indicator.key === 'gdp' || props.indicator.key === 'gdp_per_capita') {
        return `$${d3.format('.2s')(entry.extent[0])}`
      }

      return d3.format('.2f')(entry.extent[0])
    })
}

const updateMap = () => {
  if (!countriesLayer || geoFeatures.length === 0) {
    return
  }

  const validValues = geoFeatures
    .map((feature) => props.valuesByCode[feature.id])
    .filter((value) => Number.isFinite(value) && value > 0)

  if (validValues.length === 0) {
    countriesLayer.attr('fill', '#e5e7eb')
    legendLayer.selectAll('*').remove()
    return
  }

  const colorScale = d3
    .scaleQuantile()
    .domain(validValues)
    .range(d3.schemeYlGnBu[7])

  countriesLayer.attr('fill', (feature) => {
    const value = props.valuesByCode[feature.id]
    return Number.isFinite(value) ? colorScale(value) : '#e5e7eb'
  })

  drawLegend(colorScale)
}

onMounted(async () => {
  svg = d3
    .select(svgRef.value)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  const geoData = await d3.json(props.worldGeoJSONPath)
  geoFeatures = geoData.features

  const projection = d3.geoNaturalEarth1().fitSize([width, height - 40], geoData)
  const path = d3.geoPath(projection)

  mapGroup = svg.append('g')

  countriesLayer = mapGroup
    .selectAll('path')
    .data(geoFeatures)
    .join('path')
    .attr('d', path)
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0.5)
    .attr('cursor', 'grab')

  countriesLayer
    .on('mouseenter', function (event, feature) {
      const k = d3.zoomTransform(svg.node()).k
      d3.select(this)
        .raise()
        .transition().duration(100)
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 1.5 / k)
      showTooltip(event, feature)
    })
    .on('mousemove', function (event, feature) {
      moveTooltip(event)
      showTooltip(event, feature)
    })
    .on('mouseleave', function () {
      const k = d3.zoomTransform(svg.node()).k
      d3.select(this)
        .transition().duration(120)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.5 / k)
      hideTooltip()
    })

  legendLayer = svg.append('g').attr('transform', `translate(0, ${height - 36})`)

  zoomBehavior = d3.zoom()
    .scaleExtent([1, 12])
    .translateExtent([[0, 0], [width, height]])
    .on('start', () => {
      svg.attr('cursor', 'grabbing')
      hideTooltip()
    })
    .on('zoom', (event) => {
      mapGroup.attr('transform', event.transform)
      mapGroup.selectAll('path').attr('stroke-width', 0.5 / event.transform.k)
    })
    .on('end', () => {
      svg.attr('cursor', null)
    })

  svg.call(zoomBehavior)
  svg.on('dblclick.zoom', null)  // disable dblclick zoom to avoid conflict with tooltip

  tooltip = d3.select(tooltipRef.value)
  hideTooltip()

  updateMap()
})

watch(
  () => [props.valuesByCode, props.selectedYear, props.indicator.key],
  () => {
    updateMap()
  }
)
</script>

<style scoped>
.choropleth-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.zoom-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  z-index: 20;
}

.zoom-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.88);
  color: #334155;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 120ms;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: #94a3b8;
}

.zoom-reset {
  font-size: 0.8rem;
  margin-top: 2px;
}

.zoom-hint {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-size: 0.72rem;
  color: #94a3b8;
  pointer-events: none;
  user-select: none;
}

.map-tooltip {
  position: absolute;
  z-index: 10;
  min-width: 210px;
  max-width: 270px;
  padding: 0.55rem 0.7rem;
  border-radius: 0.55rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.93);
  color: #e2e8f0;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.35);
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease;
}

.map-tooltip :deep(.tooltip-title) {
  font-weight: 700;
  font-size: 0.88rem;
  margin-bottom: 0.45rem;
}

.map-tooltip :deep(.tooltip-row) {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  font-size: 0.8rem;
  margin-bottom: 0.18rem;
}
</style>