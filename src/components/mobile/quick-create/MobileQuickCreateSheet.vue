<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { createCampaign, getMyCampaigns } from '../../../api/campaignsApi';
import { createCharacter } from '../../../api/charactersApi';
import { createItem } from '../../../api/itemsApi';
import { createLocation } from '../../../api/locationsApi';
import { createNpc } from '../../../api/npcsApi';
import { createSession } from '../../../api/sessionsApi';
import { createWorld, getMyWorlds } from '../../../api/worldsApi';
import { useAuthStore } from '../../../store/authStore';
import type {
  CampaignResponse,
  CampaignStatus,
  CreateCampaignRequest,
  CreateItemRequest,
  CreateLocationRequest,
  CreateNpcRequest,
  CreateSessionRequest,
  CreateWorldRequest,
  SessionResponse,
  WorldResponse,
} from '../../../types/api';
import { extractApiErrorMessage } from '../../../utils/errorMessage';

type QuickCreateTab =
  | 'campaign'
  | 'session'
  | 'world'
  | 'npc'
  | 'item'
  | 'location'
  | 'character';

interface QuickCreateResult {
  message: string;
  linkLabel?: string;
  to?: string | { name: string; params?: Record<string, string | number> };
}

const authStore = useAuthStore();

const activeTab = ref<QuickCreateTab>('campaign');
const loadingOptions = ref(false);
const optionsError = ref('');
const worlds = ref<WorldResponse[]>([]);
const campaigns = ref<CampaignResponse[]>([]);

const campaignStatusOptions: CampaignStatus[] = ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED'];

const worldForm = reactive<CreateWorldRequest>({
  name: '',
  description: '',
  isPublic: false,
});

const campaignForm = reactive<CreateCampaignRequest>({
  worldId: 0,
  name: '',
  description: '',
  status: 'ACTIVE',
});

const sessionForm = reactive<CreateSessionRequest & { campaignId: number }>({
  campaignId: 0,
  title: '',
  sessionNumber: 1,
  sessionDate: '',
  notes: '',
});

const npcForm = reactive<CreateNpcRequest>({
  worldId: 0,
  name: '',
  race: '',
  roleOrClass: '',
  isVisibleToPlayers: true,
});

const itemForm = reactive<CreateItemRequest>({
  worldId: 0,
  name: '',
  type: '',
  rarity: '',
  isVisibleToPlayers: true,
});

const locationForm = reactive<CreateLocationRequest>({
  worldId: 0,
  name: '',
  type: '',
  description: '',
  isVisibleToPlayers: true,
});

const characterForm = reactive({
  name: '',
  race: '',
  characterClass: '',
  level: 1,
  armorClass: 10,
  maxHitPoints: 10,
  currentHitPoints: 10,
});

const worldLoading = ref(false);
const worldError = ref('');
const worldResult = ref<QuickCreateResult | null>(null);
const campaignLoading = ref(false);
const campaignError = ref('');
const campaignResult = ref<QuickCreateResult | null>(null);
const sessionLoading = ref(false);
const sessionError = ref('');
const sessionResult = ref<QuickCreateResult | null>(null);
const npcLoading = ref(false);
const npcError = ref('');
const npcResult = ref<QuickCreateResult | null>(null);
const itemLoading = ref(false);
const itemError = ref('');
const itemResult = ref<QuickCreateResult | null>(null);
const locationLoading = ref(false);
const locationError = ref('');
const locationResult = ref<QuickCreateResult | null>(null);
const characterLoading = ref(false);
const characterError = ref('');
const characterResult = ref<QuickCreateResult | null>(null);

const tabItems = computed(() => {
  if (authStore.canManageContent) {
    return [
      { key: 'campaign' as const, label: 'Campagna' },
      { key: 'session' as const, label: 'Sessione' },
      { key: 'world' as const, label: 'Mondo' },
      { key: 'npc' as const, label: 'NPC' },
      { key: 'item' as const, label: 'Oggetto' },
      { key: 'location' as const, label: 'Location' },
    ];
  }

  if (!authStore.isViewerOnly) {
    return [{ key: 'character' as const, label: 'Personaggio' }];
  }

  return [];
});

