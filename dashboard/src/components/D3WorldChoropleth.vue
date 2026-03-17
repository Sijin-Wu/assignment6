<template>
  <MapFrame
    title="D3 World Choropleth"
    description="Quantile choropleth using selected indicator and year from dashboard/data."
    :data-files="['public/data/world/world.geojson', indicator.dataFile]"
  >
    <svg ref="svgRef" class="w-100"></svg>
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

let svg
let countriesLayer
let legendLayer
let geoFeatures = []

const width = 840
const height = 500

const formatValue = (value) => {
  if (value == null || !Number.isFinite(value)) {
    return 'No data'
  }

  if (props.indicator.key === 'gdp') {
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

      if (props.indicator.key === 'gdp') {
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
    countriesLayer
      .attr('fill', '#e5e7eb')
      .select('title')
      .text((feature) => `${feature.properties.name}\nNo data`)

    legendLayer.selectAll('*').remove()
    return
  }

  const colorScale = d3
    .scaleQuantile()
    .domain(validValues)
    .range(d3.schemeYlGnBu[7])

  countriesLayer
    .attr('fill', (feature) => {
      const value = props.valuesByCode[feature.id]
      return Number.isFinite(value) ? colorScale(value) : '#e5e7eb'
    })
    .select('title')
    .text((feature) => {
      const value = props.valuesByCode[feature.id]
      return `${feature.properties.name}\n${formatValue(value)} ${Number.isFinite(value) ? props.indicator.unit : ''}`.trim()
    })

  drawLegend(colorScale)
}

onMounted(async () => {
  svg = d3
    .select(svgRef.value)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  const geoData = await d3.json('/data/world/world.geojson')
  geoFeatures = geoData.features

  const projection = d3.geoNaturalEarth1().fitSize([width, height - 40], geoData)
  const path = d3.geoPath(projection)

  countriesLayer = svg
    .append('g')
    .selectAll('path')
    .data(geoFeatures)
    .join('path')
    .attr('d', path)
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0.5)

  countriesLayer.append('title')

  legendLayer = svg.append('g').attr('transform', `translate(0, ${height - 36})`)

  updateMap()
})

watch(
  () => [props.valuesByCode, props.selectedYear, props.indicator.key],
  () => {
    updateMap()
  }
)
</script>