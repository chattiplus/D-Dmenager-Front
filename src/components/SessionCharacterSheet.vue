<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PlayerCharacterResponse, NpcResponse } from '../types/api';
import { updateCharacterHp } from '../api/charactersApi';
import { updateNpcHp } from '../api/npcsApi';

const props = defineProps<{
  character: PlayerCharacterResponse | NpcResponse;
  type: 'PC' | 'NPC';
  isGm: boolean;
}>();

const emit = defineEmits(['update']);

const loading = ref(false);
const error = ref('');

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
const currentHp = ref(props.character.currentHitPoints || 0);

// Sync currentHp when prop changes
watch(() => props.character, (newVal) => {
    currentHp.value = newVal.currentHitPoints || 0;
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

// Actions / Spells / Features
const attacks = computed(() => {
    if (props.type === 'PC') return (props.character as PlayerCharacterResponse).attacksAndSpellcasting;
    return (props.character as NpcResponse).actions;
});

const spells = computed(() => {
    if (props.type === 'PC') return (props.character as PlayerCharacterResponse).spells;
    return (props.character as NpcResponse).traits; // Mapping traits here for NPCs
});

const features = computed(() => {
    if (props.type === 'PC') return (props.character as PlayerCharacterResponse).featuresAndTraits;
    return (props.character as NpcResponse).legendaryActions;
});

const skills = computed(() => {
     if (props.type === 'PC') return (props.character as PlayerCharacterResponse).otherProficiencies; // Fallback
     return (props.character as NpcResponse).skills;
});


const updateHp = async (delta: number) => {
    if (!props.isGm && props.type === 'NPC') return; // Only GM updates NPC
    // Players can update their own PC. GM can update everything.

    loading.value = true;
    error.value = '';
    const newHp = Math.max(0, Math.min(maxHp.value, currentHp.value + delta));
    
    try {
        if (props.type === 'PC') {
            await updateCharacterHp(id.value, newHp);
        } else {
            await updateNpcHp(id.value, newHp);
        }
        currentHp.value = newHp;
    } catch (e: any) {
        console.error("Failed to update HP", e);
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
    } catch (e: any) {
        error.value = "Failed to save HP";
    } finally {
        loading.value = false;
    }
}
</script>

<template>
  <div class="character-sheet">
    <div class="sheet-header">
      <div class="identity">
        <h3>{{ name }}</h3>
        <span class="subtitle">{{ race }} - {{ className }}</span>
      </div>
      
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

    <div class="attributes-grid">
        <div v-for="attr in attributes" :key="attr.label" class="attribute-card">
            <div class="attr-label">{{ attr.label }}</div>
            <div class="attr-mod">{{ getModifier(attr.value) }}</div>
            <div class="attr-score">{{ attr.value }}</div>
        </div>
    </div>

    <div class="sheet-body">
        <details open v-if="attacks">
            <summary>Attacks & Actions</summary>
            <div class="content markdown-content" v-html="attacks"></div>
        </details>

        <details v-if="spells || (type === 'NPC' && (character as NpcResponse).traits)">
            <summary>{{ type === 'PC' ? 'Spells' : 'Traits' }}</summary>
            <div class="content markdown-content">{{ spells }}</div>
        </details>

        <details v-if="features">
            <summary>{{ type === 'PC' ? 'Features' : 'Legendary Actions' }}</summary>
            <div class="content markdown-content">{{ features }}</div>
        </details>
        
        <details v-if="skills">
            <summary>Skills & Proficiencies</summary>
             <div class="content">{{ skills }}</div>
        </details>
    </div>
    
    <div v-if="error" class="error-msg">{{ error }}</div>
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
}

.sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.subtitle {
    font-size: 0.9em;
    color: var(--color-text-muted);
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

.hp-box {
    min-width: 140px;
}

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

.attr-label {
    font-size: 0.7em;
    font-weight: bold;
    color: var(--color-text-muted);
}

.attr-mod {
    font-size: 1.1em;
    font-weight: bold;
    margin: 0.2rem 0;
}

.attr-score {
    font-size: 0.8em;
    color: var(--color-text-muted);
}

.sheet-body details {
    margin-bottom: 0.5rem;
    background: var(--color-background-soft);
    border-radius: var(--radius-sm);
}

.sheet-body summary {
    padding: 0.5rem;
    cursor: pointer;
    font-weight: bold;
    background: var(--color-surface-hover);
    border-radius: var(--radius-sm);
}

.sheet-body .content {
    padding: 0.5rem;
    white-space: pre-wrap;
    font-size: 0.9em;
}

.error-msg {
    color: var(--color-danger);
    font-size: 0.8em;
    margin-top: 0.5rem;
}

@media (max-width: 600px) {
    .attributes-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
</style>
