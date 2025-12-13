// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import DiceRollerView from '../views/DiceRollerView.vue';

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
      meta: { requiresAuth: false },
    },
    {
      path: '/dm/dashboard',
      name: 'dm-dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true, roles: ['ROLE_ADMIN', 'ROLE_GM'] },
    },
    {
      path: '/dm/worlds',
      name: 'dm-worlds',
      component: () => import('../views/WorldsView.vue'),
      meta: { requiresAuth: true, roles: ['ROLE_ADMIN', 'ROLE_GM'] },
    },
    {
      path: '/dm/npcs',
      name: 'dm-npcs',
      component: () => import('../views/DmNpcsView.vue'),
      meta: { requiresAuth: true, roles: ['ROLE_ADMIN', 'ROLE_GM'] },
    },
    {
      path: '/dm/sessions/:id',
      name: 'dm-session-detail',
      component: () => import('../views/DmSessionDetailView.vue'),
      meta: { requiresAuth: true, roles: ['ROLE_ADMIN', 'ROLE_GM'] },
    },
    {
      path: '/dm/locations',
      name: 'dm-locations',
      component: () => import('../views/DmLocationsView.vue'),
      meta: { requiresAuth: true, roles: ['ROLE_ADMIN', 'ROLE_GM'] },
    },
    {
      path: '/dm/items',
      name: 'dm-items',
      component: () => import('../views/DmItemsView.vue'),
      meta: { requiresAuth: true, roles: ['ROLE_ADMIN', 'ROLE_GM'] },
    },
    {
      path: '/worlds',
      redirect: '/dm/worlds',
    },
    {
      path: '/player/dashboard',
      name: 'player-dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/player/characters',
      name: 'player-characters',
      component: () => import('../views/PlayerCharactersView.vue'),
      meta: { requiresAuth: true, roles: ['ROLE_PLAYER', 'ROLE_VIEWER'] },
    },
    {
      path: '/player/worlds',
      name: 'player-worlds',
      component: () => import('../views/PublicWorldsView.vue'),
      meta: { requiresAuth: true, roles: ['ROLE_PLAYER', 'ROLE_VIEWER'] },
    },
    {
      path: '/dm/join-requests',
      name: 'dm-join-requests',
      component: () => import('../views/DmJoinRequestsView.vue'),
      meta: { requiresAuth: true, roles: ['ROLE_ADMIN', 'ROLE_GM'] },
    },
    {
      path: '/worlds/:id',
      name: 'world-detail',
      component: () => import('../views/WorldDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id',
      name: 'campaign-detail',
      component: () => import('../views/CampaignDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/sessions/:id',
      name: 'session-detail',
      component: () => import('../views/SessionDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dice',
      name: 'dice-roller',
      component: DiceRollerView,
      meta: { requiresAuth: true },
    },
  ],
});

export default router;
