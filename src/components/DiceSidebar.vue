<script setup lang="ts">
import Dice3DPanel from './dice/Dice3DPanel.vue';
</script>

<template>
  <aside class="dice-sidebar">
    <Dice3DPanel title="Dadi" />
  </aside>
</template>

<style scoped>
.dice-sidebar {
  width: 260px;
  flex-shrink: 0;
}
</style>
