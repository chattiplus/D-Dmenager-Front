<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { getDashboard } from '../api/dashboardApi';
import { getMyJoinRequests } from '../api/campaignPlayersApi';
import { getSessionsByCampaign } from '../api/sessionsApi';
import { getWorlds } from '../api/worldsApi';
import {
  createNpc,
  deleteNpc as deleteNpcApi,
  getNpcs,
  getNpcsByWorld,
} from '../api/npcsApi';
import {
  createLocation,
  deleteLocation as deleteLocationApi,
  getLocations,
  getLocationsByWorld,
} from '../api/locationsApi';
import {
  createItem,
  deleteItem as deleteItemApi,
  getItems,
  getItemsByWorld,
} from '../api/itemsApi';
import type {
  CampaignPlayerResponse,
  CampaignPlayerStatus,
  CreateItemRequest,
  CreateLocationRequest,
  CreateNpcRequest,
  DashboardResponse,
  ItemResponse,
  LocationResponse,
  NpcResponse,
  SessionResponse,
  WorldResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { useAuthStore } from '../store/authStore';

type FilterWorldId = number | 'all';
type GmTabKey = 'overview' | 'npcs' | 'locations' | 'items' | 'requests';

interface NpcFormState extends Omit<CreateNpcRequest, 'worldId'> {
  worldId: number | null;
}

interface LocationFormState extends Omit<CreateLocationRequest, 'worldId'> {
  worldId: number | null;
}

interface ItemFormState extends Omit<CreateItemRequest, 'worldId'> {
  worldId: number | null;
}

interface PlayerUpcomingSession {
  campaignId: number;
  campaignName?: string | null;
  session: SessionResponse;
  sessionDate: string;
}

const authStore = useAuthStore();
const dashboard = ref<DashboardResponse | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const playerExtrasLoading = ref(false);
const playerExtrasError = ref('');
const myJoinRequestsState = ref<CampaignPlayerResponse[]>([]);
const upcomingSessions = ref<PlayerUpcomingSession[]>([]);

const gmTabs: { key: GmTabKey; label: string }[] = [
  { key: 'overview', label: 'Panoramica' },
  { key: 'npcs', label: 'NPC' },
  { key: 'locations', label: 'Location' },
  { key: 'items', label: 'Oggetti' },
  { key: 'requests', label: 'Richieste' },
];
const activeGmTab = ref<GmTabKey>('overview');

const gmWorkspaceReady = ref(false);
const worlds = ref<WorldResponse[]>([]);
const worldsLoading = ref(false);
const worldsError = ref('');

const npcList = ref<NpcResponse[]>([]);
const npcFilterWorldId = ref<FilterWorldId>('all');
const npcLoading = ref(false);
const npcError = ref('');
const npcFormError = ref('');
const npcFormLoading = ref(false);
const npcActionLoading = ref<number | null>(null);
const npcForm = reactive<NpcFormState>({
  worldId: null,
  name: '',
  race: '',
  roleOrClass: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
});

const locationList = ref<LocationResponse[]>([]);
const locationFilterWorldId = ref<FilterWorldId>('all');
const locationLoading = ref(false);
const locationError = ref('');
const locationFormError = ref('');
const locationFormLoading = ref(false);
const locationActionLoading = ref<number | null>(null);
const locationForm = reactive<LocationFormState>({
  worldId: null,
  parentLocationId: undefined,
  name: '',
  type: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
});

const itemList = ref<ItemResponse[]>([]);
const itemFilterWorldId = ref<FilterWorldId>('all');
const itemLoading = ref(false);
const itemError = ref('');
const itemFormError = ref('');
const itemFormLoading = ref(false);
const itemActionLoading = ref<number | null>(null);
const itemForm = reactive<ItemFormState>({
  worldId: null,
  locationId: undefined,
  name: '',
  type: '',
  rarity: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
});

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

const sanitizeWorldFilter = (filterRef: { value: FilterWorldId }) => {
  if (filterRef.value === 'all') {
    return;
  }
  const stillExists = worlds.value.some((world) => world.id === filterRef.value);
  if (!stillExists) {
    filterRef.value = 'all';
  }
};

const worldName = (worldId: number) => {
  const found = worlds.value.find((world) => world.id === worldId);
  return found?.name ?? `Mondo #${worldId}`;
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
  } catch (error) {
    worldsError.value = extractApiErrorMessage(error, 'Impossibile caricare i mondi.');
    worlds.value = [];
  } finally {
    worldsLoading.value = false;
  }
};

