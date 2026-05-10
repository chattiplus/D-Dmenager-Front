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

const formatSessionDate = (sessionDate?: string | null) => {
  if (!sessionDate) {
    return 'Non pianificata';
  }

  const parsedDate = new Date(`${sessionDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return sessionDate;
  }

  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
};

const formatSessionTime = (startTime?: string | null) => startTime?.slice(0, 5) ?? null;
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
  <ul v-else-if="sessions.length" class="list-grid campaign-session-list">
    <li v-for="session in sessions" :key="session.id" class="card campaign-session-card">
      <div class="campaign-session-card__header">
        <div class="campaign-session-card__title-area">
          <h4 class="card-title campaign-session-card__title">{{ session.title }}</h4>
          <div class="campaign-session-card__badges">
            <span class="campaign-session-card__number">#{{ session.sessionNumber }}</span>
          <span class="session-status-badge" :class="{ closed: session.status === 'CLOSED' }">
            {{ session.status === 'CLOSED' ? 'Chiusa' : 'Aperta' }}
          </span>
          </div>
        </div>
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
      <div class="campaign-session-card__info">
        <div class="campaign-session-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm12 8H5v9h14v-9ZM5 8h14V6H5v2Z"
            />
          </svg>
        </div>
        <p>
          {{ formatSessionDate(session.sessionDate) }}
          <span v-if="formatSessionTime(session.startTime)">alle {{ formatSessionTime(session.startTime) }}</span>
        </p>
      </div>
      <p class="campaign-session-card__notes">{{ session.notes || 'Nessuna nota.' }}</p>
    </li>
  </ul>
  <p v-else class="muted">Nessuna sessione programmata.</p>
</template>

<style scoped>
.campaign-sessions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  margin-top: 0.25rem;
}

.campaign-sessions-header__main,
.campaign-session-card__title {
  flex: 1 1 auto;
  min-width: 0;
}

.campaign-sessions-header__action,
.campaign-session-card__action {
  flex-shrink: 0;
}

.campaign-session-list {
  gap: 0.85rem;
}

.campaign-session-card {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 72%, transparent);
  border-radius: 1.05rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 78%, var(--app-surface));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--app-shadow) 24%, transparent);
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
  gap: 1rem;
  min-width: 0;
}

.campaign-session-card__title-area {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.campaign-session-card__title {
  margin: 0;
  color: var(--app-text);
  line-height: 1.15;
  overflow-wrap: break-word;
  word-break: normal;
}

.campaign-session-card__badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.campaign-session-card__number {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 68%, transparent);
  border-radius: 999px;
  color: var(--app-text-muted);
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
}

.session-status-badge {
  border: 1px solid color-mix(in srgb, var(--app-accent) 45%, var(--app-surface-outline));
  border-radius: 999px;
  color: var(--app-text);
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
}

.session-status-badge.closed {
  border-color: var(--app-surface-outline);
  color: var(--app-text-muted);
}

.campaign-session-card__info {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  gap: 0.7rem;
  align-items: center;
  min-width: 0;
  color: var(--app-text-muted);
}

.campaign-session-card__icon {
  display: grid;
  place-items: center;
  width: 2.15rem;
  height: 2.15rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 28%, var(--app-surface-outline));
  border-radius: 0.78rem;
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface-elevated));
  color: var(--app-accent-strong);
}

.campaign-session-card__icon svg {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}

.campaign-session-card__info p,
.campaign-session-card__notes {
  margin: 0;
  overflow-wrap: break-word;
}

.campaign-session-card__info span {
  color: var(--app-text);
  font-weight: 700;
}

.campaign-session-card__notes {
  color: var(--app-text);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .campaign-session-card {
    padding: 0.9rem;
    border-radius: 0.95rem;
  }

  .campaign-session-card__header {
    gap: 0.75rem;
  }

  .campaign-session-card__actions {
    gap: 0.35rem;
  }
}
</style>
