<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CreateSessionEventRequest, SessionEventResponse } from '../../types/api';
import EntityActions from '../ui/EntityActions.vue';
import RefreshAction from '../ui/RefreshAction.vue';

const props = defineProps<{
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

const showForm = ref(false);
const isEditing = computed(() => props.editingEventId !== null);

watch(
  () => props.editingEventId,
  (value) => {
    if (value !== null) {
      showForm.value = true;
      return;
    }

    if (!props.submitting && !props.form.title.trim() && !props.formError) {
      showForm.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => props.submitting,
  (isSubmitting, wasSubmitting) => {
    if (
      wasSubmitting
      && !isSubmitting
      && !props.formError
      && props.editingEventId === null
      && !props.form.title.trim()
    ) {
      showForm.value = false;
    }
  },
);

const openForm = () => {
  showForm.value = true;
};

const closeForm = () => {
  showForm.value = false;
  emit('cancel-edit');
};
</script>

<template>
  <section class="events-panel stack">
    <header class="panel-header">
      <div class="panel-heading">
        <h3>Eventi</h3>
        <p v-if="canManage" class="section-subtitle">
          Registra gli snodi chiave avvenuti durante la sessione.
        </p>
      </div>
      <RefreshAction
        class="panel-refresh"
        label="Aggiorna eventi"
        :loading="loading"
        @refresh="emit('refresh')"
      />
    </header>

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
            <EntityActions
              edit-label="Modifica evento"
              delete-label="Elimina evento"
              @edit="emit('edit', event)"
              @delete="emit('delete', event.id)"
            />
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

    <template v-if="canManage">
      <button
        v-if="!showForm"
        type="button"
        class="mobile-section-create-button"
        @click="openForm"
      >
        + Crea evento
      </button>

      <section v-else class="card muted stack">
        <h4 class="card-title">{{ isEditing ? 'Modifica evento' : 'Nuovo evento' }}</h4>
        <form class="stack" @submit.prevent="emit('submit')">
          <label class="field">
            <span>Titolo</span>
            <input v-model="props.form.title" type="text" required />
          </label>
          <label class="field">
            <span>Tipo</span>
            <input v-model="props.form.type" type="text" />
          </label>
          <label class="field">
            <span>Descrizione</span>
            <textarea v-model="props.form.description" rows="6" />
          </label>
          <label class="field">
            <span>Orario in-game</span>
            <input v-model="props.form.inGameTime" type="text" />
          </label>
          <label class="field checkbox">
            <input v-model="props.form.isVisibleToPlayers" type="checkbox" />
            <span>Visibile a player/viewer</span>
          </label>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="props.submitting">
              {{
                props.submitting
                  ? 'Salvataggio...'
                  : isEditing
                    ? 'Aggiorna evento'
                    : 'Crea evento'
              }}
            </button>
            <button class="btn btn-link" type="button" @click="closeForm">
              Annulla
            </button>
          </div>
          <p v-if="props.formError" class="status-message text-danger">{{ props.formError }}</p>
        </form>
      </section>
    </template>
  </section>
</template>

<style scoped>
.events-panel {
  gap: 1rem;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.panel-heading {
  flex: 1 1 auto;
  min-width: 0;
}

.panel-refresh {
  flex: 0 0 auto;
  margin-left: auto;
}
</style>
