<script setup lang="ts">
import { computed, ref } from 'vue';
import D20Dice from '../components/D20Dice.vue';

type DiceId = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

interface DiceConfig {
  id: DiceId;
  label: string;
  sides: number;
}

const diceList: DiceConfig[] = [
  { id: 'd4',  label: 'd4',  sides: 4 },
  { id: 'd6',  label: 'd6',  sides: 6 },
  { id: 'd8',  label: 'd8',  sides: 8 },
  { id: 'd10', label: 'd10', sides: 10 },
  { id: 'd12', label: 'd12', sides: 12 },
  { id: 'd20', label: 'd20', sides: 20 },
];

const selectedDiceId = ref<DiceId>('d20');

// colore scelto via color picker (#RRGGBB)
const selectedColor = ref('#7f1d1d');

// conversione a numero esadecimale per D20Dice
const selectedColorHexNumber = computed(() =>
  parseInt(selectedColor.value.replace('#', ''), 16),
);

const selectedDice = computed(
  () => diceList.find((d) => d.id === selectedDiceId.value) ?? diceList[diceList.length - 1]!,
);
</script>

<template>
  <section class="dice-layout">
    <!-- Sidebar sinistra -->
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
    </aside>

    <!-- Area principale -->
    <main class="dice-main">
      <header class="dice-main-header">
        <h1 class="dice-main-title">
          Lanci rapidi
        </h1>
        <p class="dice-main-subtitle">
          Seleziona un dado a sinistra, scegli il colore e clicca il modello per tirare.
        </p>
      </header>

      <div class="dice-main-content">
        <!-- Per ora il 3D e implementato solo per il d20 -->
        <D20Dice
          v-if="selectedDiceId === 'd20'"
          :base-color="selectedColorHexNumber"
        />

        <!-- Placeholder per gli altri dadi -->
        <div
          v-else
          class="dice-placeholder"
        >
          <p>
            Il dado <strong>{{ selectedDice.label }}</strong> verra gestito in futuro con un modello 3D dedicato.
            Per ora la UI mostra solo il d20 3D.
          </p>
        </div>
      </div>
    </main>
  </section>
</template>

<style scoped>
.dice-layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1.5rem;
  align-items: flex-start;
}

.dice-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dice-sidebar-title {
  font-size: 0.95rem;
  font-weight: 600;
  opacity: 0.85;
}

.dice-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dice-pill {
  width: 100%;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: #e5e7eb;
  font-size: 0.85rem;
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
  gap: 0.35rem;
  font-size: 0.8rem;
}

.dice-color-picker input[type='color'] {
  width: 100%;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
  padding: 0;
}

.dice-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dice-main-header {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.dice-main-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.dice-main-subtitle {
  font-size: 0.85rem;
  opacity: 0.8;
}

.dice-main-content {
  display: flex;
  justify-content: flex-end;
}

.dice-placeholder {
  max-width: 380px;
  font-size: 0.85rem;
  opacity: 0.85;
  font-style: italic;
}
</style>
