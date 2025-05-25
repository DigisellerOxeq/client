<template>
  <div class="order-page">
    <div class="header" :class="{ 'loaded': !loading }">
      <h1>Информация о заказе</h1>
      <p v-if="order">Номер заказа: {{ orderCode }}</p>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loader"></div>
      <p>Загружаем информацию о заказе...</p>
    </div>

    <div v-else-if="error" class="error-message fade-in">
      <p>Ошибка: {{ error }}</p>
      <button @click="fetchOrder" class="retry-button">Попробовать снова</button>
    </div>

    <div v-else-if="order" class="order-details">
      <div class="order-section fade-in" style="--delay: 0.1s">
        <h2>Статус заказа</h2>
        <p :class="`status-${order.status}`">{{ getStatusText(order.status) }}</p>
      </div>

      <div class="order-section fade-in" style="--delay: 0.2s">
        <h2>Детали доставки</h2>
        <p><strong>Покупатель:</strong> {{ order.buyer_email }}</p>
        <p><strong>Дата покупки:</strong> {{ formatPayTime(order.pay_time) }}</p>
      </div>

      <div class="order-section fade-in" style="--delay: 0.3s">
        <div class="codes-header">
          <h2>Товар</h2>
          <span
            v-if="order.items && order.items.length > 0"
            class="copy-icon"
            @click="copyAllCodes"
            title="Скопировать все коды"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span class="copy-label">Скопировать все</span>
          </span>
        </div>

        <div v-if="loadingItems" class="items-loading fade-in">
          <div class="loader"></div>
          <p>Ожидаем генерации кодов...</p>
        </div>

        <template v-else>
          <transition-group name="fade-list" tag="div" class="order-items-group">
            <div
              v-for="(item, i) in order.items"
              :key="i"
              class="order-item animated-item"
              :style="{ '--index': i }"
            >
              <div class="item-content">
                <p>{{ item }}</p>
                <span class="copy-icon" @click="copyCode(item)" title="Скопировать">
                  <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </span>
              </div>
            </div>
          </transition-group>
        </template>
      </div>
    </div>

    <div v-else class="not-found fade-in">
      <p>Заказ с кодом "{{ orderCode }}" не найден</p>
    </div>

    <!-- Пуш-уведомление -->
    <teleport to="body">
      <transition name="fade-slide">
        <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import './OrderPage.css'
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5541/api',
  timeout: 15000
})

const route = useRoute()
const orderCode = ref(route.params.unique_code)
const order = ref(null)
const loading = ref(true)
const loadingItems = ref(false)
const error = ref(null)

const toastVisible = ref(false)
const toastMessage = ref('')

let pollingInterval = null

const fetchOrder = async () => {
  try {
    loading.value = true
    error.value = null

    const postResponse = await api.post(`/orders/${orderCode.value}`)
    let currentOrder = postResponse.data

    order.value = currentOrder

    if (currentOrder.status === 'success' && currentOrder.goods_list?.length > 0) {
      order.value.items = currentOrder.goods_list.map(g => g.value)
    } else if (['pending', 'processing'].includes(currentOrder.status)) {
      startPolling()
    }

  } catch (err) {
    error.value = "Не удалось загрузить информацию о заказе"
  } finally {
    loading.value = false
  }
}

const pollOrder = async () => {
  try {
    loadingItems.value = true
    const getResponse = await api.get(`/orders/${orderCode.value}`)
    const updatedOrder = getResponse.data

    order.value = updatedOrder

    if (updatedOrder.goods_list?.length > 0) {
      clearInterval(pollingInterval)
      order.value.items = updatedOrder.goods_list.map(g => g.value)
      order.value.status = 'success'
      loadingItems.value = false
    }
  } catch (err) {
    // Игнорируем
  }
}

const startPolling = () => {
  loadingItems.value = true
  pollingInterval = setInterval(pollOrder, 2000)
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': 'В обработке',
    'processing': 'В обработке',
    'error': 'Ошибка',
    'success': 'Доставлен',
  }
  return statusMap[status] || status
}

const formatPayTime = (unixTimestamp) => {
  if (!unixTimestamp) return ''
  const utcDate = new Date(unixTimestamp * 1000)
  const moscowTime = new Date(utcDate.getTime() + 3 * 60 * 60 * 1000)

  const pad = (num) => num.toString().padStart(2, '0')

  const day = pad(moscowTime.getDate())
  const month = pad(moscowTime.getMonth() + 1)
  const year = moscowTime.getFullYear()
  const hours = pad(moscowTime.getHours())
  const minutes = pad(moscowTime.getMinutes())

  return `${day}.${month}.${year} ${hours}:${minutes}`
}

const showToast = (msg) => {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => {
    toastVisible.value = false
  }, 3000)
}

const copyCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code + '\n')
    showToast('Код скопирован')
  } catch (err) {
    console.error("Не удалось скопировать код:", err)
  }
}

const copyAllCodes = async () => {
  try {
    const all = order.value.items.join('\n')
    await navigator.clipboard.writeText(all)
    showToast('Все коды скопированы')
  } catch (err) {
    console.error("Не удалось скопировать все коды:", err)
  }
}

onMounted(fetchOrder)
</script>
