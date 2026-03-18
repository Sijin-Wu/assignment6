<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-1">Page 4: Mapbox + deck.gl Heatmap</h2>
      <p class="page-description mb-4">
        Building permit activity density across {{ cityName }} · 2022–2024.
        Brighter areas indicate higher permit concentration.
      </p>
      <DeckHeatMap />
    </section>
  </div>
</template>

<script>
import DeckHeatMap from '../components/DeckHeatMap.vue'
import { PAGE4 } from '../config.js'

export default {
  name: 'Page4',
  components: { DeckHeatMap },
  data() {
    return { cityName: PAGE4.cityName }
  }
}
</script>

<style scoped>
.page-description { color: #57534e; }
</style>