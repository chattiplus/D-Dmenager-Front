<!-- src/views/DmItemsView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getWorlds } from '../api/worldsApi';
import { getLocations } from '../api/locationsApi';
import {
  createItem,
  deleteItem,
  getItems,
  getItemsByWorld,
  updateItem,
} from '../api/itemsApi';
import type {
  CreateItemRequest,
  ItemResponse,
  LocationResponse,
  WorldResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

type FilterWorldId = number | 'all';

const route = useRoute();
const router = useRouter();

const worlds = ref<WorldResponse[]>([]);
const worldsLoading = ref(false);
const worldsError = ref('');

const allLocations = ref<LocationResponse[]>([]);
const locationsLoading = ref(false);
const locationsError = ref('');

const selectedWorldId = ref<FilterWorldId>('all');

const items = ref<ItemResponse[]>([]);
const itemsLoading = ref(false);
const itemsError = ref('');
const deleteLoading = ref<number | null>(null);

const editingItemId = ref<number | null>(null);
const formError = ref('');
const formLoading = ref(false);
const activeTab = ref<'items' | 'create'>('items');

const formState = reactive<CreateItemRequest>({
  worldId: 0,
  locationId: undefined,
  name: '',
  type: '',
  rarity: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
});

const worldName = (worldId: number) => {
  const world = worlds.value.find((entry) => entry.id === worldId);
  return world?.name ?? `Mondo #${worldId}`;
};

const locationOptions = computed(() =>
  allLocations.value.filter((location) => location.worldId === formState.worldId),
);

const optionalText = (value?: string | null) => {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const ensureFormWorld = () => {
  if (formState.worldId && worlds.value.some((world) => world.id === formState.worldId)) {
    return;
  }
  formState.worldId = worlds.value[0]?.id ?? 0;
};

const sanitizeFilter = () => {
  if (selectedWorldId.value === 'all') return;
  const exists = worlds.value.some((world) => world.id === selectedWorldId.value);
  if (!exists) {
    selectedWorldId.value = 'all';
  }
};

const resetForm = () => {
  editingItemId.value = null;
  formState.name = '';
  formState.type = '';
  formState.rarity = '';
  formState.description = '';
  formState.gmNotes = '';
  formState.locationId = undefined;
  formState.isVisibleToPlayers = true;
  ensureFormWorld();
  formError.value = '';
};

const fetchWorlds = async () => {
  worldsLoading.value = true;
  worldsError.value = '';
  try {
    worlds.value = await getWorlds();
    ensureFormWorld();
    sanitizeFilter();
  } catch (error) {
    worldsError.value = extractApiErrorMessage(error, 'Impossibile caricare i mondi.');
    worlds.value = [];
    formState.worldId = 0;
  } finally {
    worldsLoading.value = false;
  }
};

const fetchLocations = async () => {
  locationsLoading.value = true;
  locationsError.value = '';
  try {
    allLocations.value = await getLocations();
  } catch (error) {
    locationsError.value = extractApiErrorMessage(
      error,
      'Impossibile recuperare le location.',
    );
    allLocations.value = [];
  } finally {
    locationsLoading.value = false;
  }
};

const fetchItems = async () => {
  itemsLoading.value = true;
  itemsError.value = '';
  try {
    if (selectedWorldId.value === 'all') {
      items.value = await getItems();
    } else {
      items.value = await getItemsByWorld(selectedWorldId.value);
    }
  } catch (error) {
    itemsError.value = extractApiErrorMessage(error, 'Impossibile caricare gli oggetti.');
    items.value = [];
  } finally {
    itemsLoading.value = false;
  }
};

const upsertItem = async () => {
  if (!formState.worldId) {
    formError.value = "Seleziona il mondo dell'oggetto.";
    return;
  }
  const trimmedName = formState.name.trim();
  if (!trimmedName) {
    formError.value = "Il nome dell'oggetto è obbligatorio.";
    return;
  }
  if (
    formState.locationId &&
    !allLocations.value.some((loc) => loc.id === formState.locationId)
  ) {
    formError.value = 'La location selezionata non esiste più.';
    return;
  }
  formError.value = '';
  formLoading.value = true;
  const payload: CreateItemRequest = {
    worldId: formState.worldId,
    locationId: formState.locationId || undefined,
    name: trimmedName,
    type: optionalText(formState.type),
    rarity: optionalText(formState.rarity),
    description: optionalText(formState.description),
    gmNotes: optionalText(formState.gmNotes),
    isVisibleToPlayers: formState.isVisibleToPlayers,
  };
  try {
    if (editingItemId.value) {
      const updated = await updateItem(editingItemId.value, payload);
      startEdit(updated);
    } else {
      const created = await createItem(payload);
      startEdit(created);
    }
    await fetchItems();
  } catch (error) {
    formError.value = extractApiErrorMessage(error, 'Operazione non riuscita.');
  } finally {
    formLoading.value = false;
  }
};

const removeItem = async (itemId: number) => {
  deleteLoading.value = itemId;
  itemsError.value = '';
  try {
    await deleteItem(itemId);
    if (editingItemId.value === itemId) {
      resetForm();
    }
    await fetchItems();
  } catch (error) {
    itemsError.value = extractApiErrorMessage(error, "Impossibile eliminare l'oggetto.");
  } finally {
    deleteLoading.value = null;
  }
};

const startEdit = (item: ItemResponse) => {
  editingItemId.value = item.id;
  activeTab.value = 'create';
  formState.worldId = item.worldId;
  formState.locationId = item.locationId ?? undefined;
  formState.name = item.name;
  formState.type = item.type ?? '';
  formState.rarity = item.rarity ?? '';
  formState.description = item.description ?? '';
  formState.gmNotes = item.gmNotes ?? '';
  formState.isVisibleToPlayers = item.isVisibleToPlayers;
  formError.value = '';
};

const cancelEdit = () => {
  resetForm();
};

const clearEditQuery = () => {
  if (!route.query.edit) return;
  const nextQuery = { ...route.query };
  delete nextQuery.edit;
  router.replace({ query: nextQuery });
};

const watchRouteEdit = () => {
  const raw = route.query.edit;
  if (!raw) return;
  const editId = Number(raw);
  if (!Number.isFinite(editId)) return;
  const existing = items.value.find((item) => item.id === editId);
  if (existing) {
    startEdit(existing);
    clearEditQuery();
  }
};

watch(
  () => selectedWorldId.value,
  () => {
    fetchItems();
  },
);

watch(
  () => items.value,
  () => {
    watchRouteEdit();
  },
);

watch(
  () => route.query.edit,
  () => {
    watchRouteEdit();
  },
);

watch(
  () => formState.worldId,
  () => {
    if (!formState.locationId) return;
    const stillValid = locationOptions.value.some(
      (location) => location.id === formState.locationId,
    );
    if (!stillValid) {
      formState.locationId = undefined;
    }
  },
);

onMounted(async () => {
  await Promise.all([fetchWorlds(), fetchLocations(), fetchItems()]);
  watchRouteEdit();
});
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Oggetti del Dungeon Master</h1>
        <p class="section-subtitle">
          Registra e modifica il catalogo degli item, con rarità, descrizioni e collegamenti alle location.
        </p>
      </header>

      <nav class="dm-tabs" role="tablist">
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'items' }"
          @click="activeTab = 'items'"
        >
          Oggetti
        </button>
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'create' }"
          @click="activeTab = 'create'"
        >
          Crea oggetto
        </button>
      </nav>

      <section v-if="activeTab === 'items'" class="dm-tab-panel stack">
        <div class="manager-filter">
          <label>
            <span>Filtro mondo</span>
            <select v-model="selectedWorldId">
              <option :value="'all'">Tutti</option>
              <option v-for="world in worlds" :key="world.id" :value="world.id">
                {{ world.name }}
              </option>
            </select>
          </label>
          <button class="btn btn-secondary" type="button" :disabled="itemsLoading" @click="fetchItems">
            {{ itemsLoading ? 'Caricamento...' : 'Aggiorna elenco' }}
          </button>
        </div>

        <p v-if="worldsError" class="status-message text-danger">{{ worldsError }}</p>
        <p v-if="locationsError" class="status-message text-danger">{{ locationsError }}</p>
        <p v-if="itemsError" class="status-message text-danger">{{ itemsError }}</p>

        <div v-if="itemsLoading">Caricamento oggetti...</div>
        <ul v-else-if="items.length" class="manager-list">
          <li
            v-for="item in items"
            :key="item.id"
            class="compact-card"
            :class="{ highlighted: editingItemId === item.id }"
          >
            <div class="manager-item">
              <header class="section-header">
                <div>
                  <p class="card-title">{{ item.name }}</p>
                  <p class="manager-meta">
                    {{ worldName(item.worldId) }} ? {{ item.type || 'Tipo N/D' }}
                    <span v-if="item.rarity">? {{ item.rarity }}</span>
                  </p>
                  <p class="manager-meta">
                    Location ID: {{ item.locationId ?? 'Nessuna' }}
                  </p>
                </div>
                <span class="pill" :class="item.isVisibleToPlayers ? 'pill-success' : 'pill-danger'">
                  {{ item.isVisibleToPlayers ? 'Visibile' : 'Solo GM' }}
                </span>
              </header>
              <p class="manager-meta">{{ item.description || 'Nessuna descrizione.' }}</p>
              <p v-if="item.gmNotes" class="manager-meta">Note GM: {{ item.gmNotes }}</p>
              <p class="manager-meta">Owner: {{ item.ownerNickname ?? 'N/D' }}</p>
              <div class="actions">
                <button class="btn btn-link" type="button" @click="startEdit(item)">
                  Modifica
                </button>
                <button
                  class="btn btn-link text-danger"
                  type="button"
                  :disabled="deleteLoading === item.id"
                  @click="removeItem(item.id)"
                >
                  {{ deleteLoading === item.id ? 'Eliminazione...' : 'Elimina' }}
                </button>
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="muted">Nessun oggetto trovato per il filtro selezionato.</p>
      </section>

      <section v-else class="dm-tab-panel card muted stack">
        <header class="section-header">
          <div>
            <h2 class="card-title">
              {{ editingItemId ? 'Modifica oggetto' : 'Nuovo oggetto' }}
            </h2>
            <p class="card-subtitle">
              Completa tutti i campi legati all'oggetto, compresi rarity e note esclusive del GM.
            </p>
          </div>
          <button v-if="editingItemId" class="btn btn-link" type="button" @click="cancelEdit">
            Annulla modifica
          </button>
        </header>

        <form class="grid-form" @submit.prevent="upsertItem">
          <label class="field">
            <span>Mondo</span>
            <select v-model="formState.worldId" required>
              <option v-if="!worlds.length" :value="0" disabled>Nessun mondo disponibile</option>
              <option v-for="world in worlds" :key="world.id" :value="world.id">
                {{ world.name }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Location</span>
            <select v-model="formState.locationId">
              <option :value="undefined">Nessuna</option>
              <option
                v-for="location in locationOptions"
                :key="location.id"
                :value="location.id"
              >
                {{ location.name }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Nome</span>
            <input v-model="formState.name" type="text" required />
          </label>
          <label class="field">
            <span>Tipologia</span>
            <input v-model="formState.type" type="text" placeholder="Arma, Pozione, Artefatto" />
          </label>
          <label class="field">
            <span>Rarità</span>
            <input v-model="formState.rarity" type="text" placeholder="Comune, Raro, Leggendario" />
          </label>
          <label class="field">
            <span>Descrizione</span>
            <textarea v-model="formState.description" rows="3" />
          </label>
          <label class="field">
            <span>Note GM</span>
            <textarea v-model="formState.gmNotes" rows="3" />
          </label>
          <label class="field checkbox">
            <input v-model="formState.isVisibleToPlayers" type="checkbox" />
            <span>Visibile ai player</span>
          </label>
          <p v-if="formError" class="status-message text-danger">{{ formError }}</p>
          <button class="btn btn-primary" type="submit" :disabled="formLoading || !worlds.length">
            {{ formLoading ? 'Salvataggio...' : editingItemId ? 'Salva modifiche' : 'Crea oggetto' }}
          </button>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.highlighted {
  box-shadow: 0 0 0 2px var(--color-primary, #6c63ff);
}

.grid-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
</style>
