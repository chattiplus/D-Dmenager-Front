<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dice3D from '../Dice3D.vue';
import { rollDice } from '../../api/diceApi';
import type { DiceRollResponse } from '../../types/api';
import { useTheme } from '../../composables/useTheme';
import {
  D10_FACE_ORIENTATIONS,
  D12_FACE_ORIENTATIONS,
  D20_FACE_ORIENTATIONS,
  D4_FACE_ORIENTATIONS,
  D6_FACE_ORIENTATIONS,
  D8_FACE_ORIENTATIONS,
  type FaceOrientationMap,
} from '../../config/diceOrientations';

type DiceId = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

interface DiceConfig {
  id: DiceId;
  label: string;
  sides: number;
  modelPath: string;
  faceOrientations: FaceOrientationMap;
}

withDefaults(defineProps<{
  compact?: boolean;
}>(), {
  compact: false,
});

const diceList: DiceConfig[] = [
  {
    id: 'd4',
    label: 'd4',
    sides: 4,
    modelPath: '/models/d4.glb',
    faceOrientations: D4_FACE_ORIENTATIONS,
  },
  {
    id: 'd6',
    label: 'd6',
    sides: 6,
    modelPath: '/models/d6.glb',
    faceOrientations: D6_FACE_ORIENTATIONS,
  },
  {
    id: 'd8',
    label: 'd8',
    sides: 8,
    modelPath: '/models/d8.glb',
    faceOrientations: D8_FACE_ORIENTATIONS,
  },
  {
    id: 'd10',
    label: 'd10',
    sides: 10,
    modelPath: '/models/d10.glb',
    faceOrientations: D10_FACE_ORIENTATIONS,
  },
  {
    id: 'd12',
    label: 'd12',
    sides: 12,
    modelPath: '/models/d12.glb',
    faceOrientations: D12_FACE_ORIENTATIONS,
  },
  {
    id: 'd20',
    label: 'd20',
    sides: 20,
    modelPath: '/models/d20.glb',
    faceOrientations: D20_FACE_ORIENTATIONS,
  },
];

const { currentTheme } = useTheme();
const selectedDiceId = ref<DiceId>('d20');
const selectedColor = ref(currentTheme.value.diceDefaultColor ?? '#7f1d1d');
const hasManualColorOverride = ref(false);

const selectedColorHexNumber = computed(() =>
  parseInt(selectedColor.value.replace('#', ''), 16),
);

const selectedConfig = computed(
  () => diceList.find((d) => d.id === selectedDiceId.value) ?? diceList[diceList.length - 1]!,
);

const selectedRollFn = computed<() => Promise<DiceRollResponse>>(() => {
  const cfg = selectedConfig.value;
  return () => rollDice(cfg.sides);
});

watch(
  currentTheme,
  (theme) => {
    if (!hasManualColorOverride.value) {
      selectedColor.value = theme.diceDefaultColor ?? '#7f1d1d';
    }
  },
  { immediate: true },
);

const handleColorInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  selectedColor.value = target.value;
  hasManualColorOverride.value = true;
};
</script>

<template>
  <section class="dice-panel" :class="{ 'dice-panel--compact': compact }">
    <header class="dice-panel__header">
      <h2 class="dice-panel__title">Dadi</h2>
    </header>

    <ul class="dice-panel__list">
      <li
        v-for="dice in diceList"
        :key="dice.id"
      >
        <button
          class="dice-panel__pill"
          :class="{ active: dice.id === selectedDiceId }"
          type="button"
          @click="selectedDiceId = dice.id"
        >
          {{ dice.label }}
        </button>
      </li>
    </ul>

    <label class="dice-panel__color-picker">
      <span>Colore del dado</span>
      <input
        :value="selectedColor"
        type="color"
        @input="handleColorInput"
      />
    </label>

    <div class="dice-panel__die" v-if="selectedConfig">
      <Dice3D
        :key="selectedConfig.id"
        :model-path="selectedConfig.modelPath"
        :sides="selectedConfig.sides"
        :face-orientations="selectedConfig.faceOrientations"
        :base-color="selectedColorHexNumber"
        :roll-fn="selectedRollFn"
      />
    </div>
  </section>
</template>

<style scoped>
.dice-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
}

.dice-panel--compact {
  gap: 0.75rem;
}

.dice-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.dice-panel__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.dice-panel__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
}

.dice-panel__pill {
  width: 100%;
  border-radius: 999px;
  padding: 0.42rem 0.6rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 86%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-text-muted) 28%, transparent);
  color: var(--app-text);
  font-size: 0.78rem;
  text-align: center;
  cursor: pointer;
  transition:
    background 0.15s ease-out,
    border-color 0.15s ease-out,
    transform 0.1s ease-out;
}

.dice-panel__pill:hover {
  background: color-mix(in srgb, var(--app-accent) 18%, var(--app-surface-elevated));
  border-color: color-mix(in srgb, var(--app-accent-strong) 60%, transparent);
  transform: translateY(-1px);
}

.dice-panel__pill.active {
  background: color-mix(in srgb, var(--app-accent) 28%, var(--app-surface-elevated));
  border-color: color-mix(in srgb, var(--app-accent-strong) 82%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--app-accent-strong) 18%, transparent);
}

.dice-panel__color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.78rem;
}

.dice-panel__color-picker input[type='color'] {
  width: 100%;
  height: 2rem;
  border-radius: 0.6rem;
  border: 1px solid var(--app-input-border);
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.dice-panel__die {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
  width: 100%;
  min-height: 15rem;
  padding: 0.85rem;
  border-radius: 1rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-text-muted) 18%, transparent);
  overflow: visible;
}

.dice-panel--compact .dice-panel__die {
  min-height: 13rem;
}

@media (max-width: 480px) {
  .dice-panel__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
