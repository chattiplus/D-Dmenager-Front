<!-- src/views/DmNpcsView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { getWorlds } from '../api/worldsApi';
import {
  createNpc,
  deleteNpc,
  getNpcs,
  getNpcsByWorld,
  updateNpc,
} from '../api/npcsApi';
import type { CreateNpcRequest, NpcResponse, WorldResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { useAuthStore } from '../store/authStore';
import EntityActions from '../components/ui/EntityActions.vue';
import RefreshAction from '../components/ui/RefreshAction.vue';

type FilterWorldId = number | 'all';
type NullableString = string | null | undefined;

interface NpcFormState {
  worldId: number;
  name: string;
  race: string;
  roleOrClass: string;
  alignment: string;
  size: string;
  creatureType: string;
  description: string;
  gmNotes: string;
  isVisibleToPlayers: boolean;
  armorClass: string;
  maxHitPoints: string;
  currentHitPoints: string;
  temporaryHitPoints: string;
  hitDice: string;
  speed: string;
  strength: string;
  dexterity: string;
  constitution: string;
  intelligence: string;
  wisdom: string;
  charisma: string;
  savingThrows: string;
  skills: string;
  damageResistances: string;
  damageImmunities: string;
  conditionImmunities: string;
  senses: string;
  languages: string;
  challengeRating: string;
  experiencePoints: string;
  difficultyClass: string;
  traits: string;
  actions: string;
  legendaryActions: string;
  reactions: string;
  lairActions: string;
  regionalEffects: string;
}

const createEmptyFormState = (worldId = 0): NpcFormState => ({
  worldId,
  name: '',
  race: '',
  roleOrClass: '',
  alignment: '',
  size: '',
  creatureType: '',
  description: '',
  gmNotes: '',
  isVisibleToPlayers: true,
  armorClass: '',
  maxHitPoints: '',
  currentHitPoints: '',
  temporaryHitPoints: '',
  hitDice: '',
  speed: '',
  strength: '',
  dexterity: '',
  constitution: '',
  intelligence: '',
  wisdom: '',
  charisma: '',
  savingThrows: '',
  skills: '',
  damageResistances: '',
  damageImmunities: '',
  conditionImmunities: '',
  senses: '',
  languages: '',
  challengeRating: '',
  experiencePoints: '',
  difficultyClass: '',
  traits: '',
  actions: '',
  legendaryActions: '',
  reactions: '',
  lairActions: '',
  regionalEffects: '',
});

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { canManageContent } = storeToRefs(authStore);

const worlds = ref<WorldResponse[]>([]);
const worldsLoading = ref(false);
const worldsError = ref('');

const selectedWorldId = ref<FilterWorldId>('all');

const npcs = ref<NpcResponse[]>([]);
const npcsLoading = ref(false);
const npcsError = ref('');
const deleteLoading = ref<number | null>(null);

const editingNpcId = ref<number | null>(null);
const formError = ref('');
const formLoading = ref(false);
const lastCreatedId = ref<number | null>(null);
const activeNpcTab = ref<'npcs' | 'create'>('npcs');

const formState = reactive<NpcFormState>(createEmptyFormState());

const worldName = (worldId: number) => {
  const world = worlds.value.find((entry) => entry.id === worldId);
  return world?.name ?? `Mondo #${worldId}`;
};

const optionalText = (value?: string | null) => {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const optionalNumber = (value?: string | null) => {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return undefined;
  }
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const numberToInputString = (value?: number | null) => {
  if (value === 0) {
    return '0';
  }
  if (value == null) {
    return '';
  }
  return String(value);
};

const textOrEmpty = (value?: NullableString) => value ?? '';

const sanitizeFilter = () => {
  if (selectedWorldId.value === 'all') {
    return;
  }
  const exists = worlds.value.some((world) => world.id === selectedWorldId.value);
  if (!exists) {
    selectedWorldId.value = 'all';
  }
};

const ensureFormWorld = () => {
  if (formState.worldId && worlds.value.some((world) => world.id === formState.worldId)) {
    return;
  }
  formState.worldId = worlds.value[0]?.id ?? 0;
};

const resetForm = () => {
  editingNpcId.value = null;
  formError.value = '';
  const currentWorldId = formState.worldId;
  Object.assign(formState, createEmptyFormState(currentWorldId));
  ensureFormWorld();
};

const fetchWorlds = async () => {
  worldsLoading.value = true;
  worldsError.value = '';
  try {
    worlds.value = await getWorlds();
    ensureFormWorld();
    sanitizeFilter();
  } catch (error) {
    worldsError.value = extractApiErrorMessage(error, 'Impossibile caricare i mondi.');
    worlds.value = [];
    formState.worldId = 0;
  } finally {
    worldsLoading.value = false;
  }
};

const fetchNpcs = async () => {
  npcsLoading.value = true;
  npcsError.value = '';
  try {
    if (selectedWorldId.value === 'all') {
      npcs.value = await getNpcs();
    } else {
      npcs.value = await getNpcsByWorld(selectedWorldId.value);
    }
  } catch (error) {
    npcsError.value = extractApiErrorMessage(error, 'Impossibile caricare gli NPC.');
    npcs.value = [];
  } finally {
    npcsLoading.value = false;
  }
};

const upsertNpc = async () => {
  console.debug('[DmNpcsView] upsertNpc called', {
    editingNpcId: editingNpcId.value,
    worldId: formState.worldId,
    name: formState.name,
    armorClass: formState.armorClass,
    maxHitPoints: formState.maxHitPoints,
    currentHitPoints: formState.currentHitPoints,
    temporaryHitPoints: formState.temporaryHitPoints,
  });

  if (!formState.worldId) {
    formError.value = 'Seleziona il mondo di appartenenza.';
    return;
  }
  const trimmedName = formState.name.trim();
  if (!trimmedName) {
    formError.value = "Il nome dell'NPC è obbligatorio.";
    return;
  }
  formError.value = '';
  formLoading.value = true;
  const payload: CreateNpcRequest = {
    worldId: formState.worldId,
    name: trimmedName,
    race: optionalText(formState.race),
    roleOrClass: optionalText(formState.roleOrClass),
    alignment: optionalText(formState.alignment),
    size: optionalText(formState.size),
    creatureType: optionalText(formState.creatureType),
    description: optionalText(formState.description),
    gmNotes: canManageContent.value ? optionalText(formState.gmNotes) : undefined,
    isVisibleToPlayers: formState.isVisibleToPlayers,
    armorClass: optionalNumber(formState.armorClass),
    maxHitPoints: optionalNumber(formState.maxHitPoints),
    currentHitPoints: optionalNumber(formState.currentHitPoints),
    temporaryHitPoints: optionalNumber(formState.temporaryHitPoints),
    hitDice: optionalText(formState.hitDice),
    speed: optionalText(formState.speed),
    strength: optionalNumber(formState.strength),
    dexterity: optionalNumber(formState.dexterity),
    constitution: optionalNumber(formState.constitution),
    intelligence: optionalNumber(formState.intelligence),
    wisdom: optionalNumber(formState.wisdom),
    charisma: optionalNumber(formState.charisma),
    savingThrows: optionalText(formState.savingThrows),
    skills: optionalText(formState.skills),
    damageResistances: optionalText(formState.damageResistances),
    damageImmunities: optionalText(formState.damageImmunities),
    conditionImmunities: optionalText(formState.conditionImmunities),
    senses: optionalText(formState.senses),
    languages: optionalText(formState.languages),
    challengeRating: optionalText(formState.challengeRating),
    experiencePoints: optionalNumber(formState.experiencePoints),
    difficultyClass: optionalNumber(formState.difficultyClass),
    traits: optionalText(formState.traits),
    actions: optionalText(formState.actions),
    legendaryActions: optionalText(formState.legendaryActions),
    reactions: optionalText(formState.reactions),
    lairActions: optionalText(formState.lairActions),
    regionalEffects: optionalText(formState.regionalEffects),
  };
  try {
    let created: NpcResponse;
    if (editingNpcId.value) {
      created = await updateNpc(editingNpcId.value, payload);
    } else {
      created = await createNpc(payload);
      lastCreatedId.value = created.id;
    }
    await fetchNpcs();
    startEdit(created);
  } catch (error) {
    formError.value = extractApiErrorMessage(error, 'Operazione non riuscita.');
  } finally {
    formLoading.value = false;
  }
};

const removeNpc = async (npcId: number) => {
  deleteLoading.value = npcId;
  npcsError.value = '';
  try {
    await deleteNpc(npcId);
    if (editingNpcId.value === npcId) {
      resetForm();
    }
    await fetchNpcs();
  } catch (error) {
    npcsError.value = extractApiErrorMessage(error, "Impossibile eliminare l'NPC.");
  } finally {
    deleteLoading.value = null;
  }
};

const startEdit = (npc: NpcResponse) => {
  editingNpcId.value = npc.id;
  activeNpcTab.value = 'create';
  Object.assign(formState, createEmptyFormState(npc.worldId));
  formState.name = npc.name;
  formState.race = textOrEmpty(npc.race);
  formState.roleOrClass = textOrEmpty(npc.roleOrClass);
  formState.alignment = textOrEmpty(npc.alignment);
  formState.size = textOrEmpty(npc.size);
  formState.creatureType = textOrEmpty(npc.creatureType);
  formState.description = textOrEmpty(npc.description);
  formState.gmNotes = canManageContent.value ? textOrEmpty(npc.gmNotes) : '';
  formState.armorClass = numberToInputString(npc.armorClass);
  formState.maxHitPoints = numberToInputString(npc.maxHitPoints);
  formState.currentHitPoints = numberToInputString(npc.currentHitPoints);
  formState.temporaryHitPoints = numberToInputString(npc.temporaryHitPoints);
  formState.hitDice = textOrEmpty(npc.hitDice);
  formState.speed = textOrEmpty(npc.speed);
  formState.strength = numberToInputString(npc.strength);
  formState.dexterity = numberToInputString(npc.dexterity);
  formState.constitution = numberToInputString(npc.constitution);
  formState.intelligence = numberToInputString(npc.intelligence);
  formState.wisdom = numberToInputString(npc.wisdom);
  formState.charisma = numberToInputString(npc.charisma);
  formState.savingThrows = textOrEmpty(npc.savingThrows);
  formState.skills = textOrEmpty(npc.skills);
  formState.damageResistances = textOrEmpty(npc.damageResistances);
  formState.damageImmunities = textOrEmpty(npc.damageImmunities);
  formState.conditionImmunities = textOrEmpty(npc.conditionImmunities);
  formState.senses = textOrEmpty(npc.senses);
  formState.languages = textOrEmpty(npc.languages);
  formState.challengeRating = textOrEmpty(npc.challengeRating);
  formState.experiencePoints = numberToInputString(npc.experiencePoints);
  formState.difficultyClass = numberToInputString(npc.difficultyClass);
  formState.traits = textOrEmpty(npc.traits);
  formState.actions = textOrEmpty(npc.actions);
  formState.legendaryActions = textOrEmpty(npc.legendaryActions);
  formState.reactions = textOrEmpty(npc.reactions);
  formState.lairActions = textOrEmpty(npc.lairActions);
  formState.regionalEffects = textOrEmpty(npc.regionalEffects);
  formState.isVisibleToPlayers = npc.isVisibleToPlayers;
  formError.value = '';
};

const cancelEdit = () => {
  resetForm();
};

const clearEditQuery = () => {
  if (!route.query.edit) {
    return;
  }
  const nextQuery = { ...route.query };
  delete nextQuery.edit;
  router.replace({ query: nextQuery });
};

const watchRouteEdit = () => {
  const raw = route.query.edit;
  if (!raw) {
    return;
  }
  const editId = Number(raw);
  if (!Number.isFinite(editId)) {
    return;
  }
  const existing = npcs.value.find((npc) => npc.id === editId);
  if (existing) {
    startEdit(existing);
    clearEditQuery();
  }
};

watch(
  () => selectedWorldId.value,
  () => {
    fetchNpcs();
  },
);

watch(
  () => npcs.value,
  () => {
    watchRouteEdit();
  },
);

watch(
  () => route.query.edit,
  () => {
    watchRouteEdit();
  },
);

onMounted(async () => {
  await Promise.all([fetchWorlds(), fetchNpcs()]);
  watchRouteEdit();
});

const highlightedNpcId = computed(() => editingNpcId.value ?? lastCreatedId.value ?? null);
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">NPC del Dungeon Master</h1>
        <p class="section-subtitle">
          Gestisci le schede complete dei tuoi NPC
        </p>
      </header>

      <nav class="dm-tabs" role="tablist">
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeNpcTab === 'npcs' }"
          @click="activeNpcTab = 'npcs'"
        >
          NPC
        </button>
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeNpcTab === 'create' }"
          @click="activeNpcTab = 'create'"
        >
          Crea NPC
        </button>
      </nav>

      <section v-if="activeNpcTab === 'npcs'" class="dm-tab-panel stack">
        <div class="manager-filter">
          <label>
            <span>Filtro mondo</span>
            <select v-model="selectedWorldId">
              <option :value="'all'">Tutti</option>
              <option v-for="world in worlds" :key="world.id" :value="world.id">
                {{ world.name }}
              </option>
            </select>
          </label>
          <RefreshAction
            label="Aggiorna NPC"
            :loading="npcsLoading"
            @refresh="fetchNpcs"
          />
        </div>
        <p v-if="worldsError" class="status-message text-danger">{{ worldsError }}</p>
        <p v-if="npcsError" class="status-message text-danger">{{ npcsError }}</p>

        <div v-if="npcsLoading">Caricamento NPC...</div>
        <ul v-else-if="npcs.length" class="manager-list">
          <li
            v-for="npc in npcs"
            :key="npc.id"
            class="compact-card"
            :class="{ highlighted: highlightedNpcId === npc.id }"
          >
            <div class="manager-item">
              <header class="section-header">
                <div>
                  <p class="card-title">{{ npc.name }}</p>
                  <p class="manager-meta">
                    {{ worldName(npc.worldId) }} •
                    {{ npc.race || 'Razza N/D' }} / {{ npc.roleOrClass || 'Ruolo N/D' }}
                  </p>
                </div>
                <span class="pill" :class="npc.isVisibleToPlayers ? 'pill-success' : 'pill-danger'">
                  {{ npc.isVisibleToPlayers ? 'Visibile' : 'Solo GM' }}
                </span>
              </header>
              <p class="manager-meta">
                {{ npc.description || 'Nessuna descrizione.' }}
              </p>
              <p v-if="npc.gmNotes" class="manager-meta">Note DM: {{ npc.gmNotes }}</p>
              <p class="manager-meta">
                Owner: {{ npc.ownerNickname ?? 'N/D' }}
              </p>
              <div class="actions">
                <EntityActions
                  edit-label="Modifica NPC"
                  delete-label="Elimina NPC"
                  :delete-disabled="deleteLoading === npc.id"
                  :delete-loading="deleteLoading === npc.id"
                  @edit="startEdit(npc)"
                  @delete="removeNpc(npc.id)"
                />
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="muted">Nessun NPC trovato per il filtro selezionato.</p>
      </section>

      <section v-else class="dm-tab-panel npc-editor-card">
        <header class="npc-editor-header">
          <div>
            <p class="npc-editor-kicker">Scheda D&D 5e</p>
            <h2>
              {{ editingNpcId ? 'Modifica NPC' : 'Nuovo NPC' }}
            </h2>
            <p class="npc-editor-subtitle">
              Compila la scheda completa del PNG. Le Note DM restano private e visibili solo ai Master.
            </p>
          </div>
          <button v-if="editingNpcId" class="btn btn-link contrast" type="button" @click="cancelEdit">
            Annulla modifica
          </button>
        </header>

        <form class="npc-form" novalidate @submit.prevent="upsertNpc">
          <section class="npc-section">
            <div class="npc-section__header">
              <h3>Identità e base</h3>
              <p>Definisci chi è questo PNG nel mondo di gioco.</p>
            </div>
            <div class="npc-section__grid npc-section__grid--two">
              <label class="field">
                <span>Mondo</span>
                <select v-model="formState.worldId" required>
                  <option v-if="!worlds.length" :value="0" disabled>Nessun mondo disponibile</option>
                  <option v-for="world in worlds" :key="world.id" :value="world.id">
                    {{ world.name }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>Nome</span>
                <input v-model="formState.name" type="text" required placeholder="Es. Lord Neverember" />
              </label>
              <label class="field">
                <span>Razza / Specie</span>
                <input v-model="formState.race" type="text" placeholder="Es. Elfo Alto" />
              </label>
              <label class="field">
                <span>Ruolo / Classe</span>
                <input v-model="formState.roleOrClass" type="text" placeholder="Bardo, Locandiere..." />
              </label>
              <label class="field">
                <span>Allineamento</span>
                <input v-model="formState.alignment" type="text" placeholder="Es. Caotico Buono" />
              </label>
              <label class="field">
                <span>Taglia</span>
                <input v-model="formState.size" type="text" placeholder="Es. Media" />
              </label>
              <label class="field">
                <span>Tipo creatura</span>
                <input v-model="formState.creatureType" type="text" placeholder="Es. Umanoide" />
              </label>
            </div>
            <label class="field">
              <span>Descrizione</span>
              <textarea
                v-model="formState.description"
                rows="5"
                placeholder="Aspetto, personalità e agganci narrativi"
              ></textarea>
            </label>
          </section>

          <section class="npc-section">
            <div class="npc-section__header">
              <h3>Statistiche</h3>
              <p>Valori numerici di combattimento e sopravvivenza.</p>
            </div>
            <div class="npc-section__grid npc-section__grid--stats">
              <label class="field">
                <span>Classe Armatura (CA)</span>
                <input v-model="formState.armorClass" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>PF massimi</span>
                <input v-model="formState.maxHitPoints" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>PF attuali</span>
                <input v-model="formState.currentHitPoints" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>PF temporanei</span>
                <input v-model="formState.temporaryHitPoints" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>Dadi Vita</span>
                <input v-model="formState.hitDice" type="text" placeholder="Es. 8d8 + 8" />
              </label>
              <label class="field">
                <span>Velocità</span>
                <input v-model="formState.speed" type="text" placeholder="Es. 9 m., volo 18 m." />
              </label>
            </div>
          </section>

          <section class="npc-section">
            <div class="npc-section__header">
              <h3>Ability Scores</h3>
              <p>Le sei caratteristiche base dello statblock.</p>
            </div>
            <div class="npc-section__grid npc-section__grid--ability">
              <label class="field">
                <span>FOR</span>
                <input v-model="formState.strength" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>DES</span>
                <input v-model="formState.dexterity" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>COS</span>
                <input v-model="formState.constitution" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>INT</span>
                <input v-model="formState.intelligence" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>SAG</span>
                <input v-model="formState.wisdom" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>CAR</span>
                <input v-model="formState.charisma" type="text" inputmode="numeric" />
              </label>
            </div>
          </section>

          <section class="npc-section">
            <div class="npc-section__header">
              <h3>Abilità &amp; Tiri salvezza</h3>
              <p>Inserisci bonus già calcolati per risparmiare tempo durante il gioco.</p>
            </div>
            <div class="npc-section__grid npc-section__grid--two">
              <label class="field">
                <span>Tiri salvezza</span>
                <textarea v-model="formState.savingThrows" rows="3" placeholder="Es. Des +6, Sag +4"></textarea>
              </label>
              <label class="field">
                <span>Abilità</span>
                <textarea v-model="formState.skills" rows="3" placeholder="Es. Furtività +7, Percezione +5"></textarea>
              </label>
            </div>
          </section>

          <section class="npc-section">
            <div class="npc-section__header">
              <h3>Resistenze &amp; Sensi</h3>
              <p>Gestisci immunità, resistenze e percezioni speciali.</p>
            </div>
            <div class="npc-section__grid npc-section__grid--two">
              <label class="field">
                <span>Resistenze ai danni</span>
                <textarea v-model="formState.damageResistances" rows="3" placeholder="Es. fuoco, fulmine"></textarea>
              </label>
              <label class="field">
                <span>Immunità ai danni</span>
                <textarea v-model="formState.damageImmunities" rows="3" placeholder="Es. necrotico"></textarea>
              </label>
              <label class="field">
                <span>Immunità alle condizioni</span>
                <textarea v-model="formState.conditionImmunities" rows="3" placeholder="Es. affascinato, spaventato"></textarea>
              </label>
              <label class="field">
                <span>Sensi</span>
                <textarea v-model="formState.senses" rows="3" placeholder="Vista cieca 18 m., Percezione passiva 15"></textarea>
              </label>
              <label class="field npc-section__grid--full">
                <span>Linguaggi</span>
                <textarea v-model="formState.languages" rows="3" placeholder="Comune, Elfico, Telepatia 18 m."></textarea>
              </label>
            </div>
          </section>

          <section class="npc-section">
            <div class="npc-section__header">
              <h3>Challenge / Difficoltà</h3>
              <p>Valuta il CR e le ricompense dell'incontro.</p>
            </div>
            <div class="npc-section__grid npc-section__grid--three">
              <label class="field">
                <span>Challenge Rating</span>
                <input v-model="formState.challengeRating" type="text" placeholder="Es. 5 o 1/2" />
              </label>
              <label class="field">
                <span>Punti Esperienza</span>
                <input v-model="formState.experiencePoints" type="text" inputmode="numeric" />
              </label>
              <label class="field">
                <span>Difficoltà / CD</span>
                <input v-model="formState.difficultyClass" type="text" inputmode="numeric" />
              </label>
            </div>
          </section>

          <section class="npc-section">
            <div class="npc-section__header">
              <h3>Tratti &amp; Azioni</h3>
              <p>Trascrivi fedelmente blocchi di testo per il combattimento.</p>
            </div>
            <div class="npc-section__grid npc-section__grid--long">
              <label class="field">
                <span>Tratti</span>
                <textarea v-model="formState.traits" rows="5"></textarea>
              </label>
              <label class="field">
                <span>Azioni</span>
                <textarea v-model="formState.actions" rows="5"></textarea>
              </label>
              <label class="field">
                <span>Azioni leggendarie</span>
                <textarea v-model="formState.legendaryActions" rows="5"></textarea>
              </label>
              <label class="field">
                <span>Reazioni</span>
                <textarea v-model="formState.reactions" rows="5"></textarea>
              </label>
              <label class="field">
                <span>Azioni della tana</span>
                <textarea v-model="formState.lairActions" rows="5"></textarea>
              </label>
              <label class="field">
                <span>Effetti regionali</span>
                <textarea v-model="formState.regionalEffects" rows="5"></textarea>
              </label>
            </div>
          </section>

          <section v-if="canManageContent" class="npc-section">
            <div class="npc-section__header">
              <h3>Note DM</h3>
              <p>Annotazioni private solo per GM/ADMIN.</p>
            </div>
            <label class="field">
              <span>Note riservate</span>
              <textarea v-model="formState.gmNotes" rows="6" placeholder="Segreti, motivazioni e piani nascosti"></textarea>
            </label>
          </section>

          <div class="npc-footer">
            <label class="field checkbox">
              <input v-model="formState.isVisibleToPlayers" type="checkbox" />
              <span>Visibile ai player</span>
            </label>
            <div class="npc-footer__cta">
              <p v-if="formError" class="status-message text-danger">{{ formError }}</p>
              <button class="btn btn-primary" type="submit" :disabled="formLoading || !worlds.length">
                {{ formLoading ? 'Salvataggio...' : editingNpcId ? 'Salva modifiche' : 'Crea NPC' }}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.highlighted {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-accent) 55%, transparent);
}

