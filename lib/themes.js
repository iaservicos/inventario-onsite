// Configuração de temas - Dark Mode e Light Mode com Cyan/Turquesa

export const themes = {
  light: {
    name: 'light',
    colors: {
      // Primárias - Branco elegante
      bg_primary: '#ffffff',
      bg_secondary: '#f5f7fa',
      bg_tertiary: '#eef2f7',
      sidebar_bg: '#1f2937',

      // Textos
      text_primary: '#1a202c',
      text_secondary: '#2d3748',
      text_tertiary: '#718096',
      text_disabled: '#a0aec0',

      // Cinzas
      gray_50: '#fafbfc',
      gray_100: '#f3f4f6',
      gray_200: '#e5e7eb',
      gray_300: '#d1d5db',
      gray_400: '#9ca3af',
      gray_500: '#6b7280',
      gray_600: '#4b5563',
      gray_700: '#374151',
      gray_800: '#1f2937',
      gray_900: '#111827',

      // Bordas
      border_light: '#e5e7eb',
      border_default: '#d1d5db',
      border_dark: '#9ca3af',

      // Acento - Turquesa (mantém elegância)
      accent: '#14b8a6',
      accent_hover: '#0d9488',

      // Status - Cores vibrantes
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',

      // Sombras
      shadow_sm: 'rgba(0, 0, 0, 0.05)',
      shadow_md: 'rgba(0, 0, 0, 0.1)',
      shadow_lg: 'rgba(0, 0, 0, 0.15)',
    }
  },

  dark: {
    name: 'dark',
    colors: {
      // Primárias - POSITIVO PRETO + VERMELHO
      bg_primary: '#0a0a0a',
      bg_secondary: '#1a1a1a',
      bg_tertiary: '#2d2d2d',
      sidebar_bg: '#000000',

      // Textos
      text_primary: '#ffffff',
      text_secondary: '#e5e5e5',
      text_tertiary: '#a0a0a0',
      text_disabled: '#6b6b6b',

      // Cinzas
      gray_50: '#0a0a0a',
      gray_100: '#1a1a1a',
      gray_200: '#2d2d2d',
      gray_300: '#3d3d3d',
      gray_400: '#5d5d5d',
      gray_500: '#a0a0a0',
      gray_600: '#e5e5e5',
      gray_700: '#ffffff',
      gray_800: '#ffffff',
      gray_900: '#ffffff',

      // Bordas
      border_light: '#2d2d2d',
      border_default: '#3d3d3d',
      border_dark: '#5d5d5d',

      // Acento - VERDE NEON POSITIVO
      accent: '#00ff41',
      accent_hover: '#00cc34',
      accent_light: '#39ff14',

      // Status
      success: '#00ff41',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff',

      // Sombras com vermelho neon
      shadow_sm: 'rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 0, 0, 0.08)',
      shadow_md: 'rgba(0, 0, 0, 0.7), 0 0 25px rgba(255, 0, 0, 0.15)',
      shadow_lg: 'rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 0, 0, 0.25)',
    }
  }
};

export const getTheme = (themeName = 'light') => {
  return themes[themeName] || themes.light;
};

export const getCSSVars = (theme) => {
  const t = typeof theme === 'string' ? getTheme(theme) : theme;

  let css = ':root {\n';
  Object.entries(t.colors).forEach(([key, value]) => {
    css += `  --color-${key}: ${value};\n`;
  });
  css += '}';

  return css;
};
