// Configuração de temas - Dark Mode e Light Mode com Cyan/Turquesa

export const themes = {
  light: {
    name: 'light',
    colors: {
      // Primárias - IDÊNTICO ao Dark Mode (ambos escuros!)
      bg_primary: '#0f1419',
      bg_secondary: '#1e2d40',
      bg_tertiary: '#2a3850',
      sidebar_bg: '#0a0e1a',

      // Textos
      text_primary: '#ffffff',
      text_secondary: '#e8eef7',
      text_tertiary: '#8b95a5',
      text_disabled: '#6b7280',

      // Cinzas
      gray_50: '#0f1419',
      gray_100: '#1e2d40',
      gray_200: '#2a3850',
      gray_300: '#2f3d4f',
      gray_400: '#485563',
      gray_500: '#8b95a5',
      gray_600: '#e8eef7',
      gray_700: '#ffffff',
      gray_800: '#ffffff',
      gray_900: '#ffffff',

      // Bordas
      border_light: '#2a3850',
      border_default: '#2f3d4f',
      border_dark: '#485563',

      // Acento - Turquesa NexProp
      accent: '#26d0ce',
      accent_hover: '#1db5ba',
      accent_light: '#3ae6e4',

      // Status
      success: '#26d0ce',
      warning: '#f59e0b',
      error: '#f87171',
      info: '#60a5fa',

      // Sombras com turquesa
      shadow_sm: 'rgba(0, 0, 0, 0.4), 0 0 15px rgba(38, 208, 206, 0.08)',
      shadow_md: 'rgba(0, 0, 0, 0.6), 0 0 25px rgba(38, 208, 206, 0.12)',
      shadow_lg: 'rgba(0, 0, 0, 0.8), 0 0 40px rgba(38, 208, 206, 0.2)',
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
