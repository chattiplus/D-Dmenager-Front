<!-- src/App.vue -->
<script setup lang="ts">
import AppHeader from './components/AppHeader.vue';
import AppLayout from './components/AppLayout.vue';
</script>

<template>
  <AppLayout>
    <template #header>
      <AppHeader />
    </template>
  </AppLayout>
</template>
