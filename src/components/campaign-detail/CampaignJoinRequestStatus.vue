<script setup lang="ts">
import type { CampaignPlayerResponse } from '../../types/api';

defineProps<{
  loadingJoinRequest: boolean;
  joinRequestError: string;
  myJoinRequest: CampaignPlayerResponse | null;
}>();
</script>

<template>
  <section class="stack">
    <h3>Stato richiesta di accesso</h3>
    <p v-if="loadingJoinRequest">Verifica stato...</p>
    <p v-else-if="joinRequestError" class="status-message text-danger">{{ joinRequestError }}</p>
    <template v-else>
      <p v-if="myJoinRequest" class="status-message">
        Stato: {{ myJoinRequest.status }}
        <span v-if="myJoinRequest.message">- "{{ myJoinRequest.message }}"</span>
      </p>
      <p v-else class="muted">
        Nessuna richiesta inviata. Torna alla sezione "Mondi pubblici" per inoltrarla.
      </p>
    </template>
  </section>
</template>
