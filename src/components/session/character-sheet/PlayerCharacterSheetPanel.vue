<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import {
  performLongRest,
  updateCharacter,
  updateCharacterDeathSaves,
  updateCharacterHp,
  updateCharacterInventory,
  updateCharacterSpellSlots,
} from '../../../api/charactersApi';
import type { PlayerCharacterResponse } from '../../../types/api';
import CharacterAttributesPanel from './CharacterAttributesPanel.vue';
import CharacterVitalsPanel from './CharacterVitalsPanel.vue';
import ArcaneCorner from '../../theme/arcane/ArcaneCorner.vue';
import ArcaneDiamond from '../../theme/arcane/ArcaneDiamond.vue';
import ArcaneDivider from '../../theme/arcane/ArcaneDivider.vue';
import ArcaneStatIcon from '../../theme/arcane/ArcaneStatIcon.vue';

const props = defineProps<{
  character: PlayerCharacterResponse;
  isGm: boolean;
}>();

const emit = defineEmits<{
  'character-updated': [character: PlayerCharacterResponse];
}>();

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      fn(...(lastArgs ?? ([] as unknown as Parameters<T>)));
    }, delay);
  };

  debounced.flush = () => {
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    timeout = null;
    fn(...(lastArgs ?? ([] as unknown as Parameters<T>)));
  };

  return debounced;
}

const loading = ref(false);
const error = ref('');
const saving = ref(false);
const syncingFromCharacter = ref(false);

const formData = reactive({
  currentHp: 0,
  temporaryHp: 0,
  deathSaves: { successes: 0, failures: 0 },
  inventory: { equipment: '', treasure: '' },
  hitDice: '',
  cantrips: '',
  preparedSpells: '',
  spellSlots: [] as { level: number; current: number; max: number }[],
  notes: '',
});

const characterId = computed(() => props.character.id);
const maxHp = computed(() => {
  const value = Number(props.character.maxHitPoints ?? 0);
  return value > 0 ? value : 0;
});

const clampHp = (value: unknown) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const normalized = Math.trunc(parsed);
  if (maxHp.value > 0) {
    return Math.max(0, Math.min(maxHp.value, normalized));
  }

  return Math.max(0, normalized);
};

const setCurrentHp = (value: unknown) => {
  formData.currentHp = clampHp(value);
};

const normalizeTemporaryHp = (value: unknown) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.trunc(parsed));
};

const setTemporaryHp = (value: unknown) => {
  formData.temporaryHp = normalizeTemporaryHp(value);
};

const parseSpellSlots = (str: string) => {
  if (!str) {
    return [];
  }

  return str
    .split(',')
    .map((part) => {
      const [lvlStr, counts] = part.split(':');
      if (!lvlStr || !counts) {
        return null;
      }

      const level = Number.parseInt(lvlStr, 10);
      if (Number.isNaN(level)) {
        return null;
      }

      let current = 0;
      let max = 0;
      if (counts.includes('/')) {
        const [c, m] = counts.split('/').map((value) => Number.parseInt(value, 10));
        current = c == null || Number.isNaN(c) ? 0 : c;
        max = m == null || Number.isNaN(m) ? 0 : m;
      } else {
        max = Number.parseInt(counts, 10);
        current = max;
      }

      return { level, current, max };
    })
    .filter(Boolean) as { level: number; current: number; max: number }[];
};

const serializeSpellSlots = (slots: { level: number; current: number; max: number }[]) => {
  return slots.map((slot) => `${slot.level}:${slot.current}/${slot.max}`).join(',');
};

