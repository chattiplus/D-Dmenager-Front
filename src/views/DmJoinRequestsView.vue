<!-- src/views/DmJoinRequestsView.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  approveJoinRequest,
  getDmPendingJoinRequests,
  rejectJoinRequest,
} from '../api/campaignPlayersApi';
import type { CampaignPlayerResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

const requests = ref<CampaignPlayerResponse[]>([]);
const loading = ref(false);
const globalError = ref('');
const actionLoading = ref<number | null>(null);

const pendingCountLabel = computed(() => `${requests.value.length} in attesa`);

const formatRequestDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
};

const loadRequests = async () => {
  loading.value = true;
  globalError.value = '';
  try {
    requests.value = await getDmPendingJoinRequests();
  } catch (error) {
    globalError.value = extractApiErrorMessage(error, 'Impossibile caricare le richieste.');
  } finally {
    loading.value = false;
  }
};

const handleAction = async (
  request: CampaignPlayerResponse,
  action: 'approve' | 'reject',
) => {
  if (!request.campaignId || !request.id) return;
  actionLoading.value = request.id;
  globalError.value = '';
  try {
    if (action === 'approve') {
      await approveJoinRequest(request.campaignId, request.id);
    } else {
      await rejectJoinRequest(request.campaignId, request.id);
    }
    await loadRequests();
  } catch (error) {
    globalError.value = extractApiErrorMessage(error, 'Operazione non riuscita.');
  } finally {
    actionLoading.value = null;
  }
};

onMounted(() => {
  loadRequests();
});
</script>

<template>
  <section class="stack">
    <div class="card stack dm-requests-page">
      <header class="dm-requests-header">
        <div class="dm-requests-header__copy">
          <h1 class="section-title">Richieste da approvare</h1>
          <p class="section-subtitle">
            Approvare o rifiutare le richieste inviate dai player per entrare nelle tue campagne.
          </p>
        </div>
        <span v-if="requests.length" class="dm-requests-count">{{ pendingCountLabel }}</span>
      </header>

      <div v-if="loading" class="dm-requests-state">Caricamento richieste...</div>
      <p v-else-if="globalError" class="status-message text-danger">{{ globalError }}</p>

      <ul v-else-if="requests.length" class="dm-requests-list">
        <li v-for="request in requests" :key="request.id" class="dm-request-card">
          <header class="dm-request-card__header">
            <div class="dm-request-card__title-area">
              <h2 class="dm-request-card__player">{{ request.playerNickname ?? 'Player' }}</h2>
              <p class="dm-request-card__character">
                {{ request.characterName ?? `Personaggio #${request.characterId}` }}
              </p>
            </div>
            <span class="dm-request-status">In attesa</span>
          </header>

          <dl class="dm-request-meta">
            <div class="dm-request-meta__item">
              <dt>Campagna</dt>
              <dd>{{ request.campaignName ?? `Campagna #${request.campaignId}` }}</dd>
            </div>
            <div v-if="formatRequestDate(request.createdAt)" class="dm-request-meta__item">
              <dt>Data richiesta</dt>
              <dd>{{ formatRequestDate(request.createdAt) }}</dd>
            </div>
            <div v-if="request.message" class="dm-request-meta__item dm-request-meta__item--full">
              <dt>Messaggio</dt>
              <dd>{{ request.message }}</dd>
            </div>
          </dl>
          <div class="dm-request-actions">
            <button
              class="btn btn-link text-danger dm-request-action dm-request-action--reject"
              :disabled="actionLoading === request.id"
              @click="handleAction(request, 'reject')"
            >
              Rifiuta
            </button>
            <button
              class="btn btn-primary dm-request-action"
              :disabled="actionLoading === request.id"
              @click="handleAction(request, 'approve')"
            >
              {{ actionLoading === request.id ? 'Invio...' : 'Approva' }}
            </button>
          </div>
        </li>
      </ul>

      <div v-else class="dm-requests-empty">
        <h2>Nessuna richiesta da approvare</h2>
        <p>Quando un player chiederà di unirsi a una campagna, la richiesta apparirà qui.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dm-requests-page {
  gap: 1.15rem;
}

.dm-requests-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.dm-requests-header__copy {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.dm-requests-count,
.dm-request-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--app-accent) 42%, var(--app-surface-outline));
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-accent) 10%, transparent);
  color: var(--app-text);
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0.28rem 0.6rem;
  white-space: nowrap;
}

.dm-requests-state,
.dm-requests-empty {
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 68%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 78%, var(--app-surface));
  color: var(--app-text-muted);
  padding: 1rem;
}

.dm-requests-empty {
  display: grid;
  gap: 0.35rem;
  text-align: center;
}

.dm-requests-empty h2,
.dm-requests-empty p {
  margin: 0;
}

.dm-requests-empty h2 {
  color: var(--app-text);
  font-size: 1.1rem;
}

.dm-requests-list {
  display: grid;
  gap: 0.9rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.dm-request-card {
  display: grid;
  gap: 0.9rem;
  padding: clamp(1rem, 2vw, 1.25rem);
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 74%, transparent);
  border-radius: 1.1rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 80%, var(--app-surface));
  box-shadow: 0 12px 28px color-mix(in srgb, var(--app-shadow) 26%, transparent);
}

.dm-request-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
  min-width: 0;
}

.dm-request-card__title-area {
  min-width: 0;
}

.dm-request-card__player,
.dm-request-card__character {
  margin: 0;
  overflow-wrap: break-word;
}

.dm-request-card__player {
  color: var(--app-text);
  font-size: clamp(1.1rem, 2vw, 1.3rem);
  line-height: 1.15;
}

.dm-request-card__character {
  margin-top: 0.2rem;
  color: var(--app-text-muted);
  font-size: 0.92rem;
}

.dm-request-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  margin: 0;
}

.dm-request-meta__item {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 58%, transparent);
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 72%, transparent);
}

.dm-request-meta__item--full {
  grid-column: 1 / -1;
}

.dm-request-meta dt,
.dm-request-meta dd {
  margin: 0;
}

.dm-request-meta dt {
  color: var(--app-text-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.dm-request-meta dd {
  color: var(--app-text);
  line-height: 1.45;
  overflow-wrap: break-word;
}

.dm-request-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding-top: 0.15rem;
}

.dm-request-action {
  min-width: 7rem;
  justify-content: center;
}

.dm-request-action--reject {
  border: 1px solid color-mix(in srgb, var(--app-danger, #b91c1c) 28%, var(--app-surface-outline));
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-danger, #b91c1c) 8%, transparent);
  text-decoration: none;
}

@media (max-width: 640px) {
  .dm-requests-header,
  .dm-request-card__header {
    flex-direction: column;
  }

  .dm-request-meta {
    grid-template-columns: 1fr;
  }

  .dm-request-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .dm-request-action {
    min-width: 0;
  }
}
</style>
