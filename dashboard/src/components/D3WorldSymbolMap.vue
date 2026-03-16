<template>
    <MapFrame
        title="D3 World Proportional Symbol Map"
        description="World proportional symbol scaffold with local values joined to local GeoJSON."
        :data-files="['public/data/world/world.geojson', 'public/data/world/world-data.csv']"
    >
        <svg ref="svg" class="w-100"></svg>
    </MapFrame>
</template>

<script>
import * as d3 from "d3"
import MapFrame from './MapFrame.vue'

export default {
        name: 'D3WorldSymbolMap',
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

        const populationMap = {}

        csvData.forEach(d => {
            populationMap[d.country] = +d.population
        })

        const radius = d3.scaleSqrt()
            .domain([0, 1400000000])
            .range([0, 25])

        svg.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "#eee")
            .attr("stroke", "white")

        svg.selectAll("circle")
            .data(geoData.features)
            .enter()
            .append("circle")
            .attr("cx", d => projection(d3.geoCentroid(d))[0])
            .attr("cy", d => projection(d3.geoCentroid(d))[1])
            .attr("r", d => {
                const v = populationMap[d.properties.name]
                return v ? radius(v) : 0
            })
            .attr("fill", "red")
            .attr("opacity", 0.7)

    })

    }

}
</script>