const applyCharacterToForm = (newVal: PlayerCharacterResponse) => {
    syncingFromCharacter.value = true;

    const nextHp = clampHp(newVal.currentHitPoints ?? 0);
    if (nextHp !== formData.currentHp) {
      formData.currentHp = nextHp;
    }

    const nextTemporaryHp = normalizeTemporaryHp(newVal.temporaryHitPoints ?? 0);
    if (nextTemporaryHp !== formData.temporaryHp) {
      formData.temporaryHp = nextTemporaryHp;
    }

    if ((newVal.deathSaveSuccesses || 0) !== formData.deathSaves.successes) {
      formData.deathSaves.successes = newVal.deathSaveSuccesses || 0;
    }
    if ((newVal.deathSaveFailures || 0) !== formData.deathSaves.failures) {
      formData.deathSaves.failures = newVal.deathSaveFailures || 0;
    }
    if ((newVal.equipment || '') !== formData.inventory.equipment) {
      formData.inventory.equipment = newVal.equipment || '';
    }
    if ((newVal.treasure || '') !== formData.inventory.treasure) {
      formData.inventory.treasure = newVal.treasure || '';
    }
    if ((newVal.spells || '') !== formData.cantrips) {
      formData.cantrips = newVal.spells || '';
    }
    if ((newVal.preparedSpells || '') !== formData.preparedSpells) {
      formData.preparedSpells = newVal.preparedSpells || '';
    }
    if ((newVal.otherNotes || '') !== formData.notes) {
      formData.notes = newVal.otherNotes || '';
    }
    if ((newVal.hitDice || '') !== formData.hitDice) {
      formData.hitDice = newVal.hitDice || '';
    }

    const currentSerialized = serializeSpellSlots(formData.spellSlots);
    const incomingSerialized = newVal.spellSlots || '';
    if (incomingSerialized !== currentSerialized) {
      formData.spellSlots = parseSpellSlots(incomingSerialized);
    }
    syncingFromCharacter.value = false;
};

watch(
  () => props.character,
  (newVal) => {
    applyCharacterToForm(newVal);
  },
  { immediate: true, deep: true },
);

watch(maxHp, () => {
  setCurrentHp(formData.currentHp);
});

const emitUpdatedCharacter = (character: PlayerCharacterResponse) => {
  emit('character-updated', character);
};

const handleSaveError = (saveError: unknown, context: string) => {
  console.error(`Error saving ${context}:`, saveError);
  error.value = `Errore salvataggio ${context}`;
  saving.value = false;
};

const saveHp = async () => {
  saving.value = true;
  try {
    const updatedCharacter = await updateCharacterHp(characterId.value, formData.currentHp);
    emitUpdatedCharacter(updatedCharacter);
    error.value = '';
  } catch (saveError) {
    handleSaveError(saveError, 'HP');
  } finally {
    saving.value = false;
  }
};

const saveSlots = async () => {
  saving.value = true;
  try {
    const slotsStr = serializeSpellSlots(formData.spellSlots);
    const updatedCharacter = await updateCharacterSpellSlots(characterId.value, slotsStr);
    emitUpdatedCharacter(updatedCharacter);
    error.value = '';
  } catch (saveError) {
    handleSaveError(saveError, 'Slots');
  } finally {
    saving.value = false;
  }
};

const saveDeathSaves = async () => {
  saving.value = true;
  try {
    const updatedCharacter = await updateCharacterDeathSaves(
      characterId.value,
      formData.deathSaves.successes,
      formData.deathSaves.failures,
    );
    emitUpdatedCharacter(updatedCharacter);
    error.value = '';
  } catch (saveError) {
    handleSaveError(saveError, 'Death Saves');
  } finally {
    saving.value = false;
  }
};

const saveInventory = async () => {
  saving.value = true;
  try {
    const updatedCharacter = await updateCharacterInventory(
      characterId.value,
      formData.inventory.equipment,
      formData.inventory.treasure,
    );
    emitUpdatedCharacter(updatedCharacter);
    error.value = '';
  } catch (saveError) {
    handleSaveError(saveError, 'Inventory');
  } finally {
    saving.value = false;
  }
};

