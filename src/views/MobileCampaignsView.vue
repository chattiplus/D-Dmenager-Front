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

type CampaignFilterValue = 'ALL' | CampaignStatus;

const authStore = useAuthStore();
const loading = ref(false);
const errorMessage = ref('');
const campaignEntries = ref<MobileCampaignEntry[]>([]);
const searchQuery = ref('');
const selectedFilter = ref<CampaignFilterValue>('ALL');

const filterOptions: Array<{ value: CampaignFilterValue; label: string }> = [
  { value: 'ALL', label: 'Tutte' },
  { value: 'ACTIVE', label: 'Attive' },
  { value: 'PLANNED', label: 'Pianificate' },
  { value: 'PAUSED', label: 'In pausa' },
  { value: 'COMPLETED', label: 'Completate' },
];

const sessionRouteName = computed(() =>
  authStore.canManageContent ? 'dm-session-detail' : 'session-detail',
);

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
  campaignEntries.value.filter((entry) => {
    const matchesFilter =
      selectedFilter.value === 'ALL' || entry.campaignStatus === selectedFilter.value;

    if (!matchesFilter) {
      return false;
    }

    return matchSearch(
      searchQuery.value,
      entry.campaignName,
      entry.campaignDescription,
      entry.campaignStatus,
      campaignStatusLabel(entry.campaignStatus),
      ...entry.sessions.flatMap((session) => [session.title, session.notes]),
    );
  }),
);

const visibleCampaignsCount = computed(() => filteredCampaignEntries.value.length);
const visibleSessionsCount = computed(() =>
  filteredCampaignEntries.value.reduce((sum, entry) => sum + entry.sessions.length, 0),
);
const totalCampaigns = computed(() => campaignEntries.value.length);
const totalSessions = computed(() =>
  campaignEntries.value.reduce((sum, entry) => sum + entry.sessions.length, 0),
);

const resultsLabel = computed(() => {
  const campaignLabel = visibleCampaignsCount.value === 1 ? 'campagna' : 'campagne';
  const sessionLabel = visibleSessionsCount.value === 1 ? 'sessione' : 'sessioni';
  return `${visibleCampaignsCount.value} ${campaignLabel}, ${visibleSessionsCount.value} ${sessionLabel}`;
});

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
          .filter(
            (request) =>
              request.status === 'APPROVED' && typeof request.campaignId === 'number',
          )
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
      'Impossibile caricare campagne e sessioni.',
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
      <h1 class="mobile-screen__title">Campagne</h1>
      <p class="campaigns-subtitle">
        {{ authStore.canManageContent
          ? 'Archivio e gestione di campagne e sessioni.'
          : 'Cerca campagne approvate e apri le sessioni disponibili.' }}
      </p>
    </header>

    <p v-if="loading" class="card">Caricamento campagne...</p>
    <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

    <template v-else>
      <article class="campaigns-overview-card stack">
        <div class="campaigns-overview-card__badge">
          <span class="campaigns-overview-card__badge-main">
            {{ authStore.canManageContent ? 'DM' : 'PLAYER' }}
          </span>
          <span class="campaigns-overview-card__badge-sub">
            {{ authStore.canManageContent ? 'DUNGEON MASTER' : 'AVVENTURIERO' }}
          </span>
        </div>
        <h2 class="campaigns-overview-card__title">
          {{ authStore.canManageContent ? 'Le tue campagne' : 'Le tue campagne attive' }}
        </h2>
        <div class="campaigns-overview-card__stats">
          <div class="campaigns-overview-stat">
            <span class="campaigns-overview-stat__label">Campagne</span>
            <strong class="campaigns-overview-stat__value">{{ totalCampaigns }}</strong>
          </div>
          <div class="campaigns-overview-stat">
            <span class="campaigns-overview-stat__label">Sessioni</span>
            <strong class="campaigns-overview-stat__value">{{ totalSessions }}</strong>
          </div>
        </div>
      </article>

      <section class="campaigns-toolbar stack">
        <label class="field">
          <span>Cerca</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cerca campagne o sessioni..."
          />
        </label>

        <div class="campaign-filter-tabs" role="tablist" aria-label="Filtri campagne">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            type="button"
            class="campaign-filter-tab"
            :class="{ 'campaign-filter-tab--active': selectedFilter === option.value }"
            @click="selectedFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <p class="campaign-results">{{ resultsLabel }}</p>
      </section>

      <section class="campaign-list stack">
        <article
          v-for="entry in filteredCampaignEntries"
          :key="entry.campaignId"
          class="campaign-card"
        >
          <div class="campaign-card-header">
            <div class="campaign-card-title-block">
              <strong class="campaign-title">{{ entry.campaignName }}</strong>
            </div>
            <span
              v-if="entry.campaignStatus"
              :class="['campaign-status-badge', campaignStatusClass(entry.campaignStatus)]"
            >
              {{ campaignStatusLabel(entry.campaignStatus) }}
            </span>
            <span v-else class="campaign-type-label">Campagna</span>
          </div>

          <small class="campaign-description">
            {{ entry.campaignDescription || 'Apri la campagna o entra in una sessione.' }}
          </small>

          <div class="campaign-card-primary-action">
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
              :to="{ name: sessionRouteName, params: { id: session.id } }"
            >
              <div class="campaign-session-main">
                <strong>{{ session.title }}</strong>
                <small>
                  Sessione #{{ session.sessionNumber }} - {{ formatSessionDate(session.sessionDate) }}
                </small>
              </div>
              <span class="campaign-session-action">Apri</span>
            </RouterLink>
          </div>

          <p v-else class="manager-meta">Nessuna sessione disponibile</p>
        </article>

        <article v-if="!filteredCampaignEntries.length" class="card stack">
          <h2 class="card-title">
            {{ authStore.canManageContent ? 'Nessuna campagna trovata' : 'Nessuna campagna disponibile' }}
          </h2>
          <p class="manager-meta">
            {{ authStore.canManageContent
              ? 'Prova a cambiare ricerca o filtro per ritrovare campagne e sessioni.'
              : 'Prova a cambiare ricerca o apri i mondi pubblici dal Profilo.' }}
          </p>
        </article>
      </section>
    </template>
  </section>
