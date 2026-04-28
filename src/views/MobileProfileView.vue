<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
const router = useRouter();

const profileCards = computed(() => {
  if (authStore.canManageContent) {
    return [
      { title: 'Mondi', subtitle: 'Archivio completo mondi e campagne.', to: '/dm/worlds' },
      { title: 'Oggetti', subtitle: 'Gestione completa oggetti e loot.', to: '/dm/items' },
      { title: 'Location', subtitle: 'Gestione completa luoghi e mappe.', to: '/dm/locations' },
      {
        title: 'Richieste campagne',
        subtitle: 'Approva o rifiuta gli ingressi alle campagne.',
        to: '/dm/join-requests',
      },
      { title: 'NPC', subtitle: 'Archivio completo personaggi non giocanti.', to: '/dm/npcs' },
    ];
  }

  return [
    {
      title: 'Home personale',
      subtitle: 'Torna alla dashboard personale.',
      to: authStore.defaultRoutePath,
    },
    {
      title: 'Personaggi',
      subtitle: 'Apri le schede giocante disponibili.',
      to: '/player/characters',
    },
    {
      title: 'Mondi pubblici',
      subtitle: 'Esplora campagne e mondi visibili.',
      to: '/player/worlds',
    },
  ];
});

const handleLogout = async () => {
  authStore.logout();
  await router.push({ name: 'login' });
};
</script>

<template>
  <section class="stack mobile-profile">
    <article class="card mobile-profile__hero">
      <h2 class="card-title">Profilo / Menu</h2>
      <p class="card-subtitle">
        {{ authStore.nickname ?? authStore.profile?.email ?? 'Avventuriero' }}
      </p>
      <p class="mobile-profile__roles">{{ authStore.roleBadge }}</p>
      <button type="button" class="btn btn-secondary mobile-profile__logout" @click="handleLogout">
        Logout
      </button>
    </article>

    <RouterLink
      v-for="card in profileCards"
      :key="card.title"
      :to="card.to"
      class="card mobile-profile__card"
    >
      <strong>{{ card.title }}</strong>
      <span>{{ card.subtitle }}</span>
    </RouterLink>
  </section>
</template>

<style scoped>
.mobile-profile__hero {
  gap: 0.45rem;
}

.mobile-profile__roles {
  margin: 0;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
}

.mobile-profile__logout {
  margin-top: 0.5rem;
}

.mobile-profile__card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.mobile-profile__card strong {
  font-size: 1.05rem;
}

.mobile-profile__card span {
  color: var(--color-muted);
}
</style>
