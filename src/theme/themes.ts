export type ThemeId = 'default' | 'medieval';

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  description?: string;
  dataTheme: string;
  diceDefaultColor?: string;
};

export const DEFAULT_THEME_ID: ThemeId = 'default';

export const themes: ThemeDefinition[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Mantiene il look attuale del frontend.',
    dataTheme: 'default',
    diceDefaultColor: '#7f1d1d',
  },
  {
    id: 'medieval',
    label: 'Medievale',
    description: 'Pergamena scura, legno e accenti oro caldo.',
    dataTheme: 'medieval',
    diceDefaultColor: '#7a3b25',
  },
];

export const getThemeById = (themeId: string | null | undefined): ThemeDefinition => {
  const fallbackTheme = themes.find((theme) => theme.id === DEFAULT_THEME_ID);
  const selectedTheme = themes.find((theme) => theme.id === themeId);

  if (selectedTheme) {
    return selectedTheme;
  }

  if (fallbackTheme) {
    return fallbackTheme;
  }

  return {
    id: DEFAULT_THEME_ID,
    label: 'Default',
    dataTheme: DEFAULT_THEME_ID,
  };
};
