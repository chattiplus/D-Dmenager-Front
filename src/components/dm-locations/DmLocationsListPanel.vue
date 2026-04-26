<script setup lang="ts">
import type { LocationResponse, WorldResponse } from '../../types/api';
import type { FilterWorldId } from '../../composables/dmLocations/useDmLocationsSlice';

defineProps<{
  worlds: WorldResponse[];
  worldsError: string;
  locationsError: string;
  locations: LocationResponse[];
  locationsLoading: boolean;
  selectedWorldId: FilterWorldId;
  deleteLoading: number | null;
  editingLocationId: number | null;
  worldName: (worldId: number) => string;
}>();

const emit = defineEmits<{
  (e: 'update:selectedWorldId', value: FilterWorldId): void;
  (e: 'refresh'): void;
  (e: 'edit', location: LocationResponse): void;
  (e: 'delete', locationId: number): void;
}>();

const onWorldChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  emit('update:selectedWorldId', value === 'all' ? 'all' : Number(value));
};
</script>

<template>
  <section class="dm-tab-panel stack">
    <div class="manager-filter">
      <label>
        <span>Filtro mondo</span>
        <select :value="selectedWorldId" @change="onWorldChange">
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
        @click="emit('refresh')"
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
                {{ worldName(location.worldId) }} ? {{ location.type || 'Tipo non definito' }}
              </p>
              <p class="manager-meta">
                Parent: {{ location.parentLocationId ?? 'Nessuna' }}
              </p>
            </div>
            <span class="pill" :class="location.isVisibleToPlayers ? 'pill-success' : 'pill-danger'">
              {{ location.isVisibleToPlayers ? 'Visibile' : 'Solo GM' }}
            </span>
          </header>
          <p class="manager-meta">{{ location.description || 'Nessuna descrizione.' }}</p>
          <p v-if="location.gmNotes" class="manager-meta">Note GM: {{ location.gmNotes }}</p>
          <p class="manager-meta">Owner: {{ location.ownerNickname ?? 'N/D' }}</p>
          <div class="actions">
            <button class="btn btn-link" type="button" @click="emit('edit', location)">
              Modifica
            </button>
            <button
              class="btn btn-link text-danger"
              type="button"
              :disabled="deleteLoading === location.id"
              @click="emit('delete', location.id)"
            >
              {{ deleteLoading === location.id ? 'Eliminazione...' : 'Elimina' }}
            </button>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="muted">Nessuna location trovata per il filtro selezionato.</p>
  </section>
</template>

<style scoped>
.highlighted {
  box-shadow: 0 0 0 2px var(--color-primary, #6c63ff);
}
</style>
