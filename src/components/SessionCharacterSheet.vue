<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, reactive } from 'vue';
import type { PlayerCharacterResponse, NpcResponse } from '../types/api';
import { 
    updateCharacter,
    performLongRest,
    updateCharacterHp,
    updateCharacterDeathSaves,
    updateCharacterInventory,
    updateCharacterSpellSlots
} from '../api/charactersApi';
import { updateNpcHp } from '../api/npcsApi';

const props = defineProps<{
  character: PlayerCharacterResponse | NpcResponse;
  type: 'PC' | 'NPC';
  isGm: boolean;
}>();

// Utils
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
    let timeout: any;
    const debounced = (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
    debounced.flush = () => {
        if (timeout) {
            clearTimeout(timeout);
            fn(); // Execute immediately
        }
    }
    return debounced;
}

// State
const loading = ref(false);
const error = ref('');
const saving = ref(false); // Visual indicator

// Reactive Form Data - Single Source of Truth for local edits
const formData = reactive({
    currentHp: 0,
    deathSaves: { successes: 0, failures: 0 },
    inventory: { equipment: '', treasure: '' },
    cantrips: '',       // Maps to 'spells'
    preparedSpells: '', // Maps to 'preparedSpells'
    spellSlots: [] as { level: number, current: number, max: number }[],
    notes: '',          // Maps to 'otherNotes'
});

// Normalized ID
const characterId = computed(() => props.character.id);

// --- Helpers ---

const parseSpellSlots = (str: string) => {
    if (!str) return [];
    return str.split(',').map(part => {
        const [lvlStr, counts] = part.split(':');
        if (!lvlStr || !counts) return null;
        const level = parseInt(lvlStr);
        let current, max;
        if (counts.includes('/')) {
            const [c, m] = counts.split('/').map(Number);
            current = c;
            max = m;
        } else {
            max = parseInt(counts);
            current = max; 
        }
        return { level, current, max };
    }).filter(Boolean) as { level: number, current: number, max: number }[];
};

const serializeSpellSlots = (slots: { level: number, current: number, max: number }[]) => {
    return slots.map(s => `${s.level}:${s.current}/${s.max}`).join(',');
};

// --- Initialization ---

// Initialize form data from props
watch(() => props.character, (newVal) => {
    // Sync Loop Protection: Only update if different
    if ((newVal.currentHitPoints || 0) !== formData.currentHp) {
        formData.currentHp = newVal.currentHitPoints || 0;
    }
    
    if (props.type === 'PC') {
        const pc = newVal as PlayerCharacterResponse;
        
        if ((pc.deathSaveSuccesses || 0) !== formData.deathSaves.successes) {
            formData.deathSaves.successes = pc.deathSaveSuccesses || 0;
        }
        if ((pc.deathSaveFailures || 0) !== formData.deathSaves.failures) {
            formData.deathSaves.failures = pc.deathSaveFailures || 0;
        }
        
        // Deep compare inventory to allow local edits while syncing external changes
        if ((pc.equipment || '') !== formData.inventory.equipment) {
            formData.inventory.equipment = pc.equipment || '';
        }
        if ((pc.treasure || '') !== formData.inventory.treasure) {
            formData.inventory.treasure = pc.treasure || '';
        }
        
        if ((pc.spells || '') !== formData.cantrips) {
            formData.cantrips = pc.spells || '';
        }
        if ((pc.preparedSpells || '') !== formData.preparedSpells) {
            formData.preparedSpells = pc.preparedSpells || '';
        }
        if ((pc.otherNotes || '') !== formData.notes) {
            formData.notes = pc.otherNotes || '';
        }
        
        const currentSerialized = serializeSpellSlots(formData.spellSlots);
        const incomingSerialized = pc.spellSlots || '';
        if (incomingSerialized !== currentSerialized) {
             formData.spellSlots = parseSpellSlots(incomingSerialized);
        }
    }
}, { immediate: true, deep: true });


