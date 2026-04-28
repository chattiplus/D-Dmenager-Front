<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getMyCampaigns } from '../api/campaignsApi';
import { getMyJoinRequests } from '../api/campaignPlayersApi';
import { getMySessions, getSessionsByCampaign } from '../api/sessionsApi';
import { useAuthStore } from '../store/authStore';
import type { CampaignPlayerResponse, CampaignResponse, SessionResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

interface PlayerCampaignCard {
  id: number;
  campaignId: number;
  title: string;
  subtitle: string;
}

interface UpcomingSessionCard {
  id: number;
  title: string;
  subtitle: string;
  to: { name: 'dm-session-detail' | 'session-detail'; params: { id: number } };
}

const authStore = useAuthStore();
const loading = ref(false);
const errorMessage = ref('');
const campaigns = ref<CampaignResponse[]>([]);
const joinRequests = ref<CampaignPlayerResponse[]>([]);
const dmSessions = ref<SessionResponse[]>([]);
const playerUpcomingSessions = ref<UpcomingSessionCard[]>([]);

const approvedCampaigns = computed<PlayerCampaignCard[]>(() =>
  joinRequests.value
    .filter((request) => request.status === 'APPROVED' && typeof request.campaignId === 'number')
    .map((request) => ({
      id: request.id,
      campaignId: request.campaignId as number,
      title: request.campaignName ?? `Campagna #${request.campaignId}`,
      subtitle: request.characterName ?? 'Partecipazione approvata',
    })),
);

const orderedDmSessions = computed(() =>
  [...dmSessions.value].sort((a, b) => {
    const aDate = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
    const bDate = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
    return aDate - bDate;
  }),
);

const loadDmCampaigns = async () => {
  const [campaignsData, sessionsData] = await Promise.all([getMyCampaigns(), getMySessions()]);
  campaigns.value = campaignsData;
  dmSessions.value = sessionsData;
};

const loadPlayerCampaigns = async () => {
  const requests = await getMyJoinRequests();
  joinRequests.value = requests;

  const approved = requests.filter(
    (request) => request.status === 'APPROVED' && typeof request.campaignId === 'number',
  );

  const sessionsByCampaign = await Promise.all(
    approved.map((request) => getSessionsByCampaign(request.campaignId as number)),
  );

  const upcoming = approved.flatMap((request, index) => {
    const sessions = sessionsByCampaign[index] ?? [];
    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      subtitle: request.campaignName ?? `Campagna #${request.campaignId}`,
      to: { name: 'session-detail' as const, params: { id: session.id } },
      dateValue: session.sessionDate ? new Date(session.sessionDate).getTime() : Number.MAX_SAFE_INTEGER,
    }));
  });

  playerUpcomingSessions.value = upcoming
    .sort((a, b) => a.dateValue - b.dateValue)
    .map(({ dateValue: _dateValue, ...rest }) => rest);
};

const loadData = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    if (authStore.canManageContent) {
      await loadDmCampaigns();
      joinRequests.value = [];
      playerUpcomingSessions.value = [];
      return;
    }

    await loadPlayerCampaigns();
    campaigns.value = [];
    dmSessions.value = [];
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(
      error,
      'Impossibile caricare la sezione campagne mobile.',
    );
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (authStore.isAuthenticated) {
    loadData();
  }
});
</script>

<template>
  <section class="stack mobile-campaigns">
    <article class="card mobile-campaigns__hero">
      <p class="mobile-campaigns__eyebrow">Sezione campagne</p>
      <h2 class="card-title">Campagne e sessioni</h2>
      <p class="card-subtitle">
        Punto di ingresso mobile per aprire campagne, sessioni e relativi flussi esistenti.
      </p>
    </article>

    <p v-if="loading" class="muted">Caricamento campagne...</p>
    <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

    <template v-else-if="authStore.canManageContent">
      <article class="card mobile-campaigns__section">
        <header class="mobile-campaigns__header">
          <h3 class="card-title">Le tue campagne</h3>
          <RouterLink class="btn btn-link" to="/dm/worlds">Gestione completa</RouterLink>
        </header>
        <ul v-if="campaigns.length" class="mobile-campaigns__list">
          <li v-for="campaign in campaigns" :key="campaign.id">
            <RouterLink
              :to="{ name: 'campaign-detail', params: { id: campaign.id } }"
              class="mobile-campaigns__card"
            >
              <strong>{{ campaign.name }}</strong>
              <span>{{ campaign.status }} · owner {{ campaign.ownerNickname ?? 'N/D' }}</span>
            </RouterLink>
          </li>
        </ul>
        <p v-else class="muted">Nessuna campagna disponibile.</p>
      </article>

      <article class="card mobile-campaigns__section">
        <header class="mobile-campaigns__header">
          <h3 class="card-title">Sessioni</h3>
        </header>
        <ul v-if="orderedDmSessions.length" class="mobile-campaigns__list">
          <li v-for="session in orderedDmSessions" :key="session.id">
            <RouterLink
              :to="{ name: 'dm-session-detail', params: { id: session.id } }"
              class="mobile-campaigns__card"
            >
              <strong>{{ session.title }}</strong>
              <span>Sessione #{{ session.sessionNumber }} · {{ session.sessionDate ?? 'Data da definire' }}</span>
            </RouterLink>
          </li>
        </ul>
        <p v-else class="muted">Nessuna sessione disponibile.</p>
      </article>
    </template>

    <template v-else>
      <article class="card mobile-campaigns__section">
        <header class="mobile-campaigns__header">
          <h3 class="card-title">Campagne attive</h3>
          <RouterLink class="btn btn-link" to="/player/worlds">Esplora</RouterLink>
        </header>
        <ul v-if="approvedCampaigns.length" class="mobile-campaigns__list">
          <li v-for="campaign in approvedCampaigns" :key="campaign.id">
            <RouterLink
              :to="{ name: 'campaign-detail', params: { id: campaign.campaignId } }"
              class="mobile-campaigns__card"
            >
              <strong>{{ campaign.title }}</strong>
              <span>{{ campaign.subtitle }}</span>
            </RouterLink>
          </li>
        </ul>
        <p v-else class="muted">Nessuna campagna approvata disponibile.</p>
      </article>

      <article class="card mobile-campaigns__section">
        <header class="mobile-campaigns__header">
          <h3 class="card-title">Sessioni</h3>
        </header>
        <ul v-if="playerUpcomingSessions.length" class="mobile-campaigns__list">
          <li v-for="session in playerUpcomingSessions" :key="session.id">
            <RouterLink :to="session.to" class="mobile-campaigns__card">
              <strong>{{ session.title }}</strong>
              <span>{{ session.subtitle }}</span>
            </RouterLink>
          </li>
        </ul>
        <p v-else class="muted">Nessuna sessione disponibile al momento.</p>
      </article>
    </template>
  </section>
</template>

<style scoped>
.mobile-campaigns__hero,
.mobile-campaigns__section {
  gap: 0.75rem;
}

.mobile-campaigns__eyebrow {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mobile-campaigns__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.mobile-campaigns__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.85rem;
}

.mobile-campaigns__card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mobile-campaigns__card strong {
  font-size: 1rem;
}

.mobile-campaigns__card span {
  color: var(--color-muted);
  line-height: 1.4;
}
</style>
