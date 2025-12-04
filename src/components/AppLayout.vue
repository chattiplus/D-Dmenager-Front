<!-- src/components/AppLayout.vue -->
<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="layout">
    <slot name="header" />
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>
