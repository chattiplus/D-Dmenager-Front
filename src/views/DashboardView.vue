<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getDashboard } from '../api/dashboardApi';
import { getMyJoinRequests } from '../api/campaignPlayersApi';
import { getMyCampaigns } from '../api/campaignsApi';
import { getSessionsByCampaign, getMySessions } from '../api/sessionsApi';
import type {
  CampaignResponse,
  CampaignPlayerResponse,
  CampaignPlayerStatus,
  DashboardResponse,
  SessionResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { useAuthStore } from '../store/authStore';
import { useIsMobile } from '../composables/useIsMobile';

import OpenEntityButton from '../components/ui/OpenEntityButton.vue';

interface PlayerUpcomingSession {
  campaignId: number;
  campaignName?: string | null;
  session: SessionResponse;
  sessionDate: string;
}

const authStore = useAuthStore();
const { isMobile } = useIsMobile();
const isViewerOnly = computed(() => authStore.isViewerOnly);
const greetingName = computed(() => authStore.nickname ?? authStore.profile?.nickname ?? 'Avventuriero');
const dashboard = ref<DashboardResponse | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const playerExtrasLoading = ref(false);
const playerExtrasError = ref('');
const myJoinRequestsState = ref<CampaignPlayerResponse[]>([]);
const upcomingSessions = ref<PlayerUpcomingSession[]>([]);
const dmCurrentSession = ref<{ session: SessionResponse; campaignName: string } | null>(null);
const dmCurrentSessionLoading = ref(false);
const dmCurrentSessionError = ref('');
const dmCampaigns = ref<CampaignResponse[]>([]);
const dmSessions = ref<SessionResponse[]>([]);

const isGmView = computed(() => dashboard.value?.view === 'GM');

const parseSessionDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyPattern.test(value)) {
    const parts = value.split('-').map(Number);
    if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
      return null;
    }
    const [year, month, day] = parts as [number, number, number];
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatSessionDate = (value: string | null | undefined) => {
  const date = parseSessionDate(value);
  if (!date) {
    return value ?? 'Data non disponibile';
  }
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'full' }).format(date);
};

const statusLabels: Record<CampaignPlayerStatus, string> = {
  PENDING: 'In attesa',
  APPROVED: 'Approvata',
  REJECTED: 'Rifiutata',
};

const statusPriority: Record<CampaignPlayerStatus, number> = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
};

const refreshDashboardStats = async () => {
  const data = await getDashboard();
  dashboard.value = data;
  return data;
};

