<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-2">Page 1: D3 World Maps</h2>
      <p class="page-description mb-4">
        Two required world maps implemented as dedicated Vue components.
      </p>

      <div class="row g-4">
        <div class="col-12 col-xl-6">
        <D3WorldChoropleth />
        </div>

        <div class="col-12 col-xl-6">
        <D3WorldSymbolMap />
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import D3WorldChoropleth from '../components/D3WorldChoropleth.vue'
import D3WorldSymbolMap from '../components/D3WorldSymbolMap.vue'

export default {
  name: 'Page1',
  components: {
    D3WorldChoropleth,
    D3WorldSymbolMap
  }
}
</script>