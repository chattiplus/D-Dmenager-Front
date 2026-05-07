<!-- src/views/WorldsView.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useAuthStore } from '../store/authStore';
import {
  createWorld,
  getMyWorlds,
} from '../api/worldsApi';
import {
  createCampaign,
  deleteCampaign,
  getMyCampaigns,
  updateCampaign,
} from '../api/campaignsApi';
import type {
  CampaignResponse,
  CampaignStatus,
  WorldResponse,
} from '../types/api';
import {
  CAMPAIGN_STATUS_VALUES,
  campaignStatusClass,
  campaignStatusLabel,
  isCampaignStatus,
} from '../utils/campaignStatus';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { matchSearch } from '../utils/search';
import { useIsMobile } from '../composables/useIsMobile';
import EntityActions from '../components/ui/EntityActions.vue';
import OpenEntityButton from '../components/ui/OpenEntityButton.vue';
import RefreshAction from '../components/ui/RefreshAction.vue';

type ManagerSection = 'worlds' | 'campaigns';

const authStore = useAuthStore();
const { isMobile } = useIsMobile();

const currentSection = ref<ManagerSection>('worlds');

const worlds = ref<WorldResponse[]>([]);
const worldsLoading = ref(false);
const worldsError = ref('');

const campaigns = ref<CampaignResponse[]>([]);
const campaignsLoading = ref(false);
const campaignsError = ref('');

const refreshing = ref(false);
const worldSearchQuery = ref('');
const campaignSearchQuery = ref('');

const quickWorldForm = reactive({
  name: '',
  description: '',
  isPublic: false,
});
const quickWorldError = ref('');
const quickWorldLoading = ref(false);

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

const campaignStatuses: CampaignStatus[] = [...CAMPAIGN_STATUS_VALUES];

const totalWorlds = computed(() => worlds.value.length);
const totalCampaigns = computed(() => campaigns.value.length);
const getWorldNameById = (worldId: number) =>
  worlds.value.find((world) => world.id === worldId)?.name ?? `World #${worldId}`;

const filteredWorlds = computed(() =>
  worlds.value.filter((world) => matchSearch(worldSearchQuery.value, world.name, world.description)),
);

const filteredCampaigns = computed(() => {
  return campaigns.value.filter((campaign) => {
    const matchesWorldFilter =
      selectedWorldFilter.value === 'all' || campaign.worldId === selectedWorldFilter.value;
    return matchesWorldFilter
      && matchSearch(
        campaignSearchQuery.value,
        campaign.name,
        campaign.description,
        campaign.status,
        campaignStatusLabel(campaign.status),
        getWorldNameById(campaign.worldId),
      );
  });
});

const visibleWorldsCount = computed(() => filteredWorlds.value.length);
const visibleCampaignsCount = computed(() => filteredCampaigns.value.length);

const ensureCampaignWorldSelection = () => {
  const firstWorld = worlds.value[0];
  if (!firstWorld) {
    quickCampaignForm.worldId = 0;
    if (editingCampaignId.value) {
      editingCampaignForm.worldId = 0;
    }
    return;
  }
  if (!worlds.value.some((world) => world.id === quickCampaignForm.worldId)) {
    quickCampaignForm.worldId = firstWorld.id;
  }
  if (
    editingCampaignId.value &&
    !worlds.value.some((world) => world.id === editingCampaignForm.worldId)
  ) {
    editingCampaignForm.worldId = firstWorld.id;
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
    worlds.value = await getMyWorlds();
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
    campaigns.value = await getMyCampaigns();
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
  quickWorldForm.isPublic = false;
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
      isPublic: quickWorldForm.isPublic,
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
  editingWorldForm.isPublic = world.isPublic;
  editingWorldError.value = '';
};

const cancelWorldEdit = () => {
  editingWorldId.value = null;
  editingWorldForm.name = '';
  editingWorldForm.description = '';
  editingWorldForm.isPublic = false;
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
    const updatedWorld = await updateWorld(worldId, {
      name: trimmedName,
      description: editingWorldForm.description.trim() || undefined,
      isPublic: editingWorldForm.isPublic,
    });
    worlds.value = worlds.value.map((world) => (world.id === worldId ? updatedWorld : world));
    cancelWorldEdit();
  } catch (error) {
    editingWorldError.value = extractApiErrorMessage(error, 'Aggiornamento non riuscito.');
  } finally {
    editingWorldLoading.value = false;
  }
};

