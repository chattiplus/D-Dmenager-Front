<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
const router = useRouter();

const profileLinks = computed(() => {
  if (authStore.canManageContent) {
    return [
      { label: 'Mondi', description: 'Gestione mondi e campagne.', to: '/dm/worlds' },
      { label: 'NPC', description: 'Archivio personaggi non giocanti.', to: '/dm/npcs' },
      { label: 'Location', description: 'Luoghi, dungeon e mappe.', to: '/dm/locations' },
      { label: 'Oggetti', description: 'Loot, tesori e equipaggiamento.', to: '/dm/items' },
      { label: 'Richieste campagne', description: 'Coda candidature campagne.', to: '/dm/join-requests' },
    ];
  }

  return [
    { label: 'I miei personaggi', description: 'Schede e creazione personaggi.', to: '/player/characters' },
    { label: 'Mondi pubblici', description: 'Esplora mondi e campagne aperte.', to: '/player/worlds' },
  ];
});

const handleLogout = async () => {
  authStore.logout();
  await router.push('/login');
};
</script>

<template>
  <section class="mobile-screen stack">
    <header class="mobile-screen__header">
      <p class="mobile-screen__eyebrow">Profilo</p>
      <h1 class="mobile-screen__title">{{ authStore.nickname ?? 'Account' }}</h1>
      <p class="mobile-screen__subtitle">
        {{ authStore.roleBadge || 'Il tuo spazio' }}
      </p>
    </header>

    <article class="mobile-hero-card stack">
      <span class="tag">{{ authStore.roleBadge || 'Utente' }}</span>
      <h2 class="card-title">Strumenti e raccolte</h2>
      <p v-if="authStore.profile?.email" class="manager-meta">{{ authStore.profile.email }}</p>
    </article>

    <section class="mobile-link-grid">
      <RouterLink
        v-for="link in profileLinks"
        :key="link.to"
        class="mobile-link-card"
        :to="link.to"
      >
        <span class="mobile-link-card__label">Sezione</span>
        <strong>{{ link.label }}</strong>
        <small>{{ link.description }}</small>
      </RouterLink>
    </section>

    <article class="card stack">
      <h2 class="card-title">Sessione utente</h2>
      <p class="card-subtitle">Esci dall account e torna alla schermata di accesso.</p>
      <button class="btn btn-secondary" type="button" @click="handleLogout">
        Logout
      </button>
    </article>
  </section>
</template>