const saveGeneric = async () => {
  saving.value = true;
  try {
    const payload = {
      ...props.character,
      currentHitPoints: formData.currentHp,
      temporaryHitPoints: formData.temporaryHp,
      deathSaveSuccesses: formData.deathSaves.successes,
      deathSaveFailures: formData.deathSaves.failures,
      equipment: formData.inventory.equipment,
      treasure: formData.inventory.treasure,
      hitDice: formData.hitDice,
      spellSlots: serializeSpellSlots(formData.spellSlots),
      spells: formData.cantrips,
      preparedSpells: formData.preparedSpells,
      otherNotes: formData.notes,
    };
    const updatedCharacter = await updateCharacter(characterId.value, payload);
    emitUpdatedCharacter(updatedCharacter);
    error.value = '';
  } catch (saveError) {
    handleSaveError(saveError, 'Dati Generici');
  } finally {
    saving.value = false;
  }
};

const debouncedSaveHp = debounce(saveHp, 800);
const debouncedSaveSlots = debounce(saveSlots, 200);
const debouncedSaveInventory = debounce(saveInventory, 1000);
const debouncedSaveGeneric = debounce(saveGeneric, 1500);

watch(() => formData.currentHp, () => {
  if (syncingFromCharacter.value) {
    return;
  }

  debouncedSaveHp();
});
watch(() => formData.spellSlots, () => {
  if (syncingFromCharacter.value) {
    return;
  }

  debouncedSaveSlots();
}, { deep: true });
watch(() => formData.deathSaves, () => {
  if (syncingFromCharacter.value) {
    return;
  }

  saveDeathSaves();
}, { deep: true });
watch(() => formData.inventory, () => {
  if (syncingFromCharacter.value) {
    return;
  }

  debouncedSaveInventory();
}, { deep: true });
watch(() => [formData.temporaryHp, formData.hitDice, formData.cantrips, formData.preparedSpells, formData.notes], () => {
  if (syncingFromCharacter.value) {
    return;
  }

  debouncedSaveGeneric();
});

onBeforeUnmount(() => {
  debouncedSaveHp.flush();
  debouncedSaveSlots.flush();
  debouncedSaveInventory.flush();
  debouncedSaveGeneric.flush();
});

const updateHp = (value: number) => {
  setCurrentHp(value);
};

const updateTemporaryHp = (value: number) => {
  setTemporaryHp(value);
};

const toggleSpellSlot = (levelIndex: number, slotIndex: number) => {
  const slot = formData.spellSlots[levelIndex];
  if (!slot) {
    return;
  }

  if (slot.current > slotIndex) {
    slot.current = slotIndex;
  } else {
    slot.current = slotIndex + 1;
  }
};

const updateDeathSave = (type: 'success' | 'failure', index: number) => {
  const current = type === 'success' ? formData.deathSaves.successes : formData.deathSaves.failures;
  const newValue = current === index ? index - 1 : index;
  if (type === 'success') {
    formData.deathSaves.successes = newValue;
  } else {
    formData.deathSaves.failures = newValue;
  }
};

