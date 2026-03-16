<template>
  <MapFrame
    title="Mapbox + deck.gl Hexagon Layer"
    description="Page 4 scaffold with a HexagonLayer (or another first deck.gl layer)."
    :data-files="['data/city_points.csv']"
  >
    <div class="map-placeholder">
      Add Mapbox map and attach deck.gl HexagonLayer.
    </div>
  </MapFrame>
</template>

<script>
import MapFrame from './MapFrame.vue'

export default {
  name: 'DeckGlHexMap',
  components: {
    MapFrame
  }
}
</script>
