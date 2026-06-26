// Configuração de temas - Dark Mode e Light Mode com Cyan/Turquesa

export const themes = {
  light: {
    name: 'light',
    colors: {
      // Primárias
      bg_primary: '#ffffff',      // Fundo principal
      bg_secondary: '#f8f8f8',    // Fundo secundário
      bg_tertiary: '#f0f0f0',     // Fundo terciário
      sidebar_bg: '#2c3e50',      // Sidebar - cinza escuro (não preto puro)

      // Textos
      text_primary: '#000000',    // Texto principal
      text_secondary: '#333333',  // Texto secundário
      text_tertiary: '#666666',   // Texto terciário
      text_disabled: '#999999',   // Texto desabilitado

      // Cinzas
      gray_50: '#fafafa',
      gray_100: '#f5f5f5',
      gray_200: '#eeeeee',
      gray_300: '#e0e0e0',
      gray_400: '#cccccc',
      gray_500: '#999999',
      gray_600: '#666666',
      gray_700: '#333333',
      gray_800: '#1a1a1a',
      gray_900: '#000000',

      // Bordas
      border_light: '#e5e5e5',
      border_default: '#d0d0d0',
      border_dark: '#999999',

      // Acento (preto para light mode)
      accent: '#000000',
      accent_hover: '#333333',

      // Status
      success: '#2d5016',         // Verde escuro
      warning: '#664d00',         // Laranja escuro
      error: '#661a1a',           // Vermelho escuro
      info: '#1a3a4d',            // Azul escuro

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
      bg_primary: '#1a1f2e',
      bg_secondary: '#2d3748',
      bg_tertiary: '#374151',
      sidebar_bg: '#0f1419',

      // Textos
      text_primary: '#e2e8f0',
      text_secondary: '#cbd5e0',
      text_tertiary: '#9ca3af',
      text_disabled: '#6b7280',

      // Cinzas
      gray_50: '#1a1f2e',
      gray_100: '#2d3748',
      gray_200: '#374151',
      gray_300: '#4b5563',
      gray_400: '#6b7280',
      gray_500: '#9ca3af',
      gray_600: '#cbd5e0',
      gray_700: '#e2e8f0',
      gray_800: '#f3f4f6',
      gray_900: '#ffffff',

      // Bordas
      border_light: '#374151',
      border_default: '#4b5563',
      border_dark: '#6b7280',

      // Acento - Turquesa
      accent: '#14b8a6',
      accent_hover: '#0d9488',
      accent_light: '#2dd4bf',

      // Status
      success: '#14b8a6',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',

      // Sombras
      shadow_sm: 'rgba(0, 0, 0, 0.2)',
      shadow_md: 'rgba(0, 0, 0, 0.3)',
      shadow_lg: 'rgba(0, 0, 0, 0.4)',
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
