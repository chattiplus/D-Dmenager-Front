<!-- src/views/DmLocationsView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getWorlds } from '../api/worldsApi';
import {
  createLocation,
  deleteLocation,
  getLocations,
  getLocationsByWorld,
  updateLocation,
} from '../api/locationsApi';
import type { CreateLocationRequest, LocationResponse, WorldResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

type FilterWorldId = number | 'all';

const route = useRoute();
const router = useRouter();

const worlds = ref<WorldResponse[]>([]);
const worldsLoading = ref(false);
const worldsError = ref('');

const selectedWorldId = ref<FilterWorldId>('all');

const locations = ref<LocationResponse[]>([]);
const locationsLoading = ref(false);
const locationsError = ref('');
const deleteLoading = ref<number | null>(null);

const editingLocationId = ref<number | null>(null);
const formError = ref('');
const formLoading = ref(false);

const formState = reactive<CreateLocationRequest>({
  worldId: 0,
  parentLocationId: undefined,
  name: '',
  type: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
});

const worldName = (worldId: number) => {
  const world = worlds.value.find((entry) => entry.id === worldId);
  return world?.name ?? `Mondo #${worldId}`;
};

const optionalText = (value?: string | null) => {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const sanitizeFilter = () => {
  if (selectedWorldId.value === 'all') {
    return;
  }
  const exists = worlds.value.some((world) => world.id === selectedWorldId.value);
  if (!exists) {
    selectedWorldId.value = 'all';
  }
};

const ensureFormWorld = () => {
  if (formState.worldId && worlds.value.some((world) => world.id === formState.worldId)) {
    return;
  }
  formState.worldId = worlds.value[0]?.id ?? 0;
};

const resetForm = () => {
  editingLocationId.value = null;
  formState.name = '';
  formState.type = '';
  formState.description = '';
  formState.gmNotes = '';
  formState.parentLocationId = undefined;
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
    if (selectedWorldId.value === 'all') {
      locations.value = await getLocations();
    } else {
      locations.value = await getLocationsByWorld(selectedWorldId.value);
    }
  } catch (error) {
    locationsError.value = extractApiErrorMessage(
      error,
      'Impossibile caricare le location.',
    );
    locations.value = [];
  } finally {
    locationsLoading.value = false;
  }
};

const parentOptions = computed(() =>
  locations.value.filter(
    (location) =>
      location.worldId === formState.worldId && location.id !== editingLocationId.value,
  ),
);

const upsertLocation = async () => {
  if (!formState.worldId) {
    formError.value = 'Seleziona un mondo di riferimento.';
    return;
  }
  const trimmedName = formState.name.trim();
  if (!trimmedName) {
    formError.value = 'Il nome della location è obbligatorio.';
    return;
  }
  formError.value = '';
  formLoading.value = true;
  const payload: CreateLocationRequest = {
    worldId: formState.worldId,
    parentLocationId: formState.parentLocationId || undefined,
    name: trimmedName,
    type: optionalText(formState.type),
    description: optionalText(formState.description),
    gmNotes: optionalText(formState.gmNotes),
    isVisibleToPlayers: formState.isVisibleToPlayers,
  };
  try {
    if (editingLocationId.value) {
      const updated = await updateLocation(editingLocationId.value, payload);
      startEdit(updated);
    } else {
      const created = await createLocation(payload);
      startEdit(created);
    }
    await fetchLocations();
  } catch (error) {
    formError.value = extractApiErrorMessage(error, 'Operazione non riuscita.');
  } finally {
    formLoading.value = false;
  }
};

const removeLocation = async (locationId: number) => {
  deleteLoading.value = locationId;
  locationsError.value = '';
  try {
    await deleteLocation(locationId);
    if (editingLocationId.value === locationId) {
      resetForm();
    }
    await fetchLocations();
  } catch (error) {
    locationsError.value = extractApiErrorMessage(
      error,
      'Impossibile eliminare la location.',
    );
  } finally {
    deleteLoading.value = null;
  }
};

const startEdit = (location: LocationResponse) => {
  editingLocationId.value = location.id;
  formState.worldId = location.worldId;
  formState.parentLocationId = location.parentLocationId ?? undefined;
  formState.name = location.name;
  formState.type = location.type ?? '';
  formState.description = location.description ?? '';
  formState.gmNotes = location.gmNotes ?? '';
  formState.isVisibleToPlayers = location.isVisibleToPlayers;
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
  const existing = locations.value.find((location) => location.id === editId);
  if (existing) {
    startEdit(existing);
    clearEditQuery();
  }
};

watch(
  () => selectedWorldId.value,
  () => {
    fetchLocations();
  },
);

watch(
  () => locations.value,
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

onMounted(async () => {
  await Promise.all([fetchWorlds(), fetchLocations()]);
  watchRouteEdit();
});
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Location del Dungeon Master</h1>
        <p class="section-subtitle">
          Crea e aggiorna i luoghi chiave dei tuoi mondi, inclusi riferimenti gerarchici e note private.
        </p>
      </header>

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
        <button
          class="btn btn-secondary"
          type="button"
          :disabled="locationsLoading"
          @click="fetchLocations"
        >
          {{ locationsLoading ? 'Caricamento...' : 'Aggiorna elenco' }}
        </button>
      </div>

      <p v-if="worldsError" class="status-message text-danger">{{ worldsError }}</p>
      <p v-if="locationsError" class="status-message text-danger">{{ locationsError }}</p>

      <div v-if="locationsLoading">Caricamento location...</div>
      <ul v-else-if="locations.length" class="manager-list">
        <li
          v-for="location in locations"
          :key="location.id"
          class="compact-card"
          :class="{ highlighted: editingLocationId === location.id }"
        >
          <div class="manager-item">
            <header class="section-header">
              <div>
                <p class="card-title">{{ location.name }}</p>
                <p class="manager-meta">
                  {{ worldName(location.worldId) }} • {{ location.type || 'Tipo non definito' }}
                </p>
                <p class="manager-meta">
                  Parent: {{ location.parentLocationId ?? 'Nessuna' }}
                </p>
              </div>
              <span
                class="pill"
                :class="location.isVisibleToPlayers ? 'pill-success' : 'pill-danger'"
              >
                {{ location.isVisibleToPlayers ? 'Visibile' : 'Solo GM' }}
              </span>
            </header>
            <p class="manager-meta">{{ location.description || 'Nessuna descrizione.' }}</p>
            <p v-if="location.gmNotes" class="manager-meta">Note GM: {{ location.gmNotes }}</p>
            <p class="manager-meta">Owner: {{ location.ownerNickname ?? 'N/D' }}</p>
            <div class="actions">
              <button class="btn btn-link" type="button" @click="startEdit(location)">
                Modifica
              </button>
              <button
                class="btn btn-link text-danger"
                type="button"
                :disabled="deleteLoading === location.id"
                @click="removeLocation(location.id)"
              >
                {{ deleteLoading === location.id ? 'Eliminazione...' : 'Elimina' }}
              </button>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="muted">Nessuna location trovata per il filtro selezionato.</p>

      <section class="card muted stack">
        <header class="section-header">
          <div>
            <h2 class="card-title">
              {{ editingLocationId ? 'Modifica location' : 'Nuova location' }}
            </h2>
            <p class="card-subtitle">
              Compila i dettagli completi della location, comprese note e gerarchie.
            </p>
          </div>
          <button v-if="editingLocationId" class="btn btn-link" type="button" @click="cancelEdit">
            Annulla modifica
          </button>
        </header>

        <form class="grid-form" @submit.prevent="upsertLocation">
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
            <span>Location padre</span>
            <select v-model="formState.parentLocationId">
              <option :value="undefined">Nessuna</option>
              <option v-for="parent in parentOptions" :key="parent.id" :value="parent.id">
                {{ parent.name }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Nome</span>
            <input v-model="formState.name" type="text" required />
          </label>
          <label class="field">
            <span>Tipologia</span>
            <input v-model="formState.type" type="text" placeholder="Città, Dungeon, Bioma" />
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
            {{
              formLoading
                ? 'Salvataggio...'
                : editingLocationId
                  ? 'Salva modifiche'
                  : 'Crea location'
            }}
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
