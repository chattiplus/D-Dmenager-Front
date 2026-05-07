<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import ThemeSelector from '../components/theme/ThemeSelector.vue';
import { getPrimaryUserRoleLabel } from '../utils/userRoleLabel';

const authStore = useAuthStore();
const router = useRouter();
const primaryRoleLabel = computed(() => getPrimaryUserRoleLabel(authStore.roles));

const profileLinks = computed(() => {
  if (authStore.canManageContent) {
    return [
      { label: 'History', description: 'Rileggi campagne e sessioni passate.', to: '/profile/history' },
      { label: 'Mondi', description: 'Gestione mondi e campagne.', to: '/dm/worlds' },
      { label: 'NPC', description: 'Archivio personaggi non giocanti.', to: '/dm/npcs' },
      { label: 'Location', description: 'Luoghi, dungeon e mappe.', to: '/dm/locations' },
      { label: 'Oggetti', description: 'Loot, tesori e equipaggiamento.', to: '/dm/items' },
      { label: 'Richieste campagne', description: 'Coda candidature campagne.', to: '/dm/join-requests' },
    ];
  }

  return [
    { label: 'History', description: 'Rileggi campagne e sessioni passate.', to: '/profile/history' },
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
      <p class="mobile-screen__subtitle">Gestisci il tuo account</p>
    </header>

    <article class="mobile-hero-card stack">
      <h2 class="card-title">Profilo</h2>
      <p v-if="authStore.profile?.email" class="manager-meta">{{ authStore.profile.email }}</p>
      <div class="profile-role-card">
        <span class="profile-role-card__label">Ruolo</span>
        <strong class="profile-role-card__value">{{ primaryRoleLabel }}</strong>
      </div>
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
      <div class="profile-theme-header">
        <div>
          <h2 class="card-title">Tema</h2>
          <p class="card-subtitle">Scegli il look dell app anche da mobile.</p>
        </div>
      </div>
      <ThemeSelector variant="card" />
    </article>

    <article class="card stack">
      <h2 class="card-title">Sessione utente</h2>
      <p class="card-subtitle">Esci dall account e torna alla schermata di accesso.</p>
      <button class="btn btn-secondary" type="button" @click="handleLogout">
        Logout
      </button>
    </article>
  </section>
</template>

<style scoped>
.profile-theme-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.profile-role-card {
  display: grid;
  gap: 0.3rem;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, transparent);
  border: 1px solid var(--app-surface-outline);
}

.profile-role-card__label {
  color: var(--app-text-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.profile-role-card__value {
  color: var(--app-text);
  font-size: 1rem;
}
</style>
