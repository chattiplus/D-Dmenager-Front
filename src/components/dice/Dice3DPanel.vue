<script setup lang="ts">
import { computed, ref } from 'vue';
import Dice3D from '../Dice3D.vue';
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

type DiceId = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

interface DiceConfig {
  id: DiceId;
  label: string;
  sides: number;
  modelPath: string;
  faceOrientations: FaceOrientationMap;
  orientationValue?: (value: number) => number;
}

interface RollHistoryEntry {
  id: string;
  label: string;
  value: number;
  rolledAt: string;
}

const props = withDefaults(
  defineProps<{
    title?: string;
    compact?: boolean;
    initialDice?: DiceId;
  }>(),
  {
    title: 'Dadi',
    compact: false,
    initialDice: 'd20',
  },
);

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
  {
    id: 'd100',
    label: 'd100',
    sides: 100,
    modelPath: '/models/d10.glb',
    faceOrientations: D10_FACE_ORIENTATIONS,
    orientationValue: (value) => {
      const normalized = value % 10;
      return normalized === 0 ? 10 : normalized;
    },
  },
];

const selectedDiceId = ref<DiceId>(props.initialDice);
const selectedColor = ref('#7f1d1d');
const latestRoll = ref<RollHistoryEntry | null>(null);
const rollHistory = ref<RollHistoryEntry[]>([]);

const selectedConfig = computed(
  () => diceList.find((dice) => dice.id === selectedDiceId.value) ?? diceList[diceList.length - 1]!,
);

const selectedColorHexNumber = computed(() =>
  parseInt(selectedColor.value.replace('#', ''), 16),
);

const registerRoll = (result: DiceRollResponse) => {
  const entry: RollHistoryEntry = {
    id: `${result.sides}-${result.value}-${result.rolledAt}`,
    label: selectedConfig.value.label,
    value: result.value,
    rolledAt: result.rolledAt,
  };

  latestRoll.value = entry;
  rollHistory.value = [entry, ...rollHistory.value].slice(0, 10);
  return result;
};

const rollSelectedDice = async (): Promise<DiceRollResponse> => {
  const sides = selectedConfig.value.sides;
  const value = Math.floor(Math.random() * sides) + 1;
  return registerRoll({
    value,
    sides,
    rolledAt: new Date().toISOString(),
  });
};
</script>

<template>
  <section class="dice-panel" :class="{ 'dice-panel--compact': compact }">
    <header class="dice-panel__header">
      <div>
        <h2 class="dice-panel__title">{{ title }}</h2>
        <p v-if="latestRoll" class="dice-panel__subtitle">
          Ultimo tiro: <strong>{{ latestRoll.label }}</strong> = {{ latestRoll.value }}
        </p>
      </div>
    </header>

    <ul class="dice-list">
      <li v-for="dice in diceList" :key="dice.id">
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
        <input v-model="selectedColor" type="color" />
      </label>
    </div>

    <div v-if="selectedConfig" class="dice-panel__viewer">
      <Dice3D
        :key="selectedConfig.id"
        :model-path="selectedConfig.modelPath"
        :sides="selectedConfig.sides"
        :face-orientations="selectedConfig.faceOrientations"
        :base-color="selectedColorHexNumber"
        :roll-fn="rollSelectedDice"
        :get-orientation-value="selectedConfig.orientationValue"
      />
    </div>

    <section class="dice-history">
      <header class="dice-history__header">
        <h3 class="dice-history__title">Storico tiri</h3>
        <span class="dice-history__count">{{ rollHistory.length }}/10</span>
      </header>

      <p v-if="!rollHistory.length" class="dice-history__empty">
        Nessun tiro ancora.
      </p>

      <ol v-else class="dice-history__list">
        <li v-for="entry in rollHistory" :key="entry.id" class="dice-history__item">
          <div>
            <strong>{{ entry.label }}</strong>
            <span>{{ entry.value }}</span>
          </div>
          <small>{{ new Date(entry.rolledAt).toLocaleTimeString() }}</small>
        </li>
      </ol>
    </section>
  </section>
</template>

<style scoped>
.dice-panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  width: 260px;
  flex-shrink: 0;
}

.dice-panel--compact {
  width: min(100%, 320px);
}

.dice-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.dice-panel__title {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.dice-panel__subtitle {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: rgba(229, 231, 235, 0.8);
}

.dice-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.dice-pill {
  width: 100%;
  min-height: 44px;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: #e5e7eb;
  font-size: 0.84rem;
  text-align: center;
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
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.dice-panel__viewer {
  display: flex;
  justify-content: center;
}

.dice-history {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 1rem;
  padding: 0.8rem;
  background: rgba(15, 23, 42, 0.45);
}

.dice-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
}

.dice-history__title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(226, 232, 240, 0.7);
}

.dice-history__count {
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.55);
}

.dice-history__empty {
  font-size: 0.82rem;
  color: rgba(226, 232, 240, 0.72);
}

.dice-history__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.dice-history__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 0.75rem;
  padding: 0.5rem 0.6rem;
  background: rgba(255, 255, 255, 0.04);
}

.dice-history__item div {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}

.dice-history__item span {
  font-weight: 700;
}

.dice-history__item small {
  color: rgba(226, 232, 240, 0.6);
}
</style>
