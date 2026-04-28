import { computed, reactive } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

interface MobileShellState {
  title: string;
  subtitle: string;
  showBack: boolean;
  backTo: RouteLocationRaw | null;
}

const state = reactive<MobileShellState>({
  title: '',
  subtitle: '',
  showBack: false,
  backTo: null,
});

export const useMobileShell = () => {
  const setMobileShellState = (nextState: Partial<MobileShellState>) => {
    state.title = nextState.title ?? '';
    state.subtitle = nextState.subtitle ?? '';
    state.showBack = nextState.showBack ?? false;
    state.backTo = nextState.backTo ?? null;
  };

  const resetMobileShellState = () => {
    state.title = '';
    state.subtitle = '';
    state.showBack = false;
    state.backTo = null;
  };

  return {
    mobileShellState: computed(() => state),
    setMobileShellState,
    resetMobileShellState,
  };
};
