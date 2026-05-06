<script setup lang="ts">
import type { SessionResponse } from '../../types/api';
import RefreshAction from '../ui/RefreshAction.vue';
import IconActionButton from '../ui/IconActionButton.vue';
import OpenEntityButton from '../ui/OpenEntityButton.vue';

defineProps<{
  sessions: SessionResponse[];
  sessionsError: string;
  loadingSessions: boolean;
  canManage: boolean;
  deletingSessionId: number | null;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'open-session', sessionId: number): void;
  (e: 'delete-session', sessionId: number): void;
}>();
</script>

<template>
  <header class="section-header campaign-sessions-header">
    <div class="campaign-sessions-header__main">
      <h3>Sessioni</h3>
    </div>
    <RefreshAction
      class="campaign-sessions-header__action"
      label="Aggiorna sessioni"
      :loading="loadingSessions"
      @refresh="emit('refresh')"
    />
  </header>

  <p v-if="sessionsError" class="status-message text-danger">{{ sessionsError }}</p>
  <ul v-else-if="sessions.length" class="list-grid">
    <li v-for="session in sessions" :key="session.id" class="card">
      <div class="campaign-session-card__header">
        <h4 class="card-title campaign-session-card__title">
          {{ session.title }} {{ session.sessionNumber }}°
        </h4>
        <div class="campaign-session-card__actions">
          <OpenEntityButton
            class="campaign-session-card__action"
            label="Apri"
            variant="primary"
            @click="emit('open-session', session.id)"
          />
          <IconActionButton
            v-if="canManage"
            icon="delete"
            label="Elimina sessione"
            variant="danger"
            :loading="deletingSessionId === session.id"
            :disabled="deletingSessionId === session.id"
            @click="emit('delete-session', session.id)"
          />
        </div>
      </div>
      <p class="card-subtitle">
        Data: {{ session.sessionDate ?? 'Non pianificata' }}
      </p>
      <p>{{ session.notes || 'Nessuna nota.' }}</p>
    </li>
  </ul>
  <p v-else class="muted">Nessuna sessione associata.</p>
</template>

<style scoped>
.campaign-sessions-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.campaign-sessions-header__main,
.campaign-session-card__title {
  flex: 1 1 auto;
  min-width: 0;
}

.campaign-sessions-header__action,
.campaign-session-card__action {
  flex-shrink: 0;
  align-self: flex-start;
}

.campaign-session-card__actions {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex-shrink: 0;
}

.campaign-session-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.campaign-session-card__title {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
