<!-- src/views/WorldDetailView.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import MobileTopBar from '../components/mobile/MobileTopBar.vue';
import { useAuthStore } from '../store/authStore';
import { getWorldById } from '../api/worldsApi';
import { createCampaign, deleteCampaign, getCampaignsByWorld } from '../api/campaignsApi';
import { createNpc, getNpcsByWorld } from '../api/npcsApi';
import { createLocation, getLocationsByWorld } from '../api/locationsApi';
import { createItem, getItemsByWorld } from '../api/itemsApi';
import { useIsMobile } from '../composables/useIsMobile';
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
import {
  CAMPAIGN_STATUS_VALUES,
  campaignStatusClass,
  campaignStatusLabel,
} from '../utils/campaignStatus';
import { extractApiErrorMessage } from '../utils/errorMessage';
import RefreshAction from '../components/ui/RefreshAction.vue';
import IconActionButton from '../components/ui/IconActionButton.vue';

type MobileWorldSection = 'overview' | 'campaigns' | 'npcs' | 'items' | 'locations';
type CreateSection = 'campaign' | 'npc' | 'location' | 'item';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { canManageContent } = storeToRefs(authStore);
const { isMobile } = useIsMobile();

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

const showCreateForm = reactive<Record<CreateSection, boolean>>({
  campaign: false,
  npc: false,
  location: false,
  item: false,
});

const activeMobileSection = ref<MobileWorldSection>('overview');

const campaignForm = reactive<CreateCampaignRequest>({
  worldId: 0,
  name: '',
  description: '',
  status: 'PLANNED',
});

