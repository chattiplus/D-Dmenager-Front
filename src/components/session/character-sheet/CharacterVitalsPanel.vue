<script setup lang="ts">
const props = defineProps<{
  currentHp?: number | null;
  maxHp?: number | null;
  temporaryHp?: number | null;
  armorClass?: number | null;
  speed?: number | string | null;
  canEdit: boolean;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  'update-hp': [value: number];
  'update-temp-hp': [value: number];
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

const normalizeTemporaryHp = (value: unknown) => {
  const fallback = Number(props.temporaryHp ?? 0);
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed)
    ? parsed
    : (Number.isFinite(fallback) ? fallback : 0);

  return Math.max(0, Math.trunc(safeValue));
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

const onTempHpInput = (event: Event) => {
  if (!props.canEdit || props.readOnly) {
    return;
  }

  const target = event.target as HTMLInputElement;
  const normalizedHp = normalizeTemporaryHp(target.value);
  emit('update-temp-hp', normalizedHp);
  target.value = String(normalizedHp);
};

const updateHpByDelta = (delta: number) => {
  if (!props.canEdit || props.readOnly) {
    return;
  }

  emit('update-hp', normalizeHp(Number(props.currentHp ?? 0) + delta));
};

const updateTempHpByDelta = (delta: number) => {
  if (!props.canEdit || props.readOnly) {
    return;
  }

  emit('update-temp-hp', normalizeTemporaryHp(Number(props.temporaryHp ?? 0) + delta));
};
</script>

<template>
  <div class="vitals-grid">
    <div class="vital-card hp-card">
      <label>HP</label>
      <div class="hp-value">
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
      </div>
      <div v-if="canEdit && !readOnly" class="hp-controls">
        <button type="button" @click="updateHpByDelta(-1)">-</button>
        <button type="button" @click="updateHpByDelta(1)">+</button>
      </div>
    </div>

    <div class="vital-card temp-hp-card">
      <label>Temp HP</label>
      <div class="hp-value hp-value--single">
        <input
          class="hp-input"
          type="number"
          :value="temporaryHp ?? 0"
          min="0"
          step="1"
          inputmode="numeric"
          :readonly="readOnly || !canEdit"
          @input="onTempHpInput"
        >
      </div>
      <div v-if="canEdit && !readOnly" class="hp-controls">
        <button type="button" @click="updateTempHpByDelta(-1)">-</button>
        <button type="button" @click="updateTempHpByDelta(1)">+</button>
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
  grid-template-columns: minmax(170px, 1.4fr) repeat(3, minmax(96px, 1fr));
  gap: 0.9rem;
  margin-bottom: 1.5rem;
  width: 100%;
  min-width: 0;
  align-items: stretch;
}

.vital-card {
  background: rgba(21, 28, 46, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  padding: 0.75rem 0.9rem;
  border-radius: 0.95rem;
  text-align: center;
  min-width: 96px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
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
  line-height: 1;
}

.hp-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
  flex-wrap: nowrap;
}

.hp-value--single {
  gap: 0;
}

.hp-controls {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  justify-content: center;
}

.hp-input {
  width: 5.5rem;
  min-width: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.65rem;
  color: white;
  font-size: 1.4rem;
  padding: 0.45rem 0.35rem;
  text-align: center;
  font-weight: bold;
  line-height: 1.1;
}

.hp-input:focus {
  outline: none;
  border-color: rgba(99, 179, 237, 0.72);
  box-shadow: 0 0 0 2px rgba(99, 179, 237, 0.18);
}

.hp-input::-webkit-outer-spin-button,
.hp-input::-webkit-inner-spin-button {
  appearance: none;
  -webkit-appearance: none;
  margin: 0;
}

.hp-input {
  appearance: textfield;
  -moz-appearance: textfield;
}

.hp-controls button {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.denom {
  color: #cbd5e0;
  font-weight: 600;
  font-size: 1.2rem;
  white-space: nowrap;
}

@container (max-width: 700px) {
  .vitals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .vital-card {
    min-width: 0;
  }

  .hp-value {
    flex-wrap: wrap;
  }

  .hp-input {
    width: 4.75rem;
  }
}

@container (max-width: 480px) {
  .vitals-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .vitals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .vital-card {
    min-width: 0;
  }

  .hp-value {
    flex-wrap: wrap;
  }

  .hp-input {
    width: 4.75rem;
  }
}

@media (max-width: 430px) {
  .vitals-grid {
    grid-template-columns: 1fr;
  }
}
</style>
