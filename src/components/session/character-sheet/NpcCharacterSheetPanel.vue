<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { updateNpc, updateNpcHp } from '../../../api/npcsApi';
import type { NpcResponse } from '../../../types/api';
import { extractApiErrorMessage } from '../../../utils/errorMessage';
import CharacterAttributesPanel from './CharacterAttributesPanel.vue';
import CharacterVitalsPanel from './CharacterVitalsPanel.vue';
import ArcaneCorner from '../../theme/arcane/ArcaneCorner.vue';
import ArcaneDiamond from '../../theme/arcane/ArcaneDiamond.vue';
import ArcaneDivider from '../../theme/arcane/ArcaneDivider.vue';

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

const updateTemporaryHp = (value: number) => {
  formData.temporaryHitPoints = Math.max(0, Math.trunc(value));
};
</script>

<template>
  <div class="character-sheet arcane-sheet arcane-sheet--npc">
    <div class="arcane-sheet__frame" aria-hidden="true" />
    <ArcaneCorner class="arcane-only" color="var(--arcane-crimson)" position="top-left" />
    <ArcaneCorner class="arcane-only" color="var(--arcane-crimson)" position="top-right" />
    <ArcaneCorner class="arcane-only" color="var(--arcane-crimson)" position="bottom-left" />
    <ArcaneCorner class="arcane-only" color="var(--arcane-crimson)" position="bottom-right" />

    <div class="arcane-sheet__content">
      <div v-if="saving" class="saving-badge">Saving...</div>

      <div class="header arcane-sheet__header">
        <div class="arcane-sheet__title-row">
          <div class="identity arcane-sheet__title-block">
            <h2 class="arcane-sheet__title arcane-sheet__title--npc">{{ formData.name }}</h2>
            <span class="sub arcane-sheet__subtitle arcane-sheet__subtitle--npc">
              {{ formData.roleOrClass || 'NPC' }}
            </span>
          </div>
        </div>
        <div class="arcane-sheet__divider arcane-only">
          <ArcaneDivider color="var(--arcane-crimson)" />
        </div>
      </div>

      <CharacterVitalsPanel
        :current-hp="formData.currentHp"
        :max-hp="character.maxHitPoints"
        :temporary-hp="formData.temporaryHitPoints"
        :armor-class="character.armorClass"
        :speed="character.speed"
        :can-edit="canEdit"
        :read-only="!canEdit"
        @update-hp="updateHp"
        @update-temp-hp="updateTemporaryHp"
      />

      <CharacterAttributesPanel
        :strength="character.strength"
        :dexterity="character.dexterity"
        :constitution="character.constitution"
        :intelligence="character.intelligence"
        :wisdom="character.wisdom"
        :charisma="character.charisma"
      />

      <div class="arcane-section-divider arcane-only">
        <ArcaneDivider color="var(--arcane-crimson)" variant="compact" />
      </div>

      <div class="sections">
        <div class="section-block arcane-sheet__section">
          <h3 class="arcane-sheet__section-title arcane-sheet__section-title--npc">
            <ArcaneDiamond class="arcane-only" color="var(--arcane-crimson-light)" size="sm" />
            <span>Dati Base</span>
          </h3>
          <div class="row">
            <div class="col">
              <label>Nome</label>
              <input v-model="formData.name" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
            <div class="col">
              <label>Razza</label>
              <input v-model="formData.race" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
          </div>
          <div class="row">
            <div class="col">
              <label>Ruolo/Classe</label>
              <input v-model="formData.roleOrClass" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
            <div class="col">
              <label>Allineamento</label>
              <input v-model="formData.alignment" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
          </div>
          <div class="row">
            <div class="col">
              <label>Taglia</label>
              <input v-model="formData.size" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
            <div class="col">
              <label>Tipo Creatura</label>
              <input v-model="formData.creatureType" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
          </div>
        </div>

        <div class="section-block arcane-sheet__section">
          <h3 class="arcane-sheet__section-title arcane-sheet__section-title--npc">
            <ArcaneDiamond class="arcane-only" color="var(--arcane-crimson-light)" size="sm" />
            <span>Descrizione</span>
          </h3>
          <textarea v-model="formData.description" class="arcane-textarea" :readonly="!canEdit" rows="4" />
        </div>

        <div class="section-block arcane-sheet__section">
          <h3 class="arcane-sheet__section-title arcane-sheet__section-title--npc">
            <ArcaneDiamond class="arcane-only" color="var(--arcane-crimson-light)" size="sm" />
            <span>Dettagli</span>
          </h3>
          <div class="row">
            <div class="col">
              <label>Hit Dice</label>
              <input v-model="formData.hitDice" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
            <div class="col">
              <label>Sensi</label>
              <input v-model="formData.senses" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
          </div>
          <div class="row">
            <div class="col">
              <label>Linguaggi</label>
              <input v-model="formData.languages" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
            <div class="col">
              <label>Skills</label>
              <input v-model="formData.skills" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
          </div>
          <div class="row">
            <div class="col">
              <label>Saving Throws</label>
              <input v-model="formData.savingThrows" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
            <div class="col">
              <label>Challenge Rating</label>
              <input v-model="formData.challengeRating" class="arcane-input" :readonly="!canEdit" type="text">
            </div>
          </div>
        </div>

        <details class="arcane-sheet__details">
          <summary>Tratti</summary>
          <div class="details-content arcane-sheet__details-content">
            <textarea v-model="formData.traits" class="arcane-textarea" :readonly="!canEdit" rows="4" />
          </div>
        </details>

        <details class="arcane-sheet__details">
          <summary>Azioni</summary>
          <div class="details-content arcane-sheet__details-content">
            <textarea v-model="formData.actions" class="arcane-textarea" :readonly="!canEdit" rows="4" />
          </div>
        </details>

        <details class="arcane-sheet__details">
          <summary>Reazioni e Altro</summary>
          <div class="details-content stack arcane-sheet__details-content">
            <label>
              Reazioni
              <textarea v-model="formData.reactions" class="arcane-textarea" :readonly="!canEdit" rows="3" />
            </label>
            <label>
              Legendary Actions
              <textarea
                v-model="formData.legendaryActions"
                class="arcane-textarea"
                :readonly="!canEdit"
                rows="3"
              />
            </label>
            <label>
              Lair Actions
              <textarea v-model="formData.lairActions" class="arcane-textarea" :readonly="!canEdit" rows="3" />
            </label>
            <label>
              Regional Effects
              <textarea
                v-model="formData.regionalEffects"
                class="arcane-textarea"
                :readonly="!canEdit"
                rows="3"
              />
            </label>
          </div>
        </details>

        <div class="section-block arcane-sheet__section">
          <h3 class="arcane-sheet__section-title arcane-sheet__section-title--npc">
            <ArcaneDiamond class="arcane-only" color="var(--arcane-crimson-light)" size="sm" />
            <span>Note DM</span>
          </h3>
          <textarea v-model="formData.gmNotes" class="arcane-textarea" :readonly="!canEdit" rows="4" />
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
  padding: 1.25rem;
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
  margin-bottom: 1rem;
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

