<script setup lang="ts">
import type { SessionResponse } from '../../types/api';

defineProps<{
  sessions: SessionResponse[];
  sessionsError: string;
  loadingSessions: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'open-session', sessionId: number): void;
}>();
</script>

<template>
  <header class="section-header campaign-sessions-header">
    <div class="campaign-sessions-header__main">
      <h3>Sessioni</h3>
    </div>
    <button
      class="btn btn-link campaign-sessions-header__action"
      @click="emit('refresh')"
      :disabled="loadingSessions"
    >
      Aggiorna sessioni
    </button>
  </header>

  <p v-if="sessionsError" class="status-message text-danger">{{ sessionsError }}</p>
  <ul v-else-if="sessions.length" class="list-grid">
    <li v-for="session in sessions" :key="session.id" class="card">
      <div class="campaign-session-card__header">
        <h4 class="card-title campaign-session-card__title">
          {{ session.title }} {{ session.sessionNumber }}°
        </h4>
        <button class="btn btn-link campaign-session-card__action" @click="emit('open-session', session.id)">
          Apri
        </button>
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
