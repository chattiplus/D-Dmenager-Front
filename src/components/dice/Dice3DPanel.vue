<script setup lang="ts">
import { computed, ref } from 'vue';
import Dice3D from '../Dice3D.vue';
import { rollDice } from '../../api/diceApi';
import type { DiceRollResponse } from '../../types/api';
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

const selectedDiceId = ref<DiceId>('d20');
const selectedColor = ref('#7f1d1d');

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
</script>

<template>
  <section class="dice-panel" :class="{ 'dice-panel--compact': compact }">
    <header class="dice-panel__header">
      <div>
        <h2 class="dice-panel__title">Dadi</h2>
        <p class="dice-panel__subtitle">Usa lo stesso dado 3D della dashboard.</p>
      </div>
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
        v-model="selectedColor"
        type="color"
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

.dice-panel__subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: rgba(226, 232, 240, 0.72);
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
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.32);
  color: #e5e7eb;
  font-size: 0.78rem;
  text-align: center;
  cursor: pointer;
  transition:
    background 0.15s ease-out,
    border-color 0.15s ease-out,
    transform 0.1s ease-out;
}

.dice-panel__pill:hover {
  background: rgba(30, 64, 175, 0.64);
  border-color: rgba(129, 140, 248, 0.82);
  transform: translateY(-1px);
}

.dice-panel__pill.active {
  background: rgba(79, 70, 229, 0.72);
  border-color: rgba(191, 219, 254, 0.9);
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
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.dice-panel__die {
  display: flex;
  justify-content: center;
  min-width: 0;
}

@media (max-width: 480px) {
  .dice-panel__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
