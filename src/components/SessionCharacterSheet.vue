<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PlayerCharacterResponse, NpcResponse } from '../types/api';
import { 
    updateCharacterHp, 
    updateCharacterDeathSaves, 
    updateCharacterInventory, 
    updateCharacterSpellSlots,
    performLongRest
} from '../api/charactersApi';
import { updateNpcHp } from '../api/npcsApi';

const props = defineProps<{
  character: PlayerCharacterResponse | NpcResponse;
  type: 'PC' | 'NPC';
  isGm: boolean;
}>();

const emit = defineEmits(['update']);

const loading = ref(false);
const error = ref('');
const successMsg = ref('');

// Computed properties to normalize access between PC and NPC
const id = computed(() => props.character.id);
const name = computed(() => props.character.name);
const race = computed(() => props.character.race || '-');
const className = computed(() => {
    if (props.type === 'PC') {
        const pc = props.character as PlayerCharacterResponse;
        return `${pc.characterClass || ''} ${pc.level ? 'Lvl ' + pc.level : ''}`;
    } else {
        return (props.character as NpcResponse).roleOrClass || '-';
    }
});
const ac = computed(() => props.character.armorClass || 10);
const speed = computed(() => props.character.speed || '30ft');
const maxHp = computed(() => props.character.maxHitPoints || 0);

// Parsing Logic
const parseSpellSlots = (str: string) => {
    if (!str) return [];
    // Expected formats: "1:4,2:2" or "1:4/4,2:2/2"
    return str.split(',').map(part => {
        const parts = part.split(':');
        if (parts.length < 2) return null;
        
        const levelStr = parts[0];
        const counts = parts[1];

        if (levelStr === undefined || counts === undefined) return null;
        
        const level = parseInt(levelStr);
        
        let current, max;
        if (counts.includes('/')) {
            const [c, m] = counts.split('/').map(Number);
            current = c;
            max = m;
        } else {
            max = parseInt(counts);
            current = max; // Default to full if only max is provided (legacy)
        }
        
        return { level, current, max };
    }).filter(x => x !== null) as { level: number, current: number, max: number }[];
};

const serializeSpellSlots = (slots: { level: number, current: number, max: number }[]) => {
    return slots.map(s => `${s.level}:${s.current}/${s.max}`).join(',');
};

// Local State
const currentHp = ref(props.character.currentHitPoints || 0);
const deathSaves = ref({ successes: 0, failures: 0 });
const inventory = ref({ equipment: '', treasure: '' });
const spellSlotsParsed = ref<{ level: number, current: number, max: number }[]>([]);

// Sync State when prop changes
watch(() => props.character, (newVal) => {
    currentHp.value = newVal.currentHitPoints || 0;
    
    if (props.type === 'PC') {
        const pc = newVal as PlayerCharacterResponse;
        deathSaves.value = {
            successes: pc.deathSaveSuccesses || 0,
            failures: pc.deathSaveFailures || 0
        };
        inventory.value = {
            equipment: pc.equipment || '',
            treasure: pc.treasure || ''
        };
        spellSlotsParsed.value = parseSpellSlots(pc.spellSlots || '');
    }
}, { deep: true, immediate: true });



// Attributes
const attributes = computed(() => [
    { label: 'STR', value: props.character.strength || 10 },
    { label: 'DEX', value: props.character.dexterity || 10 },
    { label: 'CON', value: props.character.constitution || 10 },
    { label: 'INT', value: props.character.intelligence || 10 },
    { label: 'WIS', value: props.character.wisdom || 10 },
    { label: 'CHA', value: props.character.charisma || 10 },
]);

const getModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
};

// Content Accessors
const attacks = computed(() => {
    if (props.type === 'PC') return (props.character as PlayerCharacterResponse).attacksAndSpellcasting;
    return (props.character as NpcResponse).actions;
});

const spellsContent = computed(() => {
    if (props.type === 'PC') return (props.character as PlayerCharacterResponse).preparedSpells || (props.character as PlayerCharacterResponse).spells;
    return (props.character as NpcResponse).traits; 
});

const features = computed(() => {
    if (props.type === 'PC') return (props.character as PlayerCharacterResponse).featuresAndTraits;
    return (props.character as NpcResponse).legendaryActions;
});

const skills = computed(() => {
     if (props.type === 'PC') return (props.character as PlayerCharacterResponse).otherProficiencies; 
     return (props.character as NpcResponse).skills;
});