const determineNextSessionEntry = (
  entries: { session: SessionResponse; campaign: CampaignResponse }[],
) => {
  if (!entries.length) {
    return null;
  }
  const now = new Date();
  const withDate = entries
    .map((entry) => ({
      entry,
      date: parseSessionDate(entry.session.sessionDate ?? null),
    }))
    .filter((item): item is { entry: { session: SessionResponse; campaign: CampaignResponse }; date: Date } => !!item.date);
  const future = withDate
    .filter((item) => item.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const futureEntry = future[0];
  if (futureEntry) {
    return {
      session: futureEntry.entry.session,
      campaignName: futureEntry.entry.campaign.name,
    };
  }
  const latestPast = withDate.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  if (latestPast) {
    return {
      session: latestPast.entry.session,
      campaignName: latestPast.entry.campaign.name,
    };
  }
  const sortedByNumber = [...entries].sort(
    (a, b) => b.session.sessionNumber - a.session.sessionNumber,
  );
  const fallback = sortedByNumber[0];
  return fallback
    ? {
        session: fallback.session,
        campaignName: fallback.campaign.name,
      }
    : null;
};

const loadDmCurrentSession = async () => {
  if (dashboard.value?.view !== 'GM') {
    dmCurrentSession.value = null;
    dmCampaigns.value = [];
    dmSessions.value = [];
    return;
  }
  dmCurrentSessionLoading.value = true;
  dmCurrentSessionError.value = '';
  try {
    const campaigns = await getMyCampaigns();
    const sessions = await getMySessions();
    dmCampaigns.value = campaigns;
    dmSessions.value = sessions;

    const sessionEntries = sessions
      .map((session: SessionResponse) => {
        const campaign = campaigns.find((c) => c.id === session.campaignId);
        return campaign ? { session, campaign } : null;
      })
      .filter((entry): entry is { session: SessionResponse; campaign: CampaignResponse } => entry !== null);

    dmCurrentSession.value = determineNextSessionEntry(sessionEntries);
  } catch (error) {
    dmCurrentSessionError.value = extractApiErrorMessage(
      error,
      'Impossibile recuperare la sessione attuale.',
    );
    dmCurrentSession.value = null;
  } finally {
    dmCurrentSessionLoading.value = false;
  }
};

const loadPlayerExtras = async () => {
  if (authStore.isViewerOnly) {
    playerExtrasLoading.value = false;
    playerExtrasError.value = '';
    myJoinRequestsState.value = [];
    upcomingSessions.value = [];
    return;
  }
  playerExtrasLoading.value = true;
  playerExtrasError.value = '';
  try {
    const joinRequests = await getMyJoinRequests();
    myJoinRequestsState.value = joinRequests;

    const approvedRequests = joinRequests.filter(
      (request) => request.status === 'APPROVED' && typeof request.campaignId === 'number',
    );

    const uniqueApproved = Array.from(
      new Map<number, CampaignPlayerResponse>(
        approvedRequests.map((request) => [request.campaignId as number, request]),
      ).values(),
    );

    if (!uniqueApproved.length) {
      upcomingSessions.value = [];
      return;
    }

    const sessionsLists = await Promise.all(
      uniqueApproved.map((request) => getSessionsByCampaign(request.campaignId as number)),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const aggregated: PlayerUpcomingSession[] = [];
    uniqueApproved.forEach((request, index) => {
      const sessions = sessionsLists[index] ?? [];
      sessions.forEach((session) => {
        if (!session.sessionDate) {
          return;
        }
        const parsedDate = parseSessionDate(session.sessionDate);
        if (!parsedDate) {
          return;
        }
        if (parsedDate >= today) {
          aggregated.push({
            campaignId: request.campaignId as number,
            campaignName: request.campaignName,
            session,
            sessionDate: session.sessionDate,
          });
        }
      });
    });

    aggregated.sort((a, b) => {
      const aDate = parseSessionDate(a.sessionDate)?.getTime() ?? 0;
      const bDate = parseSessionDate(b.sessionDate)?.getTime() ?? 0;
      return aDate - bDate;
    });

    upcomingSessions.value = aggregated;
  } catch (error) {
    playerExtrasError.value = extractApiErrorMessage(
      error,
      'Impossibile caricare le sessioni del giocatore.',
    );
  } finally {
    playerExtrasLoading.value = false;
  }
};

const loadDashboard = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await refreshDashboardStats();
    if (data.view === 'PLAYER') {
      if (authStore.isViewerOnly) {
        playerExtrasLoading.value = false;
        playerExtrasError.value = '';
        myJoinRequestsState.value = [];
        upcomingSessions.value = [];
      } else {
        await loadPlayerExtras();
        myJoinRequestsState.value = [...myJoinRequestsState.value];
      }
    } else {
      myJoinRequestsState.value = [];
      upcomingSessions.value = [];
      playerExtrasError.value = '';
      playerExtrasLoading.value = false;
      await loadDmCurrentSession();
    }
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Impossibile caricare la dashboard.');
  } finally {
    loading.value = false;
  }
};