const npcForm = reactive<CreateNpcRequest>({
  worldId: 0,
  name: '',
  race: '',
  roleOrClass: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
  armorClass: 10,
  maxHitPoints: 10,
  currentHitPoints: 10,
  temporaryHitPoints: 0,
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

const mobileSections: Array<{ key: MobileWorldSection; label: string }> = [
  { key: 'overview', label: 'Panoramica' },
  { key: 'campaigns', label: 'Campagne' },
  { key: 'npcs', label: 'NPC' },
  { key: 'items', label: 'Oggetti' },
  { key: 'locations', label: 'Luoghi' },
];

const previewText = (value?: string | null, fallback = 'Nessuna descrizione disponibile.') =>
  value?.trim() || fallback;

const resetCampaignForm = () => {
  campaignForm.worldId = worldId.value ?? 0;
  campaignForm.name = '';
  campaignForm.description = '';
  campaignForm.status = 'PLANNED';
  formErrors.campaign = '';
};

const resetNpcForm = () => {
  npcForm.worldId = worldId.value ?? 0;
  npcForm.name = '';
  npcForm.race = '';
  npcForm.roleOrClass = '';
  npcForm.description = '';
  npcForm.gmNotes = '';
  npcForm.isVisibleToPlayers = true;
  npcForm.armorClass = 10;
  npcForm.maxHitPoints = 10;
  npcForm.currentHitPoints = 10;
  npcForm.temporaryHitPoints = 0;
  formErrors.npc = '';
};

const resetLocationForm = () => {
  locationForm.worldId = worldId.value ?? 0;
  locationForm.parentLocationId = undefined;
  locationForm.name = '';
  locationForm.type = '';
  locationForm.description = '';
  locationForm.gmNotes = '';
  locationForm.isVisibleToPlayers = true;
  formErrors.location = '';
};

const resetItemForm = () => {
  itemForm.worldId = worldId.value ?? 0;
  itemForm.locationId = undefined;
  itemForm.name = '';
  itemForm.type = '';
  itemForm.rarity = '';
  itemForm.description = '';
  itemForm.gmNotes = '';
  itemForm.isVisibleToPlayers = true;
  formErrors.item = '';
};

const closeCreateForm = (section: CreateSection) => {
  showCreateForm[section] = false;
  if (section === 'campaign') {
    resetCampaignForm();
  }
  if (section === 'npc') {
    resetNpcForm();
  }
  if (section === 'location') {
    resetLocationForm();
  }
  if (section === 'item') {
    resetItemForm();
  }
};

const openCreateForm = (section: CreateSection) => {
  showCreateForm[section] = true;
};

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
  const trimmedName = campaignForm.name.trim();
  if (!trimmedName) {
    formErrors.campaign = 'Il nome della campagna è obbligatorio.';
    return;
  }
  formLoading.campaign = true;
  try {
    await createCampaign({
      worldId: worldId.value,
      name: trimmedName,
      description: campaignForm.description?.trim() || undefined,
      status: campaignForm.status,
    });
    await loadCampaigns();
    closeCreateForm('campaign');
  } catch (error) {
    formErrors.campaign = extractApiErrorMessage(error, 'Errore nella creazione della campagna.');
  } finally {
    formLoading.campaign = false;
  }
};

const handleCreateNpc = async () => {
  if (!worldId.value || !canMutate.value) return;
  formErrors.npc = '';
  const trimmedName = npcForm.name.trim();
  if (!trimmedName) {
    formErrors.npc = "Il nome dell'NPC è obbligatorio.";
    return;
  }
  if (
    typeof npcForm.armorClass !== 'number'
    || !Number.isFinite(npcForm.armorClass)
    || npcForm.armorClass <= 0
  ) {
    formErrors.npc = 'La classe armatura deve essere maggiore di 0.';
    return;
  }
  if (
    typeof npcForm.maxHitPoints !== 'number'
    || !Number.isFinite(npcForm.maxHitPoints)
    || npcForm.maxHitPoints <= 0
  ) {
    formErrors.npc = 'I punti ferita massimi devono essere maggiori di 0.';
    return;
  }
  if (
    typeof npcForm.currentHitPoints !== 'number'
    || !Number.isFinite(npcForm.currentHitPoints)
    || npcForm.currentHitPoints < 0
  ) {
    formErrors.npc = 'I punti ferita attuali non possono essere negativi.';
    return;
  }
  if (npcForm.currentHitPoints > npcForm.maxHitPoints) {
    formErrors.npc = 'I punti ferita attuali non possono superare i punti ferita massimi.';
    return;
  }
  if (
    typeof npcForm.temporaryHitPoints !== 'number'
    || !Number.isFinite(npcForm.temporaryHitPoints)
    || npcForm.temporaryHitPoints < 0
  ) {
    formErrors.npc = 'I punti ferita temporanei non possono essere negativi.';
    return;
  }
  formLoading.npc = true;
  try {
    await createNpc({
      worldId: worldId.value,
      name: trimmedName,
      race: npcForm.race?.trim() || undefined,
      roleOrClass: npcForm.roleOrClass?.trim() || undefined,
      description: npcForm.description?.trim() || undefined,
      gmNotes: npcForm.gmNotes?.trim() || undefined,
      isVisibleToPlayers: npcForm.isVisibleToPlayers,
      armorClass: npcForm.armorClass,
      maxHitPoints: npcForm.maxHitPoints,
      currentHitPoints: npcForm.currentHitPoints,
      temporaryHitPoints: npcForm.temporaryHitPoints,
    });
    await loadNpcs();
    closeCreateForm('npc');
  } catch (error) {
    formErrors.npc = extractApiErrorMessage(error, "Errore nella creazione dell'NPC.");
  } finally {
    formLoading.npc = false;
  }
};

const handleCreateLocation = async () => {
  if (!worldId.value || !canMutate.value) return;
  formErrors.location = '';
  const trimmedName = locationForm.name.trim();
  if (!trimmedName) {
    formErrors.location = 'Il nome della location è obbligatorio.';
    return;
  }
  formLoading.location = true;
  try {
    await createLocation({
      worldId: worldId.value,
      parentLocationId: locationForm.parentLocationId || undefined,
      name: trimmedName,
      type: locationForm.type?.trim() || undefined,
      description: locationForm.description?.trim() || undefined,
      gmNotes: locationForm.gmNotes?.trim() || undefined,
      isVisibleToPlayers: locationForm.isVisibleToPlayers,
    });
    await loadLocations();
    closeCreateForm('location');
  } catch (error) {
    formErrors.location = extractApiErrorMessage(error, 'Errore nella creazione della location.');
  } finally {
    formLoading.location = false;
  }
};

const handleCreateItem = async () => {
  if (!worldId.value || !canMutate.value) return;
  formErrors.item = '';
  const trimmedName = itemForm.name.trim();
  if (!trimmedName) {
    formErrors.item = "Il nome dell'oggetto è obbligatorio.";
    return;
  }
  formLoading.item = true;
  try {
    await createItem({
      worldId: worldId.value,
      locationId: itemForm.locationId || undefined,
      name: trimmedName,
      type: itemForm.type?.trim() || undefined,
      rarity: itemForm.rarity?.trim() || undefined,
      description: itemForm.description?.trim() || undefined,
      gmNotes: itemForm.gmNotes?.trim() || undefined,
      isVisibleToPlayers: itemForm.isVisibleToPlayers,
    });
    await loadItems();
    closeCreateForm('item');
  } catch (error) {
    formErrors.item = extractApiErrorMessage(error, "Errore nella creazione dell'oggetto.");
  } finally {
    formLoading.item = false;
  }
};

const goToCampaign = (campaignId: number) => {
  router.push({ name: 'campaign-detail', params: { id: campaignId } });
};

const removeCampaign = async (campaignId: number) => {
  campaignsError.value = '';
  const confirmed = window.confirm('Sei sicuro di voler eliminare questa campagna?');
  if (!confirmed) {
    return;
  }

  try {
    await deleteCampaign(campaignId);
    campaigns.value = campaigns.value.filter((campaignEntry) => campaignEntry.id !== campaignId);
    if (world.value) {
      world.value = {
        ...world.value,
        campaignCount: Math.max(0, world.value.campaignCount - 1),
      };
    }
  } catch (error) {
    campaignsError.value = extractApiErrorMessage(error, 'Impossibile eliminare la campagna.');
  }
};

watch(
  [() => authStore.isAuthenticated, worldId],
  ([loggedIn, id]) => {
    if (loggedIn && id) {
      resetCampaignForm();
      resetNpcForm();
      resetLocationForm();
      resetItemForm();
      activeMobileSection.value = 'overview';
      showCreateForm.campaign = false;
      showCreateForm.npc = false;
      showCreateForm.location = false;
      showCreateForm.item = false;
      refreshAll();
    } else {
      resetState();
    }
  },
  { immediate: true },
);
</script>

<template>
  <section v-if="isMobile" class="mobile-screen mobile-page stack">
    <MobileTopBar
      :title="world?.name ?? 'Dettaglio mondo'"
      subtitle="Mondo"
      back-to="/dm/worlds"
    />

    <div v-if="worldError" class="status-message text-danger">{{ worldError }}</div>
    <p v-else-if="loadingWorld" class="card">Caricamento mondo...</p>

    <template v-else-if="world">
      <article class="mobile-hero-card stack">
        <div class="mobile-world-summary__header world-summary-header world-card-title-row">
          <div class="world-card-title-block world-summary-main">
            <p class="mobile-link-card__label">Mondo</p>
            <h2 class="card-title world-card-title world-summary-title">{{ world.name }}</h2>
          </div>
          <span class="mobile-world-summary__badge world-visibility-badge">
            {{ world.isPublic ? 'Pubblico' : 'Privato' }}
          </span>
        </div>
        <p class="mobile-world-summary__description">
          {{ previewText(world.description, 'Nessuna descrizione fornita.') }}
        </p>
        <div class="mobile-world-summary__meta">
          <span>Campagne: {{ campaigns.length }}</span>
          <span>NPC: {{ npcs.length }}</span>
          <span>Oggetti: {{ items.length }}</span>
          <span>Luoghi: {{ locations.length }}</span>
        </div>
      </article>

      <nav class="mobile-section-tabs" role="tablist" aria-label="Sezioni del mondo">
        <button
          v-for="section in mobileSections"
          :key="section.key"
          type="button"
          class="mobile-section-tab"
          :class="{ active: activeMobileSection === section.key }"
          @click="activeMobileSection = section.key"
        >
          {{ section.label }}
        </button>
      </nav>

      <section class="mobile-section-panel stack">
        <template v-if="activeMobileSection === 'overview'">
          <article class="mobile-entity-card card stack">
            <h3 class="card-title">Panoramica</h3>
            <p class="manager-meta">{{ previewText(world.description, 'Nessuna descrizione fornita.') }}</p>
            <div class="mobile-stats-grid">
              <article class="mobile-stat-card">
                <strong>{{ campaigns.length }}</strong>
                <span>Campagne</span>
              </article>
              <article class="mobile-stat-card">
                <strong>{{ npcs.length }}</strong>
                <span>NPC</span>
              </article>
              <article class="mobile-stat-card">
                <strong>{{ items.length }}</strong>
                <span>Oggetti</span>
              </article>
              <article class="mobile-stat-card">
                <strong>{{ locations.length }}</strong>
                <span>Luoghi</span>
              </article>
            </div>
          </article>
        </template>

        <template v-else-if="activeMobileSection === 'campaigns'">
          <header class="mobile-section-panel__header section-header-row">
            <div>
              <h3>Campagne</h3>
              <p class="manager-meta">Campagne del mondo: {{ campaigns.length }}</p>
            </div>
            <RefreshAction
              class="section-link-action"
              label="Aggiorna campagne"
              :loading="loadingCampaigns"
              @refresh="loadCampaigns"
            />
          </header>
          <p v-if="campaignsError" class="status-message text-danger">{{ campaignsError }}</p>
          <p v-else-if="loadingCampaigns" class="card">Caricamento campagne...</p>
          <div v-else-if="campaigns.length" class="mobile-panel-list">
            <article
              v-for="campaign in campaigns"
              :key="campaign.id"
              class="mobile-link-card mobile-entity-card mobile-panel-card"
            >
              <div class="mobile-panel-card__header campaign-card-header">
                <strong class="mobile-panel-card__title campaign-card-title">{{ campaign.name }}</strong>
                <span :class="['campaign-status-badge', campaignStatusClass(campaign.status)]">
                  {{ campaignStatusLabel(campaign.status) }}
                </span>
              </div>
              <p class="manager-meta">{{ previewText(campaign.description, 'Nessuna descrizione.') }}</p>
              <RouterLink class="btn btn-secondary" :to="{ name: 'campaign-detail', params: { id: campaign.id } }">
                Apri campagna
              </RouterLink>
            </article>
          </div>
          <article v-else class="mobile-hero-card mobile-empty-state stack">
            <h3 class="card-title">Nessuna campagna</h3>
            <p class="manager-meta">Questo mondo non ha ancora campagne registrate.</p>
          </article>

          <template v-if="canMutate">
            <button
              v-if="!showCreateForm.campaign"
              class="mobile-section-create-button"
              type="button"
              @click="openCreateForm('campaign')"
            >
              + Crea campagna
            </button>
            <form
              v-else
              class="mobile-entity-card card stack"
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
                <span>Stato</span>
                <select v-model="campaignForm.status">
                  <option v-for="status in CAMPAIGN_STATUS_VALUES" :key="status" :value="status">
                    {{ campaignStatusLabel(status) }}
                  </option>
                </select>
              </label>
              <div class="mobile-inline-actions">
                <button class="btn btn-primary" type="submit" :disabled="formLoading.campaign">
                  {{ formLoading.campaign ? 'Creazione...' : 'Salva campagna' }}
                </button>
                <button class="btn btn-link" type="button" @click="closeCreateForm('campaign')">
                  Annulla
                </button>
              </div>
              <p v-if="formErrors.campaign" class="status-message text-danger">
                {{ formErrors.campaign }}
              </p>
            </form>
          </template>
        </template>

        <template v-else-if="activeMobileSection === 'npcs'">
          <header class="mobile-section-panel__header section-header-row">
            <div>
              <h3>NPC</h3>
              <p class="manager-meta">NPC del mondo: {{ npcs.length }}</p>
            </div>
            <RefreshAction
              class="section-link-action"
              label="Aggiorna NPC"
              :loading="loadingNpcs"
              @refresh="loadNpcs"
            />
          </header>
          <p v-if="npcsError" class="status-message text-danger">{{ npcsError }}</p>
          <p v-else-if="loadingNpcs" class="card">Caricamento NPC...</p>
          <div v-else-if="npcs.length" class="mobile-panel-list">
            <article
              v-for="npc in npcs"
              :key="npc.id"
              class="mobile-link-card mobile-entity-card mobile-panel-card"
            >
              <div class="mobile-panel-card__header">
                <strong class="mobile-panel-card__title">{{ npc.name }}</strong>
                <span class="mobile-link-card__label">NPC</span>
              </div>
              <p class="manager-meta">
                {{ npc.race || 'Razza non indicata' }} · {{ npc.roleOrClass || 'Ruolo non indicato' }}
              </p>
              <div class="npc-stat-row">
                <span class="npc-stat-pill">
                  <span class="npc-stat-label">PF</span>
                  <span class="npc-stat-value">{{ npc.currentHitPoints ?? '—' }}/{{ npc.maxHitPoints ?? '—' }}</span>
                </span>
                <span class="npc-stat-pill">
                  <span class="npc-stat-label">CA</span>
                  <span class="npc-stat-value">{{ npc.armorClass ?? '—' }}</span>
                </span>
              </div>
              <RouterLink class="btn btn-secondary" :to="{ name: 'dm-npcs', query: { edit: npc.id } }">
                Apri
              </RouterLink>
            </article>
          </div>
          <article v-else class="mobile-hero-card mobile-empty-state stack">
            <h3 class="card-title">Nessun NPC</h3>
            <p class="manager-meta">Questo mondo non ha ancora NPC registrati.</p>
          </article>

          <template v-if="canMutate">
            <button
              v-if="!showCreateForm.npc"
              class="mobile-section-create-button"
              type="button"
              @click="openCreateForm('npc')"
            >
              + Crea NPC
            </button>
            <form v-else class="mobile-entity-card card stack" @submit.prevent="handleCreateNpc">
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
                <span>CA</span>
                <input v-model.number="npcForm.armorClass" type="number" min="1" required />
              </label>
              <label class="field">
                <span>PF massimi</span>
                <input v-model.number="npcForm.maxHitPoints" type="number" min="1" required />
              </label>
              <label class="field">
                <span>PF attuali</span>
                <input v-model.number="npcForm.currentHitPoints" type="number" min="0" required />
              </label>
              <label class="field">
                <span>PF temporanei</span>
                <input v-model.number="npcForm.temporaryHitPoints" type="number" min="0" />
              </label>
              <label class="field">
                <span>Descrizione</span>
                <textarea v-model="npcForm.description" rows="3" />
              </label>
              <label class="field">
                <span>Note DM</span>
                <textarea v-model="npcForm.gmNotes" rows="2" />
              </label>
              <label class="field checkbox">
                <input v-model="npcForm.isVisibleToPlayers" type="checkbox" />
                <span>Visibile a player/viewer</span>
              </label>
              <div class="mobile-inline-actions">
                <button class="btn btn-primary" type="submit" :disabled="formLoading.npc">
                  {{ formLoading.npc ? 'Creazione...' : 'Salva NPC' }}
                </button>
                <button class="btn btn-link" type="button" @click="closeCreateForm('npc')">
                  Annulla
                </button>
              </div>
              <p v-if="formErrors.npc" class="status-message text-danger">{{ formErrors.npc }}</p>
            </form>
          </template>
        </template>

        <template v-else-if="activeMobileSection === 'items'">
          <header class="mobile-section-panel__header section-header-row">
            <div>
              <h3>Oggetti</h3>
              <p class="manager-meta">Oggetti del mondo: {{ items.length }}</p>
            </div>
            <RefreshAction
              class="section-link-action"
              label="Aggiorna oggetti"
              :loading="loadingItems"
              @refresh="loadItems"
            />
          </header>
          <p v-if="itemsError" class="status-message text-danger">{{ itemsError }}</p>
          <p v-else-if="loadingItems" class="card">Caricamento oggetti...</p>
          <div v-else-if="items.length" class="mobile-panel-list">
            <article
              v-for="item in items"
              :key="item.id"
              class="mobile-link-card mobile-entity-card mobile-panel-card"
            >
              <div class="mobile-panel-card__header">
                <strong class="mobile-panel-card__title">{{ item.name }}</strong>
                <span class="mobile-link-card__label">Oggetto</span>
              </div>
              <p class="manager-meta">
                {{ item.type || 'Tipo non indicato' }} · {{ item.rarity || 'Rarità non indicata' }}
              </p>
              <RouterLink class="btn btn-secondary" :to="{ name: 'dm-items', query: { edit: item.id } }">
                Apri
              </RouterLink>
            </article>
          </div>
          <article v-else class="mobile-hero-card mobile-empty-state stack">
            <h3 class="card-title">Nessun oggetto</h3>
            <p class="manager-meta">Questo mondo non ha ancora oggetti registrati.</p>
          </article>

          <template v-if="canMutate">
            <button
              v-if="!showCreateForm.item"
              class="mobile-section-create-button"
              type="button"
              @click="openCreateForm('item')"
            >
              + Crea oggetto
            </button>
            <form v-else class="mobile-entity-card card stack" @submit.prevent="handleCreateItem">
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
                <span>Note DM</span>
                <textarea v-model="itemForm.gmNotes" rows="2" />
              </label>
              <label class="field checkbox">
                <input v-model="itemForm.isVisibleToPlayers" type="checkbox" />
                <span>Visibile a player/viewer</span>
              </label>
              <div class="mobile-inline-actions">
                <button class="btn btn-primary" type="submit" :disabled="formLoading.item">
                  {{ formLoading.item ? 'Creazione...' : 'Salva oggetto' }}
                </button>
                <button class="btn btn-link" type="button" @click="closeCreateForm('item')">
                  Annulla
                </button>
              </div>
              <p v-if="formErrors.item" class="status-message text-danger">{{ formErrors.item }}</p>
            </form>
          </template>
        </template>

        <template v-else>
          <header class="mobile-section-panel__header section-header-row">
            <div>
              <h3>Luoghi</h3>
              <p class="manager-meta">Luoghi del mondo: {{ locations.length }}</p>
            </div>
            <RefreshAction
              class="section-link-action"
              label="Aggiorna luoghi"
              :loading="loadingLocations"
              @refresh="loadLocations"
            />
          </header>
          <p v-if="locationsError" class="status-message text-danger">{{ locationsError }}</p>
          <p v-else-if="loadingLocations" class="card">Caricamento luoghi...</p>
          <div v-else-if="locations.length" class="mobile-panel-list">
            <article
              v-for="location in locations"
              :key="location.id"
              class="mobile-link-card mobile-entity-card mobile-panel-card"
            >
              <div class="mobile-panel-card__header">
                <strong class="mobile-panel-card__title">{{ location.name }}</strong>
                <span class="mobile-link-card__label">Luogo</span>
              </div>
              <p class="manager-meta">{{ location.type || 'Tipo non indicato' }}</p>
              <RouterLink
                class="btn btn-secondary"
                :to="{ name: 'dm-locations', query: { edit: location.id } }"
              >
                Apri
              </RouterLink>
            </article>
          </div>
          <article v-else class="mobile-hero-card mobile-empty-state stack">
            <h3 class="card-title">Nessun luogo</h3>
            <p class="manager-meta">Questo mondo non ha ancora luoghi registrati.</p>
          </article>

          <template v-if="canMutate">
            <button
              v-if="!showCreateForm.location"
              class="mobile-section-create-button"
              type="button"
              @click="openCreateForm('location')"
            >
              + Crea luogo
            </button>
            <form
              v-else
              class="mobile-entity-card card stack"
              @submit.prevent="handleCreateLocation"
            >
              <h4 class="card-title">Nuovo luogo</h4>
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
                <span>Note DM</span>
                <textarea v-model="locationForm.gmNotes" rows="2" />
              </label>
              <label class="field checkbox">
                <input v-model="locationForm.isVisibleToPlayers" type="checkbox" />
                <span>Visibile a player/viewer</span>
              </label>
              <div class="mobile-inline-actions">
                <button class="btn btn-primary" type="submit" :disabled="formLoading.location">
                  {{ formLoading.location ? 'Creazione...' : 'Salva luogo' }}
                </button>
                <button class="btn btn-link" type="button" @click="closeCreateForm('location')">
                  Annulla
                </button>
              </div>
              <p v-if="formErrors.location" class="status-message text-danger">
                {{ formErrors.location }}
              </p>
            </form>
          </template>
        </template>
      </section>
    </template>
  </section>

  <section v-else class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Dettaglio Mondo</h1>
        <p class="section-subtitle">World ID: {{ world?.id ?? route.params.id }}</p>
      </header>

      <div v-if="worldError" class="status-message text-danger">{{ worldError }}</div>
      <div v-else-if="loadingWorld">Caricamento mondo...</div>
      <div v-else-if="world" class="stack">
        <article class="card muted stack">
          <div class="world-card-title-row">
            <div class="world-card-title-block">
              <h2 class="card-title world-card-title">{{ world.name }}</h2>
            </div>
            <span class="mobile-world-summary__badge world-visibility-badge">
              {{ world.isPublic ? 'Pubblico' : 'Privato' }}
            </span>
          </div>
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
            <RefreshAction
              label="Aggiorna campagne"
              :loading="loadingCampaigns"
              @refresh="loadCampaigns"
            />
          </header>
          <p v-if="campaignsError" class="status-message text-danger">{{ campaignsError }}</p>
          <ul v-else-if="campaigns.length" class="list-grid">
            <li v-for="campaign in campaigns" :key="campaign.id" class="card">
              <h4 class="card-title">{{ campaign.name }}</h4>
              <p class="card-subtitle">{{ campaign.description || 'Nessuna descrizione.' }}</p>
              <p class="world-meta">
                Stato:
                <span :class="['campaign-status-badge', campaignStatusClass(campaign.status)]">
                  {{ campaignStatusLabel(campaign.status) }}
                </span>
              </p>
              <p class="world-meta">
                Owner: {{ campaign.ownerNickname ?? 'N/D' }} (#{{ campaign.ownerId ?? '—' }})
              </p>
              <div class="actions">
                <button class="btn btn-link" @click="goToCampaign(campaign.id)">
                  Vai alla campagna
                </button>
                <IconActionButton
                  v-if="canMutate"
                  icon="delete"
                  label="Elimina campagna"
                  variant="danger"
                  @click="removeCampaign(campaign.id)"
                />
              </div>
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
              <span>Stato</span>
              <select v-model="campaignForm.status">
                <option v-for="status in CAMPAIGN_STATUS_VALUES" :key="status" :value="status">
                  {{ campaignStatusLabel(status) }}
                </option>
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
            <RefreshAction
              label="Aggiorna NPC"
              :loading="loadingNpcs"
              @refresh="loadNpcs"
            />
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
              <p v-if="npc.gmNotes" class="world-meta">DM Notes: {{ npc.gmNotes }}</p>
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
              <span>CA</span>
              <input v-model.number="npcForm.armorClass" type="number" min="1" required />
            </label>
            <label class="field">
              <span>PF massimi</span>
              <input v-model.number="npcForm.maxHitPoints" type="number" min="1" required />
            </label>
            <label class="field">
              <span>PF attuali</span>
              <input v-model.number="npcForm.currentHitPoints" type="number" min="0" required />
            </label>
            <label class="field">
              <span>PF temporanei</span>
              <input v-model.number="npcForm.temporaryHitPoints" type="number" min="0" />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="npcForm.description" rows="3" />
            </label>
            <label class="field">
              <span>Note DM</span>
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
            <RefreshAction
              label="Aggiorna luoghi"
              :loading="loadingLocations"
              @refresh="loadLocations"
            />
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
              <p v-if="location.gmNotes" class="world-meta">DM Notes: {{ location.gmNotes }}</p>
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
              <span>Note DM</span>
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
            <RefreshAction
              label="Aggiorna oggetti"
              :loading="loadingItems"
              @refresh="loadItems"
            />
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
              <p v-if="item.gmNotes" class="world-meta">DM Notes: {{ item.gmNotes }}</p>
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
              <span>Note DM</span>
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

<style scoped>
.mobile-page {
  padding-bottom: 0.5rem;
}

.mobile-world-summary__header,
.mobile-panel-card__header,
.mobile-section-panel__header,
.mobile-inline-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.mobile-world-summary__description,
.mobile-world-summary__meta {
  margin: 0;
}

.world-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.world-card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.world-card-title-block {
  min-width: 0;
  flex: 1 1 auto;
}

.world-summary-main {
  flex: 1 1 auto;
}

.world-card-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.world-summary-title {
  margin: 0;
}

.mobile-world-summary__badge {
  flex-shrink: 0;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-bg-soft) 84%, transparent);
  color: var(--app-text);
  font-size: 0.76rem;
  font-weight: 700;
}