// Actions
const updateHp = async (delta: number) => {
    if (!props.isGm && props.type === 'NPC') return;
    loading.value = true;
    const newHp = Math.max(0, Math.min(maxHp.value, currentHp.value + delta));
    try {
        if (props.type === 'PC') {
            await updateCharacterHp(id.value, newHp);
        } else {
            await updateNpcHp(id.value, newHp);
        }
        currentHp.value = newHp;
    } catch (e: any) {
        error.value = "Failed to update HP";
    } finally {
        loading.value = false;
    }
};

const saveHpInput = async () => {
    loading.value = true;
    try {
        if (props.type === 'PC') {
            await updateCharacterHp(id.value, currentHp.value);
        } else {
            await updateNpcHp(id.value, currentHp.value);
        }
    } catch (e) {
        error.value = "Failed to save HP";
    } finally {
        loading.value = false;
    }
}

const triggerLongRest = async () => {
    if (!confirm("Riposo Lungo: HP e Slot Incantesimi verranno ripristinati. Continuare?")) return;
    loading.value = true;
    try {
        const updated = await performLongRest(id.value);
        currentHp.value = updated.currentHitPoints || 0;
        spellSlotsParsed.value = parseSpellSlots(updated.spellSlots || '');
        deathSaves.value.successes = 0;
        deathSaves.value.failures = 0;
        successMsg.value = "Riposo Lungo completato!";
        setTimeout(() => successMsg.value = '', 3000);
    } catch (e) {
        error.value = "Errore durante il Riposo Lungo";
    } finally {
        loading.value = false;
    }
};

const updateDeathSave = async (type: 'success' | 'failure', count: number) => {
    if (props.type !== 'PC') return;
    
    // Toggle logic: if clicking the current value, reduce by 1 (toggle off). 
    // Otherwise set to count.
    let newVal;
    if (type === 'success') {
        newVal = deathSaves.value.successes === count ? count - 1 : count;
        deathSaves.value.successes = newVal;
    } else {
        newVal = deathSaves.value.failures === count ? count - 1 : count;
        deathSaves.value.failures = newVal;
    }

    try {
        await updateCharacterDeathSaves(id.value, deathSaves.value.successes, deathSaves.value.failures);
    } catch (e) {
        error.value = "Errore salvataggio Tiri Salvezza";
    }
};

const useSpellSlot = async (levelIndex: number, slotIndex: number) => {
    if (props.type !== 'PC') return;
    const slotData = spellSlotsParsed.value[levelIndex];
    if (!slotData) return;

    // Toggle: If clicking a slot index < current, it implies using it?
    // Let's simpler logic:
    // Slot circles represent "Available Slots". 
    // If I show 4 circles. 3 Filled, 1 Empty.
    // If I click a Filled one, it becomes Empty (Usage).
    // If I click an Empty one, it becomes Filled (Recovery).
    
    // Actually, UI convention: 
    // Show MAX circles. 
    // Checked = Used? Or Checked = Available?
    // User requested: "cliccare su un pallino per 'usare' lo slot".
    // Usually "Filled" = Available. Click -> "Empty" = Used.
    
    // Logic: If index < current (meaning it's active), we consume it (current--).
    // If we click an empty one (index >= current), we restore it (current++).
    // But specific index clicking is tricky.
    // Simplify: Just toggle "current" count. 
    // If I click the Nth circle (0-indexed):
    // If N < current, set current = N (consume down to this point? or just decrement?)
    // Best UX: Click specific circle. 
    // If we assume slots are consumed LIFO. 
    // Click any active circle -> decrement current.
    // Click any inactive circle -> increment current.
    
    if (slotData.current > 0) {
        slotData.current--;
    } else {
        // All used? Click to restore?
        // Let's try simpler: Just +/- buttons next to slots? 
        // User asked for "Checkboxes/Pallini".
        // Let's implement: Clicking a circle toggles state of THAT specific slot? No, slots are fungible.
        // Clicking the 3rd circle means "I have 3 slots"? 
        // Let's do: Clicking the K-th circle sets count to K or K+1.
        // If I click circle 3 (index 2) and I have 3 slots, make it 2.
        // If I click circle 3 (index 2) and I have 2 slots, make it 3.
        
        // Let's implement simpler: Click to SPEND.
        // If current > 0, decrement.
        // Recovery? Maybe Right Click? Or just a "Reset" button? 
        // Or make valid toggles.
        // Implementation: Render Max circles.
        // Filled if i < current. Empty if i >= current.
        // Click on Filled (i < current) -> current = i (Consumer).
        // Click on Empty (i >= current) -> current = i + 1 (Restorer).
    }
    
    // Re-evaluating based on "checkboxes" request. 
    // Checkbox Checked = Available. Unchecked = Used.
    // Click checkbox i:
    // If checked -> Uncheck (Used). current--
    // If unchecked -> Check (Restored). current++
    // This implies we don't strictly enforce LIFO visually but logically we do.
    
    // Let's go with:
    // Render `max` checkboxes.
    // `checked` if `index < current`.
    // `@click` -> if index < current (it was active), set current = index.
    //            if index >= current (it was empty), set current = index + 1.
    
    if (slotIndex < slotData.current) {
         slotData.current = slotIndex; // Use this and all above
    } else {
         slotData.current = slotIndex + 1; // Restore up to this
    }

    try {
        const str = serializeSpellSlots(spellSlotsParsed.value);
        await updateCharacterSpellSlots(id.value, str);
    } catch(e) {
        error.value = "Errore salvataggio Slot";
    }
};