// --- Granular Auto-Save Logic ---

const handleSaveError = (e: any, context: string) => {
    console.error(`Error saving ${context}:`, e);
    error.value = `Errore salvataggio ${context}`;
    saving.value = false;
};

// 1. HP Watcher (Optimized Debounce)
const saveHp = async () => {
    if (props.type !== 'PC') return; 
    saving.value = true;
    try {
        await updateCharacterHp(characterId.value, formData.currentHp);
        error.value = '';
    } catch(e) { handleSaveError(e, 'HP'); } 
    finally { saving.value = false; }
};
// 800ms allows "click-click-click" (accumulate) -> Single Save
const debouncedSaveHp = debounce(saveHp, 800);
watch(() => formData.currentHp, () => debouncedSaveHp());


// 2. Spell Slots Watcher (Immediate/Fast)
const saveSlots = async () => {
    if (props.type !== 'PC') return;
    saving.value = true;
    try {
        const slotsStr = serializeSpellSlots(formData.spellSlots);
        await updateCharacterSpellSlots(characterId.value, slotsStr);
        error.value = '';
    } catch(e) { handleSaveError(e, 'Slots'); }
    finally { saving.value = false; }
};
const debouncedSaveSlots = debounce(saveSlots, 200); // Almost immediate but prevents double-click spam
watch(() => formData.spellSlots, () => debouncedSaveSlots(), { deep: true });


// 3. Death Saves (Immediate)
const saveDeathSaves = async () => {
    if (props.type !== 'PC') return;
    saving.value = true;
    try {
        await updateCharacterDeathSaves(characterId.value, formData.deathSaves.successes, formData.deathSaves.failures);
        error.value = '';
    } catch(e) { handleSaveError(e, 'Death Saves'); }
    finally { saving.value = false; }
};
// No debounce for death saves usually, but safe to add very small one or just call directly
watch(() => formData.deathSaves, () => saveDeathSaves(), { deep: true });


// 4. Inventory (Medium Debounce)
const saveInventory = async () => {
    if (props.type !== 'PC') return;
    saving.value = true;
    try {
        await updateCharacterInventory(characterId.value, formData.inventory.equipment, formData.inventory.treasure);
        error.value = '';
    } catch(e) { handleSaveError(e, 'Inventory'); }
    finally { saving.value = false; }
};
const debouncedSaveInventory = debounce(saveInventory, 1000);
watch(() => formData.inventory, () => debouncedSaveInventory(), { deep: true });


// 5. Generic Text Fields (Notes, Spells Lists) -> PUT (Slow Debounce)
// We group these because they don't have specific PATCH endpoints yet (or used legacy PUT)
const saveGeneric = async () => {
    if (props.type !== 'PC') return;
    saving.value = true;
    try {
        // We construct a payload that PRIMARILY updates the text fields.
        // But PUT requires full object. We mix in current state to be safe.
        const base = props.character as PlayerCharacterResponse;
        const payload = {
            ...base,
            // Ensure we send latest critical values too, just in case PUT overwrites them
            currentHitPoints: formData.currentHp,
            deathSaveSuccesses: formData.deathSaves.successes,
            deathSaveFailures: formData.deathSaves.failures,
            equipment: formData.inventory.equipment,
            treasure: formData.inventory.treasure,
            spellSlots: serializeSpellSlots(formData.spellSlots),
            
            // The fields we actually want to update here:
            spells: formData.cantrips,
            preparedSpells: formData.preparedSpells,
            otherNotes: formData.notes,
        };
        await updateCharacter(characterId.value, payload);
        error.value = '';
    } catch(e) { handleSaveError(e, 'Dati Generici'); }
    finally { saving.value = false; }
};
const debouncedSaveGeneric = debounce(saveGeneric, 1500);

