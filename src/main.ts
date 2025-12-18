// src/main.ts
import './styles/theme.css';
import './style.css';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { useAuthStore } from './store/authStore';
import type { UserRole } from './types/api';
import { setUnauthorizedHandler } from './api/httpClient';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const authStore = useAuthStore(pinia);

setUnauthorizedHandler(async () => {
  authStore.logout();
  if (router.currentRoute.value.name !== 'login') {
    await router.push({ name: 'login' });
  }
});

router.beforeEach((to) => {
  const requiresAuth = to.meta?.requiresAuth !== false;
  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: authStore.defaultRouteName };
  }

  const allowedRoles = (to.meta?.roles as UserRole[] | undefined) ?? undefined;
  if (allowedRoles && !authStore.hasAnyRole(allowedRoles)) {
    return { name: authStore.defaultRouteName };
  }

  return true;
});

app.use(router);

app.mount('#app');
