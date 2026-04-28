<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getMyJoinRequests } from '../api/campaignPlayersApi';
import { getMyCampaigns } from '../api/campaignsApi';
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
  sessionNumber: number;
  sessionDate?: string | null;
  to: { name: 'dm-session-detail' | 'session-detail'; params: { id: number } };
}

const authStore = useAuthStore();
const loading = ref(false);
const errorMessage = ref('');
const campaigns = ref<CampaignResponse[]>([]);
const joinRequests = ref<CampaignPlayerResponse[]>([]);
const dmSessions = ref<SessionResponse[]>([]);
const playerUpcomingSessions = ref<UpcomingSessionCard[]>([]);
const hasApprovedPlayerCampaigns = computed(() => approvedCampaigns.value.length > 0);

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
      sessionNumber: session.sessionNumber,
      sessionDate: session.sessionDate ?? null,
      to: { name: 'session-detail' as const, params: { id: session.id } },
      dateValue: session.sessionDate
        ? new Date(session.sessionDate).getTime()
        : Number.MAX_SAFE_INTEGER,
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
      <p class="mobile-campaigns__eyebrow">Campagne</p>
      <h2 class="card-title">Campagne e sessioni</h2>
      <p class="card-subtitle">
        Accesso rapido alle campagne esistenti e alle sessioni collegate.
      </p>
    </article>

    <p v-if="loading" class="muted">Caricamento campagne...</p>
    <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

    <template v-else-if="authStore.canManageContent">
      <article class="card mobile-campaigns__section">
        <header class="mobile-campaigns__header">
          <div>
            <h3 class="card-title">Le tue campagne</h3>
            <p class="card-subtitle">Apri una campagna o crea una nuova avventura.</p>
          </div>
          <RouterLink class="btn btn-secondary" :to="{ name: 'mobile-create', query: { action: 'campaign' } }">
            Nuova campagna
          </RouterLink>
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
          <div>
            <h3 class="card-title">Sessioni</h3>
            <p class="card-subtitle">Apri una sessione esistente o creane una su campagna attiva.</p>
          </div>
          <RouterLink class="btn btn-secondary" :to="{ name: 'mobile-create', query: { action: 'session' } }">
            Nuova sessione
          </RouterLink>
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
          <div>
            <h3 class="card-title">Campagne attive</h3>
            <p class="card-subtitle">Apri le campagne a cui partecipi.</p>
          </div>
          <RouterLink class="btn btn-secondary" to="/player/worlds">Esplora</RouterLink>
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
          <div>
            <h3 class="card-title">Le tue sessioni</h3>
            <p class="card-subtitle">Sessioni disponibili nelle campagne dove sei approvato.</p>
          </div>
        </header>
        <ul v-if="playerUpcomingSessions.length" class="mobile-campaigns__list">
          <li v-for="session in playerUpcomingSessions" :key="session.id">
            <article class="mobile-campaigns__card mobile-campaigns__session-card">
              <strong>{{ session.title }}</strong>
              <span>{{ session.subtitle }}</span>
              <span class="mobile-campaigns__session-meta">
                Sessione #{{ session.sessionNumber }} · {{ session.sessionDate ?? 'Data da definire' }}
              </span>
              <RouterLink :to="session.to" class="btn btn-secondary mobile-campaigns__cta">
                Apri sessione
              </RouterLink>
            </article>
          </li>
        </ul>
        <p v-else-if="hasApprovedPlayerCampaigns" class="muted">
          Non ci sono ancora sessioni disponibili nelle tue campagne approvate.
        </p>
        <p v-else class="muted">
          Nessuna sessione visibile: prima devi essere partecipante approvato a una campagna.
        </p>
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
  align-items: flex-start;
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

.mobile-campaigns__session-card {
  align-items: flex-start;
}

.mobile-campaigns__session-meta {
  font-size: 0.86rem;
}

.mobile-campaigns__cta {
  margin-top: 0.35rem;
}
</style>