watch(() => [formData.cantrips, formData.preparedSpells, formData.notes], () => {
    debouncedSaveGeneric();
}); 


// Flush all on unmount
onBeforeUnmount(() => {
    debouncedSaveHp.flush();
    debouncedSaveSlots.flush();
    debouncedSaveInventory.flush();
    debouncedSaveGeneric.flush();
});


// --- Actions ---

const updateHp = (delta: number) => {
    // Strictly Optimistic Update: Update local state immediately.
    // The Watcher will handle the server sync via debounce.
    const rawMax = (props.character as PlayerCharacterResponse).maxHitPoints;
    // If max is 0 or missing, treat as "unbounded" (e.g. 9999) to prevent locking
    const max = (rawMax && rawMax > 0) ? rawMax : 9999;
    
    const newVal = formData.currentHp + delta;
    
    // Clamp values (still prevent negative)
    formData.currentHp = Math.max(0, Math.min(max, newVal));
};

const toggleSpellSlot = (levelIndex: number, slotIndex: number) => {
    const slot = formData.spellSlots[levelIndex];
    if (!slot) return;
    
    // Toggle logic
    if (slot.current > slotIndex) {
        slot.current = slotIndex;
    } else {
        slot.current = slotIndex + 1;
    }
};

const updateDeathSave = (type: 'success' | 'failure', index: number) => {
    const current = type === 'success' ? formData.deathSaves.successes : formData.deathSaves.failures;
    const newVal = current === index ? index - 1 : index;
    if (type === 'success') formData.deathSaves.successes = newVal;
    else formData.deathSaves.failures = newVal;
};

const triggerLongRest = async () => {
    if (!confirm("Riposo Lungo: Ripristino HP e Slot?")) return;
    loading.value = true;
    try {
        const updated = await performLongRest(characterId.value);
        // We rely on the Prop Watcher to update local state from this response
        // But to be instant, we can also set it here:
        formData.currentHp = updated.currentHitPoints || 0;
        formData.spellSlots = parseSpellSlots(updated.spellSlots || '');
        formData.deathSaves.successes = 0;
        formData.deathSaves.failures = 0;
    } catch(e) {
        error.value = "Errore Long Rest";
    } finally {
        loading.value = false;
    }
};

// UI Helpers
const getModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
};

const attributes = computed(() => [
    { label: 'STR', value: props.character.strength || 10 },
    { label: 'DEX', value: props.character.dexterity || 10 },
    { label: 'CON', value: props.character.constitution || 10 },
    { label: 'INT', value: props.character.intelligence || 10 },
    { label: 'WIS', value: props.character.wisdom || 10 },
    { label: 'CHA', value: props.character.charisma || 10 },
]);

</script>