const triggerLongRest = async () => {
  if (!confirm('Riposo Lungo: Ripristino HP e Slot?')) {
    return;
  }

  loading.value = true;
  try {
    const updated = await performLongRest(characterId.value);
    emitUpdatedCharacter(updated);
    applyCharacterToForm(updated);
  } catch {
    error.value = 'Errore Long Rest';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="character-sheet arcane-sheet arcane-sheet--player">
    <div class="arcane-sheet__frame" aria-hidden="true" />
    <ArcaneCorner class="arcane-only" color="var(--arcane-gold)" position="top-left" />
    <ArcaneCorner class="arcane-only" color="var(--arcane-gold)" position="top-right" />
    <ArcaneCorner class="arcane-only" color="var(--arcane-gold)" position="bottom-left" />
    <ArcaneCorner class="arcane-only" color="var(--arcane-gold)" position="bottom-right" />

    <div class="arcane-sheet__content">
      <div v-if="saving" class="saving-badge">Saving...</div>

      <div class="arcane-sheet__topline arcane-only">
        <ArcaneDiamond color="var(--arcane-gold)" size="sm" />
        <span>Versione Giocatore</span>
        <ArcaneDiamond color="var(--arcane-gold)" size="sm" />
      </div>

      <div class="header arcane-sheet__header">
        <div class="arcane-sheet__title-row">
          <div class="identity arcane-sheet__title-block">
            <h2 class="arcane-sheet__title">{{ character.name }}</h2>
            <span class="sub arcane-sheet__subtitle">
              <span>{{ character.race }}</span>
              <ArcaneDiamond class="arcane-only" color="var(--arcane-gold)" size="sm" />
              <span>{{ character.characterClass }} Lvl {{ character.level }}</span>
            </span>
            <div class="arcane-sheet__flavor arcane-only">Codex del personaggio</div>
          </div>
          <button type="button" class="rest-btn arcane-sheet__header-action" @click="triggerLongRest">
            <ArcaneStatIcon class="arcane-only" variant="hp" color="var(--arcane-gold)" />
            <span>Riposo Lungo</span>
          </button>
        </div>
        <div class="arcane-sheet__divider arcane-only">
          <ArcaneDivider color="var(--arcane-gold)" />
        </div>
      </div>

      <CharacterVitalsPanel
        :current-hp="formData.currentHp"
        :max-hp="character.maxHitPoints"
        :temporary-hp="formData.temporaryHp"
        :armor-class="character.armorClass"
        :speed="character.speed"
        :can-edit="true"
        @update-hp="updateHp"
        @update-temp-hp="updateTemporaryHp"
      />

      <div class="death-saves arcane-death-saves">
        <div class="ds-group arcane-ds-group">
          <span class="ds-label arcane-ds-label">Successi</span>
          <div class="ds-dots">
            <div
              v-for="i in 3"
              :key="'s' + i"
              class="dot success arcane-ds-dot"
              :class="{ active: i <= formData.deathSaves.successes }"
              @click="updateDeathSave('success', i)"
            />
          </div>
        </div>
        <div class="ds-group arcane-ds-group">
          <span class="ds-label arcane-ds-label">Fallimenti</span>
          <div class="ds-dots">
            <div
              v-for="i in 3"
              :key="'f' + i"
              class="dot failure arcane-ds-dot"
              :class="{ active: i <= formData.deathSaves.failures }"
              @click="updateDeathSave('failure', i)"
            />
          </div>
        </div>
      </div>

      <CharacterAttributesPanel
        :strength="character.strength"
        :dexterity="character.dexterity"
        :constitution="character.constitution"
        :intelligence="character.intelligence"
        :wisdom="character.wisdom"
        :charisma="character.charisma"
      />

      <div class="arcane-section-divider arcane-only">
        <ArcaneDivider color="var(--arcane-gold)" variant="compact" />
      </div>

      <div class="sections">
        <div class="section-block arcane-sheet__section">
          <h3 class="arcane-sheet__section-title">
            <ArcaneDiamond class="arcane-only" color="var(--arcane-gold)" size="sm" />
            <span>Inventario</span>
          </h3>
          <div class="row">
            <div class="col">
              <label>Equipaggiamento</label>
              <textarea v-model="formData.inventory.equipment" class="arcane-textarea" rows="4" />
            </div>
            <div class="col">
              <label>Tesoro</label>
              <textarea v-model="formData.inventory.treasure" class="arcane-textarea" rows="2" />
            </div>
          </div>
        </div>

        <div class="section-block arcane-sheet__section">
          <h3 class="arcane-sheet__section-title">
            <ArcaneDiamond class="arcane-only" color="var(--arcane-gold)" size="sm" />
            <span>Dadi Vita</span>
          </h3>
          <div class="hit-dice-surface arcane-surface">
            <label>Dadi Vita / Riposo breve</label>
            <input
              v-model="formData.hitDice"
              class="arcane-input"
              type="text"
              placeholder="Es. 3d8"
            >
            <p class="helper-text arcane-helper-text">
              Il backend espone solo il campo testuale dei dadi vita, quindi qui puoi aggiornarlo direttamente.
            </p>
          </div>
        </div>

        <div class="section-block arcane-sheet__section">
          <h3 class="arcane-sheet__section-title">
            <ArcaneDiamond class="arcane-only" color="var(--arcane-gold)" size="sm" />
            <span>Magia</span>
          </h3>
          <div v-if="formData.spellSlots.length > 0" class="slots-container arcane-surface">
            <div
              v-for="(slot, lvlIdx) in formData.spellSlots"
              :key="slot.level"
              class="slot-row arcane-slot-row"
            >
              <div class="slot-meta arcane-slot-meta">Livello <strong>{{ slot.level }}</strong></div>
              <div class="slot-display">
                <div
                  v-for="i in slot.max"
                  :key="i"
                  class="slot-check arcane-slot-check"
                  :class="{ checked: i <= slot.current }"
                  @click="toggleSpellSlot(lvlIdx, i - 1)"
                />
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col">
              <label>Trucchetti</label>
              <textarea
                v-model="formData.cantrips"
                class="arcane-textarea"
                rows="4"
                placeholder="Lista trucchetti..."
              />
            </div>
            <div class="col">
              <label>Incantesimi Preparati</label>
              <textarea
                v-model="formData.preparedSpells"
                class="arcane-textarea"
                rows="6"
                placeholder="Lista incantesimi..."
              />
            </div>
          </div>
        </div>

        <details class="arcane-sheet__details">
          <summary>Attacchi & Azioni</summary>
          <div class="md-content arcane-sheet__details-content" v-html="character.attacksAndSpellcasting" />
        </details>

        <details class="arcane-sheet__details">
          <summary>Tratti & Privilegi</summary>
          <div class="md-content arcane-sheet__details-content" v-html="character.featuresAndTraits" />
        </details>

        <div class="section-block arcane-sheet__section">
          <h3 class="arcane-sheet__section-title">
            <ArcaneDiamond class="arcane-only" color="var(--arcane-gold)" size="sm" />
            <span>Note</span>
          </h3>
          <textarea v-model="formData.notes" class="arcane-textarea" rows="4" placeholder="Note varie..." />
        </div>
      </div>

      <div v-if="error" class="err-toast">{{ error }}</div>
    </div>
  </div>
</template>

<style scoped>
.character-sheet {
  background: var(--sheet-bg);
  border: 1px solid var(--sheet-panel-border);
  box-shadow: 0 16px 40px color-mix(in srgb, var(--app-shadow) 70%, transparent);
  backdrop-filter: blur(16px);
  color: var(--app-text);
  padding: 1.5rem;
  border-radius: 1.2rem;
  font-family: var(--font-body);
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  margin: 0 auto;
  container-type: inline-size;
}

.saving-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: color-mix(in srgb, var(--app-accent) 14%, transparent);
  color: var(--app-accent-strong);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.identity h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--app-text);
}

