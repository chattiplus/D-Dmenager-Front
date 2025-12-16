<!-- src/views/PlayerCharactersView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
  createCharacter,
  deleteCharacter,
  getMyCharacters,
  updateCharacter,
} from '../api/charactersApi';
import type { PlayerCharacterRequest, PlayerCharacterResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
const characters = ref<PlayerCharacterResponse[]>([]);
const loading = ref(false);
const formLoading = ref(false);
const formError = ref('');
const successMessage = ref('');
const editingId = ref<number | null>(null);
const activeTab = ref<'list' | 'create'>('list');

const createDefaultForm = (): PlayerCharacterRequest => ({
  name: '',
  race: '',
  alignment: '',
  background: '',
  characterClass: '',
  subclass: '',
  level: 1,
  experiencePoints: 0,
  inspiration: false,
  proficiencyBonus: 2,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  strengthSaveProficient: false,
  dexteritySaveProficient: false,
  constitutionSaveProficient: false,
  intelligenceSaveProficient: false,
  wisdomSaveProficient: false,
  charismaSaveProficient: false,
  acrobaticsProficient: false,
  animalHandlingProficient: false,
  arcanaProficient: false,
  athleticsProficient: false,
  deceptionProficient: false,
  historyProficient: false,
  insightProficient: false,
  intimidationProficient: false,
  investigationProficient: false,
  medicineProficient: false,
  natureProficient: false,
  perceptionProficient: false,
  performanceProficient: false,
  persuasionProficient: false,
  religionProficient: false,
  sleightOfHandProficient: false,
  stealthProficient: false,
  survivalProficient: false,
  maxHitPoints: null,
  currentHitPoints: null,
  temporaryHitPoints: null,
  armorClass: null,
  speed: null,
  initiativeModifier: null,
  hitDice: '',
  deathSaveSuccesses: null,
  deathSaveFailures: null,
  passivePerception: null,
  passiveInvestigation: null,
  passiveInsight: null,
  personalityTraits: '',
  ideals: '',
  bonds: '',
  flaws: '',
  appearance: '',
  backstory: '',
  featuresAndTraits: '',
  alliesAndOrganizations: '',
  treasure: '',
  proficienciesAndLanguages: '',
  otherProficiencies: '',
  attacksAndSpellcasting: '',
  equipment: '',
  spells: '',
  spellcastingClass: '',
  spellSaveDC: null,
  spellAttackBonus: null,
  knownSpells: '',
  preparedSpells: '',
  spellSlots: '',
  otherNotes: '',
  gmNotes: '',
  isVisibleToPlayers: true,
  knownLanguages: ['COMMON'],
});

const characterForm = reactive<PlayerCharacterRequest>(createDefaultForm());
const formBindings = characterForm as Record<string, any>; // helper alias per binding dinamico

const abilityFields = [
  { key: 'strength', label: 'FOR' },
  { key: 'dexterity', label: 'DES' },
  { key: 'constitution', label: 'COS' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'SAG' },
  { key: 'charisma', label: 'CAR' },
] as const satisfies { key: keyof PlayerCharacterRequest; label: string }[];

const savingThrowFields = [
  { key: 'strengthSaveProficient', label: 'Forza' },
  { key: 'dexteritySaveProficient', label: 'Destrezza' },
  { key: 'constitutionSaveProficient', label: 'Costituzione' },
  { key: 'intelligenceSaveProficient', label: 'Intelligenza' },
  { key: 'wisdomSaveProficient', label: 'Saggezza' },
  { key: 'charismaSaveProficient', label: 'Carisma' },
] as const satisfies { key: keyof PlayerCharacterRequest; label: string }[];

const skillFields = [
  { key: 'acrobaticsProficient', label: 'Acrobazia (DES)' },
  { key: 'animalHandlingProficient', label: 'Addestrare animali (SAG)' },
  { key: 'arcanaProficient', label: 'Arcano (INT)' },
  { key: 'athleticsProficient', label: 'Atletica (FOR)' },
  { key: 'deceptionProficient', label: 'Inganno (CAR)' },
  { key: 'historyProficient', label: 'Storia (INT)' },
  { key: 'insightProficient', label: 'Intuizione (SAG)' },
  { key: 'intimidationProficient', label: 'Intimidire (CAR)' },
  { key: 'investigationProficient', label: 'Investigare (INT)' },
  { key: 'medicineProficient', label: 'Medicina (SAG)' },
  { key: 'natureProficient', label: 'Natura (INT)' },
  { key: 'perceptionProficient', label: 'Percezione (SAG)' },
  { key: 'performanceProficient', label: 'Intrattenere (CAR)' },
  { key: 'persuasionProficient', label: 'Persuasione (CAR)' },
  { key: 'religionProficient', label: 'Religione (INT)' },
  { key: 'sleightOfHandProficient', label: 'Rapidità di mano (DES)' },
  { key: 'stealthProficient', label: 'Furtività (DES)' },
  { key: 'survivalProficient', label: 'Sopravvivenza (SAG)' },
  { key: 'survivalProficient', label: 'Sopravvivenza (SAG)' },
] as const satisfies { key: keyof PlayerCharacterRequest; label: string }[];

const AVAILABLE_LANGUAGES = [
  'COMMON', 
  'DWARVISH', 
  'ELVISH', 
  'GIANT', 
  'GNOMISH', 
  'GOBLIN', 
  'HALFLING', 
  'ORC',
  'ABYSSAL', 
  'CELESTIAL', 
  'DRACONIC', 
  'DEEP_SPEECH', 
  'INFERNAL', 
  'PRIMORDIAL', 
  'SYLVAN', 
  'UNDERCOMMON', 
  'THIEVES_CANT', 
  'EGYPTIAN'
] as const;

const isEditing = computed(() => editingId.value !== null);

const resetForm = () => {
  Object.assign(characterForm, createDefaultForm());
  editingId.value = null;
  formError.value = '';
  successMessage.value = '';
};

const normalizePayload = (form: PlayerCharacterRequest): PlayerCharacterRequest => {
  const normalized = { ...form } as Record<string, any>;
  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      normalized[key] = trimmed.length ? trimmed : undefined;
    } else if (value === null) {
      normalized[key] = undefined;
    }
  });
  return normalized as PlayerCharacterRequest;
};

