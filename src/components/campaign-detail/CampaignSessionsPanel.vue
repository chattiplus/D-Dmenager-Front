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
  <header class="section-header">
    <h3>Sessioni</h3>
    <button class="btn btn-link" @click="emit('refresh')" :disabled="loadingSessions">
      Aggiorna sessioni
    </button>
  </header>

  <p v-if="sessionsError" class="status-message text-danger">{{ sessionsError }}</p>
  <ul v-else-if="sessions.length" class="list-grid">
    <li v-for="session in sessions" :key="session.id" class="card">
      <h4 class="card-title">
        {{ session.sessionNumber }} ¶ú {{ session.title }}
      </h4>
      <p class="card-subtitle">
        Data: {{ session.sessionDate ?? 'Non pianificata' }}
      </p>
      <p>{{ session.notes || 'Nessuna nota.' }}</p>
      <button class="btn btn-link" @click="emit('open-session', session.id)">
        Apri sessione
      </button>
    </li>
  </ul>
  <p v-else class="muted">Nessuna sessione associata.</p>
</template>