.sub {
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.rest-btn {
  background: color-mix(in srgb, var(--app-bg-soft) 75%, transparent);
  color: var(--app-text);
  border: 1px solid var(--app-input-border);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}

.rest-btn:hover {
  background: color-mix(in srgb, var(--app-text) 12%, var(--app-bg-soft));
}

.death-saves {
  background: var(--sheet-stat-bg);
  border: 1px solid var(--sheet-stat-border);
  padding: 0.8rem;
  border-radius: 0.95rem;
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.ds-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.ds-label {
  font-size: 0.75rem;
  color: var(--app-text-muted);
  text-transform: uppercase;
  font-weight: bold;
}

.ds-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 16px;
  height: 16px;
  border: 2px solid color-mix(in srgb, var(--app-text-muted) 45%, transparent);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.dot.success.active {
  background: var(--app-success);
  border-color: var(--app-success);
}

.dot.failure.active {
  background: var(--app-danger);
  border-color: var(--app-danger);
}

.divider {
  border: 0;
  border-top: 1px solid var(--app-surface-outline);
  margin: 2rem 0;
}

.section-block {
  margin-bottom: 2rem;
}

.section-block h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: var(--app-text);
  border-bottom: 1px solid var(--app-surface-outline);
  padding-bottom: 0.5rem;
}

.row {
  display: flex;
  gap: 1.5rem;
  min-width: 0;
  flex-wrap: wrap;
}

.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.col label {
  font-size: 0.9rem;
  font-weight: bold;
  color: color-mix(in srgb, var(--app-text) 86%, var(--app-text-muted));
}

textarea {
  background: var(--app-input-bg);
  border: 1px solid var(--app-input-border);
  color: var(--app-text);
  padding: 0.8rem;
  border-radius: 0.85rem;
  font-family: inherit;
  resize: vertical;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

input[type='text'] {
  background: var(--app-input-bg);
  border: 1px solid var(--app-input-border);
  color: var(--app-text);
  padding: 0.8rem;
  border-radius: 0.85rem;
  font-family: inherit;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

input[type='text']:focus {
  border-color: var(--app-accent);
  box-shadow: 0 0 0 2px var(--app-focus-ring);
  outline: none;
}

textarea:focus {
  border-color: var(--app-accent);
  box-shadow: 0 0 0 2px var(--app-focus-ring);
  outline: none;
}

.slots-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  background: var(--sheet-panel-bg);
  border: 1px solid var(--sheet-panel-border);
  padding: 1rem;
  border-radius: 0.95rem;
  min-width: 0;
}

.hit-dice-surface {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background: var(--sheet-panel-bg);
  border: 1px solid var(--sheet-panel-border);
  padding: 1rem;
  border-radius: 0.95rem;
  min-width: 0;
}

.hit-dice-surface label {
  font-size: 0.9rem;
  font-weight: bold;
  color: color-mix(in srgb, var(--app-text) 86%, var(--app-text-muted));
}

.helper-text {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.8rem;
}

.slot-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.slot-meta {
  font-size: 0.8rem;
  color: var(--app-text-muted);
}

.slot-display {
  display: flex;
  gap: 4px;
}

.slot-check {
  width: 14px;
  height: 14px;
  border: 2px solid color-mix(in srgb, var(--app-accent) 55%, transparent);
  cursor: pointer;
  background: color-mix(in srgb, var(--app-bg-soft) 86%, black);
  transition: background 0.15s;
  border-radius: 2px;
}

.slot-check.checked {
  background: var(--app-accent);
  box-shadow: 0 0 5px color-mix(in srgb, var(--app-accent) 70%, transparent);
}

.md-content {
  font-size: 0.9rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--app-text) 84%, var(--app-text-muted));
}

details {
  background: var(--sheet-panel-bg);
  border: 1px solid var(--sheet-panel-border);
  border-radius: 0.9rem;
  margin-bottom: 0.5rem;
  overflow: hidden;
}

summary {
  padding: 0.8rem;
  cursor: pointer;
  font-weight: bold;
  user-select: none;
}

details .md-content {
  padding: 1rem;
  border-top: 1px solid var(--app-surface-outline);
}

.err-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--app-danger);
  color: var(--app-text);
  padding: 1rem;
  border-radius: 6px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .character-sheet {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .row {
    flex-direction: column;
    gap: 1rem;
  }

  .sections,
  .section-block,
  .slot-row,
  .md-content {
    min-width: 0;
  }
}

@media (max-width: 430px) {
  .character-sheet {
    padding: 0.9rem;
  }

  .identity h2 {
    font-size: 1.2rem;
  }
}
</style>
