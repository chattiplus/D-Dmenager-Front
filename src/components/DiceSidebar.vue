<script setup lang="ts">
import { computed, ref } from 'vue';
import Dice3D from './Dice3D.vue';
import { rollDice } from '../api/diceApi';
import type { DiceRollResponse } from '../types/api';

type DiceId = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

type FaceOrientationMap = Record<number, [number, number, number, number]>;

interface DiceConfig {
  id: DiceId;
  label: string;
  sides: number;
  modelPath: string;
  faceOrientations: FaceOrientationMap;
}

const diceList: DiceConfig[] = [
  {
    id: 'd4',
    label: 'd4',
    sides: 4,
    modelPath: '/models/d4.glb',
    faceOrientations: {} as FaceOrientationMap,
  },
  {
    id: 'd6',
    label: 'd6',
    sides: 6,
    modelPath: '/models/d6.glb',
    faceOrientations: {} as FaceOrientationMap,
  },
  {
    id: 'd8',
    label: 'd8',
    sides: 8,
    modelPath: '/models/d8.glb',
    faceOrientations: {} as FaceOrientationMap,
  },
  {
    id: 'd10',
    label: 'd10',
    sides: 10,
    modelPath: '/models/d10.glb',
    faceOrientations: {} as FaceOrientationMap,
  },
  {
    id: 'd12',
    label: 'd12',
    sides: 12,
    modelPath: '/models/d12.glb',
    faceOrientations: {} as FaceOrientationMap,
  },
  {
    id: 'd20',
    label: 'd20',
    sides: 20,
    modelPath: '/models/d20.glb',
    faceOrientations: {} as FaceOrientationMap,
  },
];

const selectedDiceId = ref<DiceId>('d20');
const selectedColor = ref('#7f1d1d');

const selectedColorHexNumber = computed(() =>
  parseInt(selectedColor.value.replace('#', ''), 16),
);

const selectedConfig = computed(
  () => diceList.find((d) => d.id === selectedDiceId.value) ?? diceList[diceList.length - 1],
);

const selectedRollFn = computed<() => Promise<DiceRollResponse>>(() => {
  const cfg = selectedConfig.value;
  return () => rollDice(cfg.sides);
});
</script>

<template>
  <aside class="dice-sidebar">
    <h2 class="dice-sidebar-title">Dadi</h2>

    <ul class="dice-list">
      <li
        v-for="dice in diceList"
        :key="dice.id"
      >
        <button
          class="dice-pill"
          :class="{ active: dice.id === selectedDiceId }"
          type="button"
          @click="selectedDiceId = dice.id"
        >
          {{ dice.label }}
        </button>
      </li>
    </ul>

    <div class="dice-color-picker">
      <label>
        <span>Colore del dado</span>
        <input
          v-model="selectedColor"
          type="color"
        />
      </label>
    </div>

    <div class="dice-sidebar-die" v-if="selectedConfig">
      <Dice3D
        :key="selectedConfig.id"
        :model-path="selectedConfig.modelPath"
        :sides="selectedConfig.sides"
        :face-orientations="selectedConfig.faceOrientations"
        :base-color="selectedColorHexNumber"
        :roll-fn="selectedRollFn"
      />
    </div>
  </aside>
</template>

<style scoped>
.dice-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 260px;
  flex-shrink: 0;
}

.dice-sidebar-title {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.dice-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dice-pill {
  width: 100%;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: #e5e7eb;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease-out,
    border-color 0.15s ease-out,
    transform 0.1s ease-out;
}

.dice-pill:hover {
  background: rgba(30, 64, 175, 0.7);
  border-color: rgba(129, 140, 248, 0.9);
  transform: translateY(-1px);
}

.dice-pill.active {
  background: rgba(79, 70, 229, 0.75);
  border-color: rgba(191, 219, 254, 0.9);
}

.dice-color-picker label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
}

.dice-color-picker input[type='color'] {
  width: 100%;
  height: 1.9rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.dice-sidebar-die {
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
}

</style>
