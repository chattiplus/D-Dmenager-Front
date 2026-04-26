<script setup lang="ts">
import type {
  CampaignPlayerResponse,
  NpcResponse,
  PlayerCharacterResponse,
} from '../../../types/api';

defineProps<{
  campaignPlayers: CampaignPlayerResponse[];
  npcs: NpcResponse[];
  selectedSheetCharacter: NpcResponse | PlayerCharacterResponse | null;
  selectedSheetType: 'PC' | 'NPC';
  loadingPlayerSheetId: number | null;
  playerSheetError: string;
}>();

const emit = defineEmits<{
  selectPlayerCharacter: [player: CampaignPlayerResponse];
  selectNpcCharacter: [npc: NpcResponse];
}>();
</script>

<template>
  <aside class="chat-sidebar card">
    <h4 class="sidebar-title">Giocatori</h4>
    <p v-if="playerSheetError" class="status-message text-danger">
      {{ playerSheetError }}
    </p>
    <div class="private-list">
      <template v-for="player in campaignPlayers" :key="player.id">
        <button
          v-if="player.characterId"
          class="channel-btn"
          :class="{
            active:
              selectedSheetCharacter?.id === player.characterId &&
              selectedSheetType === 'PC',
          }"
          :disabled="loadingPlayerSheetId === player.characterId"
          @click="emit('selectPlayerCharacter', player)"
        >
          <span v-if="loadingPlayerSheetId === player.characterId">Caricamento...</span>
          <span v-else>
            {{ player.characterName ?? 'Personaggio' }} ({{ player.playerNickname ?? 'Player' }})
          </span>
        </button>
      </template>
      <div v-if="!campaignPlayers.some((player) => player.characterId)" class="muted p-1">
        Nessun PG
      </div>
    </div>

    <h4 class="sidebar-title mt-2">NPCs</h4>
    <div class="private-list">
      <button
        v-for="npc in npcs"
        :key="npc.id"
        class="channel-btn"
        :class="{ active: selectedSheetCharacter?.id === npc.id && selectedSheetType === 'NPC' }"
        @click="emit('selectNpcCharacter', npc)"
      >
        {{ npc.name }}
      </button>
      <div v-if="!npcs.length" class="muted p-1">Nessun NPC</div>
    </div>
  </aside>
</template>