const optionalTextValue = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const ensureDefaults = () => {
  const defaultWorldId = worlds.value[0]?.id ?? 0;
  if (!campaignForm.worldId) campaignForm.worldId = defaultWorldId;
  if (!npcForm.worldId) npcForm.worldId = defaultWorldId;
  if (!itemForm.worldId) itemForm.worldId = defaultWorldId;
  if (!locationForm.worldId) locationForm.worldId = defaultWorldId;

  const defaultCampaignId = campaigns.value[0]?.id ?? 0;
  if (!sessionForm.campaignId) sessionForm.campaignId = defaultCampaignId;
};

const resetWorldForm = () => {
  worldForm.name = '';
  worldForm.description = '';
  worldForm.isPublic = false;
};

const resetCampaignForm = () => {
  campaignForm.name = '';
  campaignForm.description = '';
  campaignForm.status = 'ACTIVE';
};

const resetSessionForm = () => {
  sessionForm.title = '';
  sessionForm.sessionNumber = 1;
  sessionForm.sessionDate = '';
  sessionForm.notes = '';
};

const resetNpcForm = () => {
  npcForm.name = '';
  npcForm.race = '';
  npcForm.roleOrClass = '';
  npcForm.isVisibleToPlayers = true;
};

const resetItemForm = () => {
  itemForm.name = '';
  itemForm.type = '';
  itemForm.rarity = '';
  itemForm.isVisibleToPlayers = true;
};

const resetLocationForm = () => {
  locationForm.name = '';
  locationForm.type = '';
  locationForm.description = '';
  locationForm.isVisibleToPlayers = true;
};

const resetCharacterForm = () => {
  characterForm.name = '';
  characterForm.race = '';
  characterForm.characterClass = '';
  characterForm.level = 1;
  characterForm.armorClass = 10;
  characterForm.maxHitPoints = 10;
  characterForm.currentHitPoints = 10;
};

const refreshOptions = async () => {
  if (!authStore.canManageContent) {
    worlds.value = [];
    campaigns.value = [];
    return;
  }

  loadingOptions.value = true;
  optionsError.value = '';
  try {
    const [worldsData, campaignsData] = await Promise.all([getMyWorlds(), getMyCampaigns()]);
    worlds.value = worldsData;
    campaigns.value = campaignsData;
    ensureDefaults();
  } catch (error) {
    optionsError.value = extractApiErrorMessage(
      error,
      'Impossibile caricare mondi e campagne per la creazione rapida.',
    );
  } finally {
    loadingOptions.value = false;
  }
};

const handleWorldCreate = async () => {
  if (!worldForm.name.trim()) {
    worldError.value = 'Il nome del mondo è obbligatorio.';
    return;
  }

  worldLoading.value = true;
  worldError.value = '';
  worldResult.value = null;
  try {
    const created = await createWorld({
      name: worldForm.name.trim(),
      description: optionalTextValue(worldForm.description),
      isPublic: worldForm.isPublic,
    });
    await refreshOptions();
    campaignForm.worldId = created.id;
    npcForm.worldId = created.id;
    itemForm.worldId = created.id;
    locationForm.worldId = created.id;
    resetWorldForm();
    worldResult.value = {
      message: 'Mondo creato con successo.',
      linkLabel: 'Apri mondo',
      to: { name: 'world-detail', params: { id: created.id } },
    };
  } catch (error) {
    worldError.value = extractApiErrorMessage(error, 'Impossibile creare il mondo.');
  } finally {
    worldLoading.value = false;
  }
};

const handleCampaignCreate = async () => {
  if (!campaignForm.worldId) {
    campaignError.value = 'Seleziona un mondo per la campagna.';
    return;
  }
  if (!campaignForm.name.trim()) {
    campaignError.value = 'Il nome della campagna è obbligatorio.';
    return;
  }

  campaignLoading.value = true;
  campaignError.value = '';
  campaignResult.value = null;
  try {
    const created = await createCampaign({
      worldId: campaignForm.worldId,
      name: campaignForm.name.trim(),
      description: optionalTextValue(campaignForm.description),
      status: campaignForm.status,
    });
    await refreshOptions();
    sessionForm.campaignId = created.id;
    resetCampaignForm();
    campaignResult.value = {
      message: 'Campagna creata con successo.',
      linkLabel: 'Apri campagna',
      to: { name: 'campaign-detail', params: { id: created.id } },
    };
  } catch (error) {
    campaignError.value = extractApiErrorMessage(error, 'Impossibile creare la campagna.');
  } finally {
    campaignLoading.value = false;
  }
};