const saveInventory = async () => {
    loading.value = true;
    try {
        await updateCharacterInventory(id.value, inventory.value.equipment, inventory.value.treasure);
        successMsg.value = "Inventario salvato!";
        setTimeout(() => successMsg.value = '', 3000);
    } catch(e) {
        error.value = "Errore salvataggio Inventario";
    } finally {
        loading.value = false;
    }
};

</script>

<template>
  <div class="character-sheet">
    <div class="sheet-header">
      <div class="header-top">
          <div class="identity">
            <h3>{{ name }}</h3>
            <span class="subtitle">{{ race }} - {{ className }}</span>
          </div>
          <button v-if="type === 'PC'" class="long-rest-btn" @click="triggerLongRest" :disabled="loading">
             🌙 Riposo Lungo
          </button>
      </div>
      
      <div class="vitals-row">
          <div class="vitals">
            <div class="vital-box hp-box">
                 <label>HP</label>
                 <div class="hp-controls">
                    <button @click="updateHp(-1)" :disabled="loading">-</button>
                    <input type="number" v-model.number="currentHp" @blur="saveHpInput" :disabled="loading">
                    <span class="max">/ {{ maxHp }}</span>
                    <button @click="updateHp(1)" :disabled="loading">+</button>
                 </div>
            </div>
            <div class="vital-box">
                <label>AC</label>
                <span class="value">{{ ac }}</span>
            </div>
            <div class="vital-box">
                <label>SPD</label>
                <span class="value">{{ speed }}</span>
            </div>
          </div>
      </div>
      
      <!-- Death Saves for PC -->
      <div v-if="type === 'PC'" class="death-saves">
          <div class="ds-row">
              <label>Successi</label>
              <div class="checks">
                  <div v-for="i in 3" :key="'s'+i" 
                       class="ds-check" 
                       :class="{ active: i <= deathSaves.successes }"
                       @click="updateDeathSave('success', i)">
                  </div>
              </div>
          </div>
          <div class="ds-row">
              <label>Fallimenti</label>
              <div class="checks">
                  <div v-for="i in 3" :key="'f'+i" 
                       class="ds-check failure" 
                       :class="{ active: i <= deathSaves.failures }"
                       @click="updateDeathSave('failure', i)">
                  </div>
              </div>
          </div>
      </div>
    </div>

    <!-- Attributes -->
    <div class="attributes-grid">
        <div v-for="attr in attributes" :key="attr.label" class="attribute-card">
            <div class="attr-label">{{ attr.label }}</div>
            <div class="attr-mod">{{ getModifier(attr.value) }}</div>
            <div class="attr-score">{{ attr.value }}</div>
        </div>
    </div>

    <div class="sheet-body">
        
        <!-- Inventory Section -->
        <details v-if="type === 'PC'">
            <summary>📦 Inventario & Tesoro</summary>
            <div class="content inventory-form">
                <div class="form-group">
                    <label>Equipaggiamento</label>
                    <textarea v-model="inventory.equipment" rows="5"></textarea>
                </div>
                <div class="form-group">
                    <label>Tesoro</label>
                    <textarea v-model="inventory.treasure" rows="2"></textarea>
                </div>
                <button class="save-btn" @click="saveInventory" :disabled="loading">Salva Inventario</button>
            </div>
        </details>
        
        <!-- Attacks -->
        <details open v-if="attacks">
            <summary>⚔️ Attacks & Actions</summary>
            <div class="content markdown-content" v-html="attacks"></div>
        </details>

        <!-- Spells -->
        <details v-if="spellsContent || spellSlotsParsed.length > 0">
            <summary>✨ Incantesimi (Spells)</summary>
            <div class="content">
                <!-- Spell Slots -->
                <div v-if="type === 'PC' && spellSlotsParsed.length > 0" class="spell-slots">
                    <div v-for="(slot, idx) in spellSlotsParsed" :key="slot.level" class="slot-row">
                        <span class="slot-level">Livello {{ slot.level }}</span>
                        <div class="slot-circles">
                            <div v-for="i in slot.max" :key="i" 
                                 class="slot-circle"
                                 :class="{ filled: i <= slot.current }"
                                 @click="useSpellSlot(idx, i - 1)">
                            </div>
                        </div>
                    </div>
                    <hr>
                </div>
                
                <div class="markdown-content">{{ spellsContent }}</div>
            </div>
        </details>

        <!-- Features -->
        <details v-if="features">
            <summary>🧬 {{ type === 'PC' ? 'Features' : 'Legendary Actions' }}</summary>
            <div class="content markdown-content">{{ features }}</div>
        </details>
        
        <!-- Skills -->
        <details v-if="skills">
            <summary>🎓 Skills & Proficiencies</summary>
             <div class="content">{{ skills }}</div>
        </details>
    </div>
    
    <div v-if="error" class="error-msg">{{ error }}</div>
    <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
  </div>
