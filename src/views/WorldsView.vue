<!-- src/views/WorldsView.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import {
  createWorld,
  deleteWorld,
  getWorlds,
  updateWorld,
} from '../api/worldsApi';
import {
  createCampaign,
  deleteCampaign,
  getCampaigns,
  updateCampaign,
} from '../api/campaignsApi';
import type {
  CampaignResponse,
  CampaignStatus,
  WorldResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

type ManagerSection = 'worlds' | 'campaigns';

const authStore = useAuthStore();

const currentSection = ref<ManagerSection>('worlds');

const worlds = ref<WorldResponse[]>([]);
const worldsLoading = ref(false);
const worldsError = ref('');

const campaigns = ref<CampaignResponse[]>([]);
const campaignsLoading = ref(false);
const campaignsError = ref('');

const refreshing = ref(false);

const quickWorldForm = reactive({
  name: '',
  description: '',
});
const quickWorldError = ref('');
const quickWorldLoading = ref(false);

const editingWorldId = ref<number | null>(null);
const editingWorldForm = reactive({
  name: '',
  description: '',
});
const editingWorldError = ref('');
const editingWorldLoading = ref(false);

const selectedWorldFilter = ref<number | 'all'>('all');

const quickCampaignForm = reactive({
  worldId: 0,
  name: '',
  description: '',
  status: 'PLANNED' as CampaignStatus,
});
const quickCampaignError = ref('');
const quickCampaignLoading = ref(false);

const editingCampaignId = ref<number | null>(null);
const editingCampaignForm = reactive({
  worldId: 0,
  name: '',
  description: '',
  status: 'PLANNED' as CampaignStatus,
});
const editingCampaignError = ref('');
const editingCampaignLoading = ref(false);

const campaignStatuses: CampaignStatus[] = ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED'];

const totalWorlds = computed(() => worlds.value.length);
const totalCampaigns = computed(() => campaigns.value.length);

const filteredCampaigns = computed(() => {
  if (selectedWorldFilter.value === 'all') {
    return campaigns.value;
  }
  return campaigns.value.filter((campaign) => campaign.worldId === selectedWorldFilter.value);
});

const ensureCampaignWorldSelection = () => {
  if (!worlds.value.length) {
    quickCampaignForm.worldId = 0;
    if (editingCampaignId.value) {
      editingCampaignForm.worldId = 0;
    }
    return;
  }
  if (!worlds.value.some((world) => world.id === quickCampaignForm.worldId)) {
    quickCampaignForm.worldId = worlds.value[0].id;
  }
  if (
    editingCampaignId.value &&
    !worlds.value.some((world) => world.id === editingCampaignForm.worldId)
  ) {
    editingCampaignForm.worldId = worlds.value[0].id;
  }
};

const ensureFilterWorld = () => {
  if (selectedWorldFilter.value === 'all') {
    return;
  }
  if (!worlds.value.some((world) => world.id === selectedWorldFilter.value)) {
    selectedWorldFilter.value = 'all';
  }
};

const loadWorlds = async () => {
  worldsLoading.value = true;
  worldsError.value = '';
  try {
    worlds.value = await getWorlds();
    ensureCampaignWorldSelection();
    ensureFilterWorld();
  } catch (error) {
    worldsError.value = extractApiErrorMessage(error, 'Impossibile caricare i mondi.');
    worlds.value = [];
  } finally {
    worldsLoading.value = false;
  }
};

const loadCampaigns = async () => {
  campaignsLoading.value = true;
  campaignsError.value = '';
  try {
    campaigns.value = await getCampaigns();
  } catch (error) {
    campaignsError.value = extractApiErrorMessage(error, 'Impossibile caricare le campagne.');
    campaigns.value = [];
  } finally {
    campaignsLoading.value = false;
  }
};

const refreshAll = async () => {
  if (!authStore.isAuthenticated) {
    return;
  }
  refreshing.value = true;
  await Promise.all([loadWorlds(), loadCampaigns()]);
  refreshing.value = false;
};

const resetQuickWorldForm = () => {
  quickWorldForm.name = '';
  quickWorldForm.description = '';
};

const handleCreateWorld = async () => {
  quickWorldError.value = '';
  const trimmedName = quickWorldForm.name.trim();
  if (!trimmedName) {
    quickWorldError.value = 'Il nome del mondo è obbligatorio.';
    return;
  }
  quickWorldLoading.value = true;
  try {
    await createWorld({
      name: trimmedName,
      description: quickWorldForm.description.trim() || undefined,
    });
    resetQuickWorldForm();
    await loadWorlds();
  } catch (error) {
    quickWorldError.value = extractApiErrorMessage(error, 'Creazione mondo non riuscita.');
  } finally {
    quickWorldLoading.value = false;
  }
};

const startWorldEdit = (world: WorldResponse) => {
  editingWorldId.value = world.id;
  editingWorldForm.name = world.name;
  editingWorldForm.description = world.description ?? '';
  editingWorldError.value = '';
};

const cancelWorldEdit = () => {
  editingWorldId.value = null;
  editingWorldForm.name = '';
  editingWorldForm.description = '';
  editingWorldError.value = '';
};

const saveWorldEdit = async (worldId: number) => {
  const trimmedName = editingWorldForm.name.trim();
  if (!trimmedName) {
    editingWorldError.value = 'Il nome del mondo è obbligatorio.';
    return;
  }
  editingWorldLoading.value = true;
  editingWorldError.value = '';
  try {
    await updateWorld(worldId, {
      name: trimmedName,
      description: editingWorldForm.description.trim() || undefined,
    });
    await loadWorlds();
    cancelWorldEdit();
  } catch (error) {
    editingWorldError.value = extractApiErrorMessage(error, 'Aggiornamento non riuscito.');
  } finally {
    editingWorldLoading.value = false;
  }
};

const removeWorld = async (worldId: number) => {
  worldsError.value = '';
  try {
    await deleteWorld(worldId);
    if (editingWorldId.value === worldId) {
      cancelWorldEdit();
    }
    await refreshAll();
  } catch (error) {
    worldsError.value = extractApiErrorMessage(error, 'Impossibile eliminare il mondo.');
  }
};

const resetQuickCampaignForm = () => {
  quickCampaignForm.name = '';
  quickCampaignForm.description = '';
  quickCampaignForm.status = 'PLANNED';
  ensureCampaignWorldSelection();
};

const handleCreateCampaign = async () => {
  quickCampaignError.value = '';
  if (!quickCampaignForm.worldId) {
    quickCampaignError.value = 'Seleziona un mondo valido.';
    return;
  }
  const trimmedName = quickCampaignForm.name.trim();
  if (!trimmedName) {
    quickCampaignError.value = 'Il nome della campagna è obbligatorio.';
    return;
  }
  quickCampaignLoading.value = true;
  try {
    await createCampaign({
      worldId: quickCampaignForm.worldId,
      name: trimmedName,
      description: quickCampaignForm.description.trim() || undefined,
      status: quickCampaignForm.status,
    });
    resetQuickCampaignForm();
    await loadCampaigns();
  } catch (error) {
    quickCampaignError.value = extractApiErrorMessage(error, 'Creazione campagna non riuscita.');
  } finally {
    quickCampaignLoading.value = false;
  }
};

const startCampaignEdit = (campaign: CampaignResponse) => {
  editingCampaignId.value = campaign.id;
  editingCampaignForm.worldId = campaign.worldId;
  editingCampaignForm.name = campaign.name;
  editingCampaignForm.description = campaign.description ?? '';
  editingCampaignForm.status = campaign.status ?? 'PLANNED';
  editingCampaignError.value = '';
};

const cancelCampaignEdit = () => {
  editingCampaignId.value = null;
  editingCampaignForm.worldId = 0;
  editingCampaignForm.name = '';
  editingCampaignForm.description = '';
  editingCampaignForm.status = 'PLANNED';
  editingCampaignError.value = '';
};

const saveCampaignEdit = async (campaignId: number) => {
  if (!editingCampaignForm.worldId) {
    editingCampaignError.value = 'Seleziona un mondo valido.';
    return;
  }
  const trimmedName = editingCampaignForm.name.trim();
  if (!trimmedName) {
    editingCampaignError.value = 'Il nome della campagna è obbligatorio.';
    return;
  }
  editingCampaignLoading.value = true;
  editingCampaignError.value = '';
  try {
    await updateCampaign(campaignId, {
      worldId: editingCampaignForm.worldId,
      name: trimmedName,
      description: editingCampaignForm.description.trim() || undefined,
      status: editingCampaignForm.status,
    });
    await loadCampaigns();
    cancelCampaignEdit();
  } catch (error) {
    editingCampaignError.value = extractApiErrorMessage(error, 'Aggiornamento non riuscito.');
  } finally {
    editingCampaignLoading.value = false;
  }
};

const removeCampaign = async (campaignId: number) => {
  campaignsError.value = '';
  try {
    await deleteCampaign(campaignId);
    if (editingCampaignId.value === campaignId) {
      cancelCampaignEdit();
    }
    await loadCampaigns();
  } catch (error) {
    campaignsError.value = extractApiErrorMessage(error, 'Impossibile eliminare la campagna.');
  }
};

watch(
  () => authStore.isAuthenticated,
  (loggedIn) => {
    if (loggedIn) {
      refreshAll();
    } else {
      worlds.value = [];
      campaigns.value = [];
      worldsError.value = '';
      campaignsError.value = '';
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header class="section-header">
        <div>
          <h1 class="section-title">Mondi e Campagne</h1>
          <p class="section-subtitle">
            Gestisci ambientazioni e storyline direttamente da questa tab dedicata ai Dungeon Master.
          </p>
        </div>
        <button class="btn btn-secondary" :disabled="refreshing" @click="refreshAll">
          {{ refreshing ? 'Aggiornamento...' : 'Aggiorna dati' }}
        </button>
      </header>

      <div class="mini-tabs">
        <button
          class="mini-tab"
          :class="{ active: currentSection === 'worlds' }"
          type="button"
          @click="currentSection = 'worlds'"
        >
          Mondi ({{ totalWorlds }})
        </button>
        <button
          class="mini-tab"
          :class="{ active: currentSection === 'campaigns' }"
          type="button"
          @click="currentSection = 'campaigns'"
        >
          Campagne ({{ totalCampaigns }})
        </button>
      </div>

      <section v-if="currentSection === 'worlds'" class="manager-sections">
        <article class="manager-card">
          <header class="manager-card__header">
            <div>
              <p class="manager-card__kicker">Panoramica</p>
              <h2>Mondi registrati</h2>
              <p class="manager-card__subtitle">
                Elenco completo delle ambientazioni visibili con strumenti rapidi per aggiornarle.
              </p>
            </div>
          </header>

          <p v-if="worldsError" class="status-message text-danger">{{ worldsError }}</p>
          <div v-if="worldsLoading" class="muted">Caricamento mondi...</div>

          <ul v-else-if="worlds.length" class="manager-list">
            <li v-for="world in worlds" :key="world.id" class="manager-item-card">
              <header class="manager-item-card__header">
                <div>
                  <p class="card-title">{{ world.name }}</p>
                  <p class="manager-meta">
                    {{ world.description || 'Nessuna descrizione disponibile.' }}
                  </p>
                </div>
                <RouterLink class="btn btn-link" :to="`/worlds/${world.id}`">
                  Vai al dettaglio
                </RouterLink>
              </header>
              <dl class="world-meta">
                <div>
                  <dt>Owner</dt>
                  <dd>{{ world.ownerNickname ?? 'N/D' }}</dd>
                </div>
                <div>
                  <dt>Campagne</dt>
                  <dd>{{ world.campaignCount }}</dd>
                </div>
                <div>
                  <dt>Visibilità</dt>
                  <dd>{{ world.isPublic ? 'Pubblico' : 'Privato' }}</dd>
                </div>
              </dl>
              <div class="actions">
                <button class="btn btn-secondary" type="button" @click="startWorldEdit(world)">
                  Modifica
                </button>
                <button class="btn btn-link text-danger" type="button" @click="removeWorld(world.id)">
                  Elimina
                </button>
              </div>

              <div v-if="editingWorldId === world.id" class="inline-edit">
                <form class="stack" @submit.prevent="saveWorldEdit(world.id)">
                  <label class="field">
                    <span>Nome</span>
                    <input v-model="editingWorldForm.name" type="text" required />
                  </label>
                  <label class="field">
                    <span>Descrizione</span>
                    <textarea v-model="editingWorldForm.description" rows="2" />
                  </label>
                  <div class="inline-edit__actions">
                    <button class="btn btn-primary" type="submit" :disabled="editingWorldLoading">
                      {{ editingWorldLoading ? 'Salvataggio...' : 'Salva modifiche' }}
                    </button>
                    <button class="btn btn-link" type="button" @click="cancelWorldEdit">
                      Annulla
                    </button>
                  </div>
                  <p v-if="editingWorldError" class="status-message text-danger">
                    {{ editingWorldError }}
                  </p>
                </form>
              </div>
            </li>
          </ul>
          <p v-else class="muted">Non hai ancora creato mondi.</p>
        </article>

        <article class="manager-card">
          <header class="manager-card__header">
            <div>
              <p class="manager-card__kicker">Creazione veloce</p>
              <h2>Nuovo mondo</h2>
              <p class="manager-card__subtitle">
                Aggiungi rapidamente una nuova ambientazione per pianificare campagne future.
              </p>
            </div>
          </header>

          <form class="stack" @submit.prevent="handleCreateWorld">
            <label class="field">
              <span>Nome</span>
              <input v-model="quickWorldForm.name" type="text" placeholder="Es. Faerûn" required />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea
                v-model="quickWorldForm.description"
                rows="3"
                placeholder="Note sintetiche sul mondo"
              />
            </label>
            <button class="btn btn-primary" type="submit" :disabled="quickWorldLoading">
              {{ quickWorldLoading ? 'Creazione...' : 'Registra mondo' }}
            </button>
            <p v-if="quickWorldError" class="status-message text-danger">{{ quickWorldError }}</p>
          </form>
        </article>
      </section>

      <section v-else class="manager-sections">
        <article class="manager-card">
          <header class="manager-card__header">
            <div>
              <p class="manager-card__kicker">Panoramica</p>
              <h2>Campagne attive</h2>
              <p class="manager-card__subtitle">
                Visualizza e gestisci tutte le campagne, filtrandole per mondo di riferimento.
              </p>
            </div>
            <label class="field compact-select">
              <span>Filtro mondo</span>
              <select v-model="selectedWorldFilter">
                <option value="all">Tutti</option>
                <option v-for="world in worlds" :key="world.id" :value="world.id">
                  {{ world.name }}
                </option>
              </select>
            </label>
          </header>

          <p v-if="campaignsError" class="status-message text-danger">{{ campaignsError }}</p>
          <div v-if="campaignsLoading" class="muted">Caricamento campagne...</div>

          <ul v-else-if="filteredCampaigns.length" class="manager-list">
            <li v-for="campaign in filteredCampaigns" :key="campaign.id" class="manager-item-card">
              <header class="manager-item-card__header">
                <div>
                  <p class="card-title">{{ campaign.name }}</p>
                  <p class="manager-meta">
                    {{ campaign.description || 'Nessuna descrizione.' }}
                  </p>
                </div>
                <RouterLink class="btn btn-link" :to="`/campaigns/${campaign.id}`">
                  Vai alla campagna
                </RouterLink>
              </header>
              <dl class="world-meta">
                <div>
                  <dt>Mondo</dt>
                  <dd>
                    {{
                      worlds.find((world) => world.id === campaign.worldId)?.name ||
                      `World #${campaign.worldId}`
                    }}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{{ campaign.status }}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{{ campaign.ownerNickname ?? 'N/D' }}</dd>
                </div>
              </dl>
              <div class="actions">
                <button class="btn btn-secondary" type="button" @click="startCampaignEdit(campaign)">
                  Modifica
                </button>
                <button
                  class="btn btn-link text-danger"
                  type="button"
                  @click="removeCampaign(campaign.id)"
                >
                  Elimina
                </button>
              </div>

              <div v-if="editingCampaignId === campaign.id" class="inline-edit">
                <form class="stack" @submit.prevent="saveCampaignEdit(campaign.id)">
                  <label class="field">
                    <span>Mondo</span>
                    <select v-model="editingCampaignForm.worldId" required>
                      <option value="0" disabled>Seleziona un mondo</option>
                      <option v-for="world in worlds" :key="world.id" :value="world.id">
                        {{ world.name }}
                      </option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Nome</span>
                    <input v-model="editingCampaignForm.name" type="text" required />
                  </label>
                  <label class="field">
                    <span>Descrizione</span>
                    <textarea v-model="editingCampaignForm.description" rows="2" />
                  </label>
                  <label class="field">
                    <span>Status</span>
                    <select v-model="editingCampaignForm.status">
                      <option v-for="status in campaignStatuses" :key="status" :value="status">
                        {{ status }}
                      </option>
                    </select>
                  </label>
                  <div class="inline-edit__actions">
                    <button class="btn btn-primary" type="submit" :disabled="editingCampaignLoading">
                      {{ editingCampaignLoading ? 'Salvataggio...' : 'Salva modifiche' }}
                    </button>
                    <button class="btn btn-link" type="button" @click="cancelCampaignEdit">
                      Annulla
                    </button>
                  </div>
                  <p v-if="editingCampaignError" class="status-message text-danger">
                    {{ editingCampaignError }}
                  </p>
                </form>
              </div>
            </li>
          </ul>
          <p v-else class="muted">Nessuna campagna disponibile per il filtro selezionato.</p>
        </article>

        <article class="manager-card">
          <header class="manager-card__header">
            <div>
              <p class="manager-card__kicker">Creazione veloce</p>
              <h2>Nuova campagna</h2>
              <p class="manager-card__subtitle">
                Crea una nuova storia selezionando mondo, stato e descrizione opzionale.
              </p>
            </div>
          </header>

          <form class="stack" @submit.prevent="handleCreateCampaign">
            <label class="field">
              <span>Mondo</span>
              <select v-model="quickCampaignForm.worldId" required>
                <option value="0" disabled>Seleziona un mondo</option>
                <option v-for="world in worlds" :key="world.id" :value="world.id">
                  {{ world.name }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>Nome</span>
              <input v-model="quickCampaignForm.name" type="text" placeholder="Titolo campagna" required />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea
                v-model="quickCampaignForm.description"
                rows="3"
                placeholder="Breve introduzione"
              />
            </label>
            <label class="field">
              <span>Status</span>
              <select v-model="quickCampaignForm.status">
                <option v-for="status in campaignStatuses" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </label>
            <button class="btn btn-primary" type="submit" :disabled="quickCampaignLoading || !worlds.length">
              {{ quickCampaignLoading ? 'Creazione...' : 'Registra campagna' }}
            </button>
            <p v-if="quickCampaignError" class="status-message text-danger">
              {{ quickCampaignError }}
            </p>
            <p v-if="!worlds.length" class="muted">
              Crea prima un mondo per poter avviare una campagna.
            </p>
          </form>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped>
.mini-tabs {
  display: inline-flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 999px;
  padding: 0.25rem;
  align-self: flex-start;
}

.mini-tab {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mini-tab.active {
  background: var(--color-primary);
  color: #0f0f17;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
}

.manager-sections {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.manager-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.2);
}

.manager-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.manager-card__kicker {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.7rem;
  color: var(--color-accent-strong, #fca311);
  margin-bottom: 0.2rem;
}

.manager-card__header h2 {
  margin: 0;
}

.manager-card__subtitle {
  margin: 0.3rem 0 0;
  color: rgba(255, 255, 255, 0.6);
}

.manager-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.manager-item-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.manager-item-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.manager-meta {
  margin: 0.3rem 0 0;
  color: rgba(255, 255, 255, 0.65);
}

.world-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin: 0.5rem 0;
}

.world-meta dt {
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.5);
}

.world-meta dd {
  margin: 0;
  font-weight: 600;
}

.inline-edit {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 0.75rem;
}

.inline-edit__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.manager-card .field span {
  color: rgba(255, 255, 255, 0.95);
}

.manager-card input,
.manager-card textarea,
.manager-card select {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
}

.manager-card input::placeholder,
.manager-card textarea::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.compact-select {
  min-width: 200px;
}

@media (max-width: 768px) {
  .manager-sections {
    grid-template-columns: 1fr;
  }

  .manager-card__header {
    flex-direction: column;
  }

  .mini-tabs {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
