<template>
  <div>
    <h3>World Symbol Map</h3>
    <svg ref="svg"></svg>
  </div>
</template>

<script>
import * as d3 from "d3"

export default {

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

    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then(data => {

        svg.selectAll("path")
          .data(data.features)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", "#eee")
          .attr("stroke", "white")

        // fake data circles
        svg.selectAll("circle")
          .data(data.features)
          .enter()
          .append("circle")
          .attr("cx", d => projection(d3.geoCentroid(d))[0])
          .attr("cy", d => projection(d3.geoCentroid(d))[1])
          .attr("r", 4)
          .attr("fill", "red")
          .attr("opacity", 0.6)

      })

  }

}
</script>