const pendingRequests = computed<CampaignPlayerResponse[]>(
  () => dashboard.value?.pendingJoinRequests ?? [],
);
const pendingRequestsPreview = computed(() => pendingRequests.value.slice(0, 3));
const myCharacters = computed(() => dashboard.value?.myCharacters ?? []);
const recentEvents = computed(() => dashboard.value?.recentEvents ?? []);
const recentEventsPreview = computed(() => recentEvents.value.slice(0, 3));
const nextSession = computed(() => upcomingSessions.value[0] ?? null);
const otherUpcomingSessions = computed(() => upcomingSessions.value.slice(1));
const dmUndatedSessionsCount = computed(
  () => dmSessions.value.filter((session) => !parseSessionDate(session.sessionDate ?? null)).length,
);
const dmPausedCampaignsCount = computed(
  () => dmCampaigns.value.filter((campaign) => campaign.status === 'PAUSED').length,
);
const dmActiveCampaignsCount = computed(
  () => dmCampaigns.value.filter((campaign) => campaign.status === 'ACTIVE').length,
);
const dmFutureSessionsCount = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dmSessions.value.filter((session) => {
    const parsed = parseSessionDate(session.sessionDate ?? null);
    return !!parsed && parsed >= today;
  }).length;
});
const dmManageItems = computed(() => {
  const items = [
    {
      key: 'pending',
      title: 'Richieste join',
      value: pendingRequests.value.length,
      detail:
        pendingRequests.value.length > 0
          ? 'Da revisionare nelle tue campagne.'
          : 'Nessuna richiesta in sospeso.',
      to: pendingRequests.value.length > 0 ? '/dm/join-requests' : undefined,
    },
    {
      key: 'undated',
      title: 'Sessioni senza data',
      value: dmUndatedSessionsCount.value,
      detail:
        dmUndatedSessionsCount.value > 0
          ? 'Pianifica la prossima finestra di gioco.'
          : 'Tutte le sessioni hanno una data.',
    },
    {
      key: 'paused',
      title: 'Campagne in pausa',
      value: dmPausedCampaignsCount.value,
      detail:
        dmPausedCampaignsCount.value > 0
          ? 'Valuta se riattivarle o archiviarle.'
          : 'Nessuna campagna in pausa.',
    },
    {
      key: 'recent',
      title: 'Eventi recenti',
      value: recentEvents.value.length,
      detail:
        recentEvents.value.length > 0
          ? 'Nuovi movimenti nella timeline.'
          : 'Nessun evento recente registrato.',
    },
  ];

  return items;
});
const playerJoinRequests = computed(() =>
  [...myJoinRequestsState.value].sort(
    (a, b) => (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99),
  ),
);
const approvedPlayerRequestsCount = computed(
  () => playerJoinRequests.value.filter((request) => request.status === 'APPROVED').length,
);

onMounted(() => {
  if (authStore.isAuthenticated) {
    loadDashboard();
  }
});
</script>