const handleSessionCreate = async () => {
  if (!sessionForm.campaignId) {
    sessionError.value = 'Seleziona una campagna.';
    return;
  }
  if (!sessionForm.title.trim()) {
    sessionError.value = 'Il titolo della sessione è obbligatorio.';
    return;
  }
  if (!Number.isFinite(sessionForm.sessionNumber) || sessionForm.sessionNumber < 1) {
    sessionError.value = 'Il numero sessione deve essere almeno 1.';
    return;
  }

  sessionLoading.value = true;
  sessionError.value = '';
  sessionResult.value = null;
  try {
    const created: SessionResponse = await createSession(sessionForm.campaignId, {
      title: sessionForm.title.trim(),
      sessionNumber: sessionForm.sessionNumber,
      sessionDate: optionalTextValue(sessionForm.sessionDate),
      notes: optionalTextValue(sessionForm.notes),
    });
    resetSessionForm();
    sessionResult.value = {
      message: 'Sessione creata con successo.',
      linkLabel: 'Apri sessione',
      to: { name: 'dm-session-detail', params: { id: created.id } },
    };
  } catch (error) {
    sessionError.value = extractApiErrorMessage(error, 'Impossibile creare la sessione.');
  } finally {
    sessionLoading.value = false;
  }
};

const handleNpcCreate = async () => {
  if (!npcForm.worldId) {
    npcError.value = 'Seleziona un mondo per l NPC.';
    return;
  }
  if (!npcForm.name.trim()) {
    npcError.value = 'Il nome dell NPC è obbligatorio.';
    return;
  }

  npcLoading.value = true;
  npcError.value = '';
  npcResult.value = null;
  try {
    const created = await createNpc({
      worldId: npcForm.worldId,
      name: npcForm.name.trim(),
      race: optionalTextValue(npcForm.race),
      roleOrClass: optionalTextValue(npcForm.roleOrClass),
      isVisibleToPlayers: npcForm.isVisibleToPlayers,
    });
    resetNpcForm();
    npcResult.value = {
      message: 'NPC creato con successo.',
      linkLabel: 'Apri archivio NPC',
      to: `/dm/npcs?edit=${created.id}`,
    };
  } catch (error) {
    npcError.value = extractApiErrorMessage(error, 'Impossibile creare l NPC.');
  } finally {
    npcLoading.value = false;
  }
};

const handleItemCreate = async () => {
  if (!itemForm.worldId) {
    itemError.value = 'Seleziona un mondo per l oggetto.';
    return;
  }
  if (!itemForm.name.trim()) {
    itemError.value = 'Il nome dell oggetto è obbligatorio.';
    return;
  }

  itemLoading.value = true;
  itemError.value = '';
  itemResult.value = null;
  try {
    const created = await createItem({
      worldId: itemForm.worldId,
      name: itemForm.name.trim(),
      type: optionalTextValue(itemForm.type),
      rarity: optionalTextValue(itemForm.rarity),
      isVisibleToPlayers: itemForm.isVisibleToPlayers,
    });
    resetItemForm();
    itemResult.value = {
      message: 'Oggetto creato con successo.',
      linkLabel: 'Apri archivio oggetti',
      to: `/dm/items?edit=${created.id}`,
    };
  } catch (error) {
    itemError.value = extractApiErrorMessage(error, 'Impossibile creare l oggetto.');
  } finally {
    itemLoading.value = false;
  }
};

