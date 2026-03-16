<template>
  <MapFrame
    title="Mapbox + deck.gl Arc Layer"
    description="Page 5 scaffold with a different deck.gl layer type than Page 4."
    :data-files="['data/city_flows.csv']"
  >
    <div class="map-placeholder">
      Add Mapbox map and attach deck.gl ArcLayer.
    </div>
  </MapFrame>
</template>

<script>
import MapFrame from './MapFrame.vue'

export default {
  name: 'DeckGlArcMap',
  components: {
    MapFrame
  }
}
</script>
