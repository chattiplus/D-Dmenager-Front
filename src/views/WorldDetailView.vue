<!-- src/views/WorldDetailView.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { getWorldById } from '../api/worldsApi';
import { createCampaign, getCampaignsByWorld } from '../api/campaignsApi';
import { createNpc, getNpcsByWorld } from '../api/npcsApi';
import { createLocation, getLocationsByWorld } from '../api/locationsApi';
import { createItem, getItemsByWorld } from '../api/itemsApi';
import type {
  CampaignResponse,
  CreateCampaignRequest,
  CreateItemRequest,
  CreateLocationRequest,
  CreateNpcRequest,
  ItemResponse,
  LocationResponse,
  NpcResponse,
  WorldResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { canManageContent } = storeToRefs(authStore);

const worldId = computed(() => {
  const value = Number(route.params.id);
  return Number.isNaN(value) ? null : value;
});

const world = ref<WorldResponse | null>(null);
const campaigns = ref<CampaignResponse[]>([]);
const npcs = ref<NpcResponse[]>([]);
const locations = ref<LocationResponse[]>([]);
const items = ref<ItemResponse[]>([]);

const worldError = ref('');
const campaignsError = ref('');
const npcsError = ref('');
const locationsError = ref('');
const itemsError = ref('');

const loadingWorld = ref(false);
const loadingCampaigns = ref(false);
const loadingNpcs = ref(false);
const loadingLocations = ref(false);
const loadingItems = ref(false);

const formLoading = reactive({
  campaign: false,
  npc: false,
  location: false,
  item: false,
});

const formErrors = reactive({
  campaign: '',
  npc: '',
  location: '',
  item: '',
});

const campaignForm = reactive<CreateCampaignRequest>({
  worldId: 0,
  name: '',
  description: '',
  status: 'ACTIVE',
});

const npcForm = reactive<CreateNpcRequest>({
  worldId: 0,
  name: '',
  race: '',
  roleOrClass: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
});

const locationForm = reactive<CreateLocationRequest>({
  worldId: 0,
  parentLocationId: undefined,
  name: '',
  type: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
});

const itemForm = reactive<CreateItemRequest>({
  worldId: 0,
  locationId: undefined,
  name: '',
  type: '',
  rarity: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
});

const canMutate = canManageContent;

const loadWorld = async () => {
  if (!worldId.value) {
    worldError.value = 'ID mondo non valido.';
    return;
  }
  loadingWorld.value = true;
  worldError.value = '';
  try {
    world.value = await getWorldById(worldId.value);
  } catch (error) {
    worldError.value = extractApiErrorMessage(error, 'Errore nel caricamento del mondo.');
  } finally {
    loadingWorld.value = false;
  }
};

const loadCampaigns = async () => {
  if (!worldId.value) return;
  loadingCampaigns.value = true;
  campaignsError.value = '';
  try {
    campaigns.value = await getCampaignsByWorld(worldId.value);
  } catch (error) {
    campaignsError.value = extractApiErrorMessage(error, 'Errore nel recupero delle campagne.');
  } finally {
    loadingCampaigns.value = false;
  }
};

const loadNpcs = async () => {
  if (!worldId.value) return;
  loadingNpcs.value = true;
  npcsError.value = '';
  try {
    npcs.value = await getNpcsByWorld(worldId.value);
  } catch (error) {
    npcsError.value = extractApiErrorMessage(error, 'Errore nel recupero degli NPC.');
  } finally {
    loadingNpcs.value = false;
  }
};

const loadLocations = async () => {
  if (!worldId.value) return;
  loadingLocations.value = true;
  locationsError.value = '';
  try {
    locations.value = await getLocationsByWorld(worldId.value);
  } catch (error) {
    locationsError.value = extractApiErrorMessage(error, 'Errore nel recupero delle location.');
  } finally {
    loadingLocations.value = false;
  }
};

const loadItems = async () => {
  if (!worldId.value) return;
  loadingItems.value = true;
  itemsError.value = '';
  try {
    items.value = await getItemsByWorld(worldId.value);
  } catch (error) {
    itemsError.value = extractApiErrorMessage(error, 'Errore nel recupero degli oggetti.');
  } finally {
    loadingItems.value = false;
  }
};

const refreshAll = async () => {
  await Promise.all([loadWorld(), loadCampaigns(), loadNpcs(), loadLocations(), loadItems()]);
};

const resetState = () => {
  world.value = null;
  campaigns.value = [];
  npcs.value = [];
  locations.value = [];
  items.value = [];
  worldError.value = '';
  campaignsError.value = '';
  npcsError.value = '';
  locationsError.value = '';
  itemsError.value = '';
};

const handleCreateCampaign = async () => {
  if (!worldId.value || !canMutate.value) return;
  formErrors.campaign = '';
  formLoading.campaign = true;
  try {
    await createCampaign({
      worldId: worldId.value,
      name: campaignForm.name.trim(),
      description: campaignForm.description?.trim() || undefined,
      status: campaignForm.status || undefined,
    });
    campaignForm.name = '';
    campaignForm.description = '';
    campaignForm.status = 'ACTIVE';
    await loadCampaigns();
  } catch (error) {
    formErrors.campaign = extractApiErrorMessage(error, 'Errore nella creazione della campagna.');
  } finally {
    formLoading.campaign = false;
  }
};

const handleCreateNpc = async () => {
  if (!worldId.value || !canMutate.value) return;
  formErrors.npc = '';
  formLoading.npc = true;
  try {
    await createNpc({
      worldId: worldId.value,
      name: npcForm.name.trim(),
      race: npcForm.race?.trim() || undefined,
      roleOrClass: npcForm.roleOrClass?.trim() || undefined,
      description: npcForm.description?.trim() || undefined,
      gmNotes: npcForm.gmNotes?.trim() || undefined,
      isVisibleToPlayers: npcForm.isVisibleToPlayers,
    });
    npcForm.name = '';
    npcForm.race = '';
    npcForm.roleOrClass = '';
    npcForm.description = '';
    npcForm.gmNotes = '';
    npcForm.isVisibleToPlayers = true;
    await loadNpcs();
  } catch (error) {
    formErrors.npc = extractApiErrorMessage(error, 'Errore nella creazione dell’NPC.');
  } finally {
    formLoading.npc = false;
  }
};

const handleCreateLocation = async () => {
  if (!worldId.value || !canMutate.value) return;
  formErrors.location = '';
  formLoading.location = true;
  try {
    await createLocation({
      worldId: worldId.value,
      parentLocationId: locationForm.parentLocationId || undefined,
      name: locationForm.name.trim(),
      type: locationForm.type?.trim() || undefined,
      description: locationForm.description?.trim() || undefined,
      gmNotes: locationForm.gmNotes?.trim() || undefined,
      isVisibleToPlayers: locationForm.isVisibleToPlayers,
    });
    locationForm.name = '';
    locationForm.type = '';
    locationForm.description = '';
    locationForm.gmNotes = '';
    locationForm.parentLocationId = undefined;
    locationForm.isVisibleToPlayers = true;
    await loadLocations();
  } catch (error) {
    formErrors.location = extractApiErrorMessage(error, 'Errore nella creazione della location.');
  } finally {
    formLoading.location = false;
  }
};

const handleCreateItem = async () => {
  if (!worldId.value || !canMutate.value) return;
  formErrors.item = '';
  formLoading.item = true;
  try {
    await createItem({
      worldId: worldId.value,
      locationId: itemForm.locationId || undefined,
      name: itemForm.name.trim(),
      type: itemForm.type?.trim() || undefined,
      rarity: itemForm.rarity?.trim() || undefined,
      description: itemForm.description?.trim() || undefined,
      gmNotes: itemForm.gmNotes?.trim() || undefined,
      isVisibleToPlayers: itemForm.isVisibleToPlayers,
    });
    itemForm.name = '';
    itemForm.type = '';
    itemForm.rarity = '';
    itemForm.description = '';
    itemForm.gmNotes = '';
    itemForm.locationId = undefined;
    itemForm.isVisibleToPlayers = true;
    await loadItems();
  } catch (error) {
    formErrors.item = extractApiErrorMessage(error, 'Errore nella creazione dell’oggetto.');
  } finally {
    formLoading.item = false;
  }
};

const goToCampaign = (campaignId: number) => {
  router.push({ name: 'campaign-detail', params: { id: campaignId } });
};

watch(
  [() => authStore.isAuthenticated, worldId],
  ([loggedIn, id]) => {
    if (loggedIn && id) {
      campaignForm.worldId = id;
      npcForm.worldId = id;
      locationForm.worldId = id;
      itemForm.worldId = id;
      refreshAll();
    } else {
      resetState();
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Dettaglio Mondo</h1>
        <p class="section-subtitle">World ID: {{ world?.id ?? route.params.id }}</p>
      </header>

      <div v-if="worldError" class="status-message text-danger">{{ worldError }}</div>
      <div v-else-if="loadingWorld">Caricamento mondo...</div>
      <div v-else-if="world" class="stack">
        <article class="card muted stack">
          <h2 class="card-title">{{ world.name }}</h2>
          <p>{{ world.description || 'Nessuna descrizione fornita.' }}</p>
          <p class="world-meta">Owner: {{ world.ownerNickname ?? 'N/D' }} (#{{ world.ownerId ?? '—' }})</p>
          <p class="world-meta">Campagne: {{ world.campaignCount }}</p>
          <p class="world-meta">
            Visibilità: {{ world.isPublic ? 'Pubblico' : 'Privato' }}
          </p>
        </article>

        <section class="stack">
          <header class="section-header">
            <h3>Campagne</h3>
            <button class="btn btn-link" @click="loadCampaigns" :disabled="loadingCampaigns">
              Aggiorna elenco
            </button>
          </header>
          <p v-if="campaignsError" class="status-message text-danger">{{ campaignsError }}</p>
          <ul v-else-if="campaigns.length" class="list-grid">
            <li v-for="campaign in campaigns" :key="campaign.id" class="card">
              <h4 class="card-title">{{ campaign.name }}</h4>
              <p class="card-subtitle">{{ campaign.description || 'Nessuna descrizione.' }}</p>
              <p class="world-meta">Status: {{ campaign.status }}</p>
              <p class="world-meta">
                Owner: {{ campaign.ownerNickname ?? 'N/D' }} (#{{ campaign.ownerId ?? '—' }})
              </p>
              <button class="btn btn-link" @click="goToCampaign(campaign.id)">
                Vai alla campagna
              </button>
            </li>
          </ul>
          <p v-else class="muted">Nessuna campagna registrata per questo mondo.</p>

          <form
            v-if="canMutate"
            class="card muted stack"
            @submit.prevent="handleCreateCampaign"
          >
            <h4 class="card-title">Nuova campagna</h4>
            <label class="field">
              <span>Nome</span>
              <input v-model="campaignForm.name" type="text" required />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="campaignForm.description" rows="3" />
            </label>
            <label class="field">
              <span>Status</span>
              <select v-model="campaignForm.status">
                <option value="ACTIVE">Attiva</option>
                <option value="PLANNED">Pianificata</option>
                <option value="PAUSED">In pausa</option>
                <option value="COMPLETED">Completata</option>
              </select>
            </label>
            <button class="btn btn-secondary" type="submit" :disabled="formLoading.campaign">
              {{ formLoading.campaign ? 'Creazione...' : 'Crea campagna' }}
            </button>
            <p v-if="formErrors.campaign" class="status-message text-danger">
              {{ formErrors.campaign }}
            </p>
          </form>
        </section>

        <section class="stack">
          <header class="section-header">
            <h3>NPC del mondo</h3>
            <button class="btn btn-link" @click="loadNpcs" :disabled="loadingNpcs">
              Aggiorna NPC
            </button>
          </header>
          <p v-if="npcsError" class="status-message text-danger">{{ npcsError }}</p>
          <ul v-else-if="npcs.length" class="list-grid">
            <li v-for="npc in npcs" :key="npc.id" class="card">
              <h4 class="card-title">{{ npc.name }}</h4>
              <p class="card-subtitle">{{ npc.description || 'Nessuna descrizione.' }}</p>
              <p class="world-meta">
                Razza/Classe: {{ npc.race || 'N/D' }} / {{ npc.roleOrClass || 'N/D' }}
              </p>
              <p class="world-meta">Visibile ai player: {{ npc.isVisibleToPlayers ? 'Sì' : 'No' }}</p>
              <p v-if="npc.gmNotes" class="world-meta">GM Notes: {{ npc.gmNotes }}</p>
            </li>
          </ul>
          <p v-else class="muted">Nessun NPC disponibile per questo mondo.</p>

          <form v-if="canMutate" class="card muted stack" @submit.prevent="handleCreateNpc">
            <h4 class="card-title">Nuovo NPC</h4>
            <label class="field">
              <span>Nome</span>
              <input v-model="npcForm.name" type="text" required />
            </label>
            <label class="field">
              <span>Razza</span>
              <input v-model="npcForm.race" type="text" />
            </label>
            <label class="field">
              <span>Ruolo / Classe</span>
              <input v-model="npcForm.roleOrClass" type="text" />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="npcForm.description" rows="3" />
            </label>
            <label class="field">
              <span>Note GM</span>
              <textarea v-model="npcForm.gmNotes" rows="2" />
            </label>
            <label class="field checkbox">
              <input v-model="npcForm.isVisibleToPlayers" type="checkbox" />
              <span>Visibile a player/viewer</span>
            </label>
            <button class="btn btn-secondary" type="submit" :disabled="formLoading.npc">
              {{ formLoading.npc ? 'Creazione...' : 'Crea NPC' }}
            </button>
            <p v-if="formErrors.npc" class="status-message text-danger">{{ formErrors.npc }}</p>
          </form>
        </section>

        <section class="stack">
          <header class="section-header">
            <h3>Location</h3>
            <button class="btn btn-link" @click="loadLocations" :disabled="loadingLocations">
              Aggiorna location
            </button>
          </header>
          <p v-if="locationsError" class="status-message text-danger">{{ locationsError }}</p>
          <ul v-else-if="locations.length" class="list-grid">
            <li v-for="location in locations" :key="location.id" class="card">
              <h4 class="card-title">{{ location.name }}</h4>
              <p class="card-subtitle">{{ location.description || 'Nessuna descrizione.' }}</p>
              <p class="world-meta">Tipo: {{ location.type || 'N/D' }}</p>
              <p class="world-meta">Parent: {{ location.parentLocationId ?? '—' }}</p>
              <p class="world-meta">
                Visibile ai player: {{ location.isVisibleToPlayers ? 'Sì' : 'No' }}
              </p>
              <p v-if="location.gmNotes" class="world-meta">GM Notes: {{ location.gmNotes }}</p>
            </li>
          </ul>
          <p v-else class="muted">Nessuna location registrata.</p>

          <form
            v-if="canMutate"
            class="card muted stack"
            @submit.prevent="handleCreateLocation"
          >
            <h4 class="card-title">Nuova location</h4>
            <label class="field">
              <span>Nome</span>
              <input v-model="locationForm.name" type="text" required />
            </label>
            <label class="field">
              <span>Tipo</span>
              <input v-model="locationForm.type" type="text" />
            </label>
            <label class="field">
              <span>ID location padre</span>
              <input v-model.number="locationForm.parentLocationId" type="number" min="1" />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="locationForm.description" rows="3" />
            </label>
            <label class="field">
              <span>Note GM</span>
              <textarea v-model="locationForm.gmNotes" rows="2" />
            </label>
            <label class="field checkbox">
              <input v-model="locationForm.isVisibleToPlayers" type="checkbox" />
              <span>Visibile a player/viewer</span>
            </label>
            <button class="btn btn-secondary" type="submit" :disabled="formLoading.location">
              {{ formLoading.location ? 'Creazione...' : 'Crea location' }}
            </button>
            <p v-if="formErrors.location" class="status-message text-danger">
              {{ formErrors.location }}
            </p>
          </form>
        </section>

        <section class="stack">
          <header class="section-header">
            <h3>Oggetti</h3>
            <button class="btn btn-link" @click="loadItems" :disabled="loadingItems">
              Aggiorna oggetti
            </button>
          </header>
          <p v-if="itemsError" class="status-message text-danger">{{ itemsError }}</p>
          <ul v-else-if="items.length" class="list-grid">
            <li v-for="item in items" :key="item.id" class="card">
              <h4 class="card-title">{{ item.name }}</h4>
              <p class="card-subtitle">{{ item.description || 'Nessuna descrizione.' }}</p>
              <p class="world-meta">Tipo/Rarità: {{ item.type || '—' }} / {{ item.rarity || '—' }}</p>
              <p class="world-meta">Location ID: {{ item.locationId ?? 'N/D' }}</p>
              <p class="world-meta">
                Visibile ai player: {{ item.isVisibleToPlayers ? 'Sì' : 'No' }}
              </p>
              <p v-if="item.gmNotes" class="world-meta">GM Notes: {{ item.gmNotes }}</p>
            </li>
          </ul>
          <p v-else class="muted">Nessun oggetto registrato.</p>

          <form v-if="canMutate" class="card muted stack" @submit.prevent="handleCreateItem">
            <h4 class="card-title">Nuovo oggetto</h4>
            <label class="field">
              <span>Nome</span>
              <input v-model="itemForm.name" type="text" required />
            </label>
            <label class="field">
              <span>Tipo</span>
              <input v-model="itemForm.type" type="text" />
            </label>
            <label class="field">
              <span>Rarità</span>
              <input v-model="itemForm.rarity" type="text" />
            </label>
            <label class="field">
              <span>ID location</span>
              <input v-model.number="itemForm.locationId" type="number" min="1" />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="itemForm.description" rows="3" />
            </label>
            <label class="field">
              <span>Note GM</span>
              <textarea v-model="itemForm.gmNotes" rows="2" />
            </label>
            <label class="field checkbox">
              <input v-model="itemForm.isVisibleToPlayers" type="checkbox" />
              <span>Visibile a player/viewer</span>
            </label>
            <button class="btn btn-secondary" type="submit" :disabled="formLoading.item">
              {{ formLoading.item ? 'Creazione...' : 'Crea oggetto' }}
            </button>
            <p v-if="formErrors.item" class="status-message text-danger">{{ formErrors.item }}</p>
          </form>
        </section>
      </div>
    </div>
  </section>
</template>
