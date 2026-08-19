import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueKonva from 'vue-konva'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/authStore'
import { signalRService } from './services/signalrService'

import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueKonva)

// Restore auth session from localStorage before routing begins
const authStore = useAuthStore()
authStore.restore()

// If user was already authenticated, reconnect SignalR
if (authStore.isAuthenticated && authStore.user?.token) {
  signalRService.connect(authStore.user.token).catch(console.warn)
}

app.mount('#app')