.divider {
  border: 0;
  border-top: 1px solid var(--app-surface-outline);
  margin: 2rem 0;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.section-block {
  margin-bottom: 0;
}

.section-block h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
  color: var(--app-text);
  border-bottom: 1px solid var(--app-surface-outline);
  padding-bottom: 0.4rem;
}

.row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.8rem;
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

label {
  font-size: 0.9rem;
  font-weight: bold;
  color: color-mix(in srgb, var(--app-text) 86%, var(--app-text-muted));
}

input,
textarea {
  background: var(--app-input-bg);
  border: 1px solid var(--app-input-border);
  color: var(--app-text);
  padding: 0.7rem 0.8rem;
  border-radius: 0.85rem;
  font-family: inherit;
  resize: vertical;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

input:focus,
textarea:focus {
  border-color: var(--app-accent);
  box-shadow: 0 0 0 2px var(--app-focus-ring);
  outline: none;
}

details {
  background: var(--sheet-panel-bg);
  border: 1px solid var(--sheet-panel-border);
  border-radius: 0.9rem;
  margin-bottom: 0;
  overflow: hidden;
}

summary {
  padding: 0.72rem 0.8rem;
  cursor: pointer;
  font-weight: bold;
  user-select: none;
}

.details-content {
  padding: 0.85rem;
  border-top: 1px solid var(--app-surface-outline);
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
  background: var(--app-danger);
  color: var(--app-text);
  padding: 1rem;
  border-radius: 6px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .character-sheet {
    padding: 0.95rem;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .row {
    flex-direction: column;
    gap: 0.8rem;
  }
}

@media (max-width: 430px) {
  .character-sheet {
    padding: 0.8rem;
  }

  .identity h2 {
    font-size: 1.2rem;
  }

  .section-block h3 {
    margin-bottom: 0.65rem;
  }
}
</style>
