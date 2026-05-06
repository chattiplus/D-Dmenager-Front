<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getMyJoinRequests } from '../api/campaignPlayersApi';
import { getMyCampaigns } from '../api/campaignsApi';
import { getSessionsByCampaign } from '../api/sessionsApi';
import { useAuthStore } from '../store/authStore';
import type { CampaignPlayerResponse, CampaignStatus, SessionResponse } from '../types/api';
import {
  campaignStatusClass,
  campaignStatusLabel,
  isCampaignStatus,
} from '../utils/campaignStatus';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { matchSearch } from '../utils/search';
import OpenEntityButton from '../components/ui/OpenEntityButton.vue';

interface MobileCampaignEntry {
  campaignId: number;
  campaignName: string;
  campaignDescription?: string | null;
  campaignStatus?: CampaignStatus | null;
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

const filteredCampaignEntries = computed(() =>
  campaignEntries.value.filter((entry) =>
    matchSearch(
      searchQuery.value,
      entry.campaignName,
      entry.campaignDescription,
      entry.campaignStatus,
      campaignStatusLabel(entry.campaignStatus),
      ...entry.sessions.flatMap((session) => [session.title, session.notes]),
    ),
  ),
);

const nextSession = computed(() => {
  const allSessions = filteredCampaignEntries.value.flatMap((entry) => entry.sessions);
  return sortSessions(allSessions)[0] ?? null;
});

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
      campaignStatus: isCampaignStatus(request.campaignStatus) ? request.campaignStatus : null,
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
        <p class="manager-meta">{{ nextSession.title }} - Sessione #{{ nextSession.sessionNumber }}</p>
        <p class="manager-meta">{{ formatSessionDate(nextSession.sessionDate) }}</p>
        <OpenEntityButton
          label="Apri sessione"
          :to="{ name: 'dm-session-detail', params: { id: nextSession.id } }"
          size="md"
        />
      </article>

      <section class="mobile-link-grid">
        <article
          v-for="entry in filteredCampaignEntries"
          :key="entry.campaignId"
          class="mobile-link-card mobile-campaign-card"
        >
          <div class="campaign-title-row">
            <strong class="campaign-title">{{ entry.campaignName }}</strong>
            <span :class="['campaign-status-badge', campaignStatusClass(entry.campaignStatus)]">
              {{ campaignStatusLabel(entry.campaignStatus) }}
            </span>
          </div>
          <small>{{ entry.campaignDescription || 'Apri la campagna o entra in una sessione.' }}</small>
          <p class="manager-meta">Sessioni: {{ entry.sessions.length }}</p>
          <div class="mobile-campaign-card__actions">
            <OpenEntityButton
              label="Apri campagna"
              :to="{ name: 'campaign-detail', params: { id: entry.campaignId } }"
            />
          </div>

          <div v-if="entry.sessions.length" class="campaign-session-list">
            <RouterLink
              v-for="session in entry.sessions"
              :key="session.id"
              class="campaign-session-item"
              :to="{ name: 'dm-session-detail', params: { id: session.id } }"
            >
              <div class="campaign-session-main">
                <strong>{{ session.title }}</strong>
                <small>Sessione #{{ session.sessionNumber }} - {{ formatSessionDate(session.sessionDate) }}</small>
              </div>
              <span class="campaign-session-action">Apri</span>
            </RouterLink>
          </div>
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
          <div class="campaign-title-row">
            <strong class="campaign-title">{{ entry.campaignName }}</strong>
            <span
              v-if="entry.campaignStatus"
              :class="['campaign-status-badge', campaignStatusClass(entry.campaignStatus)]"
            >
              {{ campaignStatusLabel(entry.campaignStatus) }}
            </span>
            <span v-else class="mobile-link-card__label campaign-type-label">Campagna</span>
          </div>
          <small>{{ entry.campaignDescription || 'Apri la campagna o entra nella sessione disponibile.' }}</small>
          <p class="manager-meta">Sessioni: {{ entry.sessions.length }}</p>
          <div class="mobile-campaign-card__actions">
            <OpenEntityButton
              label="Apri campagna"
              :to="{ name: 'campaign-detail', params: { id: entry.campaignId } }"
            />
          </div>

          <div v-if="entry.sessions.length" class="campaign-session-list">
            <RouterLink
              v-for="session in entry.sessions"
              :key="session.id"
              class="campaign-session-item"
              :to="{ name: 'session-detail', params: { id: session.id } }"
            >
              <div class="campaign-session-main">
                <strong>{{ session.title }}</strong>
                <small>Sessione #{{ session.sessionNumber }} - {{ formatSessionDate(session.sessionDate) }}</small>
              </div>
              <span class="campaign-session-action">Apri</span>
            </RouterLink>
          </div>
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

.campaign-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.campaign-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.campaign-title-row .campaign-status-badge,
.campaign-type-label {
  flex-shrink: 0;
}

.mobile-campaign-card__actions {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.campaign-session-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.campaign-session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.85rem 0.95rem;
  border-radius: 0.95rem;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-bg-soft) 72%, transparent);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.campaign-session-item:hover,
.campaign-session-item:focus-visible {
  border-color: color-mix(in srgb, var(--app-accent) 48%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface));
  transform: translateY(-1px);
  outline: none;
}

.campaign-session-main {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.campaign-session-main strong,
.campaign-session-main small {
  display: block;
}

.campaign-session-main small {
  color: var(--app-text-muted);
}

.campaign-session-action {
  flex-shrink: 0;
  color: var(--app-accent-strong);
  font-size: 0.78rem;
  font-weight: 700;
}

@media (max-width: 520px) {
  .campaign-title-row {
    align-items: flex-start;
  }

  .campaign-session-item {
    padding: 0.8rem 0.85rem;
  }
}
</style>
