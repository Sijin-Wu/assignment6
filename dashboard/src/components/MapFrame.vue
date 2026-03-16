<template>
  <article class="map-frame card h-100 border-0 shadow-sm">
    <div class="card-body d-flex flex-column gap-3">
      <div>
        <h3 class="h5 mb-1">{{ title }}</h3>
        <p class="text-body-secondary mb-0">{{ description }}</p>
      </div>

      <div class="map-stage border rounded-3">
        <slot />
      </div>

      <div>
        <p class="small fw-semibold text-uppercase mb-2">Local data files</p>
        <ul class="small text-body-secondary mb-0 ps-3">
          <li v-for="file in dataFiles" :key="file">{{ file }}</li>
        </ul>
      </div>
    </div>
  </article>
</template>

<script>
export default {
  name: 'MapFrame',
  props: {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    dataFiles: {
      type: Array,
      default: () => []
    }
  }
}
</script>
