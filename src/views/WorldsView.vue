<!-- src/views/WorldsView.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { createWorld, getWorlds } from '../api/worldsApi';
import { getCampaigns } from '../api/campaignsApi';
import type {
  CampaignResponse,
  CreateWorldRequest,
  WorldResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

const authStore = useAuthStore();

const worlds = ref<WorldResponse[]>([]);
const worldsLoading = ref(false);
const worldsError = ref('');

const campaigns = ref<CampaignResponse[]>([]);
const campaignsLoading = ref(false);
const campaignsError = ref('');

const refreshing = ref(false);

const newWorldForm = reactive<CreateWorldRequest>({
  name: '',
  description: '',
  isPublic: false,
});
const creatingWorld = ref(false);
const createWorldError = ref('');

const groupedCampaigns = computed<Record<number, CampaignResponse[]>>(() => {
  const map: Record<number, CampaignResponse[]> = {};
  campaigns.value.forEach((campaign) => {
    const list = map[campaign.worldId] ?? [];
    list.push(campaign);
    map[campaign.worldId] = list;
  });
  return map;
});

const totalWorlds = computed(() => worlds.value.length);
const totalCampaigns = computed(() => campaigns.value.length);

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

const loadCampaigns = async () => {
  campaignsLoading.value = true;
  campaignsError.value = '';
  try {
    campaigns.value = await getCampaigns();
  } catch (error) {
    campaignsError.value = extractApiErrorMessage(
      error,
      'Impossibile caricare le campagne.',
    );
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

const handleCreateWorld = async () => {
  createWorldError.value = '';
  const trimmedName = newWorldForm.name.trim();
  if (!trimmedName) {
    createWorldError.value = 'Il nome del mondo e obbligatorio.';
    return;
  }
  creatingWorld.value = true;
  try {
    await createWorld({
      name: trimmedName,
      description: newWorldForm.description?.trim() || undefined,
      isPublic: newWorldForm.isPublic,
    });
    newWorldForm.name = '';
    newWorldForm.description = '';
    newWorldForm.isPublic = false;
    await loadWorlds();
  } catch (error) {
    createWorldError.value = extractApiErrorMessage(error, 'Creazione mondo non riuscita.');
  } finally {
    creatingWorld.value = false;
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
      <header>
        <h1 class="section-title">Gestione Mondi e Campagne</h1>
        <p class="section-subtitle">
          Riepilogo delle tue ambientazioni da Dungeon Master con focus su mondi e campagne attive.
        </p>
      </header>

      <div class="actions">
        <button class="btn btn-primary" :disabled="refreshing" @click="refreshAll">
          {{ refreshing ? 'Aggiornamento...' : 'Aggiorna elenco' }}
        </button>
      </div>

      <section class="stats-grid compact">
        <article class="compact-card">
          <p class="stat-label">Mondi gestiti</p>
          <p class="stat-value">{{ worldsLoading ? '...' : totalWorlds }}</p>
        </article>
        <article class="compact-card">
          <p class="stat-label">Campagne totali</p>
          <p class="stat-value">{{ campaignsLoading ? '...' : totalCampaigns }}</p>
        </article>
      </section>

      <section class="card muted stack">
        <h2 class="card-title">Crea un nuovo mondo</h2>
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
      </section>

      <p v-if="worldsError" class="status-message text-danger">{{ worldsError }}</p>
      <p v-if="campaignsError" class="status-message text-danger">{{ campaignsError }}</p>

      <div v-if="worldsLoading">Caricamento mondi...</div>
      <ul v-else-if="worlds.length" class="list-stack">
        <li v-for="world in worlds" :key="world.id" class="card stack">
          <header class="section-header">
            <div>
              <h3 class="card-title">{{ world.name }}</h3>
              <p class="card-subtitle">
                {{ world.description || 'Nessuna descrizione disponibile.' }}
              </p>
              <p class="world-meta">
                Owner: {{ world.ownerNickname ?? 'N/D' }} - Campagne dichiarate: {{ world.campaignCount }}
              </p>
              <p class="world-meta">
                Visibilita: {{ world.isPublic ? 'Pubblico' : 'Privato' }}
              </p>
            </div>
            <RouterLink class="btn btn-link" :to="`/worlds/${world.id}`">
              Apri dettaglio mondo
            </RouterLink>
          </header>

          <section class="stack">
            <h4>Campagne collegate</h4>
            <ul
              v-if="groupedCampaigns[world.id]?.length"
              class="list-stack"
            >
              <li
                v-for="campaign in groupedCampaigns[world.id]"
                :key="campaign.id"
                class="compact-card"
              >
                <div class="manager-item">
                  <p class="card-title">{{ campaign.name }}</p>
                  <p class="manager-meta">
                    Status: {{ campaign.status }} - Owner:
                    {{ campaign.ownerNickname ?? 'N/D' }}
                  </p>
                  <p class="manager-meta">
                    {{ campaign.description || 'Nessuna descrizione.' }}
                  </p>
                  <RouterLink class="btn btn-link" :to="`/campaigns/${campaign.id}`">Apri campagna</RouterLink>
                </div>
              </li>
            </ul>
            <p v-else class="muted">Nessuna campagna associata a questo mondo.</p>
          </section>
        </li>
      </ul>
      <p v-else class="muted">Non ci sono mondi registrati al momento.</p>
    </div>
  </section>
</template>
