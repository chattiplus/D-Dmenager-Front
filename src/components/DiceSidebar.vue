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
  padding: 0.85rem;
  border-radius: 1rem;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-surface-elevated) 90%, transparent),
    color-mix(in srgb, var(--app-bg-soft) 84%, black)
  );
  border: 1px solid var(--app-border);
  box-shadow: 0 18px 36px color-mix(in srgb, var(--app-shadow) 82%, transparent);
}

@media (max-width: 960px) {
  .dice-sidebar {
    width: 100%;
  }
}
</style>
