<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-2">Page 5: Mapbox with deck.gl Layer</h2>
      <p class="page-description mb-4">
        Second deck.gl layer scaffolded with a different layer type than Page 4.
      </p>

      <DeckGlArcMap />
    </section>
  </div>
</template>

<script>
import DeckGlArcMap from '../components/DeckGlArcMap.vue'

export default {
  name: 'Page5',
  components: {
    DeckGlArcMap
  }
}
</script>