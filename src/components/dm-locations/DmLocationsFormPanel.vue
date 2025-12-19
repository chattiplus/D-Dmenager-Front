<script setup lang="ts">
import type { CreateLocationRequest, LocationResponse, WorldResponse } from '../../types/api';

defineProps<{
  worlds: WorldResponse[];
  formState: CreateLocationRequest;
  parentOptions: LocationResponse[];
  editingLocationId: number | null;
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
          {{ editingLocationId ? 'Modifica location' : 'Nuova location' }}
        </h2>
        <p class="card-subtitle">
          Compila i dettagli completi della location, comprese note e gerarchie.
        </p>
      </div>
      <button v-if="editingLocationId" class="btn btn-link" type="button" @click="emit('cancel-edit')">
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
        <input v-model="formState.type" type="text" placeholder="Cittاے, Dungeon, Bioma" />
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
</template>

<style scoped>
.grid-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
</style>
