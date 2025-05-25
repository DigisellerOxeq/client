import { createRouter, createWebHistory } from 'vue-router'
import OrderPage from '@/views/OrderPage.vue'

const routes = [
  {
    path: '/order/:unique_code',
    name: 'UniqueCode',
    component: OrderPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