const handleLocationCreate = async () => {
  if (!locationForm.worldId) {
    locationError.value = 'Seleziona un mondo per la location.';
    return;
  }
  if (!locationForm.name.trim()) {
    locationError.value = 'Il nome della location è obbligatorio.';
    return;
  }

  locationLoading.value = true;
  locationError.value = '';
  locationResult.value = null;
  try {
    const created = await createLocation({
      worldId: locationForm.worldId,
      name: locationForm.name.trim(),
      type: optionalTextValue(locationForm.type),
      description: optionalTextValue(locationForm.description),
      isVisibleToPlayers: locationForm.isVisibleToPlayers,
    });
    resetLocationForm();
    locationResult.value = {
      message: 'Location creata con successo.',
      linkLabel: 'Apri archivio location',
      to: `/dm/locations?edit=${created.id}`,
    };
  } catch (error) {
    locationError.value = extractApiErrorMessage(error, 'Impossibile creare la location.');
  } finally {
    locationLoading.value = false;
  }
};

const handleCharacterCreate = async () => {
  const trimmedName = characterForm.name.trim();
  const trimmedRace = characterForm.race.trim();
  const trimmedClass = characterForm.characterClass.trim();

  if (!trimmedName) {
    characterError.value = 'Il nome del personaggio è obbligatorio.';
    return;
  }
  if (!trimmedRace) {
    characterError.value = 'La razza è obbligatoria.';
    return;
  }
  if (!trimmedClass) {
    characterError.value = 'La classe è obbligatoria.';
    return;
  }
  if (!Number.isFinite(characterForm.level) || characterForm.level < 1) {
    characterError.value = 'Il livello deve essere almeno 1.';
    return;
  }
  if (!Number.isFinite(characterForm.armorClass) || characterForm.armorClass <= 0) {
    characterError.value = 'La CA deve essere maggiore di 0.';
    return;
  }
  if (!Number.isFinite(characterForm.maxHitPoints) || characterForm.maxHitPoints <= 0) {
    characterError.value = 'I PF massimi devono essere maggiori di 0.';
    return;
  }
  if (!Number.isFinite(characterForm.currentHitPoints) || characterForm.currentHitPoints < 0) {
    characterError.value = 'I PF attuali non possono essere negativi.';
    return;
  }
  if (characterForm.currentHitPoints > characterForm.maxHitPoints) {
    characterError.value = 'I PF attuali non possono superare i PF massimi.';
    return;
  }

  characterLoading.value = true;
  characterError.value = '';
  characterResult.value = null;
  try {
    await createCharacter({
      name: trimmedName,
      race: trimmedRace,
      characterClass: trimmedClass,
      level: characterForm.level,
      armorClass: characterForm.armorClass,
      maxHitPoints: characterForm.maxHitPoints,
      currentHitPoints: characterForm.currentHitPoints,
      proficiencyBonus: 2,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      speed: 9,
      inspiration: false,
      isVisibleToPlayers: true,
      knownLanguages: ['COMMON'],
    });
    resetCharacterForm();
    characterResult.value = {
      message: 'Personaggio creato con successo.',
      linkLabel: 'Apri personaggi',
      to: '/player/characters',
    };
  } catch (error) {
    characterError.value = extractApiErrorMessage(error, 'Impossibile creare il personaggio.');
  } finally {
    characterLoading.value = false;
  }
};

