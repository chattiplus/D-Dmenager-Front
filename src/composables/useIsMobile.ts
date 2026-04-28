import { onBeforeUnmount, onMounted, ref } from 'vue';

const MOBILE_BREAKPOINT = '(max-width: 768px)';

export const useIsMobile = () => {
  const isMobile = ref(false);
  let mediaQuery: MediaQueryList | null = null;

  const update = (event?: MediaQueryList | MediaQueryListEvent) => {
    isMobile.value = event?.matches ?? mediaQuery?.matches ?? false;
  };

  onMounted(() => {
    mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
    update(mediaQuery);
    mediaQuery.addEventListener('change', update);
  });

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', update);
  });

  return isMobile;
};