const loadCharacters = async () => {
  loading.value = true;
  formError.value = '';
  try {
    characters.value = await getMyCharacters();
  } catch (error) {
    formError.value = extractApiErrorMessage(error, 'Impossibile recuperare i personaggi.');
  } finally {
    loading.value = false;
  }
};

const submitForm = async () => {
  if (authStore.isViewerOnly) {
    formError.value = 'Gli account Viewer possono solo consultare le schede.';
    return;
  }
  formError.value = '';
  successMessage.value = '';
  const trimmedName = characterForm.name.trim();
  if (!trimmedName) {
    formError.value = 'Il nome del personaggio è obbligatorio.';
    return;
  }
  if (characterForm.level != null && characterForm.level < 1) {
    formError.value = 'Il livello deve essere almeno 1.';
    return;
  }

  const payload = normalizePayload({
    ...characterForm,
    name: trimmedName,
    level: characterForm.level && characterForm.level >= 1 ? characterForm.level : 1,
  });

  formLoading.value = true;
  const wasEditing = isEditing.value;
  try {
    if (wasEditing && editingId.value) {
      await updateCharacter(editingId.value, payload);
      successMessage.value = 'Scheda aggiornata con successo.';
    } else {
      await createCharacter(payload);
      successMessage.value = 'Nuovo personaggio creato.';
    }
    resetForm();
    await loadCharacters();
    if (!wasEditing) {
      activeTab.value = 'list';
    }
  } catch (error) {
    formError.value = extractApiErrorMessage(error, 'Operazione non riuscita.');
  } finally {
    formLoading.value = false;
  }
};

