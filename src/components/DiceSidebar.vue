<script setup lang="ts">
import Dice3DPanel from './dice/Dice3DPanel.vue';
</script>

<template>
  <aside class="dice-sidebar">
    <Dice3DPanel />
  </aside>
</template>

<style scoped>
.dice-sidebar {
  display: flex;
  width: 260px;
  flex-shrink: 0;
}
</style>
