<!-- src/components/AppLayout.vue -->
<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="app-shell">
    <slot name="header" />
    <main class="content">
      <div class="page">
        <div class="page-card">
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>
