// src/main.ts
import './style.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './store/authStore';
import { registerAuthStore } from './api/httpClient';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

registerAuthStore(useAuthStore(pinia));

app.mount('#app');
