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
