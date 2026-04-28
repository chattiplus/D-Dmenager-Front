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

const formData = reactive({
  currentHp: 0,
  deathSaves: { successes: 0, failures: 0 },
  inventory: { equipment: '', treasure: '' },
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

watch(
  () => props.character,
  (newVal) => {
    const nextHp = clampHp(newVal.currentHitPoints ?? 0);
    if (nextHp !== formData.currentHp) {
      formData.currentHp = nextHp;
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

    const currentSerialized = serializeSpellSlots(formData.spellSlots);
    const incomingSerialized = newVal.spellSlots || '';
    if (incomingSerialized !== currentSerialized) {
      formData.spellSlots = parseSpellSlots(incomingSerialized);
    }
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
      deathSaveSuccesses: formData.deathSaves.successes,
      deathSaveFailures: formData.deathSaves.failures,
      equipment: formData.inventory.equipment,
      treasure: formData.inventory.treasure,
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

watch(() => formData.currentHp, () => debouncedSaveHp());
watch(() => formData.spellSlots, () => debouncedSaveSlots(), { deep: true });
watch(() => formData.deathSaves, () => saveDeathSaves(), { deep: true });
watch(() => formData.inventory, () => debouncedSaveInventory(), { deep: true });
watch(() => [formData.cantrips, formData.preparedSpells, formData.notes], () => {
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
    formData.currentHp = updated.currentHitPoints || 0;
    formData.spellSlots = parseSpellSlots(updated.spellSlots || '');
    formData.deathSaves.successes = 0;
    formData.deathSaves.failures = 0;
  } catch {
    error.value = 'Errore Long Rest';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="character-sheet">
    <div v-if="saving" class="saving-badge">Saving...</div>

    <div class="header">
      <div class="identity">
        <h2>{{ character.name }}</h2>
        <span class="sub">
          {{ character.race }} - {{ character.characterClass }} Lvl {{ character.level }}
        </span>
      </div>
      <button type="button" class="rest-btn" @click="triggerLongRest">Riposo Lungo</button>
    </div>

    <CharacterVitalsPanel
      :current-hp="formData.currentHp"
      :max-hp="character.maxHitPoints"
      :armor-class="character.armorClass"
      :speed="character.speed"
      :can-edit="true"
      @update-hp="updateHp"
    />

    <div class="death-saves">
      <div class="ds-group">
        <span class="ds-label">Successi</span>
        <div class="ds-dots">
          <div
            v-for="i in 3"
            :key="'s' + i"
            class="dot success"
            :class="{ active: i <= formData.deathSaves.successes }"
            @click="updateDeathSave('success', i)"
          />
        </div>
      </div>
      <div class="ds-group">
        <span class="ds-label">Fallimenti</span>
        <div class="ds-dots">
          <div
            v-for="i in 3"
            :key="'f' + i"
            class="dot failure"
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

    <hr class="divider">

    <div class="sections">
      <div class="section-block">
        <h3>Inventario</h3>
        <div class="row">
          <div class="col">
            <label>Equipaggiamento</label>
            <textarea v-model="formData.inventory.equipment" rows="4" />
          </div>
          <div class="col">
            <label>Tesoro</label>
            <textarea v-model="formData.inventory.treasure" rows="2" />
          </div>
        </div>
      </div>

      <div class="section-block">
        <h3>Magia</h3>
        <div v-if="formData.spellSlots.length > 0" class="slots-container">
          <div v-for="(slot, lvlIdx) in formData.spellSlots" :key="slot.level" class="slot-row">
            <div class="slot-meta">Livello <strong>{{ slot.level }}</strong></div>
            <div class="slot-display">
              <div
                v-for="i in slot.max"
                :key="i"
                class="slot-check"
                :class="{ checked: i <= slot.current }"
                @click="toggleSpellSlot(lvlIdx, i - 1)"
              />
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col">
            <label>Trucchetti</label>
            <textarea v-model="formData.cantrips" rows="4" placeholder="Lista trucchetti..." />
          </div>
          <div class="col">
            <label>Incantesimi Preparati</label>
            <textarea
              v-model="formData.preparedSpells"
              rows="6"
              placeholder="Lista incantesimi..."
            />
          </div>
        </div>
      </div>

      <details>
        <summary>Attacchi & Azioni</summary>
        <div class="md-content" v-html="character.attacksAndSpellcasting" />
      </details>

      <details>
        <summary>Tratti & Privilegi</summary>
        <div class="md-content" v-html="character.featuresAndTraits" />
      </details>

      <div class="section-block">
        <h3>Note</h3>
        <textarea v-model="formData.notes" rows="4" placeholder="Note varie..." />
      </div>
    </div>

    <div v-if="error" class="err-toast">{{ error }}</div>
  </div>
</template>

<style scoped>
.character-sheet {
  background: #1a202c;
  color: #e2e8f0;
  padding: 1.5rem;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  position: relative;
  max-width: 900px;
  margin: 0 auto;
}

.saving-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(66, 153, 225, 0.2);
  color: #63b3ed;
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
}

.identity h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #f7fafc;
}

.sub {
  color: #a0aec0;
  font-size: 0.9rem;
}

.rest-btn {
  background: #2d3748;
  color: #cbd5e0;
  border: 1px solid #4a5568;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}

.rest-btn:hover {
  background: #4a5568;
}

.death-saves {
  background: #2d3748;
  padding: 0.8rem;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.ds-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.ds-label {
  font-size: 0.75rem;
  color: #a0aec0;
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
  border: 2px solid #4a5568;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.dot.success.active {
  background: #48bb78;
  border-color: #48bb78;
}

.dot.failure.active {
  background: #f56565;
  border-color: #f56565;
}

.divider {
  border: 0;
  border-top: 1px solid #4a5568;
  margin: 2rem 0;
}

.section-block {
  margin-bottom: 2rem;
}

.section-block h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: #e2e8f0;
  border-bottom: 2px solid #4a5568;
  padding-bottom: 0.5rem;
}

.row {
  display: flex;
  gap: 1.5rem;
}

.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.col label {
  font-size: 0.9rem;
  font-weight: bold;
  color: #cbd5e0;
}

textarea {
  background: #2d3748;
  border: 1px solid #4a5568;
  color: white;
  padding: 0.8rem;
  border-radius: 6px;
  font-family: inherit;
  resize: vertical;
  width: 100%;
}

textarea:focus {
  border-color: #63b3ed;
  outline: none;
}

.slots-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  background: #232d3f;
  padding: 1rem;
  border-radius: 6px;
}

.slot-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.slot-meta {
  font-size: 0.8rem;
  color: #a0aec0;
}

.slot-display {
  display: flex;
  gap: 4px;
}

.slot-check {
  width: 14px;
  height: 14px;
  border: 2px solid #553c9a;
  cursor: pointer;
  background: #1a202c;
  transition: background 0.15s;
  border-radius: 2px;
}

.slot-check.checked {
  background: #9f7aea;
  box-shadow: 0 0 5px #9f7aea;
}

.md-content {
  font-size: 0.9rem;
  line-height: 1.5;
  color: #cbd5e0;
}

details {
  background: #2d3748;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

summary {
  padding: 0.8rem;
  cursor: pointer;
  font-weight: bold;
  user-select: none;
}

details .md-content {
  padding: 1rem;
  border-top: 1px solid #4a5568;
}

.err-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #e53e3e;
  color: white;
  padding: 1rem;
  border-radius: 6px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .row {
    flex-direction: column;
  }
}
</style>
