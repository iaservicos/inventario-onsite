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
      // Primárias - NexProp Style
      bg_primary: '#0a0e27',
      bg_secondary: '#141829',
      bg_tertiary: '#1f2937',
      sidebar_bg: '#050608',

      // Textos
      text_primary: '#ffffff',
      text_secondary: '#e0e0e0',
      text_tertiary: '#8b8b8b',
      text_disabled: '#5a5a5a',

      // Cinzas
      gray_50: '#0a0e27',
      gray_100: '#141829',
      gray_200: '#1f2937',
      gray_300: '#2d3748',
      gray_400: '#4a5568',
      gray_500: '#8b8b8b',
      gray_600: '#e0e0e0',
      gray_700: '#ffffff',
      gray_800: '#ffffff',
      gray_900: '#ffffff',

      // Bordas
      border_light: '#1f2937',
      border_default: '#2d3748',
      border_dark: '#4a5568',

      // Acento - Verde/Turquesa vibrante
      accent: '#1dd1a1',
      accent_hover: '#10b981',
      accent_light: '#38bfa1',

      // Status
      success: '#1dd1a1',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',

      // Sombras com verde
      shadow_sm: 'rgba(0, 0, 0, 0.3), 0 0 15px rgba(29, 209, 161, 0.05)',
      shadow_md: 'rgba(0, 0, 0, 0.5), 0 0 25px rgba(29, 209, 161, 0.1)',
      shadow_lg: 'rgba(0, 0, 0, 0.7), 0 0 40px rgba(29, 209, 161, 0.15)',
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
