<script setup lang="ts">
import { RouterLink } from 'vue-router';

interface MobileBottomNavItem {
  key: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  to?: string | { name: string; params?: Record<string, string | number>; query?: Record<string, string> };
}

defineProps<{
  items: MobileBottomNavItem[];
}>();

const emit = defineEmits<{
  (event: 'action', key: string): void;
}>();
</script>

<template>
  <nav
    class="mobile-bottom-nav"
    aria-label="Navigazione mobile"
    :style="{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }"
  >
    <template v-for="item in items" :key="item.key">
      <RouterLink
        v-if="item.to && !item.disabled"
        :to="item.to"
        class="mobile-bottom-nav__item"
        :class="{ active: item.active }"
      >
        <span class="mobile-bottom-nav__label">{{ item.label }}</span>
      </RouterLink>

      <button
        v-else
        type="button"
        class="mobile-bottom-nav__item"
        :class="{ active: item.active, disabled: item.disabled }"
        :disabled="item.disabled"
        @click="emit('action', item.key)"
      >
        <span class="mobile-bottom-nav__label">{{ item.label }}</span>
      </button>
    </template>
  </nav>
</template>
