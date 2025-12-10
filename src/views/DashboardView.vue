<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getDashboard } from '../api/dashboardApi';
import { getMyJoinRequests } from '../api/campaignPlayersApi';
import { getSessionsByCampaign } from '../api/sessionsApi';
import type {
  CampaignPlayerResponse,
  CampaignPlayerStatus,
  DashboardResponse,
  SessionResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { useAuthStore } from '../store/authStore';

interface PlayerUpcomingSession {
  campaignId: number;
  campaignName?: string | null;
  session: SessionResponse;
  sessionDate: string;
}

const dashboard = ref<DashboardResponse | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const playerExtrasLoading = ref(false);
const playerExtrasError = ref('');
const myJoinRequestsState = ref<CampaignPlayerResponse[]>([]);
const upcomingSessions = ref<PlayerUpcomingSession[]>([]);
const authStore = useAuthStore();

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

const loadPlayerExtras = async () => {
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
    dashboard.value = await getDashboard();
    if (dashboard.value?.view === 'PLAYER') {
      await loadPlayerExtras();
    } else {
      myJoinRequestsState.value = [];
      upcomingSessions.value = [];
      playerExtrasError.value = '';
    }
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Impossibile caricare la dashboard.');
  } finally {
    loading.value = false;
  }
};

const statsEntries = computed(() => {
  if (!dashboard.value) {
    return [];
  }
  const stats = dashboard.value.stats;
  return [
    { label: 'Mondi', value: stats.worldCount },
    { label: 'Campagne', value: stats.campaignCount },
    { label: 'Sessioni', value: stats.sessionCount },
    { label: 'NPC', value: stats.npcCount },
    { label: 'Location', value: stats.locationCount },
    { label: 'Oggetti', value: stats.itemCount },
    { label: 'Personaggi', value: stats.playerCharacterCount },
    { label: 'Timeline', value: stats.sessionEventCount },
  ];
});

const pendingRequests = computed<CampaignPlayerResponse[]>(
  () => dashboard.value?.pendingJoinRequests ?? [],
);
const myCharacters = computed(() => dashboard.value?.myCharacters ?? []);
const recentEvents = computed(() => dashboard.value?.recentEvents ?? []);
const nextSession = computed(() => upcomingSessions.value[0] ?? null);
const otherUpcomingSessions = computed(() => upcomingSessions.value.slice(1));
const playerJoinRequests = computed(() =>
  [...myJoinRequestsState.value].sort(
    (a, b) => (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99),
  ),
);

onMounted(() => {
  if (authStore.isAuthenticated) {
    loadDashboard();
  }
});
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">
          {{ isGmView ? 'Cruscotto del Dungeon Master' : 'Dashboard giocatore' }}
        </h1>
        <p class="section-subtitle">
          Panoramica rapida di campagne, sessioni e personaggi.
        </p>
      </header>

      <div v-if="loading">Caricamento dashboard...</div>
      <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

      <template v-else-if="dashboard">
        <template v-if="isGmView">
          <section class="stats-grid">
            <article v-for="stat in statsEntries" :key="stat.label" class="card muted stack">
              <p class="stat-label">{{ stat.label }}</p>
              <p class="stat-value">{{ stat.value }}</p>
            </article>
          </section>

          <section v-if="pendingRequests.length" class="stack">
            <header class="section-header">
              <h2>Richieste in attesa</h2>
              <RouterLink class="btn btn-link" to="/dm/join-requests">
                Gestisci tutte le richieste
              </RouterLink>
            </header>
            <ul class="list-stack">
              <li v-for="request in pendingRequests" :key="request.id" class="card stack">
                <h3 class="card-title">
                  {{ request.campaignName ?? 'Campagna #'+request.campaignId }}
                </h3>
                <p class="card-subtitle">
                  {{ request.characterName ?? 'Personaggio #'+request.characterId }} /
                  {{ request.playerNickname ?? 'Player' }}
                </p>
                <p class="world-meta">Stato: {{ request.status }}</p>
                <p v-if="request.message" class="muted">Messaggio: {{ request.message }}</p>
              </li>
            </ul>
          </section>

          <section v-else class="stack">
            <header class="section-header">
              <h2>Richieste campagne</h2>
            </header>
            <p class="muted">Nessuna richiesta pendente nelle tue campagne.</p>
          </section>

          <section class="stack">
            <header class="section-header">
              <h2>I miei personaggi</h2>
              <RouterLink class="btn btn-link" to="/player/characters">Gestisci personaggi</RouterLink>
            </header>
            <ul v-if="myCharacters.length" class="list-grid">
              <li v-for="character in myCharacters" :key="character.id" class="card">
                <h3 class="card-title">{{ character.name }}</h3>
                <p class="card-subtitle">
                  {{ character.characterClass ?? 'Classe sconosciuta' }}
                  <span v-if="character.subclass">({{ character.subclass }})</span>
                  <span v-if="character.level"> Жњ Lv. {{ character.level }}</span>
                </p>
                <p class="world-meta">
                  {{ character.race || 'Razza sconosciuta' }} Жњ Allineamento: {{ character.alignment || 'N/D' }}
                </p>
              </li>
            </ul>
            <p v-else class="muted">Non hai ancora creato personaggi giocanti.</p>
          </section>

          <section class="stack">
            <header class="section-header">
              <h2>Eventi recenti</h2>
            </header>
            <ul v-if="recentEvents.length" class="list-grid">
              <li v-for="event in recentEvents" :key="event.id" class="card">
                <h4 class="card-title">{{ event.title }}</h4>
                <p class="card-subtitle">{{ event.description || 'Nessuna descrizione' }}</p>
                <p class="world-meta">Creato il: {{ event.createdAt }}</p>
              </li>
            </ul>
            <p v-else class="muted">Nessun evento disponibile.</p>
          </section>
        </template>

        <template v-else>
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
                Data: {{ formatSessionDate(nextSession.sessionDate) }} — Sessione #{{
                  nextSession.session.sessionNumber
                }}
              </p>
              <RouterLink class="btn btn-link" :to="`/campaigns/${nextSession.campaignId}`">
                Vai alla campagna
              </RouterLink>
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
                  Data: {{ formatSessionDate(sessionEntry.sessionDate) }} — Sessione #{{
                    sessionEntry.session.sessionNumber
                  }}
                </p>
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
                  <span v-if="character.level"> Жњ Lv. {{ character.level }}</span>
                </p>
                <p class="world-meta">
                  {{ character.race || 'Razza sconosciuta' }} Жњ Allineamento:
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
                    — {{ request.characterClass }}
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
      </template>
    </div>
  </section>
</template>
