<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  strength?: number | null;
  dexterity?: number | null;
  constitution?: number | null;
  intelligence?: number | null;
  wisdom?: number | null;
  charisma?: number | null;
}>();

const getModifier = (score: number) => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

const attributes = computed(() => [
  { label: 'STR', value: props.strength ?? 10 },
  { label: 'DEX', value: props.dexterity ?? 10 },
  { label: 'CON', value: props.constitution ?? 10 },
  { label: 'INT', value: props.intelligence ?? 10 },
  { label: 'WIS', value: props.wisdom ?? 10 },
  { label: 'CHA', value: props.charisma ?? 10 },
]);
</script>

<template>
  <div class="attributes">
    <div v-for="attr in attributes" :key="attr.label" class="attr-box">
      <div class="lbl">{{ attr.label }}</div>
      <div class="mod">{{ getModifier(attr.value) }}</div>
      <div class="score">{{ attr.value }}</div>
    </div>
  </div>
</template>

<style scoped>
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

.attr-box .lbl {
  font-size: 0.7rem;
  font-weight: bold;
  color: #a0aec0;
}

.attr-box .mod {
  font-size: 1.2rem;
  font-weight: bold;
  margin: 0.2rem 0;
}

.attr-box .score {
  font-size: 0.8rem;
  color: #718096;
}

@media (max-width: 768px) {
  .attributes {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