.world-visibility-badge {
  flex-shrink: 0;
  align-self: flex-start;
}

.mobile-world-summary__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.9rem;
  color: var(--app-text-muted);
  font-size: 0.92rem;
}

.mobile-section-tabs {
  display: flex;
  gap: 0.65rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  scrollbar-width: none;
}

.mobile-section-tabs::-webkit-scrollbar {
  display: none;
}

.mobile-section-tab {
  flex: 0 0 auto;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface) 90%, transparent);
  color: var(--app-text-muted);
  font-weight: 700;
}

.mobile-section-tab.active {
  border-color: color-mix(in srgb, var(--app-accent) 45%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 12%, var(--app-surface));
  color: var(--app-text);
}

.mobile-section-panel {
  gap: 1rem;
}

.mobile-panel-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.mobile-panel-card {
  gap: 0.8rem;
}

.mobile-panel-card__title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.campaign-card-header,
.section-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.campaign-card-title,
.section-header-row > :first-child {
  flex: 1 1 auto;
  min-width: 0;
}

.campaign-card-header .campaign-status-badge,
.section-link-action {
  flex-shrink: 0;
  align-self: flex-start;
}

.npc-stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.npc-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-bg-soft) 78%, transparent);
  color: var(--app-text);
  font-size: 0.86rem;
  line-height: 1;
}

.npc-stat-label {
  color: var(--app-text-muted);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.npc-stat-value {
  font-weight: 700;
}

.mobile-stats-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mobile-stat-card {
  display: grid;
  gap: 0.25rem;
  padding: 0.9rem 0.95rem;
  border-radius: 1rem;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 94%, transparent);
}

.mobile-stat-card strong {
  font-size: 1.2rem;
}

.mobile-stat-card span {
  color: var(--app-text-muted);
  font-size: 0.88rem;
}

.mobile-section-create-button {
  width: 100%;
  min-height: 3rem;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 38%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface));
  color: var(--app-text);
  font-weight: 700;
  text-align: center;
  box-shadow: 0 12px 24px color-mix(in srgb, var(--app-shadow) 68%, transparent);
}

.mobile-empty-state {
  text-align: left;
}

.checkbox {
  flex-direction: row !important;
  align-items: center;
  gap: 0.5rem;
}

.checkbox input {
  width: auto;
  margin: 0;
}

@media (max-width: 520px) {
  .mobile-stats-grid {
    grid-template-columns: 1fr;
  }

  .campaign-card-header .campaign-status-badge {
    font-size: 0.72rem;
    padding: 0.24rem 0.55rem;
  }
}
</style>
