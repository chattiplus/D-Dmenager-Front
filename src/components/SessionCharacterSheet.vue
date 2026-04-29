<script setup lang="ts">
import { computed } from 'vue';
import type { NpcResponse, PlayerCharacterResponse } from '../types/api';
import NpcCharacterSheetPanel from './session/character-sheet/NpcCharacterSheetPanel.vue';
import PlayerCharacterSheetPanel from './session/character-sheet/PlayerCharacterSheetPanel.vue';

const props = defineProps<{
  character: PlayerCharacterResponse | NpcResponse;
  type: 'PC' | 'NPC';
  isGm: boolean;
}>();

const emit = defineEmits<{
  'character-updated': [character: PlayerCharacterResponse];
  'npc-updated': [npc: NpcResponse];
}>();

const playerCharacter = computed(() => props.character as PlayerCharacterResponse);
const npcCharacter = computed(() => props.character as NpcResponse);
</script>

<template>
  <PlayerCharacterSheetPanel
    v-if="type === 'PC'"
    :character="playerCharacter"
    :is-gm="isGm"
    @character-updated="emit('character-updated', $event)"
  />
  <NpcCharacterSheetPanel
    v-else
    :character="npcCharacter"
    :is-gm="isGm"
    @npc-updated="emit('npc-updated', $event)"
  />
</template>