<template>
  <section v-if="isMobile" class="mobile-screen stack">
    <header class="mobile-screen__header">
      <p class="mobile-screen__eyebrow">Home</p>
      <h1 class="mobile-screen__title">Ciao, {{ greetingName }}</h1>
    </header>

    <div v-if="loading" class="card">Caricamento dashboard...</div>
    <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

    <template v-else-if="dashboard">
      <template v-if="isGmView">
        <article class="dm-home-hero stack">
          <div class="dm-hero__badge">
            <span class="dm-hero__badge-icon">O</span>
            <span>DM</span>
            <span class="dm-hero__badge-label">Dashboard operativa</span>
          </div>
          <div class="stack">
            <p class="dm-home-hero__eyebrow">Prossima sessione</p>
            <h2 class="dm-home-hero__title">
              {{ dmCurrentSession?.session.title ?? 'Nessuna sessione imminente' }}
            </h2>
          </div>
          <p v-if="dmCurrentSessionLoading" class="muted">Ricerca sessione...</p>
          <p v-else-if="dmCurrentSessionError" class="status-message text-danger">
            {{ dmCurrentSessionError }}
          </p>
          <template v-else-if="dmCurrentSession">
            <p class="manager-meta">Campagna: {{ dmCurrentSession.campaignName }}</p>
            <p class="manager-meta">
              Data pianificata:
              {{ formatSessionDate(dmCurrentSession.session.sessionDate) }}
            </p>
            <OpenEntityButton
              label="Apri sessione"
              :to="{ name: 'dm-session-detail', params: { id: dmCurrentSession.session.id } }"
              size="md"
            />
          </template>
            <p v-else class="muted">Pianifica una nuova data dalle tue campagne attive.</p>
        </article>

        <section class="stack">
          <header class="section-header">
            <h2>Da gestire</h2>
          </header>
          <div class="dm-manage-grid">
            <article
              v-for="item in dmManageItems"
              :key="item.key"
              class="dm-manage-card"
            >
              <div class="dm-manage-card__head">
                <span class="dm-manage-card__title">{{ item.title }}</span>
                <strong class="dm-manage-card__value">{{ item.value }}</strong>
              </div>
              <p class="manager-meta">{{ item.detail }}</p>
              <OpenEntityButton
                v-if="item.to"
                label="Apri"
                :to="item.to"
                variant="ghost"
              />
            </article>
          </div>

        </section>

        <article class="card dm-history-callout stack">
          <div>
            <p class="dm-history-callout__eyebrow">History</p>
            <h2 class="card-title">Rivedi sessioni passate</h2>
            <p class="card-subtitle">
              Apri l'archivio cronologico di campagne e sessioni gia concluse.
            </p>
          </div>
          <OpenEntityButton label="Apri history" to="/profile/history" size="md" />
        </article>

        <article class="card dm-summary-card stack">
          <header class="section-header">
            <h2 class="card-title">Mini riepilogo</h2>
          </header>
          <div class="dm-summary-grid">
            <div class="dm-summary-pill">
              <span class="dm-summary-pill__label">Campagne attive</span>
              <strong class="dm-summary-pill__value">{{ dmActiveCampaignsCount }}</strong>
            </div>
            <div class="dm-summary-pill">
              <span class="dm-summary-pill__label">Sessioni future</span>
              <strong class="dm-summary-pill__value">{{ dmFutureSessionsCount }}</strong>
            </div>
            <div class="dm-summary-pill">
              <span class="dm-summary-pill__label">Richieste pending</span>
              <strong class="dm-summary-pill__value">{{ pendingRequests.length }}</strong>
            </div>
          </div>
        </article>
      </template>

      <template v-else>
        <article class="mobile-hero-card stack">
          <span class="tag">Campagne attive</span>
          <h2 class="card-title">{{ approvedPlayerRequestsCount }}</h2>
          <p class="manager-meta">
            {{ myCharacters.length }} personaggi e {{ recentEventsPreview.length }} eventi recenti.
          </p>
          <OpenEntityButton label="Apri hub campagne" to="/mobile/campaigns" size="md" />
        </article>

        <article class="card stack">
          <h2 class="card-title">Prossima sessione</h2>
          <p v-if="playerExtrasLoading" class="muted">Caricamento sessioni...</p>
          <p v-else-if="playerExtrasError" class="status-message text-danger">
            {{ playerExtrasError }}
          </p>
          <template v-else-if="nextSession">
            <strong>{{ nextSession.session.title }}</strong>
            <p class="manager-meta">
              {{ nextSession.campaignName ?? `Campagna #${nextSession.campaignId}` }}
            </p>
            <p class="manager-meta">
              {{ formatSessionDate(nextSession.sessionDate) }}
            </p>
            <OpenEntityButton
              label="Apri sessione"
              :to="{ name: 'session-detail', params: { id: nextSession.session.id } }"
            />
          </template>
          <p v-else class="muted">Nessuna sessione futura pianificata.</p>
        </article>

        <section class="mobile-link-grid">
          <RouterLink class="mobile-link-card" to="/player/characters">
            <span class="mobile-link-card__label">Scorciatoia</span>
            <strong>Personaggi</strong>
            <small>Gestisci le tue schede personaggio.</small>
          </RouterLink>
          <RouterLink class="mobile-link-card" to="/mobile/campaigns">
            <span class="mobile-link-card__label">Scorciatoia</span>
            <strong>Campagne</strong>
            <small>Apri campagne approvate e relative sessioni.</small>
          </RouterLink>
          <RouterLink class="mobile-link-card" to="/mobile/profile">
            <span class="mobile-link-card__label">Scorciatoia</span>
            <strong>Profilo</strong>
            <small>Accesso rapido alle sezioni personali.</small>
          </RouterLink>
        </section>
      </template>
    </template>
  </section>

  <section v-else class="stack">
    <div class="card stack">
      <header v-if="!isGmView">
        <h1 class="section-title">Dashboard giocatore</h1>
        <p class="section-subtitle">
          Panoramica rapida di campagne, sessioni e personaggi.
        </p>
      </header>

      <div v-if="loading">Caricamento dashboard...</div>
      <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

      <template v-else-if="dashboard">

        <template v-if="isGmView">
          <div class="dm-dashboard-grid">
            <article class="dm-home-hero dm-home-hero--desktop">
              <div class="dm-hero__badge">
                <span class="dm-hero__badge-icon">O</span>
                <span>DM</span>
                <span class="dm-hero__badge-label">Dashboard operativa</span>
              </div>
              <div class="stack">
                <p class="dm-home-hero__eyebrow">Prossima sessione</p>
                <h2 class="dm-home-hero__title">
                  {{ dmCurrentSession?.session.title ?? 'Nessuna sessione imminente' }}
                </h2>
              </div>
              <p v-if="dmCurrentSessionLoading" class="muted">Ricerca sessione...</p>
              <p v-else-if="dmCurrentSessionError" class="status-message text-danger">
                {{ dmCurrentSessionError }}
              </p>
              <template v-else-if="dmCurrentSession">
                <p class="manager-meta">Campagna: {{ dmCurrentSession.campaignName }}</p>
                <p class="manager-meta">
                  Data pianificata:
                  {{ formatSessionDate(dmCurrentSession.session.sessionDate) }}
                </p>
                <OpenEntityButton
                  label="Apri sessione"
                  :to="{ name: 'dm-session-detail', params: { id: dmCurrentSession.session.id } }"
                  size="md"
                />
              </template>
              <p v-else class="muted">Pianifica una nuova data dalle tue campagne attive.</p>
            </article>

            <section class="card stack">
              <header class="section-header">
                <div>
                  <h2 class="card-title">Da gestire</h2>
                  <p class="card-subtitle">
                    Indicatori operativi ricavati dai dati gia presenti.
                  </p>
                </div>
              </header>
              <div class="dm-manage-grid">
                <article
                  v-for="item in dmManageItems"
                  :key="item.key"
                  class="dm-manage-card"
                >
                  <div class="dm-manage-card__head">
                    <span class="dm-manage-card__title">{{ item.title }}</span>
                    <strong class="dm-manage-card__value">{{ item.value }}</strong>
                  </div>
                  <p class="manager-meta">{{ item.detail }}</p>
                  <OpenEntityButton
                    v-if="item.to"
                    label="Apri"
                    :to="item.to"
                    variant="ghost"
                  />
                </article>
              </div>
              <ul v-if="pendingRequestsPreview.length" class="mini-list">
                <li v-for="request in pendingRequestsPreview" :key="request.id">
                  <p class="manager-meta">
                    {{ request.campaignName ?? ('Campagna #' + request.campaignId) }}
                  </p>
                  <small class="muted">
                    {{ request.playerNickname ?? 'Player' }} -
                    {{ statusLabels[request.status] ?? request.status }}
                  </small>
                </li>
              </ul>
              <ul v-if="recentEventsPreview.length" class="mini-list">
                <li v-for="event in recentEventsPreview" :key="event.id">
                  <p class="manager-meta">{{ event.title }}</p>
                  <small class="muted">{{ new Date(event.createdAt).toLocaleString() }}</small>
                </li>
              </ul>
            </section>

            <article class="card dm-history-callout stack">
              <div>
                <p class="dm-history-callout__eyebrow">History</p>
                <h2 class="card-title">Rivedi sessioni passate</h2>
                <p class="card-subtitle">Apri l'archivio cronologico delle sessioni gia giocate.</p>
              </div>
              <OpenEntityButton label="Apri history" to="/profile/history" />
            </article>

            <article class="card dm-summary-card stack">
              <h2 class="card-title">Mini riepilogo</h2>
              <div class="dm-summary-grid">
                <div class="dm-summary-pill">
                  <span class="dm-summary-pill__label">Campagne attive</span>
                  <strong class="dm-summary-pill__value">{{ dmActiveCampaignsCount }}</strong>
                </div>
                <div class="dm-summary-pill">
                  <span class="dm-summary-pill__label">Sessioni future</span>
                  <strong class="dm-summary-pill__value">{{ dmFutureSessionsCount }}</strong>
                </div>
                <div class="dm-summary-pill">
                  <span class="dm-summary-pill__label">Richieste pending</span>
                  <strong class="dm-summary-pill__value">{{ pendingRequests.length }}</strong>
                </div>
              </div>
            </article>
          </div>
        </template>
        <template v-else>
          <template v-if="!isViewerOnly">
            <section class="stack">
              <header class="section-header">
                <h2>Prossima sessione</h2>
              </header>
              <div v-if="playerExtrasLoading">Caricamento sessioni...</div>
              <p v-else-if="playerExtrasError" class="status-message text-danger">
                {{ playerExtrasError }}
              </p>
              <article v-else-if="nextSession" class="card stack">
                <span class="tag">Sessione imminente</span>
                <h3 class="card-title">{{ nextSession.session.title }}</h3>
                <p class="card-subtitle">
                  Campagna:
                  {{ nextSession.campaignName ?? 'Campagna #'+nextSession.campaignId }}
                </p>
                <p class="world-meta">
                  Data: {{ formatSessionDate(nextSession.sessionDate) }} - Sessione #{{ nextSession.session.sessionNumber }}
                </p>
                <OpenEntityButton
                  label="Apri sessione"
                  :to="{ name: 'session-detail', params: { id: nextSession.session.id } }"
                  size="md"
                />
              </article>
              <p v-else class="muted">Nessuna sessione futura pianificata.</p>
            </section>

            <section v-if="otherUpcomingSessions.length" class="stack">
              <header class="section-header">
                <h2>Altre sessioni future</h2>
              </header>
              <ul class="list-stack">
                <li
                  v-for="sessionEntry in otherUpcomingSessions"
                  :key="sessionEntry.session.id"
                  class="card stack"
                >
                  <h3 class="card-title">{{ sessionEntry.session.title }}</h3>
                  <p class="card-subtitle">
                    Campagna:
                    {{ sessionEntry.campaignName ?? 'Campagna #'+sessionEntry.campaignId }}
                  </p>
                  <p class="world-meta">
                    Data: {{ formatSessionDate(sessionEntry.sessionDate) }} - Sessione #{{ sessionEntry.session.sessionNumber }}
                  </p>
                  <OpenEntityButton
                    label="Apri sessione"
                    :to="{ name: 'session-detail', params: { id: sessionEntry.session.id } }"
                    variant="soft"
                  />
                </li>
              </ul>
            </section>

            <section class="stack">
              <header class="section-header">
                <h2>I miei personaggi</h2>
                <RouterLink class="btn btn-link" to="/player/characters">
                  Gestisci personaggi
                </RouterLink>
              </header>
              <ul v-if="myCharacters.length" class="list-grid">
                <li v-for="character in myCharacters" :key="character.id" class="card">
                  <h3 class="card-title">{{ character.name }}</h3>
                  <p class="card-subtitle">
                    {{ character.characterClass ?? 'Classe sconosciuta' }}
                    <span v-if="character.subclass">({{ character.subclass }})</span>
                    <span v-if="character.level"> - Lv. {{ character.level }}</span>
                  </p>
                  <p class="world-meta">
                    {{ character.race || 'Razza sconosciuta' }} - Allineamento:
                    {{ character.alignment || 'N/D' }}
                  </p>
                </li>
              </ul>
              <p v-else class="muted">Non hai ancora creato personaggi giocanti.</p>
            </section>

            <section class="stack">
              <header class="section-header">
                <h2>Richieste di partecipazione</h2>
                <RouterLink class="btn btn-link" to="/player/worlds">
                  Cerca nuove campagne
                </RouterLink>
              </header>
              <div v-if="playerExtrasLoading">Caricamento richieste...</div>
              <p v-else-if="playerExtrasError" class="status-message text-danger">
                {{ playerExtrasError }}
              </p>
              <ul v-else-if="playerJoinRequests.length" class="list-stack">
                <li v-for="request in playerJoinRequests" :key="request.id" class="card stack">
                  <h3 class="card-title">
                    {{ request.campaignName ?? 'Campagna #'+request.campaignId }}
                  </h3>
                  <p class="card-subtitle" v-if="request.characterName">
                    {{ request.characterName }}
                    <span v-if="request.characterClass">
                      - {{ request.characterClass }}
                      <span v-if="request.characterSubclass">({{ request.characterSubclass }})</span>
                    </span>
                  </p>
                  <p class="world-meta">
                    Stato:
                    <strong>{{ statusLabels[request.status] ?? request.status }}</strong>
                  </p>
                  <p v-if="request.message" class="muted">Messaggio inviato: {{ request.message }}</p>
                </li>
              </ul>
              <p v-else class="muted">Non hai ancora inviato richieste di partecipazione.</p>
            </section>
          </template>

          <section v-else class="stack">
            <article class="card stack">
              <h2 class="card-title">Modalità sola lettura</h2>
              <p class="section-subtitle">
                Gli account Viewer possono esplorare mondi e campagne pubbliche ma non possono unirsi o creare contenuti.
              </p>
              <RouterLink class="btn btn-secondary" to="/player/worlds">
                Esplora i mondi pubblici
              </RouterLink>
            </article>
            <article class="card stack">
              <h3 class="card-title">Eventi pubblici recenti</h3>
              <ul v-if="recentEventsPreview.length" class="list-stack">
                <li v-for="event in recentEventsPreview" :key="event.id" class="stack">
                  <p class="card-subtitle">{{ event.title }}</p>
                  <p class="muted">{{ event.description || 'Evento senza descrizione.' }}</p>
                  <small class="world-meta">{{ new Date(event.createdAt).toLocaleString() }}</small>
                </li>
              </ul>
              <p v-else class="muted">Nessun evento pubblico disponibile al momento.</p>
            </article>
          </section>
        </template>
      </template>
    </div>
  </section>
