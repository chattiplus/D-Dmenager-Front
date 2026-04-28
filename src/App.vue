<!-- src/App.vue -->
<script setup lang="ts">
import AppHeader from './components/AppHeader.vue';
import AppLayout from './components/AppLayout.vue';
import MobileAppLayout from './layouts/MobileAppLayout.vue';
import { useIsMobile } from './composables/useIsMobile';

const isMobile = useIsMobile();
</script>

<template>
  <MobileAppLayout v-if="isMobile" />
  <AppLayout v-else>
    <template #header>
      <AppHeader />
    </template>
  </AppLayout>
</template>
