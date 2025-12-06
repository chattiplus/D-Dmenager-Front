// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/worlds',
      name: 'worlds',
      component: () => import('../views/WorldsView.vue'),
    },
    {
      path: '/worlds/:id',
      name: 'world-detail',
      component: () => import('../views/WorldDetailView.vue'),
    },
    {
      path: '/campaigns/:id',
      name: 'campaign-detail',
      component: () => import('../views/CampaignDetailView.vue'),
    },
    {
      path: '/sessions/:id',
      name: 'session-detail',
      component: () => import('../views/SessionDetailView.vue'),
    },
  ],
});

export default router;
