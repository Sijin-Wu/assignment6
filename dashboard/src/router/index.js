import { createRouter, createWebHistory } from 'vue-router'

import Page1 from '../pages/Page1.vue'
import Page2 from '../pages/Page2.vue'
import Page3 from '../pages/Page3.vue'
import Page4 from '../pages/Page4.vue'
import Page5 from '../pages/Page5.vue'

const routes = [
  { path: '/', component: Page1 },
  { path: '/page2', component: Page2 },
  { path: '/page3', component: Page3 },
  { path: '/page4', component: Page4 },
  { path: '/page5', component: Page5 }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router