const fetchNpcs = async () => {
  npcLoading.value = true;
  npcError.value = '';
  try {
    npcList.value =
      npcFilterWorldId.value === 'all'
        ? await getNpcs()
        : await getNpcsByWorld(npcFilterWorldId.value);
  } catch (error) {
    npcError.value = extractApiErrorMessage(error, 'Impossibile caricare gli NPC.');
    npcList.value = [];
  } finally {
    npcLoading.value = false;
  }
};

const fetchLocations = async () => {
  locationLoading.value = true;
  locationError.value = '';
  try {
    locationList.value =
      locationFilterWorldId.value === 'all'
        ? await getLocations()
        : await getLocationsByWorld(locationFilterWorldId.value);
  } catch (error) {
    locationError.value = extractApiErrorMessage(
      error,
      'Impossibile caricare le location.',
    );
    locationList.value = [];
  } finally {
    locationLoading.value = false;
  }
};

const fetchItems = async () => {
  itemLoading.value = true;
  itemError.value = '';
  try {
    itemList.value =
      itemFilterWorldId.value === 'all'
        ? await getItems()
        : await getItemsByWorld(itemFilterWorldId.value);
  } catch (error) {
    itemError.value = extractApiErrorMessage(error, 'Impossibile caricare gli oggetti.');
    itemList.value = [];
  } finally {
    itemLoading.value = false;
  }
};

const ensureGmWorkspace = async () => {
  gmWorkspaceReady.value = false;
  await loadWorlds();
  await Promise.all([fetchNpcs(), fetchLocations(), fetchItems()]);
  gmWorkspaceReady.value = true;
};

const resetNpcForm = () => {
  npcForm.name = '';
  npcForm.race = '';
  npcForm.roleOrClass = '';
  npcForm.description = '';
  npcForm.gmNotes = '';
  npcForm.isVisibleToPlayers = true;
};

const handleNpcCreate = async () => {
  if (!npcForm.worldId) {
    npcFormError.value = 'Seleziona il mondo di appartenenza.';
    return;
  }
  if (!npcForm.name.trim()) {
    npcFormError.value = "Il nome dell'NPC e obbligatorio.";
    return;
  }
  npcFormLoading.value = true;
  npcFormError.value = '';
  try {
    await createNpc({
      worldId: npcForm.worldId,
      name: npcForm.name.trim(),
      race: optionalTextValue(npcForm.race),
      roleOrClass: optionalTextValue(npcForm.roleOrClass),
      description: optionalTextValue(npcForm.description),
      gmNotes: optionalTextValue(npcForm.gmNotes),
      isVisibleToPlayers: npcForm.isVisibleToPlayers,
    });
    resetNpcForm();
    await fetchNpcs();
    refreshDashboardStats().catch(() => undefined);
  } catch (error) {
    npcFormError.value = extractApiErrorMessage(error, "Impossibile creare l'NPC.");
  } finally {
    npcFormLoading.value = false;
  }
};

const handleNpcDelete = async (npcId: number) => {
  npcActionLoading.value = npcId;
  npcError.value = '';
  try {
    await deleteNpcApi(npcId);
    await fetchNpcs();
    refreshDashboardStats().catch(() => undefined);
  } catch (error) {
    npcError.value = extractApiErrorMessage(error, "Impossibile eliminare l'NPC.");
  } finally {
    npcActionLoading.value = null;
  }
};

const resetLocationForm = () => {
  locationForm.name = '';
  locationForm.type = '';
  locationForm.description = '';
  locationForm.gmNotes = '';
  locationForm.isVisibleToPlayers = true;
};

