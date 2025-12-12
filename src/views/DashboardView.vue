<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { getDashboard } from '../api/dashboardApi';
import { getMyJoinRequests } from '../api/campaignPlayersApi';
import { getSessionsByCampaign } from '../api/sessionsApi';
import { getWorlds } from '../api/worldsApi';
import { createNpc } from '../api/npcsApi';
import { createLocation } from '../api/locationsApi';
import { createItem } from '../api/itemsApi';
import type {
  CampaignPlayerResponse,
  CampaignPlayerStatus,
  CreateItemRequest,
  CreateLocationRequest,
  CreateNpcRequest,
  DashboardResponse,
  SessionResponse,
  WorldResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { useAuthStore } from '../store/authStore';

interface QuickNpcFormState extends Pick<CreateNpcRequest, 'name' | 'race' | 'roleOrClass'> {
  worldId: number | null;
}

interface QuickLocationFormState extends Pick<CreateLocationRequest, 'name' | 'type'> {
  worldId: number | null;
}

interface QuickItemFormState
  extends Pick<CreateItemRequest, 'name' | 'type' | 'rarity'> {
  worldId: number | null;
}

interface PlayerUpcomingSession {
  campaignId: number;
  campaignName?: string | null;
  session: SessionResponse;
  sessionDate: string;
}

const authStore = useAuthStore();
const isViewerOnly = computed(() => authStore.isViewerOnly);
const dashboard = ref<DashboardResponse | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const playerExtrasLoading = ref(false);
const playerExtrasError = ref('');
const myJoinRequestsState = ref<CampaignPlayerResponse[]>([]);
const upcomingSessions = ref<PlayerUpcomingSession[]>([]);

const worlds = ref<WorldResponse[]>([]);
const worldsLoading = ref(false);
const worldsError = ref('');

const quickNpcForm = reactive<QuickNpcFormState>({
  worldId: null,
  name: '',
  race: '',
  roleOrClass: '',
});
const quickNpcLoading = ref(false);
const quickNpcError = ref('');
const quickNpcSuccessId = ref<number | null>(null);

const quickLocationForm = reactive<QuickLocationFormState>({
  worldId: null,
  name: '',
  type: '',
});
const quickLocationLoading = ref(false);
const quickLocationError = ref('');
const quickLocationSuccessId = ref<number | null>(null);

const quickItemForm = reactive<QuickItemFormState>({
  worldId: null,
  name: '',
  type: '',
  rarity: '',
});
const quickItemLoading = ref(false);
const quickItemError = ref('');
const quickItemSuccessId = ref<number | null>(null);

const optionalTextValue = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

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

const ensureQuickFormWorlds = () => {
  const defaultWorldId = worlds.value[0]?.id ?? null;
  if (!defaultWorldId) {
    quickNpcForm.worldId = null;
    quickLocationForm.worldId = null;
    quickItemForm.worldId = null;
    return;
  }
  if (!quickNpcForm.worldId) {
    quickNpcForm.worldId = defaultWorldId;
  }
  if (!quickLocationForm.worldId) {
    quickLocationForm.worldId = defaultWorldId;
  }
  if (!quickItemForm.worldId) {
    quickItemForm.worldId = defaultWorldId;
  }
};

const refreshDashboardStats = async () => {
  const data = await getDashboard();
  dashboard.value = data;
  return data;
};

const loadWorlds = async () => {
  worldsLoading.value = true;
  worldsError.value = '';

  try {
    worlds.value = await getWorlds();
    ensureQuickFormWorlds();
  } catch (error) {
    worldsError.value = extractApiErrorMessage(error, 'Impossibile caricare i mondi.');
    worlds.value = [];
    ensureQuickFormWorlds();
  } finally {
    worldsLoading.value = false;
  }
};

const handleQuickNpcCreate = async () => {
  if (!quickNpcForm.worldId) {
    quickNpcError.value = 'Seleziona il mondo di appartenenza.';
    return;
  }
  if (!quickNpcForm.name.trim()) {
    quickNpcError.value = "Il nome dell'NPC è obbligatorio.";
    return;
  }
  quickNpcLoading.value = true;
  quickNpcError.value = '';
  try {
    const created = await createNpc({
      worldId: quickNpcForm.worldId,
      name: quickNpcForm.name.trim(),
      race: optionalTextValue(quickNpcForm.race),
      roleOrClass: optionalTextValue(quickNpcForm.roleOrClass),
      isVisibleToPlayers: true,
    });
    quickNpcForm.name = '';
    quickNpcForm.race = '';
    quickNpcForm.roleOrClass = '';
    quickNpcSuccessId.value = created.id;
    refreshDashboardStats().catch(() => undefined);
  } catch (error) {
    quickNpcError.value = extractApiErrorMessage(error, "Impossibile creare l'NPC rapido.");
  } finally {
    quickNpcLoading.value = false;
  }
};

const handleQuickLocationCreate = async () => {
  if (!quickLocationForm.worldId) {
    quickLocationError.value = 'Seleziona il mondo di riferimento.';
    return;
  }
  if (!quickLocationForm.name.trim()) {
    quickLocationError.value = 'Il nome della location è obbligatorio.';
    return;
  }
  quickLocationLoading.value = true;
  quickLocationError.value = '';
  try {
    const created = await createLocation({
      worldId: quickLocationForm.worldId,
      name: quickLocationForm.name.trim(),
      type: optionalTextValue(quickLocationForm.type),
      isVisibleToPlayers: true,
    });
    quickLocationForm.name = '';
    quickLocationForm.type = '';
    quickLocationSuccessId.value = created.id;
    refreshDashboardStats().catch(() => undefined);
  } catch (error) {
    quickLocationError.value = extractApiErrorMessage(
      error,
      'Impossibile creare la location rapida.',
    );
  } finally {
    quickLocationLoading.value = false;
  }
};

const handleQuickItemCreate = async () => {
  if (!quickItemForm.worldId) {
    quickItemError.value = "Seleziona il mondo dell'oggetto.";
    return;
  }
  if (!quickItemForm.name.trim()) {
    quickItemError.value = "Il nome dell'oggetto è obbligatorio.";
    return;
  }
  quickItemLoading.value = true;
  quickItemError.value = '';
  try {
    const created = await createItem({
      worldId: quickItemForm.worldId,
      name: quickItemForm.name.trim(),
      type: optionalTextValue(quickItemForm.type),
      rarity: optionalTextValue(quickItemForm.rarity),
      isVisibleToPlayers: true,
    });
    quickItemForm.name = '';
    quickItemForm.type = '';
    quickItemForm.rarity = '';
    quickItemSuccessId.value = created.id;
    refreshDashboardStats().catch(() => undefined);
  } catch (error) {
    quickItemError.value = extractApiErrorMessage(
      error,
      "Impossibile creare l'oggetto rapido.",
    );
  } finally {
    quickItemLoading.value = false;
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
      await loadWorlds();
    }
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Impossibile caricare la dashboard.');
  } finally {
    loading.value = false;
  }
};