const editCharacter = (character: PlayerCharacterResponse) => {
  if (authStore.isViewerOnly) {
    return;
  }
  const { id, ownerId, ownerNickname, ...editable } = character;
  Object.assign(characterForm, createDefaultForm(), editable);
  editingId.value = character.id;
  formError.value = '';
  successMessage.value = '';
  activeTab.value = 'create';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const removeCharacter = async (characterId: number) => {
  if (authStore.isViewerOnly) {
    return;
  }
  formError.value = '';
  try {
    await deleteCharacter(characterId);
    if (editingId.value === characterId) {
      resetForm();
    }
    await loadCharacters();
  } catch (error) {
    formError.value = extractApiErrorMessage(error, 'Eliminazione non riuscita.');
  }
};

onMounted(() => {
  loadCharacters();
});
</script>

<template>
  <section class="stack">
    <div v-if="!authStore.isViewerOnly" class="card stack">
      <header>
        <h1 class="section-title">Personaggi giocanti</h1>
        <p class="section-subtitle">
          Ogni scheda e pronta per essere inviata ai Dungeon Master delle campagne aperte.
        </p>
      </header>

      <nav class="dm-tabs" role="tablist">
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'list' }"
          @click="activeTab = 'list'"
        >
          Personaggi giocanti
        </button>
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'create' }"
          @click="activeTab = 'create'"
        >
          Crea personaggio
        </button>
      </nav>

      <section v-if="activeTab === 'list'" class="dm-tab-panel stack">
        <p v-if="formError" class="status-message text-danger">{{ formError }}</p>
        <div v-if="loading">Caricamento personaggi...</div>
        <section v-else class="stack">
          <ul v-if="characters.length" class="character-grid">
            <li v-for="character in characters" :key="character.id" class="card character-card stack">
              <header class="card-header">
                <div>
                  <h3 class="card-title">{{ character.name }}</h3>
                  <p class="card-subtitle">
                    {{ character.race || 'Razza sconosciuta' }} -
                    {{ character.characterClass || 'Classe' }}
                    <span v-if="character.subclass">({{ character.subclass }})</span>
                    <span v-if="character.level" class="level-pill">Lv. {{ character.level }}</span>
                  </p>
                </div>
                <span class="tag" :class="{ 'tag-muted': !character.isVisibleToPlayers }">
                  {{ character.isVisibleToPlayers ? 'Visibile' : 'Privato' }}
                </span>
              </header>

              <dl class="character-meta">
                <div>
                  <dt>Allineamento</dt>
                  <dd>{{ character.alignment || 'N/D' }}</dd>
                </div>
                <div>
                  <dt>Punti ferita</dt>
                  <dd>
                    <strong>{{ character.currentHitPoints ?? 'N/D' }}</strong>
                    <span v-if="character.maxHitPoints">/ {{ character.maxHitPoints }}</span>
                  </dd>
                </div>
                <div>
                  <dt>Classe armatura</dt>
                  <dd>{{ character.armorClass ?? 'N/D' }}</dd>
                </div>
                <div>
                  <dt>Velocita</dt>
                  <dd>{{ character.speed ? character.speed + ' ft' : 'N/D' }}</dd>
                </div>
              </dl>

              <p v-if="character.backstory" class="muted clamp">
                {{ character.backstory }}
              </p>

              <div class="actions">
                <button class="btn btn-secondary" type="button" @click="editCharacter(character)">
                  Modifica
                </button>
                <button class="btn btn-link text-danger" type="button" @click="removeCharacter(character.id)">
                  Elimina
                </button>
              </div>
            </li>
          </ul>
          <p v-else class="muted">Non hai ancora creato personaggi giocanti.</p>
        </section>
      </section>

      <section v-else class="dm-tab-panel stack">
        <header>
          <h2 class="card-title">{{ isEditing ? 'Modifica scheda' : 'Nuovo personaggio' }}</h2>
          <p class="card-subtitle">
            Organizza le informazioni come in una classica scheda D&D: identita, classe, caratteristiche e note per il GM.
          </p>
        </header>

        <p v-if="formError" class="status-message text-danger">{{ formError }}</p>
        <p v-if="successMessage" class="status-message text-success">{{ successMessage }}</p>

        <form class="character-sheet stack" @submit.prevent="submitForm">
          <div class="character-sheet-grid">
            <div class="sheet-column">
            <section class="sheet-section">
              <h3 class="section-heading">Identita</h3>
              <div class="form-grid two-col">
                <label class="field">
                  <span>Nome *</span>
                  <input
                    v-model="characterForm.name"
                    type="text"
                    placeholder="Es. Elric di Melnibone"
                    required
                  />
                </label>
                <label class="field">
                  <span>Razza</span>
                  <input v-model="characterForm.race" type="text" placeholder="Es. Elfo alto" />
                </label>
                <label class="field">
                  <span>Allineamento</span>
                  <input v-model="characterForm.alignment" type="text" placeholder="Es. Caotico Buono" />
                </label>
                <label class="field">
                  <span>Background</span>
                  <input v-model="characterForm.background" type="text" placeholder="Es. Eroe popolare" />
                </label>
              </div>
            </section>

            <section class="sheet-section">
              <h3 class="section-heading">Roleplay & Background</h3>
              <div class="form-grid two-col">
                <label class="field">
                  <span>Tratti di personalita</span>
                  <textarea v-model="characterForm.personalityTraits" rows="2" placeholder="Curioso, impetuoso" ></textarea>
                </label>
                <label class="field">
                  <span>Ideali</span>
                  <textarea v-model="characterForm.ideals" rows="2" placeholder="Conoscenza sopra ogni cosa" ></textarea>
                </label>
                <label class="field">
                  <span>Legami</span>
                  <textarea v-model="characterForm.bonds" rows="2" placeholder="Devo proteggere il mio clan" ></textarea>
                </label>
                <label class="field">
                  <span>Difetti</span>
                  <textarea v-model="characterForm.flaws" rows="2" placeholder="Superbia incontrollata" ></textarea>
                </label>
                <label class="field">
                  <span>Aspetto</span>
                  <textarea v-model="characterForm.appearance" rows="2" placeholder="Cicatrice su un occhio" ></textarea>
                </label>
                <label class="field">
                  <span>Tesoro</span>
                  <textarea v-model="characterForm.treasure" rows="2" placeholder="50 mo, anello elfico" ></textarea>
                </label>
              </div>
            </section>

            <section class="sheet-section">
              <h3 class="section-heading">Storia e appunti</h3>
              <label class="field">
                <span>Background narrativo</span>
                <textarea v-model="characterForm.backstory" rows="3" placeholder="Breve storia del personaggio" ></textarea>
              </label>
              <div class="form-grid two-col">
                <label class="field">
                  <span>Tratti e capacita</span>
                  <textarea v-model="characterForm.featuresAndTraits" rows="3" placeholder="Recupero arcano, Secondo soffio" ></textarea>
                </label>
                <label class="field">
                  <span>Alleati e organizzazioni</span>
                  <textarea v-model="characterForm.alliesAndOrganizations" rows="3" placeholder="Harpers, Ordine locale" ></textarea>
                </label>
              </div>
              <label class="field">
                <span>Altre note personali</span>
                <textarea v-model="characterForm.otherNotes" rows="3" placeholder="Segreti, appunti vari" ></textarea>
              </label>
            </section>
          </div>

          <div class="sheet-column">
            <section class="sheet-section">
              <h3 class="section-heading">Classe e livello</h3>
              <div class="form-grid two-col">
                <label class="field">
                  <span>Classe</span>
                  <input v-model="characterForm.characterClass" type="text" placeholder="Es. Mago" />
                </label>
                <label class="field">
                  <span>Sottoclasse</span>
                  <input v-model="characterForm.subclass" type="text" placeholder="Es. Scuola di Evocazione" />
                </label>
                <label class="field">
                  <span>Livello</span>
                  <input v-model.number="characterForm.level" type="number" min="1" required />
                </label>
                <label class="field">
                  <span>Punti esperienza</span>
                  <input v-model.number="characterForm.experiencePoints" type="number" min="0" />
                </label>
                <label class="field">
                  <span>Bonus competenza</span>
                  <input v-model.number="characterForm.proficiencyBonus" type="number" step="1" />
                </label>
                <label class="field checkbox checkbox-inline">
                  <input v-model="characterForm.inspiration" type="checkbox" />
                  <span>Ispirazione attiva</span>
                </label>
              </div>
            </section>

            <section class="sheet-section">
              <h3 class="section-heading">Caratteristiche</h3>
              <div class="ability-grid">
                <label v-for="ability in abilityFields" :key="ability.key" class="field ability">
                  <span>{{ ability.label }}</span>
                  <input v-model.number="formBindings[ability.key]" type="number" min="1" />
                </label>
              </div>

              <div class="form-grid two-col">
                <label class="field">
                  <span>PF massimi</span>
                  <input v-model.number="characterForm.maxHitPoints" type="number" min="0" />
                </label>
                <label class="field">
                  <span>PF attuali</span>
                  <input v-model.number="characterForm.currentHitPoints" type="number" min="0" />
                </label>
                <label class="field">
                  <span>PF temporanei</span>
                  <input v-model.number="characterForm.temporaryHitPoints" type="number" min="0" />
                </label>
                <label class="field">
                  <span>Classe armatura</span>
                  <input v-model.number="characterForm.armorClass" type="number" min="0" />
                </label>
                <label class="field">
                  <span>Velocita (ft)</span>
                  <input v-model.number="characterForm.speed" type="number" min="0" />
                </label>
                <label class="field">
                  <span>Iniziativa</span>
                  <input v-model.number="characterForm.initiativeModifier" type="number" />
                </label>
                <label class="field">
                  <span>Hit Dice</span>
                  <input v-model="characterForm.hitDice" type="text" placeholder="Es. 3d8" />
                </label>
                <label class="field">
                  <span>Passiva (Percezione)</span>
                  <input v-model.number="characterForm.passivePerception" type="number" min="0" />
                </label>
                <label class="field">
                  <span>Passiva (Indagine)</span>
                  <input v-model.number="characterForm.passiveInvestigation" type="number" min="0" />
                </label>
                <label class="field">
                  <span>Passiva (Intuizione)</span>
                  <input v-model.number="characterForm.passiveInsight" type="number" min="0" />
                </label>
                <label class="field">
                  <span>Successi tiri morte</span>
                  <input v-model.number="characterForm.deathSaveSuccesses" type="number" min="0" max="3" />
                </label>
                <label class="field">
                  <span>Fallimenti tiri morte</span>
                  <input v-model.number="characterForm.deathSaveFailures" type="number" min="0" max="3" />
                </label>
              </div>
            </section>

            <section class="sheet-section">
              <h3 class="section-heading">Tiri salvezza & Skill</h3>
              <div class="checkbox-group">
                <label v-for="save in savingThrowFields" :key="save.key" class="checkbox-pill">
                  <input v-model="formBindings[save.key]" type="checkbox" />
                  <span>{{ save.label }}</span>
                </label>
              </div>
              <div class="skills-grid">
                <label v-for="skill in skillFields" :key="skill.key" class="checkbox-pill">
                  <input v-model="formBindings[skill.key]" type="checkbox" />
                  <span>{{ skill.label }}</span>
                </label>
              </div>
            </section>

            <section class="sheet-section">
              <h3 class="section-heading">Competenze & incantesimi</h3>
              <div class="form-grid two-col">
                <label class="field">
                  <span>Lingue conosciute</span>
                  <div class="checkbox-group">
                    <label v-for="lang in AVAILABLE_LANGUAGES" :key="lang" class="checkbox-pill">
                      <input
                        type="checkbox"
                        :value="lang"
                        v-model="characterForm.knownLanguages"
                        :disabled="lang === 'COMMON'"
                      />
                      <span>{{ lang }}</span>
                    </label>
                  </div>
                </label>
                <label class="field">
                  <span>Altre competenze e lingue extra</span>
                  <textarea v-model="characterForm.proficienciesAndLanguages" rows="2" ></textarea>
                </label>
                <label class="field">
                  <span>Altre competenze</span>
                  <textarea v-model="characterForm.otherProficiencies" rows="2" ></textarea>
                </label>
              </div>
              <label class="field">
                <span>Attacchi e capacita</span>
                <textarea v-model="characterForm.attacksAndSpellcasting" rows="3" ></textarea>
              </label>
              <label class="field">
                <span>Equipaggiamento</span>
                <textarea v-model="characterForm.equipment" rows="3" ></textarea>
              </label>
              <div class="form-grid two-col">
                <label class="field">
                  <span>Classe incantatore</span>
                  <input v-model="characterForm.spellcastingClass" type="text" placeholder="Es. Mago" />
                </label>
                <label class="field">
                  <span>CD Tiri salvezza</span>
                  <input v-model.number="characterForm.spellSaveDC" type="number" min="0" />
                </label>
                <label class="field">
                  <span>Bonus attacco</span>
                  <input v-model.number="characterForm.spellAttackBonus" type="number" />
                </label>
              </div>
              <label class="field">
                <span>Incantesimi conosciuti</span>
                <textarea v-model="characterForm.knownSpells" rows="2" ></textarea>
              </label>
              <label class="field">
                <span>Incantesimi preparati</span>
                <textarea v-model="characterForm.preparedSpells" rows="2" ></textarea>
              </label>
              <label class="field">
                <span>Slot incantesimo</span>
                <input v-model="characterForm.spellSlots" type="text" placeholder="1:4, 2:3" />
              </label>
              <label class="field">
                <span>Lista incantesimi</span>
                <textarea v-model="characterForm.spells" rows="3" ></textarea>
              </label>
            </section>

            <section class="sheet-section">
              <h3 class="section-heading">Visibilita e note GM</h3>
              <label class="field checkbox">
                <input v-model="characterForm.isVisibleToPlayers" type="checkbox" />
                <span>Visibile ai Dungeon Master e agli altri player</span>
              </label>
              <label class="field">
                <span>Note per il GM</span>
                <textarea v-model="characterForm.gmNotes" rows="3" placeholder="Informazioni segrete, missioni, ecc." ></textarea>
              </label>
            </section>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="submit" :disabled="formLoading">
            {{ formLoading ? 'Salvataggio...' : isEditing ? 'Aggiorna scheda' : 'Crea personaggio' }}
          </button>
          <button v-if="isEditing" class="btn btn-link" type="button" @click="resetForm">
            Annulla modifica
          </button>
        </div>
        </form>
      </section>
    </div>
    <div v-else class="card stack">
      <h2 class="card-title">Modalita sola lettura</h2>
      <p class="card-subtitle">
        Gli utenti Viewer non possono creare o modificare personaggi. Chiedi a un GM di
        aggiornare i permessi se devi partecipare a una campagna attiva.
      </p>
      <RouterLink class="btn btn-link" to="/player/worlds">
        Torna ai mondi pubblici
      </RouterLink>
    </div>
  </section>
</template>



<style scoped>
.character-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.character-card {
  position: relative;
}

.character-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.character-meta dt {
  margin: 0;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--color-muted);
}

.character-meta dd {
  margin: 0;
  font-weight: 600;
}

.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.level-pill {
  margin-left: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-accent-strong);
}

.character-sheet {
  gap: 1.5rem;
}

.character-sheet-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.sheet-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sheet-section {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.02);
  padding: 1.25rem;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-heading {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 1.1rem;
}

.form-grid {
  display: grid;
  gap: 1rem;
}

.form-grid.two-col {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.ability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 0.75rem;
}

.ability-grid input {
  text-align: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.checkbox-inline {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.checkbox-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.85rem;
}

.checkbox-pill input {
  margin: 0;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.45rem;
}

@media (max-width: 768px) {
  .character-sheet-grid {
    grid-template-columns: 1fr;
  }

  .character-meta {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
}
</style>
