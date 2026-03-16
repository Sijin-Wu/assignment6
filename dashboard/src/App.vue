<template>
  <div class="app-shell">
    <header class="dashboard-header border-bottom">
      <div class="container py-3 py-md-4">
        <p class="eyebrow mb-2">DSCI 554 Assignment 6</p>
        <h1 class="h3 mb-3">Vue Dashboard with D3, Vega, Mapbox, and deck.gl</h1>

        <nav class="nav nav-pills nav-fill flex-column flex-md-row gap-2">
          <router-link class="nav-link" to="/" exact-active-class="active">Page 1</router-link>
          <router-link class="nav-link" to="/page2" active-class="active">Page 2</router-link>
          <router-link class="nav-link" to="/page3" active-class="active">Page 3</router-link>
          <router-link class="nav-link" to="/page4" active-class="active">Page 4</router-link>
          <router-link class="nav-link" to="/page5" active-class="active">Page 5</router-link>
        </nav>
      </div>
    </header>

    <main class="py-4 py-md-5">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>