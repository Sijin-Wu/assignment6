<template>
  <MapFrame
    title="D3 World Proportional Symbol Map"
    description="Bubble size updates interactively using selected indicator and year from dashboard/data."
    :data-files="[worldGeoJSONPath, ...(indicator.dataFiles || [indicator.dataFile]).filter(Boolean)]"
  >
    <div ref="wrapRef" class="symbol-map-wrap">
      <svg ref="svgRef" class="w-100"></svg>
      <div ref="tooltipRef" class="map-tooltip"></div>
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
let circlesGroup
let legendGroup
let geoFeatures = []
let projection
let tooltip

const width = 840
const height = 500

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

const hideTooltip = () => {
  if (!tooltip) {
    return
  }

  tooltip.style('opacity', 0)
}

const moveTooltip = (event) => {
  if (!tooltip || !wrapRef.value) {
    return
  }

  const [x, y] = d3.pointer(event, wrapRef.value)
  tooltip
    .style('left', `${x + 12}px`)
    .style('top', `${y + 12}px`)
}

const showTooltip = (event, node) => {
  if (!tooltip) {
    return
  }

  const cappedNote =
    node.capped === 'high'
      ? '<div class="tooltip-note">Value capped at 95th percentile for stable sizing.</div>'
      : node.capped === 'low'
        ? '<div class="tooltip-note">Value raised to 5th percentile for visibility.</div>'
        : ''

  tooltip
    .html(`
      <div class="tooltip-title">${node.name}</div>
      <div class="tooltip-row"><span>Year</span><strong>${props.selectedYear ?? 'N/A'}</strong></div>
      <div class="tooltip-row"><span>${props.indicator.label}</span><strong>${formatValue(node.value)}</strong></div>
      <div class="tooltip-row"><span>Rank</span><strong>#${node.rank} of ${node.total}</strong></div>
      <div class="tooltip-row"><span>Percentile</span><strong>${node.percentile}th</strong></div>
      ${cappedNote}
    `)
    .style('opacity', 1)

  moveTooltip(event)
}

const drawLegend = (radiusScale, valuesSorted) => {
  legendGroup.selectAll('*').remove()

  if (valuesSorted.length === 0) {
    return
  }

  const q25 = d3.quantile(valuesSorted, 0.25) ?? valuesSorted[0]
  const q50 = d3.quantile(valuesSorted, 0.5) ?? valuesSorted[0]
  const q95 = d3.quantile(valuesSorted, 0.95) ?? valuesSorted.at(-1)

  const samples = [
    { label: 'P25', value: q25 },
    { label: 'Median', value: q50 },
    { label: 'P95', value: q95 }
  ]

  const x0 = 70
  const yBase = height - 24

  legendGroup
    .append('text')
    .attr('x', 24)
    .attr('y', height - 92)
    .attr('fill', '#334155')
    .attr('font-size', 12)
    .text('Bubble size guide')

  legendGroup
    .selectAll('circle')
    .data(samples)
    .join('circle')
    .attr('cx', x0)
    .attr('cy', (d) => yBase - radiusScale(d.value))
    .attr('r', (d) => radiusScale(d.value))
    .attr('fill', 'none')
    .attr('stroke', '#94a3b8')
    .attr('stroke-dasharray', '3 3')

  legendGroup
    .selectAll('.legend-line')
    .data(samples)
    .join('line')
    .attr('class', 'legend-line')
    .attr('x1', x0)
    .attr('x2', x0 + 58)
    .attr('y1', (d) => yBase - radiusScale(d.value) * 2)
    .attr('y2', (d) => yBase - radiusScale(d.value) * 2)
    .attr('stroke', '#94a3b8')

  legendGroup
    .selectAll('.legend-label')
    .data(samples)
    .join('text')
    .attr('class', 'legend-label')
    .attr('x', x0 + 64)
    .attr('y', (d) => yBase - radiusScale(d.value) * 2 + 4)
    .attr('fill', '#475569')
    .attr('font-size', 10)
    .text((d) => `${d.label}: ${formatValue(d.value)}`)
}

