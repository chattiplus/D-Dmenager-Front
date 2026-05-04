<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getMyJoinRequests } from '../api/campaignPlayersApi';
import { getMyCampaigns } from '../api/campaignsApi';
import { getSessionsByCampaign } from '../api/sessionsApi';
import { useAuthStore } from '../store/authStore';
import type { CampaignPlayerResponse, SessionResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { matchSearch } from '../utils/search';

interface MobileCampaignEntry {
  campaignId: number;
  campaignName: string;
  campaignDescription?: string | null;
  campaignStatus?: string | null;
  sessions: SessionResponse[];
}

const authStore = useAuthStore();
const loading = ref(false);
const errorMessage = ref('');
const campaignEntries = ref<MobileCampaignEntry[]>([]);
const searchQuery = ref('');

const formatSessionDate = (value?: string | null) => {
  if (!value) {
    return 'Data non pianificata';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(parsed);
};

const sortSessions = (sessions: SessionResponse[]) =>
  [...sessions].sort((a, b) => {
    const aTime = a.sessionDate ? new Date(a.sessionDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.sessionDate ? new Date(b.sessionDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.sessionNumber - b.sessionNumber;
  });

const nextSession = computed(() => {
  const allSessions = filteredCampaignEntries.value.flatMap((entry) => entry.sessions);
  return sortSessions(allSessions)[0] ?? null;
});

const filteredCampaignEntries = computed(() =>
  campaignEntries.value.filter((entry) =>
    matchSearch(
      searchQuery.value,
      entry.campaignName,
      entry.campaignDescription,
      entry.campaignStatus,
      ...entry.sessions.flatMap((session) => [session.title, session.notes]),
    ),
  ),
);

const totalCampaigns = computed(() => campaignEntries.value.length);
const totalSessions = computed(() =>
  campaignEntries.value.reduce((sum, entry) => sum + entry.sessions.length, 0),
);
const visibleCampaignsCount = computed(() => filteredCampaignEntries.value.length);
const visibleSessionsCount = computed(() =>
  filteredCampaignEntries.value.reduce((sum, entry) => sum + entry.sessions.length, 0),
);

const loadMobileCampaigns = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    if (authStore.canManageContent) {
      const campaignsData = await getMyCampaigns();
      const sessionsLists = await Promise.all(
        campaignsData.map((campaign) => getSessionsByCampaign(campaign.id)),
      );
      campaignEntries.value = campaignsData.map((campaign, index) => ({
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignDescription: campaign.description,
        campaignStatus: campaign.status,
        sessions: sortSessions(sessionsLists[index] ?? []),
      }));
      return;
    }

    const requests = await getMyJoinRequests();
    const approvedRequests = Array.from(
      new Map<number, CampaignPlayerResponse>(
        requests
          .filter((request) => request.status === 'APPROVED' && typeof request.campaignId === 'number')
          .map((request) => [request.campaignId as number, request]),
      ).values(),
    );

    const sessionsLists = await Promise.all(
      approvedRequests.map((request) => getSessionsByCampaign(request.campaignId as number)),
    );

    campaignEntries.value = approvedRequests.map((request, index) => ({
      campaignId: request.campaignId as number,
      campaignName: request.campaignName ?? `Campagna #${request.campaignId}`,
      campaignDescription: request.message,
      campaignStatus: request.status,
      sessions: sortSessions(sessionsLists[index] ?? []),
    }));
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(
      error,
      'Impossibile caricare campagne e sessioni mobili.',
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
      <h1 class="mobile-screen__title">Campagne e sessioni</h1>
      <p class="mobile-screen__subtitle">Accesso diretto alle campagne e alle sessioni disponibili.</p>
    </header>

    <p v-if="loading" class="card">Caricamento campagne...</p>
    <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

    <template v-else-if="authStore.canManageContent">
      <article class="mobile-hero-card stack">
        <span class="tag">Dungeon Master</span>
        <h2 class="card-title">Le tue campagne</h2>
        <p class="manager-meta">Campagne: {{ totalCampaigns }}</p>
        <p class="manager-meta">Sessioni: {{ totalSessions }}</p>
      </article>

      <label class="field">
        <span>Cerca</span>
        <input v-model="searchQuery" type="text" placeholder="Cerca campagne o sessioni..." />
      </label>
      <p class="manager-meta">Risultati: {{ visibleCampaignsCount }} campagne, {{ visibleSessionsCount }} sessioni</p>

      <article v-if="nextSession" class="card stack">
        <h2 class="card-title">Prossima sessione</h2>
        <p class="manager-meta">
          {{ nextSession.title }} · Sessione #{{ nextSession.sessionNumber }}
        </p>
        <p class="manager-meta">{{ formatSessionDate(nextSession.sessionDate) }}</p>
        <RouterLink
          class="btn btn-primary"
          :to="{ name: 'dm-session-detail', params: { id: nextSession.id } }"
        >
          Apri sessione
        </RouterLink>
      </article>

      <section class="mobile-link-grid">
        <article
          v-for="entry in filteredCampaignEntries"
          :key="entry.campaignId"
          class="mobile-link-card mobile-campaign-card"
        >
          <span class="mobile-link-card__label">{{ entry.campaignStatus ?? 'Campagna' }}</span>
          <strong>{{ entry.campaignName }}</strong>
          <small>{{ entry.campaignDescription || 'Apri la campagna o entra in una sessione.' }}</small>
          <p class="manager-meta">Sessioni: {{ entry.sessions.length }}</p>
          <div class="mobile-campaign-card__actions">
            <RouterLink
              class="btn btn-secondary"
              :to="{ name: 'campaign-detail', params: { id: entry.campaignId } }"
            >
              Apri campagna
            </RouterLink>
            <RouterLink
              v-if="entry.sessions[0]"
              class="btn btn-primary"
              :to="{ name: 'dm-session-detail', params: { id: entry.sessions[0].id } }"
            >
              Apri sessione
            </RouterLink>
          </div>
          <ul v-if="entry.sessions.length" class="mobile-session-list">
            <li v-for="session in entry.sessions.slice(0, 3)" :key="session.id">
              <div class="mobile-session-list__meta">
                <strong>{{ session.title }}</strong>
                <small>Sessione #{{ session.sessionNumber }} · {{ formatSessionDate(session.sessionDate) }}</small>
              </div>
              <RouterLink
                class="btn btn-link"
                :to="{ name: 'dm-session-detail', params: { id: session.id } }"
              >
                Apri sessione
              </RouterLink>
            </li>
          </ul>
          <p v-else class="manager-meta">Nessuna sessione disponibile</p>
        </article>
      </section>

      <article v-if="!filteredCampaignEntries.length" class="card stack">
        <h2 class="card-title">Nessuna campagna disponibile</h2>
        <p class="manager-meta">Usa Crea Rapida per registrare la prima campagna o sessione.</p>
      </article>
    </template>

    <template v-else>
      <article class="mobile-hero-card stack">
        <span class="tag">Player</span>
        <h2 class="card-title">Le tue campagne attive</h2>
        <p class="manager-meta">Campagne: {{ totalCampaigns }}</p>
        <p class="manager-meta">Sessioni: {{ totalSessions }}</p>
      </article>

      <label class="field">
        <span>Cerca</span>
        <input v-model="searchQuery" type="text" placeholder="Cerca campagne o sessioni..." />
      </label>
      <p class="manager-meta">Risultati: {{ visibleCampaignsCount }} campagne, {{ visibleSessionsCount }} sessioni</p>

      <section class="mobile-link-grid">
        <article
          v-for="entry in filteredCampaignEntries"
          :key="entry.campaignId"
          class="mobile-link-card mobile-campaign-card"
        >
          <span class="mobile-link-card__label">Campagna</span>
          <strong>{{ entry.campaignName }}</strong>
          <small>{{ entry.campaignDescription || 'Apri la campagna o entra nella sessione disponibile.' }}</small>
          <p class="manager-meta">Sessioni: {{ entry.sessions.length }}</p>
          <div class="mobile-campaign-card__actions">
            <RouterLink
              class="btn btn-secondary"
              :to="{ name: 'campaign-detail', params: { id: entry.campaignId } }"
            >
              Apri campagna
            </RouterLink>
            <RouterLink
              v-if="entry.sessions[0]"
              class="btn btn-primary"
              :to="{ name: 'session-detail', params: { id: entry.sessions[0].id } }"
            >
              Apri sessione
            </RouterLink>
          </div>
          <ul v-if="entry.sessions.length" class="mobile-session-list">
            <li v-for="session in entry.sessions.slice(0, 3)" :key="session.id">
              <div class="mobile-session-list__meta">
                <strong>{{ session.title }}</strong>
                <small>Sessione #{{ session.sessionNumber }} · {{ formatSessionDate(session.sessionDate) }}</small>
              </div>
              <RouterLink
                class="btn btn-link"
                :to="{ name: 'session-detail', params: { id: session.id } }"
              >
                Apri sessione
              </RouterLink>
            </li>
          </ul>
          <p v-else class="manager-meta">Nessuna sessione disponibile</p>
        </article>
      </section>

      <article v-if="!filteredCampaignEntries.length" class="card stack">
        <h2 class="card-title">Nessuna campagna attiva</h2>
        <p class="manager-meta">Usa i mondi pubblici dal Profilo per trovare nuove campagne.</p>
      </article>
    </template>
  </section>
</template>

<style scoped>
.mobile-campaign-card {
  gap: 0.8rem;
}

.mobile-campaign-card__actions {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.mobile-session-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.mobile-session-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.7rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.mobile-session-list li:first-child {
  border-top: none;
  padding-top: 0;
}

.mobile-session-list__meta {
  min-width: 0;
}

.mobile-session-list strong,
.mobile-session-list small {
  display: block;
}
</style>
