import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const MOBILE_BREAKPOINT = 768;

export const useIsMobile = () => {
  const width = ref<number | null>(null);

  const updateWidth = () => {
    if (typeof window === 'undefined') {
      width.value = null;
      return;
    }
    width.value = window.innerWidth;
  };

  onMounted(() => {
    updateWidth();
    window.addEventListener('resize', updateWidth, { passive: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateWidth);
  });

  return {
    isMobile: computed(() => (width.value ?? Number.MAX_SAFE_INTEGER) <= MOBILE_BREAKPOINT),
  };
};
