export type ThemeId = 'default' | 'medieval' | 'kawaii-pink' | 'arcane' | 'kuromi';

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
  {
    id: 'kawaii-pink',
    label: 'Rosa Kawaii',
    description: 'Toni rosa, crema e fragola con atmosfera cute e leggibile.',
    dataTheme: 'kawaii-pink',
    diceDefaultColor: '#ff6fae',
  },
  {
    id: 'arcane',
    label: 'Arcano',
    description: 'Tema dark fantasy arcano con oro antico e dettagli da grimorio',
    dataTheme: 'arcane',
    diceDefaultColor: '#8f1d1d',
  },
  {
    id: 'kuromi',
    label: 'Kuromi',
    description: 'Rosa scuro elegante, nero vellutato, atmosfera kawaii raffinata.',
    dataTheme: 'kuromi',
    diceDefaultColor: '#e85a9e',
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
