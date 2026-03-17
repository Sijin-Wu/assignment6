<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-1">Page 3: Mapbox Choropleth</h2>
      <p class="page-description mb-4">
        Housing Affordability Index (HAI) by census tract · {{ cityName }}.
        Index ≥ 100 means the median household can afford the median home.
      </p>

      <MapboxCityChoropleth />
    </section>
  </div>
</template>

<script>
import MapboxCityChoropleth from '../components/MapboxCityChoropleth.vue'
import { PAGE3 } from '../config.js'

export default {
  name: 'Page3',
  components: { MapboxCityChoropleth },
  data() {
    return { cityName: PAGE3.cityName }
  }
}
</script>

<style scoped>
.page-description { color: #57534e; }
</style>