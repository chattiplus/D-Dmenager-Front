<!-- src/views/PublicWorldsView.vue -->
<script setup lang="ts">
import PublicWorldCard from '../components/public-worlds/PublicWorldCard.vue';
import { usePublicWorldsSlice } from '../composables/publicWorlds/usePublicWorldsSlice';

const {
  canRequest,
  characters,
  errorMessage,
  filteredWorlds,
  isViewerOnly,
  joinRequestWarning,
  loading,
  searchQuery,
  statusLabel,
  submitJoinRequest,
  totalCampaigns,
  totalWorlds,
  visibleCampaignsCount,
  visibleWorldsCount,
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
        <label class="field">
          <span>Cerca</span>
          <input v-model="searchQuery" type="text" placeholder="Cerca mondi o campagne..." />
        </label>
        <p class="manager-meta">
          Mondi: {{ visibleWorldsCount }} / {{ totalWorlds }} | Campagne: {{ visibleCampaignsCount }} / {{ totalCampaigns }}
        </p>
        <PublicWorldCard
          v-for="card in filteredWorlds"
          :key="card.world.id"
          :card="card"
          :characters="characters"
          :is-viewer-only="isViewerOnly"
          :status-label="statusLabel"
          :can-request="canRequest"
          @submit-join-request="submitJoinRequest"
        />
        <p v-if="!filteredWorlds.length" class="muted">Nessun mondo o campagna trovato.</p>
      </div>
    </div>
  </section>
</template>
