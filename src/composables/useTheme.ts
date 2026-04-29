import { computed, readonly, ref } from 'vue';
import {
  DEFAULT_THEME_ID,
  getThemeById,
  themes,
  type ThemeDefinition,
  type ThemeId,
} from '../theme/themes';

const STORAGE_KEY = 'dd-manager-theme';

const currentThemeId = ref<ThemeId>(DEFAULT_THEME_ID);

const applyTheme = (theme: ThemeDefinition) => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme.dataTheme;
  }
};

const resolveThemeId = (themeId: string | null | undefined): ThemeId => getThemeById(themeId).id;

const persistTheme = (themeId: ThemeId) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, themeId);
  }
};

const readStoredThemeId = (): ThemeId => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_ID;
  }

  return resolveThemeId(window.localStorage.getItem(STORAGE_KEY));
};

export const initTheme = () => {
  const themeId = readStoredThemeId();
  currentThemeId.value = themeId;
  applyTheme(getThemeById(themeId));
  persistTheme(themeId);
};

export const useTheme = () => {
  const currentTheme = computed(() => getThemeById(currentThemeId.value));

  const setTheme = (themeId: ThemeId) => {
    const resolvedThemeId = resolveThemeId(themeId);
    currentThemeId.value = resolvedThemeId;
    applyTheme(getThemeById(resolvedThemeId));
    persistTheme(resolvedThemeId);
  };

  return {
    currentThemeId: readonly(currentThemeId),
    currentTheme,
    availableThemes: themes,
    setTheme,
    initTheme,
  };
};
