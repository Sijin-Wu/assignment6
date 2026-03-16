<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-2">Page 4: Mapbox with deck.gl Layer</h2>
      <p class="page-description mb-4">
        First deck.gl layer map scaffolded for your chosen city.
      </p>

      <DeckGlHexMap />
    </section>
  </div>
</template>

<script>
import DeckGlHexMap from '../components/DeckGlHexMap.vue'

export default {
  name: 'Page4',
  components: {
    DeckGlHexMap
  }
}
</script>