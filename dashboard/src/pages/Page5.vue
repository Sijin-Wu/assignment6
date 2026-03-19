<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-1">Page 5: Mapbox + deck.gl Arc Layer</h2>
      <p class="page-description mb-4">
        311 service requests in {{ cityName }} flowing to their assigned
        Council District office · filter by week range.
      </p>
      <DeckArcLayer />
    </section>
  </div>
</template>

<script>
import DeckArcLayer from '../components/DeckArcLayer.vue'
import { PAGE5 } from '../config.js'

export default {
  name: 'Page5',
  components: { DeckArcLayer },
  data() {
    return { cityName: PAGE5.cityName }
  }
}
</script>

<style scoped>
.page-description { color: #57534e; }
</style>
