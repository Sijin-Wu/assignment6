<template>
  <MapFrame
    title="Vega City Choropleth"
    description="Scaffold for a Vega/Vega-Embed city choropleth in a standalone component."
    :data-files="['public/data/city/city-neighborhoods.geojson', 'data/city_metric.csv']"
  >
    <div class="map-placeholder">
      Mount Vega-Embed chart in this container.
    </div>
  </MapFrame>
</template>

<script>
import MapFrame from './MapFrame.vue'

export default {
  name: 'VegaCityChoropleth',
  components: {
    MapFrame
  }
}
</script>
