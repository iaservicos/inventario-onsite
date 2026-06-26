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
      // Primárias - Baseado no NexProp Design
      bg_primary: '#0d1117',      // Fundo principal (preto muito escuro)
      bg_secondary: '#1a2332',    // Fundo secundário (cinza escuro elegante)
      bg_tertiary: '#243447',     // Fundo terciário (cinza um pouco mais claro)
      sidebar_bg: '#0d1117',      // Sidebar

      // Textos - Claros e elegantes
      text_primary: '#e8eef5',    // Texto principal (branco suave)
      text_secondary: '#d0d8e0',  // Texto secundário
      text_tertiary: '#8b96a8',   // Texto terciário (cinza médio)
      text_disabled: '#5a6578',   // Texto desabilitado

      // Cinzas
      gray_50: '#0d1117',
      gray_100: '#1a2332',
      gray_200: '#243447',
      gray_300: '#2f3f52',
      gray_400: '#5a6578',
      gray_500: '#8b96a8',
      gray_600: '#d0d8e0',
      gray_700: '#e8eef5',
      gray_800: '#f5f7fa',
      gray_900: '#ffffff',

      // Bordas - Sutis e elegantes
      border_light: '#2f3f52',
      border_default: '#3d4d62',
      border_dark: '#5a6578',

      // Acento - Cyan/Turquesa vibrante (como NexProp)
      accent: '#14b8a6',          // Turquesa vibrante
      accent_hover: '#0d9488',    // Turquesa mais escuro
      accent_light: '#2dd4bf',    // Turquesa claro

      // Status
      success: '#14b8a6',         // Turquesa
      warning: '#f59e0b',         // Laranja
      error: '#ef4444',           // Vermelho
      info: '#3b82f6',            // Azul

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
