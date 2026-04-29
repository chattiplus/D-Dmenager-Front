<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getMyJoinRequests } from '../api/campaignPlayersApi';
import { getMyCampaigns } from '../api/campaignsApi';
import { getMySessions } from '../api/sessionsApi';
import { useAuthStore } from '../store/authStore';
import type { CampaignPlayerResponse, CampaignResponse, SessionResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

const authStore = useAuthStore();
const loading = ref(false);
const errorMessage = ref('');
const campaigns = ref<CampaignResponse[]>([]);
const sessions = ref<SessionResponse[]>([]);
const joinRequests = ref<CampaignPlayerResponse[]>([]);

const approvedRequests = computed(() =>
  joinRequests.value.filter((request) => request.status === 'APPROVED'),
);

const nearestSession = computed(() => {
  const sorted = [...sessions.value]
    .filter((session) => !!session.sessionDate)
    .sort((a, b) => {
      const aDate = new Date(a.sessionDate as string).getTime();
      const bDate = new Date(b.sessionDate as string).getTime();
      return aDate - bDate;
    });

  return sorted[0] ?? null;
});

const loadMobileCampaigns = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    if (authStore.canManageContent) {
      const [campaignsData, sessionsData] = await Promise.all([
        getMyCampaigns(),
        getMySessions(),
      ]);
      campaigns.value = campaignsData;
      sessions.value = sessionsData;
      joinRequests.value = [];
      return;
    }

    const requests = await getMyJoinRequests();
    joinRequests.value = requests;
    campaigns.value = [];
    sessions.value = [];
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(
      error,
      'Impossibile caricare il riepilogo campagne mobile.',
    );
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (authStore.isAuthenticated) {
    loadMobileCampaigns();
  }
});
</script>

<template>
  <section class="mobile-screen stack">
    <header class="mobile-screen__header">
      <p class="mobile-screen__eyebrow">Campagne</p>
      <h1 class="mobile-screen__title">Hub campagne</h1>
      <p class="mobile-screen__subtitle">
        Accesso rapido ai percorsi principali senza cambiare i flussi gia esistenti.
      </p>
    </header>

    <p v-if="loading" class="muted">Caricamento campagne...</p>
    <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

    <template v-else-if="authStore.canManageContent">
      <article class="mobile-hero-card stack">
        <span class="tag">Dungeon Master</span>
        <h2 class="card-title">Le tue campagne</h2>
        <p class="manager-meta">
          {{ campaigns.length }} campagne gestite in questo account.
        </p>
        <RouterLink class="btn btn-primary" to="/dm/worlds">
          Apri gestione mondi e campagne
        </RouterLink>
      </article>

      <article v-if="nearestSession" class="card stack">
        <h2 class="card-title">Prossima sessione</h2>
        <p class="manager-meta">
          {{ nearestSession.title }} · Sessione #{{ nearestSession.sessionNumber }}
        </p>
        <p class="manager-meta">
          {{ nearestSession.sessionDate ?? 'Data non pianificata' }}
        </p>
        <RouterLink
          class="btn btn-secondary"
          :to="{ name: 'dm-session-detail', params: { id: nearestSession.id } }"
        >
          Apri sessione
        </RouterLink>
      </article>

      <section class="mobile-link-grid">
        <RouterLink
          v-for="campaign in campaigns.slice(0, 6)"
          :key="campaign.id"
          class="mobile-link-card"
          :to="{ name: 'campaign-detail', params: { id: campaign.id } }"
        >
          <span class="mobile-link-card__label">{{ campaign.status ?? 'Campagna' }}</span>
          <strong>{{ campaign.name }}</strong>
          <small>{{ campaign.description || 'Apri il dettaglio campagna.' }}</small>
        </RouterLink>
      </section>
    </template>

    <template v-else>
      <article class="mobile-hero-card stack">
        <span class="tag">Player</span>
        <h2 class="card-title">Le tue campagne attive</h2>
        <p class="manager-meta">
          {{ approvedRequests.length }} campagne approvate.
        </p>
        <RouterLink class="btn btn-primary" to="/player/worlds">
          Esplora mondi e candidature
        </RouterLink>
      </article>

      <section class="mobile-link-grid">
        <RouterLink
          v-for="request in approvedRequests.slice(0, 6)"
          :key="request.id"
          class="mobile-link-card"
          :to="request.campaignId ? { name: 'campaign-detail', params: { id: request.campaignId } } : '/player/worlds'"
        >
          <span class="mobile-link-card__label">Campagna</span>
          <strong>{{ request.campaignName ?? `Campagna #${request.campaignId}` }}</strong>
          <small>{{ request.characterName || 'Apri il dettaglio della campagna.' }}</small>
        </RouterLink>
      </section>

      <article v-if="!approvedRequests.length" class="card stack">
        <h2 class="card-title">Nessuna campagna attiva</h2>
        <p class="manager-meta">
          Usa la sezione mondi pubblici per trovare campagne e inviare richieste.
        </p>
      </article>
    </template>
  </section>
</template>
