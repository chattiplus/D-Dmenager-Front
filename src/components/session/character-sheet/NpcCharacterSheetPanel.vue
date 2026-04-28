<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { updateNpc, updateNpcHp } from '../../../api/npcsApi';
import type { NpcResponse } from '../../../types/api';
import { extractApiErrorMessage } from '../../../utils/errorMessage';
import CharacterAttributesPanel from './CharacterAttributesPanel.vue';
import CharacterVitalsPanel from './CharacterVitalsPanel.vue';

const props = defineProps<{
  character: NpcResponse;
  isGm: boolean;
}>();

const emit = defineEmits<{
  'npc-updated': [npc: NpcResponse];
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

const canEdit = computed(() => props.isGm);
const saving = ref(false);
const error = ref('');

const formData = reactive({
  currentHp: 0,
  name: '',
  race: '',
  roleOrClass: '',
  alignment: '',
  size: '',
  creatureType: '',
  description: '',
  gmNotes: '',
  hitDice: '',
  savingThrows: '',
  skills: '',
  damageResistances: '',
  damageImmunities: '',
  conditionImmunities: '',
  senses: '',
  languages: '',
  challengeRating: '',
  traits: '',
  actions: '',
  legendaryActions: '',
  reactions: '',
  lairActions: '',
  regionalEffects: '',
  temporaryHitPoints: null as number | null,
  experiencePoints: null as number | null,
  difficultyClass: null as number | null,
  isVisibleToPlayers: false,
});

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

const syncFormData = (character: NpcResponse) => {
  formData.currentHp = clampHp(character.currentHitPoints ?? 0);
  formData.name = character.name;
  formData.race = character.race ?? '';
  formData.roleOrClass = character.roleOrClass ?? '';
  formData.alignment = character.alignment ?? '';
  formData.size = character.size ?? '';
  formData.creatureType = character.creatureType ?? '';
  formData.description = character.description ?? '';
  formData.gmNotes = character.gmNotes ?? '';
  formData.hitDice = character.hitDice ?? '';
  formData.savingThrows = character.savingThrows ?? '';
  formData.skills = character.skills ?? '';
  formData.damageResistances = character.damageResistances ?? '';
  formData.damageImmunities = character.damageImmunities ?? '';
  formData.conditionImmunities = character.conditionImmunities ?? '';
  formData.senses = character.senses ?? '';
  formData.languages = character.languages ?? '';
  formData.challengeRating = character.challengeRating ?? '';
  formData.traits = character.traits ?? '';
  formData.actions = character.actions ?? '';
  formData.legendaryActions = character.legendaryActions ?? '';
  formData.reactions = character.reactions ?? '';
  formData.lairActions = character.lairActions ?? '';
  formData.regionalEffects = character.regionalEffects ?? '';
  formData.temporaryHitPoints = character.temporaryHitPoints ?? null;
  formData.experiencePoints = character.experiencePoints ?? null;
  formData.difficultyClass = character.difficultyClass ?? null;
  formData.isVisibleToPlayers = character.isVisibleToPlayers;
};

watch(
  () => props.character,
  (character) => {
    syncFormData(character);
  },
  { immediate: true, deep: true },
);

const emitUpdatedNpc = (npc: NpcResponse) => {
  emit('npc-updated', npc);
};

const saveNpcHp = async () => {
  if (!canEdit.value) {
    return;
  }

  saving.value = true;
  try {
    const updatedNpc = await updateNpcHp(props.character.id, formData.currentHp);
    emitUpdatedNpc(updatedNpc);
    error.value = '';
  } catch (saveError) {
    error.value = extractApiErrorMessage(saveError, 'Errore salvataggio HP NPC');
  } finally {
    saving.value = false;
  }
};

const saveNpc = async () => {
  if (!canEdit.value) {
    return;
  }

  saving.value = true;
  try {
    const updatedNpc = await updateNpc(props.character.id, {
      worldId: props.character.worldId,
      name: formData.name,
      race: formData.race,
      roleOrClass: formData.roleOrClass,
      alignment: formData.alignment,
      size: formData.size,
      creatureType: formData.creatureType,
      description: formData.description,
      gmNotes: formData.gmNotes,
      isVisibleToPlayers: formData.isVisibleToPlayers,
      armorClass: props.character.armorClass ?? undefined,
      maxHitPoints: props.character.maxHitPoints ?? undefined,
      currentHitPoints: formData.currentHp,
      temporaryHitPoints: formData.temporaryHitPoints ?? undefined,
      hitDice: formData.hitDice,
      speed: props.character.speed ?? undefined,
      strength: props.character.strength ?? undefined,
      dexterity: props.character.dexterity ?? undefined,
      constitution: props.character.constitution ?? undefined,
      intelligence: props.character.intelligence ?? undefined,
      wisdom: props.character.wisdom ?? undefined,
      charisma: props.character.charisma ?? undefined,
      savingThrows: formData.savingThrows,
      skills: formData.skills,
      damageResistances: formData.damageResistances,
      damageImmunities: formData.damageImmunities,
      conditionImmunities: formData.conditionImmunities,
      senses: formData.senses,
      languages: formData.languages,
      challengeRating: formData.challengeRating,
      experiencePoints: formData.experiencePoints ?? undefined,
      difficultyClass: formData.difficultyClass ?? undefined,
      traits: formData.traits,
      actions: formData.actions,
      legendaryActions: formData.legendaryActions,
      reactions: formData.reactions,
      lairActions: formData.lairActions,
      regionalEffects: formData.regionalEffects,
    });
    emitUpdatedNpc(updatedNpc);
    error.value = '';
  } catch (saveError) {
    error.value = extractApiErrorMessage(saveError, 'Errore salvataggio NPC');
  } finally {
    saving.value = false;
  }
};

const debouncedSaveHp = debounce(saveNpcHp, 800);
const debouncedSaveNpc = debounce(saveNpc, 1200);

watch(() => formData.currentHp, () => debouncedSaveHp());
watch(
  () => [
    formData.name,
    formData.race,
    formData.roleOrClass,
    formData.alignment,
    formData.size,
    formData.creatureType,
    formData.description,
    formData.gmNotes,
    formData.hitDice,
    formData.savingThrows,
    formData.skills,
    formData.damageResistances,
    formData.damageImmunities,
    formData.conditionImmunities,
    formData.senses,
    formData.languages,
    formData.challengeRating,
    formData.traits,
    formData.actions,
    formData.legendaryActions,
    formData.reactions,
    formData.lairActions,
    formData.regionalEffects,
    formData.temporaryHitPoints,
    formData.experiencePoints,
    formData.difficultyClass,
    formData.isVisibleToPlayers,
  ],
  () => debouncedSaveNpc(),
);

onBeforeUnmount(() => {
  debouncedSaveHp.flush();
  debouncedSaveNpc.flush();
});

const updateHp = (value: number) => {
  formData.currentHp = clampHp(value);
};
</script>

<template>
  <div class="character-sheet">
    <div v-if="saving" class="saving-badge">Saving...</div>

    <div class="header">
      <div class="identity">
        <h2>{{ formData.name }}</h2>
        <span class="sub">{{ formData.roleOrClass || 'NPC' }}</span>
      </div>
    </div>

    <CharacterVitalsPanel
      :current-hp="formData.currentHp"
      :max-hp="character.maxHitPoints"
      :armor-class="character.armorClass"
      :speed="character.speed"
      :can-edit="canEdit"
      :read-only="!canEdit"
      @update-hp="updateHp"
    />

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
        <h3>Dati Base</h3>
        <div class="row">
          <div class="col">
            <label>Nome</label>
            <input v-model="formData.name" :readonly="!canEdit" type="text">
          </div>
          <div class="col">
            <label>Razza</label>
            <input v-model="formData.race" :readonly="!canEdit" type="text">
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Ruolo/Classe</label>
            <input v-model="formData.roleOrClass" :readonly="!canEdit" type="text">
          </div>
          <div class="col">
            <label>Allineamento</label>
            <input v-model="formData.alignment" :readonly="!canEdit" type="text">
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Taglia</label>
            <input v-model="formData.size" :readonly="!canEdit" type="text">
          </div>
          <div class="col">
            <label>Tipo Creatura</label>
            <input v-model="formData.creatureType" :readonly="!canEdit" type="text">
          </div>
        </div>
      </div>

      <div class="section-block">
        <h3>Descrizione</h3>
        <textarea v-model="formData.description" :readonly="!canEdit" rows="4" />
      </div>

      <div class="section-block">
        <h3>Dettagli</h3>
        <div class="row">
          <div class="col">
            <label>Hit Dice</label>
            <input v-model="formData.hitDice" :readonly="!canEdit" type="text">
          </div>
          <div class="col">
            <label>Sensi</label>
            <input v-model="formData.senses" :readonly="!canEdit" type="text">
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Linguaggi</label>
            <input v-model="formData.languages" :readonly="!canEdit" type="text">
          </div>
          <div class="col">
            <label>Skills</label>
            <input v-model="formData.skills" :readonly="!canEdit" type="text">
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Saving Throws</label>
            <input v-model="formData.savingThrows" :readonly="!canEdit" type="text">
          </div>
          <div class="col">
            <label>Challenge Rating</label>
            <input v-model="formData.challengeRating" :readonly="!canEdit" type="text">
          </div>
        </div>
      </div>

      <details>
        <summary>Tratti</summary>
        <div class="details-content">
          <textarea v-model="formData.traits" :readonly="!canEdit" rows="4" />
        </div>
      </details>

      <details>
        <summary>Azioni</summary>
        <div class="details-content">
          <textarea v-model="formData.actions" :readonly="!canEdit" rows="4" />
        </div>
      </details>

      <details>
        <summary>Reazioni e Altro</summary>
        <div class="details-content stack">
          <label>
            Reazioni
            <textarea v-model="formData.reactions" :readonly="!canEdit" rows="3" />
          </label>
          <label>
            Legendary Actions
            <textarea v-model="formData.legendaryActions" :readonly="!canEdit" rows="3" />
          </label>
          <label>
            Lair Actions
            <textarea v-model="formData.lairActions" :readonly="!canEdit" rows="3" />
          </label>
          <label>
            Regional Effects
            <textarea v-model="formData.regionalEffects" :readonly="!canEdit" rows="3" />
          </label>
        </div>
      </details>

      <div class="section-block">
        <h3>Note GM</h3>
        <textarea v-model="formData.gmNotes" :readonly="!canEdit" rows="4" />
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
  margin-bottom: 1rem;
}

.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.9rem;
  font-weight: bold;
  color: #cbd5e0;
}

input,
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

input:focus,
textarea:focus {
  border-color: #63b3ed;
  outline: none;
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

.details-content {
  padding: 1rem;
  border-top: 1px solid #4a5568;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