const removeWorld = async (worldId: number) => {
  worldsError.value = '';
  const confirmed = window.confirm('Sei sicuro di voler eliminare questo mondo?');
  if (!confirmed) {
    return;
  }
  try {
    await deleteWorld(worldId);
    if (editingWorldId.value === worldId) {
      cancelWorldEdit();
    }
    worlds.value = worlds.value.filter((world) => world.id !== worldId);
    if (selectedWorldFilter.value === worldId) {
      selectedWorldFilter.value = 'all';
    }
    ensureCampaignWorldSelection();
    ensureFilterWorld();
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
  editingCampaignForm.status = isCampaignStatus(campaign.status) ? campaign.status : 'PLANNED';
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
  <section v-if="isMobile" class="mobile-screen mobile-page stack">
    <header class="mobile-screen__header">
      <p class="mobile-screen__eyebrow">Mondi</p>
      <h1 class="mobile-screen__title">Mondi</h1>
      <p class="mobile-screen__subtitle">
        Consulta e apri i tuoi mondi senza mischiare campagne e strumenti di gestione.
      </p>
    </header>

    <article class="mobile-hero-card stack">
      <div class="mobile-hero-card__header">
        <div>
          <h2 class="card-title">Archivio mondi</h2>
          <p class="manager-meta">Mondi: {{ visibleWorldsCount }}</p>
        </div>
        <RefreshAction
          label="Aggiorna mondi"
          :loading="refreshing"
          @refresh="refreshAll"
        />
      </div>
      <label class="field">
        <span>Cerca</span>
        <input v-model="worldSearchQuery" type="text" placeholder="Cerca mondi..." />
      </label>
    </article>

    <p v-if="worldsError" class="status-message text-danger">{{ worldsError }}</p>
    <p v-else-if="worldsLoading" class="card">Caricamento mondi...</p>

    <section v-else-if="filteredWorlds.length" class="mobile-world-list">
      <article
        v-for="world in filteredWorlds"
        :key="world.id"
        class="mobile-link-card mobile-entity-card mobile-world-card"
      >
        <div class="world-card-title-row">
          <div class="world-card-title-block">
            <span class="mobile-link-card__label">Mondo</span>
            <strong class="mobile-world-card__title world-card-title">{{ world.name }}</strong>
          </div>
          <span class="mobile-world-card__badge world-visibility-badge">
            {{ world.isPublic ? 'Pubblico' : 'Privato' }}
          </span>
        </div>
        <p class="mobile-world-card__description">
          {{ world.description || 'Nessuna descrizione disponibile.' }}
        </p>
        <p class="manager-meta">Campagne: {{ world.campaignCount }}</p>
        <OpenEntityButton
          label="Apri mondo"
          :to="{ name: 'world-detail', params: { id: world.id } }"
          size="md"
          block
        />
      </article>
    </section>

    <article v-else class="mobile-hero-card mobile-empty-state stack">
      <h2 class="card-title">Nessun mondo trovato</h2>
      <p class="manager-meta">
        Nessun mondo corrisponde alla ricerca attuale.
      </p>
    </article>
  </section>

  <section v-else class="stack">
    <div class="card stack">
      <header class="section-header">
        <div>
          <h1 class="section-title">Mondi e Campagne</h1>
        </div>
        <RefreshAction
          label="Aggiorna dati"
          :loading="refreshing"
          @refresh="refreshAll"
        />
      </header>

      <nav class="dm-tabs" role="tablist">
        <button
          class="dm-tab"
          :class="{ active: currentSection === 'worlds' }"
          type="button"
          @click="currentSection = 'worlds'"
        >
          Mondi ({{ totalWorlds }})
        </button>
        <button
          class="dm-tab"
          :class="{ active: currentSection === 'campaigns' }"
          type="button"
          @click="currentSection = 'campaigns'"
        >
          Campagne ({{ totalCampaigns }})
        </button>
      </nav>

      <section v-if="currentSection === 'worlds'" class="dm-tab-panel manager-sections">
        <article class="manager-card">
          <header class="manager-card__header">
            <div>
              <p class="manager-card__kicker">Panoramica</p>
              <h2>Mondi registrati</h2>
              <p class="manager-meta">Mondi: {{ visibleWorldsCount }} / {{ totalWorlds }}</p>
            </div>
          </header>

          <label class="field">
            <span>Cerca</span>
            <input v-model="worldSearchQuery" type="text" placeholder="Cerca mondi..." />
          </label>

          <p v-if="worldsError" class="status-message text-danger">{{ worldsError }}</p>
          <div v-if="worldsLoading" class="muted">Caricamento mondi...</div>

          <ul v-else-if="filteredWorlds.length" class="manager-list">
            <li v-for="world in filteredWorlds" :key="world.id" class="manager-item-card">
              <header class="manager-item-card__header">
                <div>
                  <div class="world-card-title-row world-card-title-row--manager">
                    <div class="world-card-title-block">
                      <p class="card-title world-card-title">
                        {{ world.name }}
                      </p>
                    </div>
                    <span class="mobile-world-card__badge world-visibility-badge">
                      {{ world.isPublic ? 'Pubblico' : 'Privato' }}
                    </span>
                  </div>
                  <p class="manager-meta">
                    {{ world.description || 'Nessuna descrizione disponibile.' }}
                  </p>
                </div>
                <OpenEntityButton
                  label="Apri mondo"
                  :to="{ name: 'world-detail', params: { id: world.id } }"
                  variant="soft"
                />
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
            </li>
          </ul>
          <p v-else class="muted">Nessun mondo trovato per la ricerca attuale.</p>
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
            <label class="field checkbox-field">
              <input v-model="quickWorldForm.isPublic" type="checkbox" />
              <span>Mondo Pubblico</span>
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea
                v-model="quickWorldForm.description"
                rows="4"
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

      <section v-else class="dm-tab-panel manager-sections">
        <article class="manager-card">
          <header class="manager-card__header">
            <div>
              <p class="manager-card__kicker">Panoramica</p>
              <h2>Campagne attive</h2>
              <p class="manager-meta">Campagne: {{ visibleCampaignsCount }} / {{ totalCampaigns }}</p>
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

          <label class="field">
            <span>Cerca</span>
            <input v-model="campaignSearchQuery" type="text" placeholder="Cerca campagne..." />
          </label>

          <p v-if="campaignsError" class="status-message text-danger">{{ campaignsError }}</p>
          <div v-if="campaignsLoading" class="muted">Caricamento campagne...</div>

          <ul v-else-if="filteredCampaigns.length" class="manager-list">
            <li v-for="campaign in filteredCampaigns" :key="campaign.id" class="manager-item-card">
              <header class="manager-item-card__header">
                <div>
                  <div class="campaign-title-row">
                    <p class="card-title campaign-title">{{ campaign.name }}</p>
                    <span :class="['campaign-status-badge', campaignStatusClass(campaign.status)]">
                      {{ campaignStatusLabel(campaign.status) }}
                    </span>
                  </div>
                  <p class="manager-meta">
                    {{ campaign.description || 'Nessuna descrizione.' }}
                  </p>
                </div>
                <OpenEntityButton
                  label="Apri campagna"
                  :to="{ name: 'campaign-detail', params: { id: campaign.id } }"
                  variant="soft"
                />
              </header>
              <dl class="world-meta">
                <div>
                  <dt>Mondo</dt>
                  <dd>
                    {{ getWorldNameById(campaign.worldId) }}
                  </dd>
                </div>
                <div>
                  <dt>Stato</dt>
                  <dd>{{ campaignStatusLabel(campaign.status) }}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{{ campaign.ownerNickname ?? 'N/D' }}</dd>
                </div>
              </dl>
              <div class="actions">
                <EntityActions
                  edit-label="Modifica campagna"
                  delete-label="Elimina campagna"
                  @edit="startCampaignEdit(campaign)"
                  @delete="removeCampaign(campaign.id)"
                />
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
                    <textarea v-model="editingCampaignForm.description" rows="4" />
                  </label>
                  <label class="field">
                    <span>Stato</span>
                    <select v-model="editingCampaignForm.status">
                      <option v-for="status in campaignStatuses" :key="status" :value="status">
                        {{ campaignStatusLabel(status) }}
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
                rows="4"
                placeholder="Breve introduzione"
              />
            </label>
            <label class="field">
              <span>Stato</span>
              <select v-model="quickCampaignForm.status">
                <option v-for="status in campaignStatuses" :key="status" :value="status">
                  {{ campaignStatusLabel(status) }}
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

.campaign-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.campaign-title {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.campaign-title-row .campaign-status-badge {
  flex-shrink: 0;
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
  color: var(--app-text);
}

.manager-card input,
.manager-card textarea,
.manager-card select {
  background: var(--app-input-bg);
  border: 1px solid var(--app-input-border);
  color: var(--app-text);
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
}

.manager-card input::placeholder,
.manager-card textarea::placeholder {
  color: var(--app-text-muted);
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

  .campaign-title-row {
    align-items: flex-start;
  }

  .mini-tabs {
    width: 100%;
    justify-content: space-between;
  }
}

.checkbox-field {
  flex-direction: row !important;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-field input {
  width: auto;
  margin: 0;
}

.mobile-page {
  padding-bottom: 0.5rem;
}

.mobile-hero-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.mobile-world-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.mobile-world-card {
  gap: 0.85rem;
}

.world-card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.world-card-title-block {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
  flex: 1 1 auto;
}

.world-card-title-row--manager {
  margin-bottom: 0.35rem;
}

.world-card-title {
  font-size: 1.02rem;
  overflow-wrap: anywhere;
  min-width: 0;
}

.world-visibility-badge {
  align-self: flex-start;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-bg-soft) 84%, transparent);
  color: var(--app-text);
  font-size: 0.76rem;
  font-weight: 700;
  flex-shrink: 0;
}

.mobile-world-card__description {
  margin: 0;
  color: var(--app-text-muted);
}

.mobile-empty-state {
  text-align: left;
}

@media (max-width: 520px) {
  .manager-item-card__header {
    align-items: stretch;
  }
}
</style>
