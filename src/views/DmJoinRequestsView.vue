<!-- src/views/DmJoinRequestsView.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';
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
    <div class="card stack">
      <header>
        <h1 class="section-title">Richieste di partecipazione</h1>
        <p class="section-subtitle">
          Approvare o rifiutare le richieste inviate dai player per entrare nelle tue campagne.
        </p>
      </header>

      <div v-if="loading">Caricamento richieste...</div>
      <p v-else-if="globalError" class="status-message text-danger">{{ globalError }}</p>

      <ul v-else-if="requests.length" class="list-stack">
        <li v-for="request in requests" :key="request.id" class="card stack">
          <h3 class="card-title">
            {{ request.campaignName ?? 'Campagna #'+request.campaignId }}
          </h3>
          <p class="card-subtitle">
            {{ request.characterName ?? 'Personaggio #'+request.characterId }} ·
            {{ request.playerNickname ?? 'Player' }}
          </p>
          <p class="world-meta">Status: {{ request.status }}</p>
          <p v-if="request.message" class="muted">Messaggio: {{ request.message }}</p>
          <div class="actions">
            <button
              class="btn btn-secondary"
              :disabled="actionLoading === request.id"
              @click="handleAction(request, 'approve')"
            >
              {{ actionLoading === request.id ? 'Invio...' : 'Approva' }}
            </button>
            <button
              class="btn btn-link text-danger"
              :disabled="actionLoading === request.id"
              @click="handleAction(request, 'reject')"
            >
              Rifiuta
            </button>
          </div>
        </li>
      </ul>

      <p v-else class="muted">Nessuna richiesta in attesa.</p>
    </div>
  </section>
</template>
