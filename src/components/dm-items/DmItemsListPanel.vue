<script setup lang="ts">
import type { ItemResponse, WorldResponse } from '../../types/api';
import type { FilterWorldId } from '../../composables/dmItems/useDmItemsSlice';

defineProps<{
  worlds: WorldResponse[];
  worldsError: string;
  locationsError: string;
  itemsError: string;
  items: ItemResponse[];
  itemsLoading: boolean;
  selectedWorldId: FilterWorldId;
  deleteLoading: number | null;
  editingItemId: number | null;
  worldName: (worldId: number) => string;
}>();

const emit = defineEmits<{
  (e: 'update:selectedWorldId', value: FilterWorldId): void;
  (e: 'refresh'): void;
  (e: 'edit', item: ItemResponse): void;
  (e: 'delete', itemId: number): void;
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
      <button class="btn btn-secondary" type="button" :disabled="itemsLoading" @click="emit('refresh')">
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
            <button class="btn btn-link" type="button" @click="emit('edit', item)">
              Modifica
            </button>
            <button
              class="btn btn-link text-danger"
              type="button"
              :disabled="deleteLoading === item.id"
              @click="emit('delete', item.id)"
            >
              {{ deleteLoading === item.id ? 'Eliminazione...' : 'Elimina' }}
            </button>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="muted">Nessun oggetto trovato per il filtro selezionato.</p>
  </section>
</template>

<style scoped>
.highlighted {
  box-shadow: 0 0 0 2px var(--color-primary, #6c63ff);
}
</style>
