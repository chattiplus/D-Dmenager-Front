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
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.vital-card {
  background: #2d3748;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-align: center;
  min-width: 80px;
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
}

.hp-controls input {
  width: 72px;
  background: transparent;
  border: none;
  border-bottom: 2px solid #a0aec0;
  color: white;
  font-size: 1.5rem;
  text-align: center;
  font-weight: bold;
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
  background: #4a5568;
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