</template>

<style scoped>
/* ── Hero Badge (used by mobile) ── */
.dm-hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 1rem 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--app-accent) 36%, transparent);
  background: color-mix(in srgb, var(--app-accent) 7%, transparent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-accent-strong);
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
}
.dm-hero__badge-icon {
  font-size: 0.9rem;
  opacity: 0.8;
}
.dm-hero__badge-label {
  opacity: 0.75;
  font-weight: 500;
}

/* ── DM Home Hero ── */
.dm-home-hero {
  display: grid;
  gap: 1rem;
  padding: 1.4rem;
  border-radius: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 20%, var(--app-surface-outline));
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--app-accent) 16%, transparent), transparent 42%),
    linear-gradient(160deg, var(--app-surface-elevated), color-mix(in srgb, var(--app-surface) 90%, var(--app-bg)));
  box-shadow: 0 22px 40px color-mix(in srgb, var(--app-shadow) 18%, transparent);
  position: relative;
  overflow: hidden;
}
.dm-home-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--app-accent-strong) 10%, transparent), transparent 55%),
    radial-gradient(circle at bottom left, color-mix(in srgb, var(--app-accent) 12%, transparent), transparent 38%);
  pointer-events: none;
}
.dm-home-hero > * {
  position: relative;
  z-index: 1;
}
.dm-home-hero__eyebrow {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-accent-strong);
}
.dm-home-hero__title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  letter-spacing: 0.04em;
  color: var(--app-text);
  margin: 0;
}