type DmMiniTab = 'overview' | 'quick-create';
const activeMiniTab = ref<DmMiniTab>('overview');

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
const pendingRequestsPreview = computed(() => pendingRequests.value.slice(0, 3));
const myCharacters = computed(() => dashboard.value?.myCharacters ?? []);
const recentEvents = computed(() => dashboard.value?.recentEvents ?? []);
const recentEventsPreview = computed(() => recentEvents.value.slice(0, 3));
const nextSession = computed(() => upcomingSessions.value[0] ?? null);
const otherUpcomingSessions = computed(() => upcomingSessions.value.slice(1));
const playerJoinRequests = computed(() =>
  [...myJoinRequestsState.value].sort(
    (a, b) => (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99),
  ),
);

watch(worlds, () => {
  ensureQuickFormWorlds();
});

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
          {{ isGmView ? 'Dashboard Dungeon Master' : 'Dashboard giocatore' }}
        </h1>
        <p class="section-subtitle">
          Panoramica rapida di campagne, sessioni e personaggi.
        </p>
      </header>

      <div v-if="loading">Caricamento dashboard...</div>
      <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

      <template v-else-if="dashboard">

        <template v-if="isGmView">
          <section class="stack gm-dashboard">
            <nav class="dm-tabs" role="tablist">
              <button
                type="button"
                class="dm-tab"
                :class="{ active: activeMiniTab === 'overview' }"
                @click="activeMiniTab = 'overview'"
              >
                Panoramica
              </button>
              <button
                type="button"
                class="dm-tab"
                :class="{ active: activeMiniTab === 'quick-create' }"
                @click="activeMiniTab = 'quick-create'"
              >
                Creazione veloce
              </button>
            </nav>

            <template v-if="activeMiniTab === 'overview'">
              <section class="stats-grid">
                <article v-for="stat in statsEntries" :key="stat.label" class="compact-card">
                  <p class="stat-label">{{ stat.label }}</p>
                  <p class="stat-value">{{ stat.value }}</p>
                </article>
              </section>

              <section class="gm-highlights">
                <article class="card stack">
                  <header class="section-header">
                    <div>
                      <h2 class="card-title">Richieste in attesa</h2>
                      <p class="card-subtitle">
                        Mantieni il controllo sulle nuove candidature alle tue campagne.
                      </p>
                    </div>
                    <RouterLink class="btn btn-link" to="/dm/join-requests">
                      Apri coda completa
                    </RouterLink>
                  </header>
                  <p class="highlight-value">{{ pendingRequests.length }}</p>
                  <ul v-if="pendingRequestsPreview.length" class="mini-list">
                    <li v-for="request in pendingRequestsPreview" :key="request.id">
                      <p class="manager-meta">
                        {{ request.campaignName ?? ('Campagna #' + request.campaignId) }}
                      </p>
                      <small class="muted">
                        {{ request.playerNickname ?? 'Player' }} - {{ statusLabels[request.status] ?? request.status }}
                      </small>
                    </li>
                  </ul>
                  <p v-else class="muted">Nessuna richiesta in sospeso.</p>
                </article>

                <article class="card stack">
                  <header class="section-header">
                    <div>
                      <h2 class="card-title">Eventi recenti</h2>
                      <p class="card-subtitle">Ultimi aggiornamenti dalla timeline globale.</p>
                    </div>
                  </header>
                  <ul v-if="recentEventsPreview.length" class="mini-list">
                    <li v-for="event in recentEventsPreview" :key="event.id">
                      <p class="manager-meta">{{ event.title }}</p>
                      <small class="muted">
                        {{ new Date(event.createdAt).toLocaleString() }}
                      </small>
                    </li>
                  </ul>
                  <p v-else class="muted">Ancora nessun evento registrato.</p>
                </article>

                <article class="card stack">
                  <header class="section-header">
                    <div>
                      <h2 class="card-title">Controllo campagne</h2>
                      <p class="card-subtitle">
                        Accedi alla tab Mondi per gestire campagne e sessioni complete.
                      </p>
                    </div>
                    <RouterLink class="btn btn-link" to="/dm/worlds">
                      Vai alla sezione Mondi
                    </RouterLink>
                  </header>
                  <p class="manager-meta">
                    Mondi attivi: <strong>{{ dashboard.stats.worldCount }}</strong>
                  </p>
                  <p class="manager-meta">
                    Campagne totali: <strong>{{ dashboard.stats.campaignCount }}</strong>
                  </p>
                  <p class="manager-meta">
                    Sessioni registrate: <strong>{{ dashboard.stats.sessionCount }}</strong>
                  </p>
                  <p class="muted">
                    I promemoria sulle prossime sessioni saranno mostrati qui quando disponibili dal backend.
                  </p>
                </article>
              </section>
            </template>

            <template v-else>
              <section class="stack">
                <header class="section-header">
                  <div>
                    <h2>Creazione veloce</h2>
                    <p class="section-subtitle">
                      Registra l'entita con i soli campi essenziali e continua nelle tab dedicate (NPC, Location, Oggetti).
                    </p>
                  </div>
                </header>
                <p v-if="worldsLoading" class="status-message">
                  Caricamento mondi per la creazione rapida...
                </p>
                <p v-else-if="worldsError" class="status-message text-danger">
                  {{ worldsError }}
                </p>
                <p v-else-if="!worlds.length" class="muted">
                  Nessun mondo disponibile: crea un mondo dalla sezione Mondi per abilitare le scorciatoie.
                </p>
                <div class="quick-create-grid">
                  <article class="card muted stack">
                    <h3 class="card-title">NPC rapido</h3>
                    <p class="manager-meta">
                      Nome, razza e ruolo: gli altri campi resteranno vuoti finche non aprirai la scheda dettagliata.
                    </p>
                    <form class="stack" @submit.prevent="handleQuickNpcCreate">
                      <label class="field">
                        <span>Mondo</span>
                        <select v-model="quickNpcForm.worldId" :disabled="!worlds.length" required>
                          <option :value="null" disabled>Seleziona un mondo</option>
                          <option v-for="world in worlds" :key="world.id" :value="world.id">
                            {{ world.name }}
                          </option>
                        </select>
                      </label>
                      <label class="field">
                        <span>Nome</span>
                        <input v-model="quickNpcForm.name" type="text" placeholder="Nome NPC" required />
                      </label>
                      <label class="field">
                        <span>Razza</span>
                        <input v-model="quickNpcForm.race" type="text" placeholder="Es. Elfo" />
                      </label>
                      <label class="field">
                        <span>Ruolo / Classe</span>
                        <input v-model="quickNpcForm.roleOrClass" type="text" placeholder="Bardo, Locandiere..." />
                      </label>
                      <p v-if="quickNpcError" class="status-message text-danger">
                        {{ quickNpcError }}
                      </p>
                      <p v-else class="muted">
                        Dopo la creazione trovi la scheda completa nella tab NPC.
                      </p>
                      <button class="btn btn-primary" type="submit" :disabled="quickNpcLoading || !worlds.length">
                        {{ quickNpcLoading ? 'Creazione...' : 'Registra NPC' }}
                      </button>
                      <p v-if="quickNpcSuccessId" class="status-message text-success">
                        NPC creato.
                        <RouterLink :to="`/dm/npcs?edit=${quickNpcSuccessId}`">
                          Apri scheda completa
                        </RouterLink>
                      </p>
                    </form>
                  </article>

                  <article class="card muted stack">
                    <h3 class="card-title">Location rapida</h3>
                    <p class="manager-meta">
                      Perfetta per appuntare un luogo senza interrompere la sessione: descrizione e note arriveranno dopo.
                    </p>
                    <form class="stack" @submit.prevent="handleQuickLocationCreate">
                      <label class="field">
                        <span>Mondo</span>
                        <select v-model="quickLocationForm.worldId" :disabled="!worlds.length" required>
                          <option :value="null" disabled>Seleziona un mondo</option>
                          <option v-for="world in worlds" :key="world.id" :value="world.id">
                            {{ world.name }}
                          </option>
                        </select>
                      </label>
                      <label class="field">
                        <span>Nome</span>
                        <input v-model="quickLocationForm.name" type="text" placeholder="Citta, Dungeon..." required />
                      </label>
                      <label class="field">
                        <span>Tipologia</span>
                        <input v-model="quickLocationForm.type" type="text" placeholder="Metropoli, Bosco..." />
                      </label>
                      <p v-if="quickLocationError" class="status-message text-danger">
                        {{ quickLocationError }}
                      </p>
                      <p v-else class="muted">
                        I campi dettagliati sono disponibili nella tab Location.
                      </p>
                      <button class="btn btn-primary" type="submit" :disabled="quickLocationLoading || !worlds.length">
                        {{ quickLocationLoading ? 'Creazione...' : 'Registra location' }}
                      </button>
                      <p v-if="quickLocationSuccessId" class="status-message text-success">
                        Location creata.
                        <RouterLink :to="`/dm/locations?edit=${quickLocationSuccessId}`">
                          Completa i dettagli
                        </RouterLink>
                      </p>
                    </form>
                  </article>

                  <article class="card muted stack">
                    <h3 class="card-title">Oggetto rapido</h3>
                    <p class="manager-meta">
                      Usa nome, tipologia e rarita per memorizzare subito loot e artefatti.
                    </p>
                    <form class="stack" @submit.prevent="handleQuickItemCreate">
                      <label class="field">
                        <span>Mondo</span>
                        <select v-model="quickItemForm.worldId" :disabled="!worlds.length" required>
                          <option :value="null" disabled>Seleziona un mondo</option>
                          <option v-for="world in worlds" :key="world.id" :value="world.id">
                            {{ world.name }}
                          </option>
                        </select>
                      </label>
                      <label class="field">
                        <span>Nome</span>
                        <input v-model="quickItemForm.name" type="text" placeholder="Nome oggetto" required />
                      </label>
                      <label class="field">
                        <span>Tipologia</span>
                        <input v-model="quickItemForm.type" type="text" placeholder="Arma, Pozione..." />
                      </label>
                      <label class="field">
                        <span>Rarita</span>
                        <input v-model="quickItemForm.rarity" type="text" placeholder="Comune, Raro..." />
                      </label>
                      <p v-if="quickItemError" class="status-message text-danger">
                        {{ quickItemError }}
                      </p>
                      <p v-else class="muted">
                        Per descrizioni, note e collegamenti usa la tab Oggetti.
                      </p>
                      <button class="btn btn-primary" type="submit" :disabled="quickItemLoading || !worlds.length">
                        {{ quickItemLoading ? 'Creazione...' : 'Registra oggetto' }}
                      </button>
                      <p v-if="quickItemSuccessId" class="status-message text-success">
                        Oggetto creato.
                        <RouterLink :to="`/dm/items?edit=${quickItemSuccessId}`">
                          Apri scheda completa
                        </RouterLink>
                      </p>
                    </form>
                  </article>
                </div>
              </section>
            </template>
          </section>
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
                    Data: {{ formatSessionDate(sessionEntry.sessionDate) }} - Sessione #{{ sessionEntry.session.sessionNumber }}
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
.gm-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.quick-create-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}
</style>
