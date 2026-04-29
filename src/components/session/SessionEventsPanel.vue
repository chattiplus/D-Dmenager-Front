<script setup lang="ts">
import type { CreateSessionEventRequest, SessionEventResponse } from '../../types/api';

defineProps<{
  events: SessionEventResponse[];
  loading: boolean;
  error: string;
  canManage: boolean;
  form: CreateSessionEventRequest;
  formError: string;
  submitting: boolean;
  editingEventId: number | null;
}>();

const emit = defineEmits<{
  (event: 'refresh'): void;
  (event: 'submit'): void;
  (event: 'edit', value: SessionEventResponse): void;
  (event: 'cancel-edit'): void;
  (event: 'delete', value: number): void;
}>();
</script>

<template>
  <section class="events-panel stack">
    <header v-if="canManage" class="section-header">
      <div>
        <h3>Timeline eventi</h3>
        <p class="section-subtitle">Registra gli snodi chiave avvenuti durante la sessione.</p>
      </div>
      <button class="btn btn-link" type="button" @click="emit('refresh')" :disabled="loading">
        Aggiorna eventi
      </button>
    </header>

    <button
      v-else
      class="btn btn-link align-start"
      type="button"
      @click="emit('refresh')"
      :disabled="loading"
    >
      Aggiorna
    </button>

    <p v-if="error" class="status-message text-danger">{{ error }}</p>
    <div v-if="loading">Caricamento eventi...</div>
    <ul v-else-if="events.length" class="manager-list">
      <li v-for="event in events" :key="event.id" class="compact-card">
        <template v-if="canManage">
          <header class="section-header">
            <div>
              <p class="card-title">{{ event.title }}</p>
              <p class="manager-meta">
                {{ event.type || 'Evento' }} - {{ event.inGameTime || 'Tempo non indicato' }}
              </p>
            </div>
            <span class="tag tag-muted">{{ new Date(event.createdAt).toLocaleString() }}</span>
          </header>
          <p>{{ event.description || 'Nessuna descrizione disponibile.' }}</p>
          <p class="manager-meta">Visibile ai player: {{ event.isVisibleToPlayers ? 'Sì' : 'No' }}</p>
          <p class="manager-meta">Owner: {{ event.ownerNickname ?? 'N/D' }}</p>
          <div class="actions">
            <button class="btn btn-link" type="button" @click="emit('edit', event)">Modifica</button>
            <button class="btn btn-link text-danger" type="button" @click="emit('delete', event.id)">
              Elimina
            </button>
          </div>
        </template>

        <template v-else>
          <strong>{{ event.title }}</strong>
          <small class="muted">{{ event.inGameTime }} - {{ event.type }}</small>
          <p>{{ event.description }}</p>
        </template>
      </li>
    </ul>
    <p v-else class="muted">
      {{ canManage ? 'Nessun evento registrato per questa sessione.' : 'Nessun evento pubblico.' }}
    </p>

    <section v-if="canManage" class="card muted stack">
      <h4 class="card-title">{{ editingEventId ? 'Modifica evento' : 'Nuovo evento' }}</h4>
      <form class="stack" @submit.prevent="emit('submit')">
        <label class="field">
          <span>Titolo</span>
          <input v-model="form.title" type="text" required />
        </label>
        <label class="field">
          <span>Tipo</span>
          <input v-model="form.type" type="text" />
        </label>
        <label class="field">
          <span>Descrizione</span>
          <textarea v-model="form.description" rows="3" />
        </label>
        <label class="field">
          <span>Orario in-game</span>
          <input v-model="form.inGameTime" type="text" />
        </label>
        <label class="field checkbox">
          <input v-model="form.isVisibleToPlayers" type="checkbox" />
          <span>Visibile a player/viewer</span>
        </label>
        <div class="actions">
          <button class="btn btn-primary" type="submit" :disabled="submitting">
            {{
              submitting
                ? 'Salvataggio...'
                : editingEventId
                  ? 'Aggiorna evento'
                  : 'Crea evento'
            }}
          </button>
          <button
            v-if="editingEventId"
            class="btn btn-link"
            type="button"
            @click="emit('cancel-edit')"
          >
            Annulla
          </button>
        </div>
        <p v-if="formError" class="status-message text-danger">{{ formError }}</p>
      </form>
    </section>
  </section>
</template>

<style scoped>
.events-panel {
  gap: 1rem;
}

.align-start {
  align-self: flex-start;
}
</style>
