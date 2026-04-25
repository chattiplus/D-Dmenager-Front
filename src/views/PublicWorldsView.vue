<!-- src/views/PublicWorldsView.vue -->
<script setup lang="ts">
import PublicWorldCard from '../components/public-worlds/PublicWorldCard.vue';
import { usePublicWorldsSlice } from '../composables/publicWorlds/usePublicWorldsSlice';

const {
  canRequest,
  characters,
  errorMessage,
  isViewerOnly,
  joinRequestWarning,
  loading,
  statusLabel,
  submitJoinRequest,
  worlds,
} = usePublicWorldsSlice();
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Mondi pubblici</h1>
        <p class="section-subtitle">
          Sfoglia le campagne aperte e invia la tua richiesta di partecipazione usando i personaggi creati.
        </p>
      </header>

      <div v-if="loading">Caricamento mondi pubblici...</div>
      <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

      <div v-else class="stack">
        <p v-if="joinRequestWarning" class="status-message text-danger">
          {{ joinRequestWarning }}
        </p>
        <PublicWorldCard
          v-for="card in worlds"
          :key="card.world.id"
          :card="card"
          :characters="characters"
          :is-viewer-only="isViewerOnly"
          :status-label="statusLabel"
          :can-request="canRequest"
          @submit-join-request="submitJoinRequest"
        />
      </div>
    </div>
  </section>
</template>
