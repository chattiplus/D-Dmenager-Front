<script setup lang="ts">
import type { CreateItemRequest, LocationResponse, WorldResponse } from '../../types/api';

defineProps<{
  worlds: WorldResponse[];
  formState: CreateItemRequest;
  locationOptions: LocationResponse[];
  editingItemId: number | null;
  formError: string;
  formLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit'): void;
  (e: 'cancel-edit'): void;
}>();
</script>

<template>
  <section class="dm-tab-panel card muted stack">
    <header class="section-header">
      <div>
        <h2 class="card-title">
          {{ editingItemId ? 'Modifica oggetto' : 'Nuovo oggetto' }}
        </h2>
        <p class="card-subtitle">
          Completa tutti i campi legati all'oggetto, compresi rarity e note esclusive del GM.
        </p>
      </div>
      <button v-if="editingItemId" class="btn btn-link" type="button" @click="emit('cancel-edit')">
        Annulla modifica
      </button>
    </header>

    <form class="grid-form" @submit.prevent="emit('submit')">
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
          <option v-for="location in locationOptions" :key="location.id" :value="location.id">
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
</template>

<style scoped>
.grid-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
</style>
