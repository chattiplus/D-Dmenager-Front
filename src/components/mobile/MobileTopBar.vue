<script setup lang="ts">
import { useRouter } from 'vue-router';

const props = defineProps<{
  title: string;
  subtitle?: string;
  backTo?: string | { name: string; params?: Record<string, string | number> };
}>();

const router = useRouter();

const handleBack = async () => {
  if (props.backTo) {
    await router.push(props.backTo);
    return;
  }

  router.back();
};
</script>

<template>
  <header class="mobile-top-bar">
    <button type="button" class="mobile-top-bar__back" @click="handleBack">
      Indietro
    </button>
    <div class="mobile-top-bar__content">
      <p v-if="subtitle" class="mobile-top-bar__subtitle">{{ subtitle }}</p>
      <h1 class="mobile-top-bar__title">{{ title }}</h1>
    </div>
  </header>
</template>
