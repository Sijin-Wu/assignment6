<template>
  <div>

    <h2>Assignment 6 Dashboard</h2>

    <nav>
      <router-link to="/">Page1</router-link> |
      <router-link to="/page2">Page2</router-link> |
      <router-link to="/page3">Page3</router-link> |
      <router-link to="/page4">Page4</router-link> |
      <router-link to="/page5">Page5</router-link>
    </nav>

    <router-view />

  </div>
</template>

<script>
export default {
  name: "App"
}
</script>