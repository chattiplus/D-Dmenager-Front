<!-- src/views/WorldsView.vue -->
<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { checkHealth } from '../api/healthApi';
import { createWorld, getWorlds } from '../api/worldsApi';
import { getCampaigns } from '../api/campaignsApi';
import { getNpcs, getNpcById } from '../api/npcsApi';
import { getLocations, getLocationById } from '../api/locationsApi';
import { getItems, getItemById } from '../api/itemsApi';
import type {
  CampaignResponse,
  CreateWorldRequest,
  ItemResponse,
  LocationResponse,
  NpcResponse,
  WorldResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

const authStore = useAuthStore();
const router = useRouter();

const worlds = ref<WorldResponse[]>([]);
const worldsError = ref('');
const loadingWorlds = ref(false);

const healthMessage = ref('');
const healthStatus = ref<'idle' | 'ok' | 'ko'>('idle');
const checkingHealth = ref(false);

const newWorldForm = reactive<CreateWorldRequest>({
  name: '',
  description: '',
  isPublic: false,
});
const creatingWorld = ref(false);
const createWorldError = ref('');

const globalCampaigns = ref<CampaignResponse[]>([]);
const globalCampaignsError = ref('');
const loadingGlobalCampaigns = ref(false);

const globalNpcs = ref<NpcResponse[]>([]);
const globalNpcsError = ref('');
const loadingGlobalNpcs = ref(false);

const globalLocations = ref<LocationResponse[]>([]);
const globalLocationsError = ref('');
const loadingGlobalLocations = ref(false);

const globalItems = ref<ItemResponse[]>([]);
const globalItemsError = ref('');
const loadingGlobalItems = ref(false);

const lookupState = reactive({
  npcId: '',
  locationId: '',
  itemId: '',
});

const lookupKeyMap = {
  npc: 'npcId',
  location: 'locationId',
  item: 'itemId',
} as const;

type LookupTarget = 'npc' | 'location' | 'item';
type LookupResultMap = {
  npc: NpcResponse;
  location: LocationResponse;
  item: ItemResponse;
};

const lookupResults = reactive<{
  npc: LookupResultMap['npc'] | null;
  location: LookupResultMap['location'] | null;
  item: LookupResultMap['item'] | null;
}>({
  npc: null,
  location: null,
  item: null,
});

const lookupErrors = reactive({
  npc: '',
  location: '',
  item: '',
});

const lookupLoading = reactive({
  npc: false,
  location: false,
  item: false,
});

const refreshWorlds = async () => {
  if (!authStore.isAuthenticated) return;
  worldsError.value = '';
  loadingWorlds.value = true;
  try {
    worlds.value = await getWorlds();
  } catch (error) {
    worldsError.value = extractApiErrorMessage(error, 'Errore nel recupero dei mondi.');
  } finally {
    loadingWorlds.value = false;
  }
};

const checkApiHealth = async () => {
  if (!authStore.isAuthenticated) return;
  checkingHealth.value = true;
  healthMessage.value = '';
  try {
    await checkHealth();
    healthStatus.value = 'ok';
    healthMessage.value = 'API /api/health raggiungibile.';
  } catch (error) {
    healthStatus.value = 'ko';
    healthMessage.value = extractApiErrorMessage(error, 'Impossibile contattare /api/health.');
  } finally {
    checkingHealth.value = false;
  }
};

const handleCreateWorld = async () => {
  createWorldError.value = '';
  if (!newWorldForm.name.trim()) {
    createWorldError.value = 'Il nome del mondo è obbligatorio.';
    return;
  }

  creatingWorld.value = true;
  try {
    await createWorld({
      name: newWorldForm.name.trim(),
      description: newWorldForm.description?.trim() || undefined,
      isPublic: newWorldForm.isPublic,
    });
    newWorldForm.name = '';
    newWorldForm.description = '';
    newWorldForm.isPublic = false;
    await refreshWorlds();
  } catch (error) {
    createWorldError.value = extractApiErrorMessage(error, 'Creazione mondo non riuscita.');
  } finally {
    creatingWorld.value = false;
  }
};

const goToWorld = (worldId: number) => {
  router.push({ name: 'world-detail', params: { id: worldId } });
};

const loadGlobalCampaigns = async () => {
  if (!authStore.isAuthenticated) return;
  loadingGlobalCampaigns.value = true;
  globalCampaignsError.value = '';
  try {
    globalCampaigns.value = await getCampaigns();
  } catch (error) {
    globalCampaignsError.value = extractApiErrorMessage(
      error,
      'Errore nel caricamento delle campagne.',
    );
  } finally {
    loadingGlobalCampaigns.value = false;
  }
};

const loadGlobalNpcs = async () => {
  if (!authStore.isAuthenticated) return;
  loadingGlobalNpcs.value = true;
  globalNpcsError.value = '';
  try {
    globalNpcs.value = await getNpcs();
  } catch (error) {
    globalNpcsError.value = extractApiErrorMessage(error, 'Errore nel caricamento degli NPC.');
  } finally {
    loadingGlobalNpcs.value = false;
  }
};

const loadGlobalLocations = async () => {
  if (!authStore.isAuthenticated) return;
  loadingGlobalLocations.value = true;
  globalLocationsError.value = '';
  try {
    globalLocations.value = await getLocations();
  } catch (error) {
    globalLocationsError.value = extractApiErrorMessage(
      error,
      'Errore nel caricamento delle location.',
    );
  } finally {
    loadingGlobalLocations.value = false;
  }
};

const loadGlobalItems = async () => {
  if (!authStore.isAuthenticated) return;
  loadingGlobalItems.value = true;
  globalItemsError.value = '';
  try {
    globalItems.value = await getItems();
  } catch (error) {
    globalItemsError.value = extractApiErrorMessage(error, 'Errore nel caricamento degli oggetti.');
  } finally {
    loadingGlobalItems.value = false;
  }
};

const refreshGlobalData = async () => {
  await Promise.all([
    loadGlobalCampaigns(),
    loadGlobalNpcs(),
    loadGlobalLocations(),
    loadGlobalItems(),
  ]);
};

const handleLookup = async <T extends LookupTarget>(
  type: T,
  fetcher: (id: number) => Promise<LookupResultMap[T]>,
) => {
  const rawValue = lookupState[lookupKeyMap[type]];
  const id = Number(rawValue);
  lookupErrors[type] = '';
  lookupResults[type] = null;

  if (!id || Number.isNaN(id)) {
    lookupErrors[type] = 'Inserisci un ID valido.';
    return;
  }

  lookupLoading[type] = true;
  try {
    lookupResults[type] = await fetcher(id);
  } catch (error) {
    lookupErrors[type] = extractApiErrorMessage(error, `Impossibile caricare ${type.toUpperCase()}.`);
  } finally {
    lookupLoading[type] = false;
  }
};

const lookupNpc = () => handleLookup('npc', getNpcById);
const lookupLocation = () => handleLookup('location', getLocationById);
const lookupItem = () => handleLookup('item', getItemById);

const resetGlobalState = () => {
  globalCampaigns.value = [];
  globalCampaignsError.value = '';
  globalNpcs.value = [];
  globalNpcsError.value = '';
  globalLocations.value = [];
  globalLocationsError.value = '';
  globalItems.value = [];
  globalItemsError.value = '';
  lookupResults.npc = null;
  lookupResults.location = null;
  lookupResults.item = null;
  lookupErrors.npc = '';
  lookupErrors.location = '';
  lookupErrors.item = '';
};

watch(
  () => authStore.isAuthenticated,
  (loggedIn) => {
    if (loggedIn) {
      refreshWorlds();
      checkApiHealth();
      refreshGlobalData();
    } else {
      worlds.value = [];
      worldsError.value = '';
      healthMessage.value = '';
      healthStatus.value = 'idle';
      resetGlobalState();
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">I tuoi mondi</h1>
        <p class="section-subtitle">
          Crea e gestisci le ambientazioni per le tue campagne di gioco di ruolo. Ogni mondo raccoglie
          campagne, sessioni, NPC e luoghi pronti per il prossimo viaggio.
        </p>
      </header>

      <div v-if="!authStore.isAuthenticated" class="notice">
        Effettua il login per esplorare il registro dei mondi.
      </div>

      <template v-else>
        <div class="actions">
          <button class="btn btn-primary" :disabled="loadingWorlds" @click="refreshWorlds">
            {{ loadingWorlds ? 'Caricamento...' : 'Ricarica mondi' }}
          </button>
          <button class="btn btn-secondary" :disabled="checkingHealth" @click="checkApiHealth">
            {{ checkingHealth ? 'Verifica in corso...' : 'Verifica /api/health' }}
          </button>
        </div>

        <p
          v-if="healthMessage"
          class="status-message"
          :class="healthStatus === 'ok' ? 'text-success' : 'text-danger'"
        >
          {{ healthMessage }}
        </p>

        <p v-if="worldsError" class="status-message text-danger">{{ worldsError }}</p>

        <div v-if="authStore.canManageContent" class="card muted stack">
          <h2 class="card-title">Crea nuovo mondo</h2>
          <form class="stack" @submit.prevent="handleCreateWorld">
            <label class="field">
              <span>Nome</span>
              <input v-model="newWorldForm.name" type="text" required />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="newWorldForm.description" rows="3" />
            </label>
            <label class="field checkbox">
              <input v-model="newWorldForm.isPublic" type="checkbox" />
              <span>Visibile ai player (mondo pubblico)</span>
            </label>
            <button class="btn btn-secondary" type="submit" :disabled="creatingWorld">
              {{ creatingWorld ? 'Creazione...' : 'Registra mondo' }}
            </button>
            <p v-if="createWorldError" class="status-message text-danger">{{ createWorldError }}</p>
          </form>
        </div>

        <ul v-if="worlds.length" class="list-grid">
          <li v-for="world in worlds" :key="world.id" class="card">
            <header class="card-header">
              <h3 class="card-title">{{ world.name }}</h3>
              <span class="tag tag-muted">ID #{{ world.id }}</span>
            </header>
            <p class="card-subtitle">
              {{ world.description || 'Questo mondo attende ancora di essere raccontato.' }}
            </p>
            <p class="world-meta">Custode: {{ world.ownerNickname ?? 'N/D' }}</p>
            <p class="world-meta">Campagne attive: {{ world.campaignCount }}</p>
            <p class="world-meta">
              VisibilitÃ : {{ world.isPublic ? 'Pubblico' : 'Privato' }}
            </p>
            <button class="btn btn-link" @click="goToWorld(world.id)">Apri dettagli mondo</button>
          </li>
        </ul>

        <p v-else class="muted">Nessun mondo registrato. Aggiungine uno dal backend o tramite API.</p>

        <section class="stack">
          <header class="section-header">
            <h2>Campagne disponibili</h2>
            <button class="btn btn-link" @click="loadGlobalCampaigns" :disabled="loadingGlobalCampaigns">
              Aggiorna campagne
            </button>
          </header>
          <p v-if="globalCampaignsError" class="status-message text-danger">
            {{ globalCampaignsError }}
          </p>
          <ul v-else-if="globalCampaigns.length" class="list-grid">
            <li v-for="campaign in globalCampaigns" :key="campaign.id" class="card">
              <h4 class="card-title">{{ campaign.name }}</h4>
              <p class="card-subtitle">{{ campaign.description || 'Nessuna descrizione.' }}</p>
              <p class="world-meta">World ID: {{ campaign.worldId }}</p>
              <p class="world-meta">
                Owner: {{ campaign.ownerNickname ?? 'N/D' }} (#{{ campaign.ownerId ?? '—' }})
              </p>
              <button class="btn btn-link" @click="goToWorld(campaign.worldId)">
                Vai al mondo
              </button>
              <button class="btn btn-link" @click="router.push({ name: 'campaign-detail', params: { id: campaign.id } })">
                Apri campagna
              </button>
            </li>
          </ul>
          <p v-else class="muted">Nessuna campagna disponibile.</p>
        </section>

        <section class="stack">
          <header class="section-header">
            <h2>NPC disponibili</h2>
            <button class="btn btn-link" @click="loadGlobalNpcs" :disabled="loadingGlobalNpcs">
              Aggiorna NPC
            </button>
          </header>
          <p v-if="globalNpcsError" class="status-message text-danger">{{ globalNpcsError }}</p>
          <ul v-else-if="globalNpcs.length" class="list-grid">
            <li v-for="npc in globalNpcs" :key="npc.id" class="card">
              <h4 class="card-title">{{ npc.name }}</h4>
              <p class="card-subtitle">{{ npc.description || 'Nessuna descrizione.' }}</p>
              <p class="world-meta">World ID: {{ npc.worldId }}</p>
              <p class="world-meta">Visibile: {{ npc.isVisibleToPlayers ? 'Sì' : 'No' }}</p>
            </li>
          </ul>
          <p v-else class="muted">Nessun NPC disponibile.</p>
        </section>

        <section class="stack">
          <header class="section-header">
            <h2>Location note</h2>
            <button class="btn btn-link" @click="loadGlobalLocations" :disabled="loadingGlobalLocations">
              Aggiorna location
            </button>
          </header>
          <p v-if="globalLocationsError" class="status-message text-danger">
            {{ globalLocationsError }}
          </p>
          <ul v-else-if="globalLocations.length" class="list-grid">
            <li v-for="location in globalLocations" :key="location.id" class="card">
              <h4 class="card-title">{{ location.name }}</h4>
              <p class="card-subtitle">{{ location.description || 'Nessuna descrizione.' }}</p>
              <p class="world-meta">World ID: {{ location.worldId }}</p>
              <p class="world-meta">Visibile: {{ location.isVisibleToPlayers ? 'Sì' : 'No' }}</p>
            </li>
          </ul>
          <p v-else class="muted">Nessuna location caricata.</p>
        </section>

        <section class="stack">
          <header class="section-header">
            <h2>Oggetti catalogati</h2>
            <button class="btn btn-link" @click="loadGlobalItems" :disabled="loadingGlobalItems">
              Aggiorna oggetti
            </button>
          </header>
          <p v-if="globalItemsError" class="status-message text-danger">{{ globalItemsError }}</p>
          <ul v-else-if="globalItems.length" class="list-grid">
            <li v-for="item in globalItems" :key="item.id" class="card">
              <h4 class="card-title">{{ item.name }}</h4>
              <p class="card-subtitle">{{ item.description || 'Nessuna descrizione.' }}</p>
              <p class="world-meta">World ID: {{ item.worldId }}</p>
              <p class="world-meta">Rarità: {{ item.rarity || 'N/D' }}</p>
            </li>
          </ul>
          <p v-else class="muted">Nessun oggetto disponibile.</p>
        </section>

        <section class="stack">
          <header>
            <h2 class="card-title">Lookup rapido per ID</h2>
            <p class="card-subtitle">
              Recupera il dettaglio di NPC, location o item sfruttando gli endpoint /api/*/{id}.
            </p>
          </header>
          <div class="grid-lookup">
            <form class="card muted stack" @submit.prevent="lookupNpc">
              <label class="field">
                <span>ID NPC</span>
                <input v-model="lookupState.npcId" type="number" min="1" required />
              </label>
              <button class="btn btn-secondary" type="submit" :disabled="lookupLoading.npc">
                {{ lookupLoading.npc ? 'Ricerca...' : 'Cerca NPC' }}
              </button>
              <p v-if="lookupErrors.npc" class="status-message text-danger">
                {{ lookupErrors.npc }}
              </p>
              <article v-if="lookupResults.npc" class="card stack">
                <h4>{{ lookupResults.npc.name }}</h4>
                <p>{{ lookupResults.npc.description || 'Nessuna descrizione.' }}</p>
                <p class="world-meta">World ID: {{ lookupResults.npc.worldId }}</p>
                <p class="world-meta">Visibile: {{ lookupResults.npc.isVisibleToPlayers ? 'Sì' : 'No' }}</p>
              </article>
            </form>

            <form class="card muted stack" @submit.prevent="lookupLocation">
              <label class="field">
                <span>ID Location</span>
                <input v-model="lookupState.locationId" type="number" min="1" required />
              </label>
              <button class="btn btn-secondary" type="submit" :disabled="lookupLoading.location">
                {{ lookupLoading.location ? 'Ricerca...' : 'Cerca location' }}
              </button>
              <p v-if="lookupErrors.location" class="status-message text-danger">
                {{ lookupErrors.location }}
              </p>
              <article v-if="lookupResults.location" class="card stack">
                <h4>{{ lookupResults.location.name }}</h4>
                <p>{{ lookupResults.location.description || 'Nessuna descrizione.' }}</p>
                <p class="world-meta">World ID: {{ lookupResults.location.worldId }}</p>
                <p class="world-meta">
                  Visibile: {{ lookupResults.location.isVisibleToPlayers ? 'Sì' : 'No' }}
                </p>
              </article>
            </form>

            <form class="card muted stack" @submit.prevent="lookupItem">
              <label class="field">
                <span>ID Item</span>
                <input v-model="lookupState.itemId" type="number" min="1" required />
              </label>
              <button class="btn btn-secondary" type="submit" :disabled="lookupLoading.item">
                {{ lookupLoading.item ? 'Ricerca...' : 'Cerca item' }}
              </button>
              <p v-if="lookupErrors.item" class="status-message text-danger">
                {{ lookupErrors.item }}
              </p>
              <article v-if="lookupResults.item" class="card stack">
                <h4>{{ lookupResults.item.name }}</h4>
                <p>{{ lookupResults.item.description || 'Nessuna descrizione.' }}</p>
                <p class="world-meta">World ID: {{ lookupResults.item.worldId }}</p>
                <p class="world-meta">
                  Visibile: {{ lookupResults.item.isVisibleToPlayers ? 'Sì' : 'No' }}
                </p>
              </article>
            </form>
          </div>
        </section>
      </template>
    </div>
  </section>
</template>
