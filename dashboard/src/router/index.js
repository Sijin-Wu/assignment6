import { createRouter, createWebHistory } from 'vue-router'

import Page1 from '../pages/Page1.vue'
import Page2 from '../pages/Page2.vue'
import Page3 from '../pages/Page3.vue'
import Page4 from '../pages/Page4.vue'
import Page5 from '../pages/Page5.vue'

const routes = [
  {
    path: '/',
    name: 'page1',
    component: Page1,
    meta: {
      label: 'Page 1',
      title: 'D3 World Maps'
    }
  },
  {
    path: '/page2',
    name: 'page2',
    component: Page2,
    meta: {
      label: 'Page 2',
      title: 'D3 + Vega City Maps'
    }
  },
  {
    path: '/page3',
    name: 'page3',
    component: Page3,
    meta: {
      label: 'Page 3',
      title: 'Mapbox Choropleth'
    }
  },
  {
    path: '/page4',
    name: 'page4',
    component: Page4,
    meta: {
      label: 'Page 4',
      title: 'Mapbox + deck.gl Layer A'
    }
  },
  {
    path: '/page5',
    name: 'page5',
    component: Page5,
    meta: {
      label: 'Page 5',
      title: 'Mapbox + deck.gl Layer B'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router