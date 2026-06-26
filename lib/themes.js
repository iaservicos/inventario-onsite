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
      // Primárias - POSITIVO NexProp exato
      bg_primary: '#0d1117',
      bg_secondary: '#161b22',
      bg_tertiary: '#21262d',
      sidebar_bg: '#0a0e1a',

      // Textos
      text_primary: '#ffffff',
      text_secondary: '#e6edf3',
      text_tertiary: '#8b949e',
      text_disabled: '#6e7681',

      // Cinzas
      gray_50: '#0d1117',
      gray_100: '#161b22',
      gray_200: '#21262d',
      gray_300: '#30363d',
      gray_400: '#484f58',
      gray_500: '#8b949e',
      gray_600: '#e6edf3',
      gray_700: '#ffffff',
      gray_800: '#ffffff',
      gray_900: '#ffffff',

      // Bordas
      border_light: '#21262d',
      border_default: '#30363d',
      border_dark: '#484f58',

      // Acento - Turquesa POSITIVO (26d0ce tipo NexProp)
      accent: '#26d0ce',
      accent_hover: '#1fb1af',
      accent_light: '#3ae6e4',

      // Status
      success: '#26d0ce',
      warning: '#d29922',
      error: '#f85149',
      info: '#79c0ff',

      // Sombras com turquesa
      shadow_sm: 'rgba(0, 0, 0, 0.4), 0 0 15px rgba(38, 208, 206, 0.05)',
      shadow_md: 'rgba(0, 0, 0, 0.6), 0 0 25px rgba(38, 208, 206, 0.1)',
      shadow_lg: 'rgba(0, 0, 0, 0.8), 0 0 40px rgba(38, 208, 206, 0.15)',
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