<template>
  <div class="character-sheet">
     <div v-if="saving" class="saving-badge">💾 Saving...</div>
     
     <div class="header">
         <div class="identity">
             <h2>{{ character.name }}</h2>
             <span class="sub" v-if="type === 'PC'">
                {{ (character as PlayerCharacterResponse).race }} - {{ (character as PlayerCharacterResponse).characterClass }} Lvl {{ (character as PlayerCharacterResponse).level }}
             </span>
             <span class="sub" v-else>{{ (character as NpcResponse).roleOrClass }}</span>
         </div>
         <button v-if="type === 'PC'" @click="triggerLongRest" class="rest-btn">🌙 Riposo Lungo</button>
     </div>

     <!-- Vitals Grid -->
     <div class="vitals-grid">
         <!-- HP -->
         <div class="vital-card hp-card">
             <label>HP</label>
             <div class="hp-controls">
                 <button @click="updateHp(-1)">-</button>
                 <input type="number" v-model.number="formData.currentHp">
                 <span class="denom">/ {{ character.maxHitPoints }}</span>
                 <button @click="updateHp(1)">+</button>
             </div>
         </div>
         <!-- AC/Speed -->
         <div class="vital-card">
             <label>AC</label>
             <div class="val">{{ character.armorClass }}</div>
         </div>
         <div class="vital-card">
             <label>SPEED</label>
             <div class="val">{{ character.speed }}</div>
         </div>
     </div>

     <!-- Death Saves -->
     <div v-if="type === 'PC'" class="death-saves">
         <div class="ds-group">
            <span class="ds-label">Successi</span>
            <div class="ds-dots">
                <div v-for="i in 3" :key="'s'+i" 
                     class="dot success" 
                     :class="{ active: i <= formData.deathSaves.successes }"
                     @click="updateDeathSave('success', i)"></div>
            </div>
         </div>
         <div class="ds-group">
            <span class="ds-label">Fallimenti</span>
            <div class="ds-dots">
                <div v-for="i in 3" :key="'f'+i" 
                     class="dot failure" 
                     :class="{ active: i <= formData.deathSaves.failures }"
                     @click="updateDeathSave('failure', i)"></div>
            </div>
         </div>
     </div>

     <!-- Attributes -->
     <div class="attributes">
         <div v-for="attr in attributes" :key="attr.label" class="attr-box">
             <div class="lbl">{{ attr.label }}</div>
             <div class="mod">{{ getModifier(attr.value) }}</div>
             <div class="score">{{ attr.value }}</div>
         </div>
     </div>

     <hr class="divider">

     <!-- Main Content Tabs/Sections -->
     <div class="sections">
         
         <!-- Inventory -->
         <div class="section-block" v-if="type === 'PC'">
             <h3>📦 Inventario</h3>
             <div class="row">
                 <div class="col">
                     <label>Equipaggiamento</label>
                     <textarea v-model="formData.inventory.equipment" rows="4"></textarea>
                 </div>
                 <div class="col">
                     <label>Tesoro</label>
                     <textarea v-model="formData.inventory.treasure" rows="2"></textarea>
                 </div>
             </div>
         </div>

         <!-- Magic Section (Separated) -->
         <div v-if="type === 'PC'" class="section-block">
             <h3>✨ Magia</h3>
             
             <!-- Slots -->
             <div v-if="formData.spellSlots.length > 0" class="slots-container">
                 <div v-for="(slot, lvlIdx) in formData.spellSlots" :key="slot.level" class="slot-row">
                     <div class="slot-meta">Livello <strong>{{ slot.level }}</strong></div>
                     <div class="slot-display">
                         <div v-for="i in slot.max" :key="i"
                              class="slot-check"
                              :class="{ checked: i <= slot.current }"
                              @click="toggleSpellSlot(lvlIdx, i - 1)">
                         </div>
                     </div>
                 </div>
             </div>
             
             <!-- Lists -->
             <div class="row">
                 <div class="col">
                     <label>✨ Trucchetti (Cantrips)</label>
                     <textarea v-model="formData.cantrips" rows="4" placeholder="Lista trucchetti..."></textarea>
                 </div>
                 <div class="col">
                     <label>📜 Incantesimi Preparati</label>
                     <textarea v-model="formData.preparedSpells" rows="6" placeholder="Lista incantesimi..."></textarea>
                 </div>
             </div>
         </div>

         <!-- Combat / Features (Read Only for now mostly) -->
         <details>
            <summary>⚔️ Attacchi & Azioni</summary>
            <div class="md-content" v-html="(character as PlayerCharacterResponse).attacksAndSpellcasting"></div>
         </details>

         <details>
            <summary>🧬 Tratti & Privilegi</summary>
            <div class="md-content" v-html="(character as PlayerCharacterResponse).featuresAndTraits"></div>
         </details>

         <!-- Notes (Cleaned) -->
         <div v-if="type === 'PC'" class="section-block">
             <h3>📝 Note</h3>
             <textarea v-model="formData.notes" rows="4" placeholder="Note varie..."></textarea>
         </div>

     </div>

     <div v-if="error" class="err-toast">{{ error }}</div>
  </div>
