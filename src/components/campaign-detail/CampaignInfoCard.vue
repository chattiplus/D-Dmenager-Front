<script setup lang="ts">
import type { CampaignResponse } from '../../types/api';

defineProps<{
  campaign: CampaignResponse;
}>();
</script>

<template>
  <article class="card muted stack">
    <h2 class="card-title">{{ campaign.name }}</h2>
    <p>{{ campaign.description || 'Nessuna descrizione.' }}</p>
    <p class="world-meta">Status: {{ campaign.status }}</p>
    <p class="world-meta">
      Owner: {{ campaign.ownerNickname ?? 'N/D' }} (#{{ campaign.ownerId ?? 'ƒ?"' }})
    </p>
    <p class="world-meta">World ID: {{ campaign.worldId }}</p>
  </article>
</template>
