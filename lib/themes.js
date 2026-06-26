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
      // Primárias - Preto elegante
      bg_primary: '#0f0f0f',
      bg_secondary: '#1a1a1a',
      bg_tertiary: '#2d2d2d',
      sidebar_bg: '#0a0a0a',

      // Textos
      text_primary: '#ffffff',
      text_secondary: '#e5e5e5',
      text_tertiary: '#a0a0a0',
      text_disabled: '#707070',

      // Cinzas
      gray_50: '#0f0f0f',
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
      shadow_sm: 'rgba(0, 0, 0, 0.3)',
      shadow_md: 'rgba(0, 0, 0, 0.5)',
      shadow_lg: 'rgba(0, 0, 0, 0.7)',
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
