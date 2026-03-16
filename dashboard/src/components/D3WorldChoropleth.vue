<template>
    <MapFrame
        title="D3 World Choropleth"
        description="World choropleth scaffold with local GeoJSON and local CSV values."
        :data-files="['public/data/world/world.geojson', 'public/data/world/world-data.csv']"
    >
        <svg ref="svg" class="w-100"></svg>
    </MapFrame>
</template>

<script>
import * as d3 from "d3"
import MapFrame from './MapFrame.vue'

export default {
  name: "D3WorldChoropleth",
    components: {
        MapFrame
    },

    mounted() {

    const width = 800
    const height = 500

    const svg = d3.select(this.$refs.svg)
        .attr("width", width)
        .attr("height", height)

    const projection = d3.geoNaturalEarth1()
        .scale(150)
        .translate([width/2, height/2])

    const path = d3.geoPath().projection(projection)

    Promise.all([
        d3.json("/data/world/world.geojson"),
        d3.csv("/data/world/world-data.csv")
    ]).then(([geoData, csvData]) => {

        const dataMap = {}

        csvData.forEach(d => {
            dataMap[d.country] = +d.value
        })

        const color = d3.scaleSequential()
            .domain([0, 60000])
            .interpolator(d3.interpolateBlues)

        svg.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                const v = dataMap[d.properties.name]
                return v ? color(v) : "#eee"
            })
            .attr("stroke", "white")

    })

    }
}
</script>