</template>

<style scoped>
.character-sheet {
    background: #1a202c; /* Dark theme base */
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
@keyframes pulse { 50% { opacity: 0.5; } }

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}
.identity h2 { margin: 0; font-size: 1.5rem; color: #f7fafc; }
.sub { color: #a0aec0; font-size: 0.9rem; }
.rest-btn {
    background: #2d3748;
    color: #cbd5e0;
    border: 1px solid #4a5568;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
}
.rest-btn:hover { background: #4a5568; }

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
.vital-card label { display: block; font-size: 0.7rem; color: #a0aec0; font-weight: bold; text-transform: uppercase; }
.vital-card .val { font-size: 1.5rem; font-weight: bold; }

.hp-controls { display: flex; align-items: center; gap: 0.5rem; }
.hp-controls input {
    width: 60px;
    background: transparent;
    border: none;
    border-bottom: 2px solid #a0aec0;
    color: white;
    font-size: 1.5rem;
    text-align: center;
    font-weight: bold;
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

/* Death Saves */
.death-saves {
    background: #2d3748;
    padding: 0.8rem;
    border-radius: 6px;
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1.5rem;
}
.ds-group { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
.ds-label { font-size: 0.75rem; color: #a0aec0; text-transform: uppercase; font-weight: bold; }
.ds-dots { display: flex; gap: 6px; }
.dot {
    width: 16px;
    height: 16px;
    border: 2px solid #4a5568;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
}
.dot.success.active { background: #48bb78; border-color: #48bb78; }
.dot.failure.active { background: #f56565; border-color: #f56565; }

/* Attributes */
.attributes {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}
.attr-box {
    background: #2d3748;
    border-radius: 6px;
    padding: 0.5rem;
    text-align: center;
}
.attr-box .lbl { font-size: 0.7rem; font-weight: bold; color: #a0aec0; }
.attr-box .mod { font-size: 1.2rem; font-weight: bold; margin: 0.2rem 0; }
.attr-box .score { font-size: 0.8rem; color: #718096; }

.divider { border: 0; border-top: 1px solid #4a5568; margin: 2rem 0; }

/* Sections */
.section-block { margin-bottom: 2rem; }
.section-block h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #e2e8f0; border-bottom: 2px solid #4a5568; padding-bottom: 0.5rem; }
.row { display: flex; gap: 1.5rem; }
.col { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.col label { font-size: 0.9rem; font-weight: bold; color: #cbd5e0; }

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
textarea:focus { border-color: #63b3ed; outline: none; }

/* Spell Slots UI */
.slots-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    background: #232d3f;
    padding: 1rem;
    border-radius: 6px;
}
.slot-row { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.slot-meta { font-size: 0.8rem; color: #a0aec0; }
.slot-display { display: flex; gap: 4px; }
.slot-check {
    width: 14px;
    height: 14px;
    border: 2px solid #553c9a; /* Magic Purple */
    cursor: pointer;
    background: #1a202c;
    transition: background 0.15s;
    border-radius: 2px; /* Checkbox style */
}
.slot-check.checked {
    background: #9f7aea;
    box-shadow: 0 0 5px #9f7aea;
}

.md-content { font-size: 0.9rem; line-height: 1.5; color: #cbd5e0; }
details { background: #2d3748; border-radius: 6px; margin-bottom: 0.5rem; }
summary { padding: 0.8rem; cursor: pointer; font-weight: bold; user-select: none; }
details .md-content { padding: 1rem; border-top: 1px solid #4a5568; }

.err-toast { position: fixed; bottom: 20px; right: 20px; background: #e53e3e; color: white; padding: 1rem; border-radius: 6px; font-weight: bold; }

@media (max-width: 768px) {
    .attributes { grid-template-columns: repeat(3, 1fr); }
    .row { flex-direction: column; }
}
</style>