</template>

<style scoped>
.campaigns-subtitle {
  margin: 0.35rem 0 0;
  color: var(--app-text-muted);
}

.campaigns-overview-card {
  padding: 1.3rem 1.15rem;
  border-radius: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 22%, var(--app-surface-outline));
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--app-accent) 18%, transparent), transparent 40%),
    linear-gradient(160deg, var(--app-surface-elevated), color-mix(in srgb, var(--app-surface) 94%, var(--app-bg)));
  box-shadow: 0 22px 40px color-mix(in srgb, var(--app-shadow) 16%, transparent);
  position: relative;
  overflow: hidden;
}

.campaigns-overview-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--app-accent-strong) 8%, transparent), transparent 58%),
    radial-gradient(circle at bottom left, color-mix(in srgb, var(--app-accent) 10%, transparent), transparent 34%);
  pointer-events: none;
}

.campaigns-overview-card > * {
  position: relative;
  z-index: 1;
}

.campaigns-overview-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  align-self: flex-start;
  padding: 0.4rem 0.85rem 0.4rem 0.65rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--app-accent) 34%, transparent);
  background: color-mix(in srgb, var(--app-accent) 8%, transparent);
  color: var(--app-accent-strong);
}

.campaigns-overview-card__badge-main,
.campaigns-overview-card__badge-sub {
  display: inline-flex;
  align-items: center;
}

.campaigns-overview-card__badge-main {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.campaigns-overview-card__badge-sub {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  opacity: 0.82;
}

.campaigns-overview-card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.65rem;
  letter-spacing: 0.04em;
  color: var(--app-text);
}

.campaigns-overview-card__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.campaigns-overview-stat {
  display: grid;
  gap: 0.22rem;
  padding: 0.9rem 0.95rem;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 14%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-surface) 88%, transparent);
}

.campaigns-overview-stat__label {
  color: var(--app-text-muted);
  font-size: 0.8rem;
}

.campaigns-overview-stat__value {
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1.1;
  color: var(--app-text);
}

.campaigns-toolbar {
  padding: 1rem;
  border-radius: 1.25rem;
  border: 1px solid var(--app-surface-outline);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-surface-elevated) 92%, var(--app-bg)),
    color-mix(in srgb, var(--app-surface) 96%, var(--app-bg))
  );
  box-shadow: 0 18px 34px color-mix(in srgb, var(--app-shadow) 10%, transparent);
}

.campaign-filter-tabs {
  display: flex;
  gap: 0.55rem;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--app-accent) 40%, transparent) transparent;
  padding-bottom: 0.1rem;
}

.campaign-filter-tabs::-webkit-scrollbar {
  height: 4px;
}

.campaign-filter-tabs::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--app-accent) 36%, transparent);
  border-radius: 999px;
}

.campaign-filter-tab {
  appearance: none;
  -webkit-appearance: none;
  flex: 0 0 auto;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 90%, var(--app-bg));
  color: var(--app-text);
  border-radius: 999px;
  padding: 0.62rem 0.92rem;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.campaign-filter-tab:hover,
.campaign-filter-tab:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--app-accent) 52%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 8%, var(--app-surface-elevated));
  box-shadow: 0 10px 20px color-mix(in srgb, var(--app-shadow) 10%, transparent);
}

.campaign-filter-tab:focus-visible {
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--app-bg) 80%, transparent),
    0 0 0 4px color-mix(in srgb, var(--app-accent) 36%, transparent);
}

.campaign-filter-tab--active {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--app-accent-strong) 22%, var(--app-surface-elevated)),
    color-mix(in srgb, var(--app-accent) 16%, var(--app-surface))
  );
  color: var(--app-text);
  border-color: color-mix(in srgb, var(--app-accent-strong) 56%, var(--app-surface-outline));
  box-shadow: 0 12px 24px color-mix(in srgb, var(--app-shadow) 14%, transparent);
}

.campaign-results {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.92rem;
}

.campaign-list {
  gap: 0.9rem;
}

.campaign-card {
  display: grid;
  gap: 0.9rem;
  padding: 1rem;
  border-radius: 1.2rem;
  border: 1px solid var(--app-surface-outline);
  background: var(--app-surface);
  box-shadow: 0 16px 30px color-mix(in srgb, var(--app-shadow) 10%, transparent);
}

.campaign-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.campaign-card-title-block {
  min-width: 0;
}

.campaign-title {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
}

.campaign-description {
  display: block;
  color: var(--app-text-muted);
}

.campaign-type-label {
  padding: 0.38rem 0.7rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--app-accent) 18%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-surface-elevated) 90%, var(--app-bg));
  color: var(--app-text-muted);
  font-size: 0.78rem;
}

.campaign-status-badge,
.campaign-type-label {
  flex-shrink: 0;
  margin-left: auto;
  align-self: flex-start;
}

.campaign-card-primary-action {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
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
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, var(--app-bg));
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.campaign-session-item:hover,
.campaign-session-item:focus-visible {
  border-color: color-mix(in srgb, var(--app-accent) 48%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface));
  box-shadow: 0 14px 26px color-mix(in srgb, var(--app-shadow) 12%, transparent);
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
  .campaigns-overview-card__stats {
    grid-template-columns: 1fr;
  }

  .campaign-session-item {
    padding: 0.8rem 0.85rem;
  }
}
</style>
