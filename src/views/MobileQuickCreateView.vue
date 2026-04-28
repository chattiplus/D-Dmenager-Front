<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createCampaign, getMyCampaigns } from '../api/campaignsApi';
import { createItem } from '../api/itemsApi';
import { createLocation } from '../api/locationsApi';
import { createNpc } from '../api/npcsApi';
import { createSession } from '../api/sessionsApi';
import { createWorld, getMyWorlds } from '../api/worldsApi';
import { useAuthStore } from '../store/authStore';
import type {
  CampaignResponse,
  CampaignStatus,
  CreateCampaignRequest,
  CreateItemRequest,
  CreateLocationRequest,
  CreateNpcRequest,
  CreateSessionRequest,
  CreateWorldRequest,
  WorldResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

type QuickAction = 'campaign' | 'session' | 'world' | 'npc' | 'item' | 'location';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const worlds = ref<WorldResponse[]>([]);
const campaigns = ref<CampaignResponse[]>([]);

const ACTIONS: Array<{ key: QuickAction; label: string; description: string }> = [
  { key: 'campaign', label: 'Crea campagna', description: 'Nuova campagna su un mondo esistente.' },
  { key: 'session', label: 'Crea sessione', description: 'Nuova sessione su una campagna esistente.' },
  { key: 'world', label: 'Crea mondo', description: 'Nuovo mondo con dati essenziali.' },
  { key: 'npc', label: 'Crea NPC', description: 'NPC rapido collegato a un mondo.' },
  { key: 'item', label: 'Crea oggetto', description: 'Oggetto rapido collegato a un mondo.' },
  { key: 'location', label: 'Crea location', description: 'Location rapida collegata a un mondo.' },
];

const normalizeAction = (value: unknown): QuickAction => {
  if (typeof value === 'string' && ACTIONS.some((action) => action.key === value)) {
    return value as QuickAction;
  }

  return 'campaign';
};

const activeAction = ref<QuickAction>(normalizeAction(route.query.action));
const creating = ref(false);

const campaignForm = reactive<CreateCampaignRequest>({
  worldId: 0,
  name: '',
  description: '',
  status: 'ACTIVE',
});

const sessionCampaignId = ref<number>(0);
const sessionForm = reactive<CreateSessionRequest>({
  title: '',
  sessionNumber: 1,
  sessionDate: '',
  notes: '',
});

const worldForm = reactive<CreateWorldRequest>({
  name: '',
  description: '',
  isPublic: false,
});

const npcForm = reactive<CreateNpcRequest>({
  worldId: 0,
  name: '',
  race: '',
  roleOrClass: '',
  description: '',
  isVisibleToPlayers: true,
});

const itemForm = reactive<CreateItemRequest>({
  worldId: 0,
  name: '',
  type: '',
  rarity: '',
  description: '',
  isVisibleToPlayers: true,
});

const locationForm = reactive<CreateLocationRequest>({
  worldId: 0,
  name: '',
  type: '',
  description: '',
  isVisibleToPlayers: true,
});

const statusOptions: CampaignStatus[] = ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED'];

const canCreate = computed(() => authStore.canManageContent);
const requiresWorld = computed(() =>
  activeAction.value === 'campaign' ||
  activeAction.value === 'npc' ||
  activeAction.value === 'item' ||
  activeAction.value === 'location',
);
const requiresCampaign = computed(() => activeAction.value === 'session');
const canSubmitCurrentAction = computed(() => {
  if (activeAction.value === 'world') {
    return true;
  }
  if (requiresWorld.value) {
    return worlds.value.length > 0;
  }
  if (requiresCampaign.value) {
    return campaigns.value.length > 0;
  }
  return true;
});

const setDefaultSelections = () => {
  const firstWorldId = worlds.value[0]?.id ?? 0;
  const firstCampaignId = campaigns.value[0]?.id ?? 0;

  if (!campaignForm.worldId) {
    campaignForm.worldId = firstWorldId;
  }
  if (!npcForm.worldId) {
    npcForm.worldId = firstWorldId;
  }
  if (!itemForm.worldId) {
    itemForm.worldId = firstWorldId;
  }
  if (!locationForm.worldId) {
    locationForm.worldId = firstWorldId;
  }
  if (!sessionCampaignId.value) {
    sessionCampaignId.value = firstCampaignId;
  }
};

const clearFeedback = () => {
  errorMessage.value = '';
  successMessage.value = '';
};

const loadData = async () => {
  if (!canCreate.value) {
    return;
  }

  loading.value = true;
  clearFeedback();

  try {
    const [worldsData, campaignsData] = await Promise.all([getMyWorlds(), getMyCampaigns()]);
    worlds.value = worldsData;
    campaigns.value = campaignsData;
    setDefaultSelections();
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(
      error,
      'Impossibile caricare i dati necessari per la creazione rapida.',
    );
  } finally {
    loading.value = false;
  }
};

const resetActionForm = (action: QuickAction) => {
  clearFeedback();

  if (action === 'campaign') {
    campaignForm.name = '';
    campaignForm.description = '';
    campaignForm.status = 'ACTIVE';
  }
  if (action === 'session') {
    sessionForm.title = '';
    sessionForm.sessionNumber = 1;
    sessionForm.sessionDate = '';
    sessionForm.notes = '';
  }
  if (action === 'world') {
    worldForm.name = '';
    worldForm.description = '';
    worldForm.isPublic = false;
  }
  if (action === 'npc') {
    npcForm.name = '';
    npcForm.race = '';
    npcForm.roleOrClass = '';
    npcForm.description = '';
    npcForm.isVisibleToPlayers = true;
  }
  if (action === 'item') {
    itemForm.name = '';
    itemForm.type = '';
    itemForm.rarity = '';
    itemForm.description = '';
    itemForm.isVisibleToPlayers = true;
  }
  if (action === 'location') {
    locationForm.name = '';
    locationForm.type = '';
    locationForm.description = '';
    locationForm.isVisibleToPlayers = true;
  }
};

const selectAction = async (action: QuickAction) => {
  activeAction.value = action;
  resetActionForm(action);
  await router.replace({ query: { ...route.query, action } });
};

const submitCampaign = async () => {
  const payload: CreateCampaignRequest = {
    worldId: campaignForm.worldId,
    name: campaignForm.name.trim(),
    description: campaignForm.description?.trim() || undefined,
    status: campaignForm.status,
  };
  const created = await createCampaign(payload);
  successMessage.value = `Campagna "${created.name}" creata.`;
  campaigns.value = [...campaigns.value, created];
  resetActionForm('campaign');
  setDefaultSelections();
};

const submitSession = async () => {
  const payload: CreateSessionRequest = {
    title: sessionForm.title.trim(),
    sessionNumber: sessionForm.sessionNumber,
    sessionDate: sessionForm.sessionDate || undefined,
    notes: sessionForm.notes?.trim() || undefined,
  };
  const created = await createSession(sessionCampaignId.value, payload);
  successMessage.value = `Sessione "${created.title}" creata.`;
  resetActionForm('session');
};

const submitWorld = async () => {
  const payload: CreateWorldRequest = {
    name: worldForm.name.trim(),
    description: worldForm.description?.trim() || undefined,
    isPublic: worldForm.isPublic,
  };
  const created = await createWorld(payload);
  successMessage.value = `Mondo "${created.name}" creato.`;
  worlds.value = [...worlds.value, created];
  resetActionForm('world');
  setDefaultSelections();
};

const submitNpc = async () => {
  const payload: CreateNpcRequest = {
    worldId: npcForm.worldId,
    name: npcForm.name.trim(),
    race: npcForm.race?.trim() || undefined,
    roleOrClass: npcForm.roleOrClass?.trim() || undefined,
    description: npcForm.description?.trim() || undefined,
    isVisibleToPlayers: npcForm.isVisibleToPlayers,
  };
  const created = await createNpc(payload);
  successMessage.value = `NPC "${created.name}" creato.`;
  resetActionForm('npc');
};

const submitItem = async () => {
  const payload: CreateItemRequest = {
    worldId: itemForm.worldId,
    name: itemForm.name.trim(),
    type: itemForm.type?.trim() || undefined,
    rarity: itemForm.rarity?.trim() || undefined,
    description: itemForm.description?.trim() || undefined,
    isVisibleToPlayers: itemForm.isVisibleToPlayers,
  };
  const created = await createItem(payload);
  successMessage.value = `Oggetto "${created.name}" creato.`;
  resetActionForm('item');
};

const submitLocation = async () => {
  const payload: CreateLocationRequest = {
    worldId: locationForm.worldId,
    name: locationForm.name.trim(),
    type: locationForm.type?.trim() || undefined,
    description: locationForm.description?.trim() || undefined,
    isVisibleToPlayers: locationForm.isVisibleToPlayers,
  };
  const created = await createLocation(payload);
  successMessage.value = `Location "${created.name}" creata.`;
  resetActionForm('location');
};

const submitActiveAction = async () => {
  if (!canCreate.value) {
    return;
  }

  creating.value = true;
  clearFeedback();

  try {
    if (activeAction.value === 'campaign') {
      await submitCampaign();
    }
    if (activeAction.value === 'session') {
      await submitSession();
    }
    if (activeAction.value === 'world') {
      await submitWorld();
    }
    if (activeAction.value === 'npc') {
      await submitNpc();
    }
    if (activeAction.value === 'item') {
      await submitItem();
    }
    if (activeAction.value === 'location') {
      await submitLocation();
    }
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Creazione rapida non riuscita.');
  } finally {
    creating.value = false;
  }
};

watch(
  () => route.query.action,
  (action) => {
    activeAction.value = normalizeAction(action);
  },
  { immediate: true },
);

watch([worlds, campaigns], () => {
  setDefaultSelections();
});

onMounted(() => {
  loadData();
});
</script>

<template>
  <section class="stack mobile-create">
    <article class="card mobile-create__hero">
      <p class="mobile-create__eyebrow">Crea Rapida</p>
      <h2 class="card-title">Azioni rapide</h2>
      <p class="card-subtitle">
        Form diretti per creare contenuti senza passare dagli archivi completi.
      </p>
    </article>

    <template v-if="!canCreate">
      <article class="card mobile-create__empty">
        <h3 class="card-title">Azioni non disponibili</h3>
        <p class="card-subtitle">
          Questo account non ha permessi di creazione rapida nel flusso mobile.
        </p>
      </article>
    </template>

    <template v-else>
      <article class="card mobile-create__selector">
        <header class="mobile-create__header">
          <h3 class="card-title">Scegli azione</h3>
        </header>
        <div class="mobile-create__actions">
          <button
            v-for="action in ACTIONS"
            :key="action.key"
            type="button"
            class="mobile-create__action"
            :class="{ active: activeAction === action.key }"
            @click="selectAction(action.key)"
          >
            <strong>{{ action.label }}</strong>
            <span>{{ action.description }}</span>
          </button>
        </div>
      </article>

      <p v-if="loading" class="muted">Caricamento dati di creazione...</p>
      <p v-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>
      <p v-if="successMessage" class="status-message text-success">{{ successMessage }}</p>

      <article class="card mobile-create__form-card">
        <header class="mobile-create__header">
          <h3 class="card-title">
            {{ ACTIONS.find((action) => action.key === activeAction)?.label }}
          </h3>
        </header>

        <p v-if="requiresWorld && !worlds.length" class="muted">
          Nessun mondo disponibile. Crea prima un mondo con il form dedicato.
        </p>
        <p v-else-if="requiresCampaign && !campaigns.length" class="muted">
          Nessuna campagna disponibile. Crea prima una campagna dal form dedicato.
        </p>

        <form class="stack" @submit.prevent="submitActiveAction">
          <template v-if="activeAction === 'campaign'">
            <label class="field">
              <span>Mondo</span>
              <select v-model.number="campaignForm.worldId" required>
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
                <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="campaignForm.description" rows="3" />
            </label>
          </template>

          <template v-else-if="activeAction === 'session'">
            <label class="field">
              <span>Campagna</span>
              <select v-model.number="sessionCampaignId" required>
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
              <span>Note</span>
              <textarea v-model="sessionForm.notes" rows="3" />
            </label>
          </template>

          <template v-else-if="activeAction === 'world'">
            <label class="field">
              <span>Nome mondo</span>
              <input v-model="worldForm.name" type="text" required />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="worldForm.description" rows="3" />
            </label>
            <label class="field checkbox">
              <input v-model="worldForm.isPublic" type="checkbox" />
              <span>Visibile pubblicamente</span>
            </label>
          </template>

          <template v-else-if="activeAction === 'npc'">
            <label class="field">
              <span>Mondo</span>
              <select v-model.number="npcForm.worldId" required>
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
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="npcForm.description" rows="3" />
            </label>
          </template>

          <template v-else-if="activeAction === 'item'">
            <label class="field">
              <span>Mondo</span>
              <select v-model.number="itemForm.worldId" required>
                <option v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</option>
              </select>
            </label>
            <label class="field">
              <span>Nome oggetto</span>
              <input v-model="itemForm.name" type="text" required />
            </label>
            <label class="field">
              <span>Tipo</span>
              <input v-model="itemForm.type" type="text" />
            </label>
            <label class="field">
              <span>Rarita</span>
              <input v-model="itemForm.rarity" type="text" />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea v-model="itemForm.description" rows="3" />
            </label>
          </template>

          <template v-else-if="activeAction === 'location'">
            <label class="field">
              <span>Mondo</span>
              <select v-model.number="locationForm.worldId" required>
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
              <textarea v-model="locationForm.description" rows="3" />
            </label>
          </template>

          <button class="btn btn-primary" type="submit" :disabled="creating || loading || !canSubmitCurrentAction">
            {{ creating ? 'Creazione...' : 'Conferma creazione' }}
          </button>
        </form>
      </article>
    </template>
  </section>
</template>

<style scoped>
.mobile-create__hero,
.mobile-create__selector,
.mobile-create__form-card,
.mobile-create__empty {
  gap: 0.75rem;
}

.mobile-create__eyebrow {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mobile-create__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.mobile-create__actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.mobile-create__action {
  text-align: left;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.9rem;
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mobile-create__action.active {
  border-color: rgba(249, 168, 38, 0.45);
  background: rgba(249, 168, 38, 0.08);
}

.mobile-create__action span {
  color: var(--color-muted);
  font-size: 0.85rem;
}

textarea {
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.85rem 1rem;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.02);
  color: var(--color-text);
}

.checkbox {
  flex-direction: row;
  align-items: center;
}

.checkbox input {
  width: 1.1rem;
  height: 1.1rem;
}
</style>
