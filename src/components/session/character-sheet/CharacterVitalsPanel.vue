<script setup lang="ts">
import { computed } from 'vue';
import ArcaneStatIcon from '../../theme/arcane/ArcaneStatIcon.vue';

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

const hpRatio = computed(() => {
  const current = Math.max(0, Number(props.currentHp ?? 0));
  const max = Math.max(0, Number(props.maxHp ?? 0));

  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (current / max) * 100));
});
</script>

<template>
  <div class="vitals-grid arcane-vitals-grid">
    <div class="vital-card hp-card arcane-vital-card arcane-vital-card--hp" :style="{ '--arcane-fill': `${hpRatio}%` }">
      <div class="arcane-vital-card__head">
        <ArcaneStatIcon class="arcane-vital-card__glyph arcane-only" variant="hp" color="var(--arcane-gold)" />
        <label class="arcane-vital-card__label">Punti Ferita</label>
      </div>
      <div class="vitals-centered-content">
        <div class="hp-value arcane-vital-card__value">
          <input
            class="hp-input arcane-vital-card__input"
            type="number"
            :value="currentHp ?? 0"
            min="0"
            :max="maxHp ?? undefined"
            step="1"
            inputmode="numeric"
            :readonly="readOnly || !canEdit"
            @input="onHpInput"
          >
          <span class="denom arcane-vital-card__denom">/ {{ maxHp ?? 0 }}</span>
        </div>
        <div class="arcane-vital-card__bar" aria-hidden="true">
          <div class="arcane-vital-card__bar-fill" />
        </div>
        <div v-if="canEdit && !readOnly" class="hp-controls arcane-vital-card__controls vitals-actions-row">
          <button class="arcane-stepper" type="button" @click="updateHpByDelta(-1)">-</button>
          <button class="arcane-stepper" type="button" @click="updateHpByDelta(1)">+</button>
        </div>
      </div>
    </div>

    <div class="vital-card temp-hp-card arcane-vital-card arcane-vital-card--temp">
      <div class="arcane-vital-card__head">
        <ArcaneStatIcon class="arcane-vital-card__glyph arcane-only" variant="temp-hp" color="var(--arcane-blue)" />
        <label class="arcane-vital-card__label arcane-vital-card__label--temp">Temp HP</label>
      </div>
      <div class="vitals-centered-content">
        <div class="hp-value hp-value--single arcane-vital-card__value arcane-vital-card__value--single">
          <input
            class="hp-input arcane-vital-card__input"
            type="number"
            :value="temporaryHp ?? 0"
            min="0"
            step="1"
            inputmode="numeric"
            :readonly="readOnly || !canEdit"
            @input="onTempHpInput"
          >
        </div>
        <div v-if="canEdit && !readOnly" class="hp-controls arcane-vital-card__controls vitals-actions-row">
          <button class="arcane-stepper" type="button" @click="updateTempHpByDelta(-1)">-</button>
          <button class="arcane-stepper" type="button" @click="updateTempHpByDelta(1)">+</button>
        </div>
      </div>
    </div>

    <div class="vital-card arcane-vital-card arcane-vital-card--stat">
      <div class="arcane-vital-card__head arcane-vital-card__head--space">
        <label class="arcane-vital-card__label">AC</label>
        <ArcaneStatIcon class="arcane-vital-card__glyph arcane-only" variant="ac" color="var(--arcane-gold)" />
      </div>
      <div class="val arcane-vital-card__stat">{{ armorClass ?? '-' }}</div>
    </div>

    <div class="vital-card arcane-vital-card arcane-vital-card--stat">
      <div class="arcane-vital-card__head arcane-vital-card__head--space">
        <label class="arcane-vital-card__label">Speed</label>
        <ArcaneStatIcon class="arcane-vital-card__glyph arcane-only" variant="speed" color="var(--arcane-gold)" />
      </div>
      <div class="val arcane-vital-card__stat">{{ speed ?? '-' }}</div>
    </div>
  </div>
</template>

<style scoped>
.vitals-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
  width: 100%;
  min-width: 0;
  align-items: stretch;
}

.vital-card {
  background: var(--sheet-stat-bg);
  border: 1px solid var(--sheet-stat-border);
  backdrop-filter: blur(14px);
  padding: 0.7rem 0.8rem;
  border-radius: 0.95rem;
  text-align: center;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.55rem;
}

.hp-card,
.temp-hp-card {
  min-width: 0;
}

.vitals-centered-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  text-align: center;
  margin-inline: auto;
}

.vital-card label {
  display: block;
  font-size: 0.7rem;
  color: var(--app-text-muted);
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
  gap: 0.35rem;
  width: fit-content;
  max-width: 100%;
  justify-content: center;
  flex-wrap: nowrap;
  min-width: 0;
  margin-inline: auto;
}

.hp-value--single {
  gap: 0;
}

.hp-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  max-width: 100%;
  justify-content: center;
  margin-inline: auto;
}

.vitals-actions-row {
  justify-content: center;
}

.hp-input {
  width: 4.7rem;
  min-width: 0;
  background: var(--app-input-bg);
  border: 1px solid var(--app-input-border);
  border-radius: 0.65rem;
  color: var(--app-text);
  font-size: 1.25rem;
  padding: 0.35rem 0.25rem;
  text-align: center;
  font-weight: bold;
  line-height: 1.1;
}

.hp-input:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 2px var(--app-focus-ring);
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
  background: color-mix(in srgb, var(--app-text) 8%, transparent);
  border: 1px solid var(--app-surface-outline);
  color: var(--app-text);
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.denom {
  color: color-mix(in srgb, var(--app-text) 82%, var(--app-text-muted));
  font-weight: 600;
  font-size: 1rem;
  white-space: nowrap;
}

@container (min-width: 920px) {
  .vitals-grid {
    grid-template-columns: minmax(220px, 1.3fr) minmax(180px, 1fr) repeat(2, minmax(120px, 0.9fr));
  }
}

@container (max-width: 700px) {
  .vitals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .vital-card {
    min-width: 0;
  }

  .hp-input {
    width: 4.2rem;
  }
}

@media (max-width: 768px) {
  .vitals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .vital-card {
    min-width: 0;
  }

  .hp-input {
    width: 4.2rem;
  }
}

@media (max-width: 430px) {
  .vitals-grid {
    gap: 0.65rem;
    margin-bottom: 0.85rem;
  }

  .vital-card {
    padding: 0.65rem 0.72rem;
    gap: 0.5rem;
  }

  .hp-input {
    width: 3.75rem;
    font-size: 1.1rem;
  }

  .denom {
    font-size: 0.9rem;
  }

  .hp-controls button {
    width: 1.9rem;
    height: 1.9rem;
  }
}
</style>