</template>

<style scoped>
.character-sheet {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    color: var(--color-text);
    max-width: 800px;
    margin: 0 auto;
    font-family: 'Inter', sans-serif;
}

.sheet-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.subtitle {
    font-size: 0.9em;
    color: var(--color-text-muted);
}

.long-rest-btn {
    background: #4a5568;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    border: none;
}
.long-rest-btn:hover { background: #2d3748; }

.vitals-row {
    display: flex;
    justify-content: center;
}

.vitals {
    display: flex;
    gap: 0.5rem;
}

.vital-box {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 0.5rem;
    text-align: center;
    min-width: 60px;
}

.vital-box label {
    display: block;
    font-size: 0.7em;
    font-weight: bold;
    color: var(--color-text-muted);
    margin-bottom: 0.2rem;
}

.vital-box .value {
    font-size: 1.2em;
    font-weight: bold;
}

.hp-box { min-width: 140px; }

.hp-controls {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    justify-content: center;
}

.hp-controls input {
    width: 40px;
    text-align: center;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text);
}

/* Death Saves */
.death-saves {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    background: var(--color-background-soft);
    padding: 0.5rem;
    border-radius: 6px;
}
.ds-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.ds-row label { font-size: 0.8em; font-weight: bold; }
.checks { display: flex; gap: 4px; }
.ds-check {
    width: 16px;
    height: 16px;
    border: 2px solid #cbd5e0;
    border-radius: 50%;
    cursor: pointer;
}
.ds-check.active {
    background: #48bb78;
    border-color: #48bb78;
}
.ds-check.failure.active {
    background: #f56565;
    border-color: #f56565;
}

/* Spell Slots */
.spell-slots { margin-bottom: 1rem; }
.slot-row {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
}
.slot-level { width: 80px; font-weight: bold; font-size: 0.9em; }
.slot-circles { display: flex; gap: 5px; }
.slot-circle {
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
    background: transparent;
}
.slot-circle.filled {
    background: var(--color-primary);
}

/* Attributes */
.attributes-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}
.attribute-card {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.2rem;
    text-align: center;
}
.attr-label { font-size: 0.7em; font-weight: bold; color: var(--color-text-muted); }
.attr-mod { font-size: 1.1em; font-weight: bold; margin: 0.2rem 0; }
.attr-score { font-size: 0.8em; color: var(--color-text-muted); }

/* Accordions */
.sheet-body details {
    margin-bottom: 0.5rem;
    background: var(--color-background-soft);
    border-radius: var(--radius-sm);
    overflow: hidden;
}
.sheet-body summary {
    padding: 0.75rem;
    cursor: pointer;
    font-weight: bold;
    background: var(--color-surface-hover);
    list-style: none; /* Hide default triangle in some browsers */
}
.sheet-body summary::-webkit-details-marker { display: none; }

.sheet-body .content {
    padding: 1rem;
    white-space: pre-wrap;
    font-size: 0.9em;
    border-top: 1px solid var(--color-border);
}

/* Inventory Form */
.inventory-form .form-group { margin-bottom: 1rem; }
.inventory-form label { display: block; margin-bottom: 0.3rem; font-weight: bold; }
.inventory-form textarea {
    width: 100%;
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    color: var(--color-text);
}
.save-btn {
    background: var(--color-primary);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    width: 100%;
}
.save-btn:hover { filter: brightness(1.1); }

.error-msg { color: var(--color-danger); font-size: 0.8em; margin-top: 0.5rem; text-align: center; }
.success-msg { color: var(--color-success); font-size: 0.8em; margin-top: 0.5rem; text-align: center; }

@media (max-width: 600px) {
    .attributes-grid { grid-template-columns: repeat(3, 1fr); }
    .header-top { flex-direction: column; gap: 0.5rem; }
}
</style>