const handleLocationCreate = async () => {
  if (!locationForm.worldId) {
    locationFormError.value = 'Seleziona il mondo della location.';
    return;
  }
  if (!locationForm.name.trim()) {
    locationFormError.value = 'Il nome della location e obbligatorio.';
    return;
  }
  locationFormLoading.value = true;
  locationFormError.value = '';
  try {
    await createLocation({
      worldId: locationForm.worldId,
      name: locationForm.name.trim(),
      type: optionalTextValue(locationForm.type),
      description: optionalTextValue(locationForm.description),
      gmNotes: optionalTextValue(locationForm.gmNotes),
      isVisibleToPlayers: locationForm.isVisibleToPlayers,
    });
    resetLocationForm();
    await fetchLocations();
    refreshDashboardStats().catch(() => undefined);
  } catch (error) {
    locationFormError.value = extractApiErrorMessage(
      error,
      'Impossibile creare la location.',
    );
  } finally {
    locationFormLoading.value = false;
  }
};

const handleLocationDelete = async (locationId: number) => {
  locationActionLoading.value = locationId;
  locationError.value = '';
  try {
    await deleteLocationApi(locationId);
    await fetchLocations();
    refreshDashboardStats().catch(() => undefined);
  } catch (error) {
    locationError.value = extractApiErrorMessage(
      error,
      'Impossibile eliminare la location.',
    );
  } finally {
    locationActionLoading.value = null;
  }
};

const resetItemForm = () => {
  itemForm.name = '';
  itemForm.type = '';
  itemForm.rarity = '';
  itemForm.description = '';
  itemForm.gmNotes = '';
  itemForm.isVisibleToPlayers = true;
};

const handleItemCreate = async () => {
  if (!itemForm.worldId) {
    itemFormError.value = "Seleziona il mondo dell'oggetto.";
    return;
  }
  if (!itemForm.name.trim()) {
    itemFormError.value = "Il nome dell'oggetto e obbligatorio.";
    return;
  }
  itemFormLoading.value = true;
  itemFormError.value = '';
  try {
    await createItem({
      worldId: itemForm.worldId,
      name: itemForm.name.trim(),
      type: optionalTextValue(itemForm.type),
      rarity: optionalTextValue(itemForm.rarity),
      description: optionalTextValue(itemForm.description),
      gmNotes: optionalTextValue(itemForm.gmNotes),
      isVisibleToPlayers: itemForm.isVisibleToPlayers,
    });
    resetItemForm();
    await fetchItems();
    refreshDashboardStats().catch(() => undefined);
  } catch (error) {
    itemFormError.value = extractApiErrorMessage(error, "Impossibile creare l'oggetto.");
  } finally {
    itemFormLoading.value = false;
  }
};

const handleItemDelete = async (itemId: number) => {
  itemActionLoading.value = itemId;
  itemError.value = '';
  try {
    await deleteItemApi(itemId);
    await fetchItems();
    refreshDashboardStats().catch(() => undefined);
  } catch (error) {
    itemError.value = extractApiErrorMessage(error, "Impossibile eliminare l'oggetto.");
  } finally {
    itemActionLoading.value = null;
  }
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
    const data = await refreshDashboardStats();
    if (data.view === 'PLAYER') {
      await loadPlayerExtras();
      myJoinRequestsState.value = [...myJoinRequestsState.value];
      gmWorkspaceReady.value = false;
    } else {
      myJoinRequestsState.value = [];
      upcomingSessions.value = [];
      playerExtrasError.value = '';
      await ensureGmWorkspace();
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
const pendingRequestsPreview = computed(() => pendingRequests.value.slice(0, 3));
const myCharacters = computed(() => dashboard.value?.myCharacters ?? []);
const characterPreview = computed(() => myCharacters.value.slice(0, 3));
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
  const defaultWorldId = worlds.value[0]?.id ?? null;
  if (!defaultWorldId) {
    npcForm.worldId = null;
    locationForm.worldId = null;
    itemForm.worldId = null;
  } else {
    if (!npcForm.worldId) {
      npcForm.worldId = defaultWorldId;
    }
    if (!locationForm.worldId) {
      locationForm.worldId = defaultWorldId;
    }
    if (!itemForm.worldId) {
      itemForm.worldId = defaultWorldId;
    }
  }
  sanitizeWorldFilter(npcFilterWorldId);
  sanitizeWorldFilter(locationFilterWorldId);
  sanitizeWorldFilter(itemFilterWorldId);
});

