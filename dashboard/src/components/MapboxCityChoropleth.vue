<template>
  <MapFrame
    title="Mapbox Neighborhood Choropleth"
    description="Scaffold for a Mapbox GL JS choropleth using local geometry + local metrics."
    :data-files="['public/data/city/neighborhoods.geojson', 'data/city_mapbox_metric.csv']"
  >
    <div class="map-placeholder">
      Initialize mapboxgl.Map and add choropleth layer here.
    </div>
  </MapFrame>
</template>

<script>
import MapFrame from './MapFrame.vue'

export default {
  name: 'MapboxCityChoropleth',
  components: {
    MapFrame
  }
}
</script>
