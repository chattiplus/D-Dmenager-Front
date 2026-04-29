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
  <aside class="sheet-selector card">
    <h4 class="sheet-selector__title">Giocatori</h4>
    <p v-if="playerSheetError" class="status-message text-danger">
      {{ playerSheetError }}
    </p>
    <div class="sheet-selector__list">
      <template v-for="player in campaignPlayers" :key="player.id">
        <button
          v-if="player.characterId"
          type="button"
          class="sheet-selector__item sheet-selector__item--player"
          :class="{
            'is-active':
              selectedSheetCharacter?.id === player.characterId &&
              selectedSheetType === 'PC',
            'is-loading': loadingPlayerSheetId === player.characterId,
          }"
          :disabled="loadingPlayerSheetId === player.characterId"
          @click="emit('selectPlayerCharacter', player)"
        >
          <span class="sheet-selector__item-label">PG</span>
          <span v-if="loadingPlayerSheetId === player.characterId">Caricamento...</span>
          <span v-else class="sheet-selector__item-text">
            {{ player.characterName ?? 'Personaggio' }} ({{ player.playerNickname ?? 'Player' }})
          </span>
        </button>
      </template>
      <div v-if="!campaignPlayers.some((player) => player.characterId)" class="muted p-1">
        Nessun PG
      </div>
    </div>

    <h4 class="sheet-selector__title sheet-selector__title--spaced">NPCs</h4>
    <div class="sheet-selector__list">
      <button
        v-for="npc in npcs"
        :key="npc.id"
        type="button"
        class="sheet-selector__item sheet-selector__item--npc"
        :class="{ 'is-active': selectedSheetCharacter?.id === npc.id && selectedSheetType === 'NPC' }"
        @click="emit('selectNpcCharacter', npc)"
      >
        <span class="sheet-selector__item-label">NPC</span>
        <span class="sheet-selector__item-text">{{ npc.name }}</span>
      </button>
      <div v-if="!npcs.length" class="muted p-1">Nessun NPC</div>
    </div>
  </aside>
</template>

<style scoped>
.sheet-selector {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem;
  min-width: 0;
}

.sheet-selector__title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-text-muted);
}

.sheet-selector__title--spaced {
  margin-top: 0.9rem;
}

.sheet-selector__list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.sheet-selector__item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  min-width: 0;
  padding: 0.7rem 0.85rem;
  border-radius: 0.9rem;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-bg-soft) 58%, transparent);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.sheet-selector__item:hover:not(:disabled) {
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-bg-soft));
  border-color: color-mix(in srgb, var(--app-accent) 28%, var(--app-surface-outline));
  transform: translateY(-1px);
}

.sheet-selector__item:focus-visible {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 2px var(--app-focus-ring);
}

.sheet-selector__item:disabled {
  opacity: 0.72;
  cursor: progress;
}

.sheet-selector__item.is-active {
  border-color: var(--app-accent);
  background: color-mix(in srgb, var(--app-accent) 14%, var(--app-surface-elevated));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--app-shadow) 72%, transparent);
}

.sheet-selector__item-label {
  flex: 0 0 auto;
  min-width: 2.6rem;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--app-accent) 30%, transparent);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-accent-strong);
  text-align: center;
}

.sheet-selector__item-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

:root[data-theme='arcane'] .sheet-selector__item {
  background: linear-gradient(180deg, rgba(30, 18, 7, 0.94), rgba(18, 11, 3, 0.94));
  border-color: rgba(201, 168, 76, 0.18);
}

:root[data-theme='arcane'] .sheet-selector__item--player .sheet-selector__item-label {
  border-color: rgba(201, 168, 76, 0.28);
  color: var(--arcane-gold-light);
}

:root[data-theme='arcane'] .sheet-selector__item--npc .sheet-selector__item-label {
  border-color: rgba(176, 53, 53, 0.32);
  color: var(--arcane-crimson-light);
}

:root[data-theme='arcane'] .sheet-selector__item--player.is-active {
  background: linear-gradient(180deg, rgba(45, 30, 10, 0.98), rgba(24, 15, 4, 0.98));
  border-color: rgba(201, 168, 76, 0.4);
}

:root[data-theme='arcane'] .sheet-selector__item--npc.is-active {
  background: linear-gradient(180deg, rgba(52, 20, 12, 0.98), rgba(24, 10, 6, 0.98));
  border-color: rgba(176, 53, 53, 0.42);
}
</style>