.npc-editor-card {
  margin-top: 2rem;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--app-surface-elevated) 96%, transparent), var(--app-surface)),
    var(--app-surface);
  border-radius: 20px;
  border: 1px solid var(--app-border-strong);
  padding: 2rem;
  color: var(--app-text);
  box-shadow: 0 20px 45px color-mix(in srgb, var(--app-shadow) 75%, transparent);
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.npc-editor-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.npc-editor-header h2 {
  margin: 0;
  font-size: 1.8rem;
  letter-spacing: 0.02em;
}

.npc-editor-kicker {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: var(--app-accent-strong);
  margin-bottom: 0.4rem;
}

.npc-editor-subtitle {
  margin-top: 0.35rem;
  color: var(--app-text-muted);
  max-width: 42rem;
}

.npc-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}

.npc-section {
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, transparent);
  border: 1px solid var(--app-surface-outline);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: inset 0 0 30px color-mix(in srgb, var(--app-shadow) 16%, transparent);
  min-width: 0;
}

.npc-section__header {
  margin-bottom: 1rem;
  min-width: 0;
}

.npc-section__header h3 {
  margin: 0;
  font-size: 1.1rem;
  letter-spacing: 0.04em;
  color: var(--app-text);
}

.npc-section__header p {
  margin: 0.35rem 0 0;
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.npc-section__grid {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.npc-section__grid--two {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.npc-section__grid--three {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.npc-section__grid--stats {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.npc-section__grid--ability {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.npc-section__grid--long {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.npc-section__grid--full {
  grid-column: 1 / -1;
}

.npc-section__grid > *,
.npc-editor-card .field {
  min-width: 0;
}

.npc-footer {
  border-top: 1px solid var(--app-surface-outline);
  margin-top: 1rem;
  padding-top: 1rem;
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
}

.npc-footer__cta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
  min-width: 0;
}

.npc-editor-card .field span {
  color: var(--app-text);
}

.npc-editor-card input,
.npc-editor-card select,
.npc-editor-card textarea {
  background: var(--app-input-bg);
  border: 1px solid var(--app-surface-outline);
  color: var(--app-text);
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.npc-editor-card input::placeholder,
.npc-editor-card textarea::placeholder {
  color: var(--app-text-muted);
}

.npc-editor-card input:focus,
.npc-editor-card select:focus,
.npc-editor-card textarea:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 2px var(--app-focus-ring);
}

.npc-editor-card .checkbox {
  color: var(--app-text);
}

.npc-editor-card .btn-link.contrast {
  color: var(--app-accent-strong);
}

@media (max-width: 768px) {
  .npc-editor-card {
    padding: 1.5rem;
  }

  .npc-editor-header {
    flex-direction: column;
  }

  .npc-section {
    padding: 1rem;
  }

  .npc-section__grid--two,
  .npc-section__grid--three,
  .npc-section__grid--stats,
  .npc-section__grid--ability,
  .npc-section__grid--long {
    grid-template-columns: 1fr;
  }

  .npc-footer,
  .npc-footer__cta {
    align-items: stretch;
  }

  .npc-footer__cta .btn {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .npc-editor-card {
    padding: 1rem;
  }

  .npc-editor-header {
    gap: 0.75rem;
  }
}
</style>