/* ── Manage area ── */
.dm-manage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.85rem;
}
.dm-manage-card {
  display: grid;
  gap: 0.55rem;
  padding: 1rem;
  border-radius: 1.15rem;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 90%, var(--app-bg));
  box-shadow: 0 12px 28px color-mix(in srgb, var(--app-shadow) 10%, transparent);
}
.dm-manage-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}
.dm-manage-card__title {
  font-size: 0.88rem;
  color: var(--app-text-muted);
}
.dm-manage-card__value {
  font-family: var(--font-display);
  font-size: 1.6rem;
  line-height: 1;
  color: var(--app-text);
}

/* ── Dashboard Grid ── */
.dm-dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 1rem;
  margin-top: 0;
}
.dm-home-hero--desktop {
  grid-column: 1 / -1;
}
.dm-history-callout {
  justify-content: space-between;
  border-left: 3px solid color-mix(in srgb, var(--app-accent) 28%, transparent);
  padding-left: 1.25rem;
  transition: border-color 0.22s ease, box-shadow 0.22s ease;
}
.dm-history-callout:hover {
  border-color: var(--app-accent);
  box-shadow: 0 8px 28px color-mix(in srgb, var(--app-shadow) 16%, transparent);
}
.dm-history-callout__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-accent-strong);
}
.dm-summary-card {
  gap: 0.9rem;
}
.dm-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}
.dm-summary-pill {
  display: grid;
  gap: 0.25rem;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface) 92%, var(--app-bg));
  transition: border-color 0.2s ease, background 0.2s ease;
}
.dm-summary-pill:hover {
  border-color: color-mix(in srgb, var(--app-accent) 24%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 5%, var(--app-surface));
}
.dm-summary-pill__label {
  color: var(--app-text-muted);
  font-size: 0.82rem;
}
.dm-summary-pill__value {
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1.1;
  color: var(--app-text);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .dm-dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