watch(npcFilterWorldId, () => {
  if (gmWorkspaceReady.value) {
    fetchNpcs();
  }
});

watch(locationFilterWorldId, () => {
  if (gmWorkspaceReady.value) {
    fetchLocations();
  }
});

watch(itemFilterWorldId, () => {
  if (gmWorkspaceReady.value) {
    fetchItems();
  }
});

watch(isGmView, (value) => {
  if (!value) {
    activeGmTab.value = 'overview';
  }
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
          <nav class="dm-tabs" role="tablist">
            <button
              v-for="tab in gmTabs"
              :key="tab.key"
              type="button"
              class="dm-tab"
              :class="{ active: activeGmTab === tab.key }"
              @click="activeGmTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </nav>

          <div v-if="activeGmTab === 'overview'" class="dm-tab-panel stack">
            <section class="stats-grid">
              <article v-for="stat in statsEntries" :key="stat.label" class="compact-card">
                <p class="stat-label">{{ stat.label }}</p>
                <p class="stat-value">{{ stat.value }}</p>
              </article>
            </section>

            <div class="overview-highlights">
              <article class="compact-card">
                <p class="muted">Richieste in attesa</p>
                <p class="highlight-value">{{ pendingRequests.length }}</p>
                <RouterLink class="btn btn-secondary" to="/dm/join-requests">
                  Vai alle richieste
                </RouterLink>
              </article>
              <article class="compact-card">
                <p class="muted">Totale mondi</p>
                <p class="highlight-value">{{ statsEntries[0]?.value ?? 0 }}</p>
                <RouterLink class="btn btn-link" to="/worlds">
                  Gestisci mondi
                </RouterLink>
              </article>
              <article class="compact-card">
                <p class="muted">Campagne attive</p>
                <p class="highlight-value">{{ statsEntries[1]?.value ?? 0 }}</p>
                <RouterLink class="btn btn-link" to="/worlds">
                  Vai alla panoramica mondi
                </RouterLink>
              </article>
            </div>

            <div class="overview-lists">
              <article class="compact-card">
                <header class="section-header">
                  <h2>Ultime richieste</h2>
                  <RouterLink class="btn btn-link" to="/dm/join-requests">
                    Gestisci
                  </RouterLink>
                </header>
                <ul v-if="pendingRequestsPreview.length" class="overview-list">
                  <li v-for="request in pendingRequestsPreview" :key="request.id">
                    <p class="card-title">
                      {{ request.campaignName ?? 'Campagna #'+request.campaignId }}
                    </p>
                    <p class="manager-meta">
                      {{ request.playerNickname ?? 'Player' }} -
                      {{ request.characterName ?? 'Personaggio #'+request.characterId }}
                    </p>
                    <p class="manager-meta">
                      Stato: {{ statusLabels[request.status] ?? request.status }}
                    </p>
                  </li>
                </ul>
                <p v-else class="muted">Nessuna richiesta da mostrare.</p>
              </article>

              <article class="compact-card">
                <header class="section-header">
                  <h2>Eventi recenti</h2>
                </header>
                <ul v-if="recentEventsPreview.length" class="overview-list">
                  <li v-for="event in recentEventsPreview" :key="event.id">
                    <p class="card-title">{{ event.title }}</p>
                    <p class="manager-meta">{{ event.description || 'Nessuna descrizione' }}</p>
                    <p class="manager-meta">Creato il: {{ event.createdAt }}</p>
                  </li>
                </ul>
                <p v-else class="muted">Nessun evento disponibile.</p>
              </article>

              <article class="compact-card">
                <header class="section-header">
                  <h2>Personaggi tracciati</h2>
                  <RouterLink class="btn btn-link" to="/player/characters">
                    Apri elenco
                  </RouterLink>
                </header>
                <ul v-if="characterPreview.length" class="overview-list">
                  <li v-for="character in characterPreview" :key="character.id">
                    <p class="card-title">{{ character.name }}</p>
                    <p class="manager-meta">
                      {{ character.characterClass ?? 'Classe sconosciuta' }}
                      <span v-if="character.level"> - Lv. {{ character.level }}</span>
                    </p>
                  </li>
                </ul>
                <p v-else class="muted">Nessun personaggio associato alle tue campagne.</p>
              </article>
            </div>

            <div v-if="pendingRequests.length" class="notice">
              Hai {{ pendingRequests.length }} richieste in attesa. Apri il tab "Richieste" per la
              lista completa.
            </div>
          </div>

          <div v-else-if="activeGmTab === 'requests'" class="dm-tab-panel stack">
            <div v-if="!pendingRequests.length" class="compact-card">
              <p class="muted">Nessuna richiesta pendente in questo momento.</p>
              <RouterLink class="btn btn-secondary" to="/dm/join-requests">
                Vai alla pagina richieste
              </RouterLink>
            </div>
            <template v-else>
              <p class="muted">
                Sintesi rapida delle richieste. Per approvare o rifiutare usa la pagina dedicata.
              </p>
              <ul class="manager-list">
                <li v-for="request in pendingRequests" :key="request.id" class="compact-card">
                  <div class="manager-item">
                    <p class="card-title">
                      {{ request.campaignName ?? 'Campagna #'+request.campaignId }}
                    </p>
                    <p class="manager-meta">
                      {{ request.playerNickname ?? 'Player' }} -
                      {{ request.characterName ?? 'Personaggio #'+request.characterId }}
                    </p>
                    <p class="manager-meta">
                      Stato: {{ statusLabels[request.status] ?? request.status }}
                    </p>
                    <p v-if="request.message" class="manager-meta">
                      Messaggio: {{ request.message }}
                    </p>
                  </div>
                </li>
              </ul>
              <RouterLink class="btn btn-secondary" to="/dm/join-requests">
                Gestisci tutte le richieste
              </RouterLink>
            </template>
          </div>

          <div v-else class="dm-tab-panel stack">
            <p v-if="!gmWorkspaceReady" class="muted">
              Preparazione strumenti del Dungeon Master...
            </p>
            <template v-else>
              <section v-if="activeGmTab === 'npcs'" class="manager-layout">
                <div class="manager-content">
                  <header class="section-header">
                    <div>
                      <h2>NPC</h2>
                      <p class="manager-meta">Filtra per mondo e controlla gli NPC esistenti.</p>
                    </div>
                    <div class="manager-filter">
                      <label>
                        <span>Mondo</span>
                        <select v-model="npcFilterWorldId">
                          <option :value="'all'">Tutti</option>
                          <option v-for="world in worlds" :key="world.id" :value="world.id">
                            {{ world.name }}
                          </option>
                        </select>
                      </label>
                      <button
                        class="btn btn-secondary"
                        type="button"
                        :disabled="npcLoading"
                        @click="fetchNpcs"
                      >
                        Aggiorna
                      </button>
                    </div>
                  </header>
                  <div v-if="npcLoading">Caricamento NPC...</div>
                  <p v-else-if="npcError" class="status-message text-danger">{{ npcError }}</p>
                  <ul v-else-if="npcList.length" class="manager-list">
                    <li v-for="npc in npcList" :key="npc.id" class="compact-card">
                      <div class="manager-item">
                        <p class="card-title">{{ npc.name }}</p>
                        <p class="manager-meta">
                          {{ worldName(npc.worldId) }} - {{ npc.race || 'Razza sconosciuta' }} -
                          {{ npc.roleOrClass || 'Ruolo sconosciuto' }}
                        </p>
                        <p v-if="npc.description" class="manager-meta">
                          {{ npc.description }}
                        </p>
                        <p v-if="npc.gmNotes" class="manager-meta">
                          Appunti GM: {{ npc.gmNotes }}
                        </p>
                        <div class="actions">
                          <span
                            class="pill"
                            :class="npc.isVisibleToPlayers ? 'pill-success' : 'pill-danger'"
                          >
                            {{ npc.isVisibleToPlayers ? 'Visibile' : 'Solo GM' }}
                          </span>
                          <button
                            class="btn btn-link text-danger"
                            type="button"
                            :disabled="npcActionLoading === npc.id"
                            @click="handleNpcDelete(npc.id)"
                          >
                            {{ npcActionLoading === npc.id ? 'Eliminazione...' : 'Elimina' }}
                          </button>
                        </div>
                      </div>
                    </li>
                  </ul>
                  <p v-else class="muted manager-empty">
                    Nessun NPC trovato per il filtro selezionato.
                  </p>
                </div>

                <form class="manager-form card" @submit.prevent="handleNpcCreate">
                  <h3 class="card-title">Nuovo NPC</h3>
                  <p class="form-helper">
                    Compila i campi principali per generare rapidamente un nuovo personaggio non
                    giocante.
                  </p>
                  <div v-if="worldsLoading">Caricamento mondi...</div>
                  <p v-else-if="worldsError" class="status-message text-danger">
                    {{ worldsError }}
                  </p>
                  <template v-else>
                    <div class="field">
                      <span>Mondo</span>
                      <select v-model="npcForm.worldId" required>
                        <option :value="null" disabled>Seleziona un mondo</option>
                        <option v-for="world in worlds" :key="world.id" :value="world.id">
                          {{ world.name }}
                        </option>
                      </select>
                    </div>
                    <div class="field">
                      <span>Nome</span>
                      <input v-model="npcForm.name" type="text" placeholder="Nome NPC" required />
                    </div>
                    <div class="field">
                      <span>Razza</span>
                      <input v-model="npcForm.race" type="text" placeholder="Es. Elfo" />
                    </div>
                    <div class="field">
                      <span>Ruolo o classe</span>
                      <input v-model="npcForm.roleOrClass" type="text" placeholder="Bardo" />
                    </div>
                    <div class="field">
                      <span>Descrizione</span>
                      <textarea v-model="npcForm.description" rows="2" />
                    </div>
                    <div class="field">
                      <span>Appunti GM</span>
                      <textarea v-model="npcForm.gmNotes" rows="2" />
                    </div>
                    <div class="field">
                      <span>Visibilita</span>
                      <select v-model="npcForm.isVisibleToPlayers">
                        <option :value="true">Visibile ai player</option>
                        <option :value="false">Solo GM</option>
                      </select>
                    </div>
                  </template>
                  <p v-if="npcFormError" class="status-message text-danger">{{ npcFormError }}</p>
                  <button
                    class="btn btn-primary"
                    type="submit"
                    :disabled="npcFormLoading || !worlds.length"
                  >
                    {{ npcFormLoading ? 'Creazione...' : 'Crea NPC' }}
                  </button>
                </form>
              </section>

              <section v-else-if="activeGmTab === 'locations'" class="manager-layout">
                <div class="manager-content">
                  <header class="section-header">
                    <div>
                      <h2>Location</h2>
                      <p class="manager-meta">
                        Controlla rapidamente i luoghi principali collegati ai tuoi mondi.
                      </p>
                    </div>
                    <div class="manager-filter">
                      <label>
                        <span>Mondo</span>
                        <select v-model="locationFilterWorldId">
                          <option :value="'all'">Tutti</option>
                          <option v-for="world in worlds" :key="world.id" :value="world.id">
                            {{ world.name }}
                          </option>
                        </select>
                      </label>
                      <button
                        class="btn btn-secondary"
                        type="button"
                        :disabled="locationLoading"
                        @click="fetchLocations"
                      >
                        Aggiorna
                      </button>
                    </div>
                  </header>
                  <div v-if="locationLoading">Caricamento location...</div>
                  <p v-else-if="locationError" class="status-message text-danger">
                    {{ locationError }}
                  </p>
                  <ul v-else-if="locationList.length" class="manager-list">
                    <li v-for="location in locationList" :key="location.id" class="compact-card">
                      <div class="manager-item">
                        <p class="card-title">{{ location.name }}</p>
                        <p class="manager-meta">
                          {{ worldName(location.worldId) }} -
                          {{ location.type || 'Tipologia non definita' }}
                        </p>
                        <p v-if="location.description" class="manager-meta">
                          {{ location.description }}
                        </p>
                        <p v-if="location.gmNotes" class="manager-meta">
                          Appunti GM: {{ location.gmNotes }}
                        </p>
                        <div class="actions">
                          <span
                            class="pill"
                            :class="location.isVisibleToPlayers ? 'pill-success' : 'pill-danger'"
                          >
                            {{ location.isVisibleToPlayers ? 'Visibile' : 'Solo GM' }}
                          </span>
                          <button
                            class="btn btn-link text-danger"
                            type="button"
                            :disabled="locationActionLoading === location.id"
                            @click="handleLocationDelete(location.id)"
                          >
                            {{
                              locationActionLoading === location.id ? 'Eliminazione...' : 'Elimina'
                            }}
                          </button>
                        </div>
                      </div>
                    </li>
                  </ul>
                  <p v-else class="muted manager-empty">
                    Nessuna location trovata per il filtro selezionato.
                  </p>
                </div>

                <form class="manager-form card" @submit.prevent="handleLocationCreate">
                  <h3 class="card-title">Nuova location</h3>
                  <p class="form-helper">
                    Definisci in pochi passaggi un nuovo luogo del tuo mondo.
                  </p>
                  <div v-if="worldsLoading">Caricamento mondi...</div>
                  <p v-else-if="worldsError" class="status-message text-danger">
                    {{ worldsError }}
                  </p>
                  <template v-else>
                    <div class="field">
                      <span>Mondo</span>
                      <select v-model="locationForm.worldId" required>
                        <option :value="null" disabled>Seleziona un mondo</option>
                        <option v-for="world in worlds" :key="world.id" :value="world.id">
                          {{ world.name }}
                        </option>
                      </select>
                    </div>
                    <div class="field">
                      <span>Nome</span>
                      <input
                        v-model="locationForm.name"
                        type="text"
                        placeholder="Cittadella nascosta"
                        required
                      />
                    </div>
                    <div class="field">
                      <span>Tipologia</span>
                      <input v-model="locationForm.type" type="text" placeholder="Citta, Dungeon" />
                    </div>
                    <div class="field">
                      <span>Descrizione</span>
                      <textarea v-model="locationForm.description" rows="2" />
                    </div>
                    <div class="field">
                      <span>Appunti GM</span>
                      <textarea v-model="locationForm.gmNotes" rows="2" />
                    </div>
                    <div class="field">
                      <span>Visibilita</span>
                      <select v-model="locationForm.isVisibleToPlayers">
                        <option :value="true">Visibile ai player</option>
                        <option :value="false">Solo GM</option>
                      </select>
                    </div>
                  </template>
                  <p v-if="locationFormError" class="status-message text-danger">
                    {{ locationFormError }}
                  </p>
                  <button
                    class="btn btn-primary"
                    type="submit"
                    :disabled="locationFormLoading || !worlds.length"
                  >
                    {{ locationFormLoading ? 'Creazione...' : 'Crea location' }}
                  </button>
                </form>
              </section>

              <section v-else class="manager-layout">
                <div class="manager-content">
                  <header class="section-header">
                    <div>
                      <h2>Oggetti</h2>
                      <p class="manager-meta">
                        Tieni d'occhio gli item chiave del mondo e crea nuove ricompense.
                      </p>
                    </div>
                    <div class="manager-filter">
                      <label>
                        <span>Mondo</span>
                        <select v-model="itemFilterWorldId">
                          <option :value="'all'">Tutti</option>
                          <option v-for="world in worlds" :key="world.id" :value="world.id">
                            {{ world.name }}
                          </option>
                        </select>
                      </label>
                      <button
                        class="btn btn-secondary"
                        type="button"
                        :disabled="itemLoading"
                        @click="fetchItems"
                      >
                        Aggiorna
                      </button>
                    </div>
                  </header>
                  <div v-if="itemLoading">Caricamento oggetti...</div>
                  <p v-else-if="itemError" class="status-message text-danger">{{ itemError }}</p>
                  <ul v-else-if="itemList.length" class="manager-list">
                    <li v-for="item in itemList" :key="item.id" class="compact-card">
                      <div class="manager-item">
                        <p class="card-title">{{ item.name }}</p>
                        <p class="manager-meta">
                          {{ worldName(item.worldId) }} - {{ item.type || 'Tipo non definito' }}
                          <span v-if="item.rarity">- {{ item.rarity }}</span>
                        </p>
                        <p v-if="item.description" class="manager-meta">
                          {{ item.description }}
                        </p>
                        <p v-if="item.gmNotes" class="manager-meta">
                          Appunti GM: {{ item.gmNotes }}
                        </p>
                        <div class="actions">
                          <span
                            class="pill"
                            :class="item.isVisibleToPlayers ? 'pill-success' : 'pill-danger'"
                          >
                            {{ item.isVisibleToPlayers ? 'Visibile' : 'Solo GM' }}
                          </span>
                          <button
                            class="btn btn-link text-danger"
                            type="button"
                            :disabled="itemActionLoading === item.id"
                            @click="handleItemDelete(item.id)"
                          >
                            {{ itemActionLoading === item.id ? 'Eliminazione...' : 'Elimina' }}
                          </button>
                        </div>
                      </div>
                    </li>
                  </ul>
                  <p v-else class="muted manager-empty">
                    Nessun oggetto trovato per il filtro selezionato.
                  </p>
                </div>

                <form class="manager-form card" @submit.prevent="handleItemCreate">
                  <h3 class="card-title">Nuovo oggetto</h3>
                  <p class="form-helper">
                    Aggiungi rapidamente loot, artefatti o equipaggiamenti chiave.
                  </p>
                  <div v-if="worldsLoading">Caricamento mondi...</div>
                  <p v-else-if="worldsError" class="status-message text-danger">
                    {{ worldsError }}
                  </p>
                  <template v-else>
                    <div class="field">
                      <span>Mondo</span>
                      <select v-model="itemForm.worldId" required>
                        <option :value="null" disabled>Seleziona un mondo</option>
                        <option v-for="world in worlds" :key="world.id" :value="world.id">
                          {{ world.name }}
                        </option>
                      </select>
                    </div>
                    <div class="field">
                      <span>Nome</span>
                      <input v-model="itemForm.name" type="text" placeholder="Nome oggetto" required />
                    </div>
                    <div class="field">
                      <span>Tipologia</span>
                      <input v-model="itemForm.type" type="text" placeholder="Arma, Pozione" />
                    </div>
                    <div class="field">
                      <span>Rarita</span>
                      <input v-model="itemForm.rarity" type="text" placeholder="Comune, Raro" />
                    </div>
                    <div class="field">
                      <span>Descrizione</span>
                      <textarea v-model="itemForm.description" rows="2" />
                    </div>
                    <div class="field">
                      <span>Appunti GM</span>
                      <textarea v-model="itemForm.gmNotes" rows="2" />
                    </div>
                    <div class="field">
                      <span>Visibilita</span>
                      <select v-model="itemForm.isVisibleToPlayers">
                        <option :value="true">Visibile ai player</option>
                        <option :value="false">Solo GM</option>
                      </select>
                    </div>
                  </template>
                  <p v-if="itemFormError" class="status-message text-danger">{{ itemFormError }}</p>
                  <button
                    class="btn btn-primary"
                    type="submit"
                    :disabled="itemFormLoading || !worlds.length"
                  >
                    {{ itemFormLoading ? 'Creazione...' : 'Crea oggetto' }}
                  </button>
                </form>
              </section>
            </template>
          </div>
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
      </template>
    </div>
  </section>
</template>
