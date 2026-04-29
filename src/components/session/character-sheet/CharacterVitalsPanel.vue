<script setup lang="ts">
const props = defineProps<{
  currentHp?: number | null;
  maxHp?: number | null;
  armorClass?: number | null;
  speed?: number | string | null;
  canEdit: boolean;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  'update-hp': [value: number];
}>();

const normalizeHp = (value: unknown) => {
  const fallback = Number(props.currentHp ?? 0);
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed)
    ? parsed
    : (Number.isFinite(fallback) ? fallback : 0);
  const normalized = Math.trunc(safeValue);
  const nonNegative = Math.max(0, normalized);
  const maxHp = Number(props.maxHp ?? 0);

  if (Number.isFinite(maxHp) && maxHp > 0) {
    return Math.min(maxHp, nonNegative);
  }

  return nonNegative;
};

const onHpInput = (event: Event) => {
  if (!props.canEdit || props.readOnly) {
    return;
  }

  const target = event.target as HTMLInputElement;
  const normalizedHp = normalizeHp(target.value);
  emit('update-hp', normalizedHp);
  target.value = String(normalizedHp);
};

const updateHpByDelta = (delta: number) => {
  if (!props.canEdit || props.readOnly) {
    return;
  }

  emit('update-hp', normalizeHp(Number(props.currentHp ?? 0) + delta));
};
</script>

<template>
  <div class="vitals-grid">
    <div class="vital-card hp-card">
      <label>HP</label>
      <div class="hp-controls">
        <button v-if="canEdit && !readOnly" type="button" @click="updateHpByDelta(-1)">-</button>
        <input
          class="hp-input"
          type="number"
          :value="currentHp ?? 0"
          min="0"
          :max="maxHp ?? undefined"
          step="1"
          inputmode="numeric"
          :readonly="readOnly || !canEdit"
          @input="onHpInput"
        >
        <span class="denom">/ {{ maxHp ?? 0 }}</span>
        <button v-if="canEdit && !readOnly" type="button" @click="updateHpByDelta(1)">+</button>
      </div>
    </div>

    <div class="vital-card">
      <label>AC</label>
      <div class="val">{{ armorClass ?? '-' }}</div>
    </div>

    <div class="vital-card">
      <label>SPEED</label>
      <div class="val">{{ speed ?? '-' }}</div>
    </div>
  </div>
</template>

<style scoped>
.vitals-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  width: 100%;
  min-width: 0;
}

.vital-card {
  background: rgba(21, 28, 46, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  padding: 0.75rem 0.9rem;
  border-radius: 0.95rem;
  text-align: center;
  min-width: 0;
}

.vital-card label {
  display: block;
  font-size: 0.7rem;
  color: #a0aec0;
  font-weight: bold;
  text-transform: uppercase;
}

.vital-card .val {
  font-size: 1.5rem;
  font-weight: bold;
}

.hp-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
  justify-content: center;
  flex-wrap: wrap;
}

.hp-controls input {
  width: 4.5rem;
  min-width: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.65rem;
  color: white;
  font-size: 1.2rem;
  padding: 0.45rem 0.35rem;
  text-align: center;
  font-weight: bold;
}

.hp-controls input:focus {
  outline: none;
  border-color: rgba(99, 179, 237, 0.72);
  box-shadow: 0 0 0 2px rgba(99, 179, 237, 0.18);
}

.hp-input {
  appearance: textfield;
  -moz-appearance: textfield;
}

.hp-input::-webkit-outer-spin-button,
.hp-input::-webkit-inner-spin-button {
  appearance: none;
  -webkit-appearance: none;
  margin: 0;
}

.hp-controls button {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  cursor: pointer;
}

.denom {
  color: #cbd5e0;
  font-weight: 600;
}

@media (max-width: 480px) {
  .vitals-grid {
    grid-template-columns: 1fr;
  }
}
</style>
