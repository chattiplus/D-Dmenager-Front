<!-- src/components/AppLayout.vue -->
<script setup lang="ts">
import { RouterView } from 'vue-router';
import DiceSidebar from './DiceSidebar.vue';
</script>

<template>
  <div class="app-shell">
    <slot name="header" />
    <main class="content">
      <div class="page">
        <div class="page-body">
          <DiceSidebar />
          <div class="page-main">
            <div class="page-card">
              <RouterView />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page-body {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.page-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
}

.page-card {
  flex: 1 1 auto;
}
</style>
