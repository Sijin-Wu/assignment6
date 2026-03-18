<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-1">Page 4: Mapbox + deck.gl Heatmap</h2>
      <p class="page-description mb-4">
        Building permit activity density across {{ cityName }} · {{ yearLabel }}.
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
  computed: {
    yearLabel() {
      const min = Number(PAGE4?.yearRange?.min)
      const max = Number(PAGE4?.yearRange?.max)
      const safeMin = Number.isFinite(min) ? min : 2022
      const safeMax = Number.isFinite(max) ? max : 2025
      return `${Math.min(safeMin, safeMax)}–${Math.max(safeMin, safeMax)}`
    }
  },
  data() {
    return { cityName: PAGE4.cityName }
  }
}
</script>

<style scoped>
.page-description { color: #57534e; }
</style>