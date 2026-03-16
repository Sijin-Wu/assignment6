<template>
  <div class="container">
    <section class="page-section">
      <h2 class="mb-2">Page 2: D3 and Vega City Maps</h2>
      <p class="page-description mb-4">
        One D3 choropleth and one Vega choropleth scaffolded as independent components.
      </p>

      <div class="row g-4">
        <div class="col-12 col-xl-6">
          <D3CityChoropleth />
        </div>
        <div class="col-12 col-xl-6">
          <VegaCityChoropleth />
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import D3CityChoropleth from '../components/D3CityChoropleth.vue'
import VegaCityChoropleth from '../components/VegaCityChoropleth.vue'

export default {
  name: 'Page2',
  components: {
    D3CityChoropleth,
    VegaCityChoropleth
  }
}
</script>