const updateMap = () => {
  if (!circlesGroup || geoFeatures.length === 0 || !projection) {
    return
  }

  const valuesSorted = geoFeatures
    .map((feature) => props.valuesByCode[feature.id])
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)

  if (valuesSorted.length === 0) {
    circlesGroup.selectAll('circle').remove()
    legendGroup.selectAll('*').remove()
    hideTooltip()
    return
  }

  const q05 = d3.quantile(valuesSorted, 0.05) ?? valuesSorted[0]
  const q95 = d3.quantile(valuesSorted, 0.95) ?? valuesSorted.at(-1)

  const clampValue = (value) => Math.max(q05, Math.min(q95, value))

  const normalizedMin = Math.log1p(q05)
  const normalizedMax = Math.log1p(q95)
  const radiusScale = d3
    .scaleSqrt()
    .domain(normalizedMin === normalizedMax ? [normalizedMin, normalizedMin + 1] : [normalizedMin, normalizedMax])
    .range([3, 19])

  const colorScale = d3
    .scaleSequential(d3.interpolateYlOrRd)
    .domain([normalizedMin, normalizedMax])

  const rankedEntries = geoFeatures
    .map((feature) => ({ code: feature.id, value: props.valuesByCode[feature.id] }))
    .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
    .sort((a, b) => b.value - a.value)

  const rankByCode = new Map(rankedEntries.map((entry, index) => [entry.code, index + 1]))

  const nodes = geoFeatures
    .map((feature) => {
      const value = props.valuesByCode[feature.id]
      if (!Number.isFinite(value) || value <= 0) {
        return null
      }

      const cappedValue = clampValue(value)
      const normalized = Math.log1p(cappedValue)
      const [baseX, baseY] = projection(d3.geoCentroid(feature))
      const rank = rankByCode.get(feature.id) ?? rankedEntries.length

      return {
        code: feature.id,
        name: feature.properties.name,
        value,
        baseX,
        baseY,
        x: baseX,
        y: baseY,
        normalized,
        radius: radiusScale(normalized),
        color: colorScale(normalized),
        rank,
        total: rankedEntries.length,
        percentile: Math.max(1, Math.round(((rankedEntries.length - rank + 1) / rankedEntries.length) * 100)),
        capped: value > q95 ? 'high' : value < q05 ? 'low' : 'none'
      }
    })
    .filter(Boolean)

  const simulation = d3
    .forceSimulation(nodes)
    .force('x', d3.forceX((d) => d.baseX).strength(0.28))
    .force('y', d3.forceY((d) => d.baseY).strength(0.28))
    .force('collide', d3.forceCollide((d) => d.radius + 0.9).iterations(2))
    .stop()

  for (let i = 0; i < 90; i += 1) {
    simulation.tick()
  }

  const circles = circlesGroup
    .selectAll('circle')
    .data(nodes, (d) => d.code)
    .join(
      (enter) =>
        enter
          .append('circle')
          .attr('cx', (d) => d.baseX)
          .attr('cy', (d) => d.baseY)
          .attr('r', 0)
          .attr('fill', (d) => d.color)
          .attr('stroke', '#fff7ed')
          .attr('stroke-width', 0.8)
          .attr('opacity', 0.82),
      (update) => update,
      (exit) => exit.remove()
    )

  circles
    .on('mouseenter', function (event, d) {
      d3.select(this)
        .raise()
        .transition()
        .duration(120)
        .attr('opacity', 0.97)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.4)
        .attr('r', d.radius + 2.5)

      showTooltip(event, d)
    })
    .on('mousemove', function (event, d) {
      moveTooltip(event)
      showTooltip(event, d)
    })
    .on('mouseleave', function (_, d) {
      d3.select(this)
        .transition()
        .duration(130)
        .attr('opacity', 0.82)
        .attr('stroke', '#fff7ed')
        .attr('stroke-width', 0.8)
        .attr('r', d.radius)

      hideTooltip()
    })

  circles
    .transition()
    .duration(360)
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', (d) => d.radius)
    .attr('fill', (d) => d.color)

  circles
    .selectAll('title')
    .data((d) => [d])
    .join('title')
    .text((d) => `${d.name}\n${formatValue(d.value)} ${props.indicator.unit}`)

  drawLegend((value) => radiusScale(Math.log1p(clampValue(value))), valuesSorted)
}

onMounted(async () => {
  svg = d3
    .select(svgRef.value)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  const geoData = await d3.json(props.worldGeoJSONPath)
  geoFeatures = geoData.features

  projection = d3.geoNaturalEarth1().fitSize([width, height], geoData)
  const path = d3.geoPath(projection)

  svg
    .append('g')
    .selectAll('path')
    .data(geoFeatures)
    .join('path')
    .attr('d', path)
    .attr('fill', '#f1f5f9')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 0.5)

  circlesGroup = svg.append('g')
  legendGroup = svg.append('g')
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
.symbol-map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-tooltip {
  position: absolute;
  z-index: 10;
  min-width: 220px;
  max-width: 280px;
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

.map-tooltip :deep(.tooltip-row span) {
  color: #94a3b8;
}

.map-tooltip :deep(.tooltip-row strong) {
  color: #f8fafc;
}

.map-tooltip :deep(.tooltip-note) {
  margin-top: 0.3rem;
  font-size: 0.73rem;
  color: #fbbf24;
}
</style>