watch(worlds, ensureDefaults);
watch(campaigns, ensureDefaults);
watch(
  tabItems,
  (items) => {
    if (!items.some((item) => item.key === activeTab.value)) {
      activeTab.value = items[0]?.key ?? 'character';
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (authStore.canManageContent) {
    refreshOptions().catch(() => undefined);
  }
});
</script>

<template>
  <section class="stack">
    <p v-if="loadingOptions" class="muted">Caricamento opzioni...</p>
    <p v-else-if="optionsError" class="status-message text-danger">{{ optionsError }}</p>

    <template v-if="authStore.canManageContent || !authStore.isViewerOnly">
      <nav
        v-if="tabItems.length > 1"
        class="quick-create-launcher"
        role="tablist"
        aria-label="Categorie creazione rapida"
      >
        <button
          v-for="tab in tabItems"
          :key="tab.key"
          type="button"
          class="quick-create-launcher__item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span class="quick-create-launcher__label">{{ tab.label }}</span>
        </button>
      </nav>

      <section v-if="activeTab === 'campaign'" class="stack">
        <header class="stack quick-create-header">
          <h3 class="card-title">Crea campagna</h3>
          <p class="card-subtitle">Nuova campagna collegata a un mondo esistente.</p>
        </header>
        <p v-if="!worlds.length" class="muted">Crea prima un mondo per poter registrare una campagna.</p>
        <form v-else class="stack" @submit.prevent="handleCampaignCreate">
          <label class="field">
            <span>Mondo</span>
            <select v-model="campaignForm.worldId" required>
              <option v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</option>
            </select>
          </label>
          <label class="field">
            <span>Nome campagna</span>
            <input v-model="campaignForm.name" type="text" required />
          </label>
          <label class="field">
            <span>Stato</span>
            <select v-model="campaignForm.status">
              <option v-for="status in campaignStatusOptions" :key="status" :value="status">{{ status }}</option>
            </select>
          </label>
          <label class="field">
            <span>Descrizione</span>
            <textarea v-model="campaignForm.description" rows="4" />
          </label>
          <p v-if="campaignError" class="status-message text-danger">{{ campaignError }}</p>
          <p v-if="campaignResult" class="status-message text-success">
            {{ campaignResult.message }}
            <RouterLink v-if="campaignResult.to && campaignResult.linkLabel" :to="campaignResult.to">
              {{ campaignResult.linkLabel }}
            </RouterLink>
          </p>
          <button class="btn btn-primary" type="submit" :disabled="campaignLoading">
            {{ campaignLoading ? 'Creazione...' : 'Crea campagna' }}
          </button>
        </form>
      </section>

      <section v-else-if="activeTab === 'session'" class="stack">
        <header class="stack quick-create-header">
          <h3 class="card-title">Crea sessione</h3>
          <p class="card-subtitle">Aggiungi una sessione a una campagna esistente.</p>
        </header>
        <p v-if="!campaigns.length" class="muted">Crea prima una campagna per poter aggiungere sessioni.</p>
        <form v-else class="stack" @submit.prevent="handleSessionCreate">
          <label class="field">
            <span>Campagna</span>
            <select v-model="sessionForm.campaignId" required>
              <option v-for="campaign in campaigns" :key="campaign.id" :value="campaign.id">{{ campaign.name }}</option>
            </select>
          </label>
          <label class="field">
            <span>Titolo sessione</span>
            <input v-model="sessionForm.title" type="text" required />
          </label>
          <label class="field">
            <span>Numero sessione</span>
            <input v-model.number="sessionForm.sessionNumber" type="number" min="1" required />
          </label>
          <label class="field">
            <span>Data</span>
            <input v-model="sessionForm.sessionDate" type="date" />
          </label>
          <label class="field">
            <span>Descrizione</span>
            <textarea v-model="sessionForm.notes" rows="5" />
          </label>
          <p v-if="sessionError" class="status-message text-danger">{{ sessionError }}</p>
          <p v-if="sessionResult" class="status-message text-success">
            {{ sessionResult.message }}
            <RouterLink v-if="sessionResult.to && sessionResult.linkLabel" :to="sessionResult.to">
              {{ sessionResult.linkLabel }}
            </RouterLink>
          </p>
          <button class="btn btn-primary" type="submit" :disabled="sessionLoading">
            {{ sessionLoading ? 'Creazione...' : 'Crea sessione' }}
          </button>
        </form>
      </section>

      <section v-else-if="activeTab === 'world'" class="stack">
        <header class="stack quick-create-header">
          <h3 class="card-title">Crea mondo</h3>
          <p class="card-subtitle">Registra un mondo base senza uscire dalla shell mobile.</p>
        </header>
        <form class="stack" @submit.prevent="handleWorldCreate">
          <label class="field">
            <span>Nome mondo</span>
            <input v-model="worldForm.name" type="text" required />
          </label>
          <label class="field">
            <span>Descrizione</span>
            <textarea v-model="worldForm.description" rows="4" />
          </label>
          <label class="field checkbox checkbox-inline">
            <input v-model="worldForm.isPublic" type="checkbox" />
            <span>Rendi pubblico il mondo</span>
          </label>
          <p v-if="worldError" class="status-message text-danger">{{ worldError }}</p>
          <p v-if="worldResult" class="status-message text-success">
            {{ worldResult.message }}
            <RouterLink v-if="worldResult.to && worldResult.linkLabel" :to="worldResult.to">
              {{ worldResult.linkLabel }}
            </RouterLink>
          </p>
          <button class="btn btn-primary" type="submit" :disabled="worldLoading">
            {{ worldLoading ? 'Creazione...' : 'Crea mondo' }}
          </button>
        </form>
      </section>

      <section v-else-if="activeTab === 'npc'" class="stack">
        <header class="stack quick-create-header">
          <h3 class="card-title">Crea NPC</h3>
          <p class="card-subtitle">Nome, razza e ruolo essenziali per partire subito.</p>
        </header>
        <p v-if="!worlds.length" class="muted">Serve almeno un mondo prima di creare un NPC.</p>
        <form v-else class="stack" @submit.prevent="handleNpcCreate">
          <label class="field">
            <span>Mondo</span>
            <select v-model="npcForm.worldId" required>
              <option v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</option>
            </select>
          </label>
          <label class="field">
            <span>Nome NPC</span>
            <input v-model="npcForm.name" type="text" required />
          </label>
          <label class="field">
            <span>Razza</span>
            <input v-model="npcForm.race" type="text" />
          </label>
          <label class="field">
            <span>Ruolo o classe</span>
            <input v-model="npcForm.roleOrClass" type="text" />
          </label>
          <label class="field checkbox checkbox-inline">
            <input v-model="npcForm.isVisibleToPlayers" type="checkbox" />
            <span>Visibile ai player</span>
          </label>
          <p v-if="npcError" class="status-message text-danger">{{ npcError }}</p>
          <p v-if="npcResult" class="status-message text-success">
            {{ npcResult.message }}
            <RouterLink v-if="npcResult.to && npcResult.linkLabel" :to="npcResult.to">
              {{ npcResult.linkLabel }}
            </RouterLink>
          </p>
          <button class="btn btn-primary" type="submit" :disabled="npcLoading">
            {{ npcLoading ? 'Creazione...' : 'Crea NPC' }}
          </button>
        </form>
      </section>

      <section v-else-if="activeTab === 'item'" class="stack">
        <header class="stack quick-create-header">
          <h3 class="card-title">Crea oggetto</h3>
          <p class="card-subtitle">Oggetto rapido con tipologia e rarità opzionali.</p>
        </header>
        <p v-if="!worlds.length" class="muted">Serve almeno un mondo prima di creare un oggetto.</p>
        <form v-else class="stack" @submit.prevent="handleItemCreate">
          <label class="field">
            <span>Mondo</span>
            <select v-model="itemForm.worldId" required>
              <option v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</option>
            </select>
          </label>
          <label class="field">
            <span>Nome oggetto</span>
            <input v-model="itemForm.name" type="text" required />
          </label>
          <label class="field">
            <span>Tipologia</span>
            <input v-model="itemForm.type" type="text" />
          </label>
          <label class="field">
            <span>Rarità</span>
            <input v-model="itemForm.rarity" type="text" />
          </label>
          <label class="field checkbox checkbox-inline">
            <input v-model="itemForm.isVisibleToPlayers" type="checkbox" />
            <span>Visibile ai player</span>
          </label>
          <p v-if="itemError" class="status-message text-danger">{{ itemError }}</p>
          <p v-if="itemResult" class="status-message text-success">
            {{ itemResult.message }}
            <RouterLink v-if="itemResult.to && itemResult.linkLabel" :to="itemResult.to">
              {{ itemResult.linkLabel }}
            </RouterLink>
          </p>
          <button class="btn btn-primary" type="submit" :disabled="itemLoading">
            {{ itemLoading ? 'Creazione...' : 'Crea oggetto' }}
          </button>
        </form>
      </section>

      <section v-else-if="activeTab === 'location'" class="stack">
        <header class="stack quick-create-header">
          <h3 class="card-title">Crea location</h3>
          <p class="card-subtitle">Location rapida con tipo e descrizione breve.</p>
        </header>
        <p v-if="!worlds.length" class="muted">Serve almeno un mondo prima di creare una location.</p>
        <form v-else class="stack" @submit.prevent="handleLocationCreate">
          <label class="field">
            <span>Mondo</span>
            <select v-model="locationForm.worldId" required>
              <option v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</option>
            </select>
          </label>
          <label class="field">
            <span>Nome location</span>
            <input v-model="locationForm.name" type="text" required />
          </label>
          <label class="field">
            <span>Tipo</span>
            <input v-model="locationForm.type" type="text" />
          </label>
          <label class="field">
            <span>Descrizione</span>
            <textarea v-model="locationForm.description" rows="4" />
          </label>
          <label class="field checkbox checkbox-inline">
            <input v-model="locationForm.isVisibleToPlayers" type="checkbox" />
            <span>Visibile ai player</span>
          </label>
          <p v-if="locationError" class="status-message text-danger">{{ locationError }}</p>
          <p v-if="locationResult" class="status-message text-success">
            {{ locationResult.message }}
            <RouterLink v-if="locationResult.to && locationResult.linkLabel" :to="locationResult.to">
              {{ locationResult.linkLabel }}
            </RouterLink>
          </p>
          <button class="btn btn-primary" type="submit" :disabled="locationLoading">
            {{ locationLoading ? 'Creazione...' : 'Crea location' }}
          </button>
        </form>
      </section>

      <section v-else-if="activeTab === 'character'" class="stack">
        <header class="stack quick-create-header">
          <h3 class="card-title">Crea personaggio</h3>
          <p class="card-subtitle">I player possono creare rapidamente solo nuovi personaggi.</p>
        </header>
        <form class="stack" @submit.prevent="handleCharacterCreate">
          <label class="field">
            <span>Nome *</span>
            <input v-model="characterForm.name" type="text" required />
          </label>
          <label class="field">
            <span>Razza *</span>
            <input v-model="characterForm.race" type="text" required />
          </label>
          <label class="field">
            <span>Classe *</span>
            <input v-model="characterForm.characterClass" type="text" required />
          </label>
          <label class="field">
            <span>Livello *</span>
            <input v-model.number="characterForm.level" type="number" min="1" required />
          </label>
          <label class="field">
            <span>CA *</span>
            <input v-model.number="characterForm.armorClass" type="number" min="1" required />
          </label>
          <label class="field">
            <span>PF massimi *</span>
            <input v-model.number="characterForm.maxHitPoints" type="number" min="1" required />
          </label>
          <label class="field">
            <span>PF attuali *</span>
            <input v-model.number="characterForm.currentHitPoints" type="number" min="0" required />
          </label>
          <p v-if="characterError" class="status-message text-danger">{{ characterError }}</p>
          <p v-if="characterResult" class="status-message text-success">
            {{ characterResult.message }}
            <RouterLink v-if="characterResult.to && characterResult.linkLabel" :to="characterResult.to">
              {{ characterResult.linkLabel }}
            </RouterLink>
          </p>
          <button class="btn btn-primary" type="submit" :disabled="characterLoading">
            {{ characterLoading ? 'Creazione...' : 'Crea personaggio' }}
          </button>
        </form>
      </section>
    </template>

    <article v-else class="card stack">
      <h3 class="card-title">Creazione non disponibile</h3>
      <p class="card-subtitle">Gli account Viewer possono solo consultare.</p>
    </article>
  </section>
</template>

<style scoped>
.quick-create-header {
  gap: 0.25rem;
}

.quick-create-launcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  width: 100%;
}

.quick-create-launcher__item {
  min-width: 0;
  min-height: 4.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-surface-outline);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, transparent);
  color: var(--app-text-muted);
  padding: 0.85rem 0.7rem;
  font-weight: 700;
  text-align: center;
}

.quick-create-launcher__item.active {
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-accent-strong) 14%, transparent);
  border-color: color-mix(in srgb, var(--app-accent-strong) 34%, transparent);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--app-shadow) 40%, transparent);
}

.quick-create-launcher__label {
  line-height: 1.15;
  word-break: break-word;
}

@media (min-width: 520px) {
  .quick-create-launcher {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
