<template>
  <div class="container">

    <h1 class="mb-4">Page 1 - World Maps</h1>

    <div class="row">

      <div class="col-md-6">
        <D3WorldChoropleth />
      </div>

      <div class="col-md-6">
        <D3WorldSymbolMap />
      </div>

    </div>

  </div>
</template>

<script>
import D3WorldChoropleth from "../components/D3WorldChoropleth.vue"
import D3WorldSymbolMap from "../components/D3WorldSymbolMap.vue"

export default {
  components: {
    D3WorldChoropleth,
    D3WorldSymbolMap
  }
}
</script>