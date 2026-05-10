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
    <div class="card stack public-worlds-page">
      <header class="public-worlds-header">
        <div class="public-worlds-header__copy">
          <h1 class="section-title">Mondi pubblici</h1>
          <p class="section-subtitle">
            Esplora i mondi condivisi dai Dungeon Master e scegli una campagna a cui unirti.
          </p>
        </div>
      </header>

      <div v-if="loading" class="public-worlds-state">Caricamento mondi pubblici...</div>
      <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

      <div v-else class="public-worlds-content">
        <p v-if="joinRequestWarning" class="status-message text-danger">
          {{ joinRequestWarning }}
        </p>
        <label class="field public-worlds-search">
          <span>Cerca</span>
          <input v-model="searchQuery" type="text" placeholder="Cerca mondi o campagne..." />
        </label>
        <div class="public-worlds-summary" aria-label="Riepilogo mondi pubblici">
          <span>Mondi: {{ visibleWorldsCount }} / {{ totalWorlds }}</span>
          <span>Campagne: {{ visibleCampaignsCount }} / {{ totalCampaigns }}</span>
        </div>
        <div v-if="filteredWorlds.length" class="public-worlds-list">
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
        </div>
        <div v-else class="public-worlds-empty">
          <h2>Nessun mondo pubblico disponibile</h2>
          <p>Quando un Dungeon Master renderà pubblico un mondo, apparirà qui.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.public-worlds-page,
.public-worlds-content,
.public-worlds-list {
  gap: 1.15rem;
}

.public-worlds-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.public-worlds-header__copy {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.public-worlds-content,
.public-worlds-list {
  display: grid;
}

.public-worlds-search {
  max-width: 42rem;
}

.public-worlds-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.public-worlds-summary span {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 68%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-surface-elevated) 78%, var(--app-surface));
  color: var(--app-text-muted);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.28rem 0.65rem;
}

.public-worlds-state,
.public-worlds-empty {
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 68%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 78%, var(--app-surface));
  color: var(--app-text-muted);
  padding: 1rem;
}

.public-worlds-empty {
  display: grid;
  gap: 0.35rem;
  text-align: center;
}

.public-worlds-empty h2,
.public-worlds-empty p {
  margin: 0;
}

.public-worlds-empty h2 {
  color: var(--app-text);
  font-size: 1.1rem;
}

@media (max-width: 640px) {
  .public-worlds-page,
  .public-worlds-content,
  .public-worlds-list {
    gap: 0.95rem;
  }
}
</style>
