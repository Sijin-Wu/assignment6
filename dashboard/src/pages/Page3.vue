<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-2">Page 3: Mapbox Choropleth</h2>
      <p class="page-description mb-4">
        Neighborhood choropleth map scaffolded with a dedicated component and local data placeholders.
      </p>

      <MapboxCityChoropleth />
    </section>
  </div>
</template>

<script>
import MapboxCityChoropleth from '../components/MapboxCityChoropleth.vue'

export default {
  name: 'Page3',
  components: {
    MapboxCityChoropleth
  }
}
</script>