// Configuração de temas - Dark Mode e Light Mode com Cyan/Turquesa

export const themes = {
  light: {
    name: 'light',
    colors: {
      // Primárias - Branco puro + Sidebar dark igual ao Dark Mode
      bg_primary: '#ffffff',
      bg_secondary: '#f8fafc',
      bg_tertiary: '#f1f5f9',
      sidebar_bg: '#0a0e1a',

      // Textos
      text_primary: '#0f1419',
      text_secondary: '#334155',
      text_tertiary: '#64748b',
      text_disabled: '#94a3b8',

      // Cinzas
      gray_50: '#f8fafc',
      gray_100: '#f1f5f9',
      gray_200: '#e2e8f0',
      gray_300: '#cbd5e1',
      gray_400: '#94a3b8',
      gray_500: '#64748b',
      gray_600: '#475569',
      gray_700: '#334155',
      gray_800: '#1e293b',
      gray_900: '#0f1419',

      // Bordas
      border_light: '#e2e8f0',
      border_default: '#cbd5e1',
      border_dark: '#94a3b8',

      // Acento - Turquesa NexProp
      accent: '#26d0ce',
      accent_hover: '#1db5ba',

      // Status - Cores vibrantes
      success: '#26d0ce',
      warning: '#f59e0b',
      error: '#f87171',
      info: '#60a5fa',

      // Sombras
      shadow_sm: 'rgba(0, 0, 0, 0.05)',
      shadow_md: 'rgba(0, 0, 0, 0.1)',
      shadow_lg: 'rgba(0, 0, 0, 0.15)',
    }
  },

  dark: {
    name: 'dark',
    colors: {
      // Primárias - NexProp Elegante (cinza-azul escuro)
      bg_primary: '#0f1419',
      bg_secondary: '#1e2d40',
      bg_tertiary: '#2a3850',
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
