<template>
  <MapFrame
    title="D3 City Choropleth"
    description="Scaffold for a D3 neighborhood choropleth rendered in its own Vue component."
    :data-files="['public/data/city/city-neighborhoods.geojson', 'data/city_metric.csv']"
  >
    <div class="map-placeholder">
      Implement D3 geoPath + color scale here.
    </div>
  </MapFrame>
</template>

<script>
import MapFrame from './MapFrame.vue'

export default {
  name: 'D3CityChoropleth',
  components: {
    MapFrame
  }
}
</script>
