// Configuração de temas - Dark Mode e Light Mode

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
      // Primárias - escuro profundo como o print
      bg_primary: '#0f1419',      // Fundo principal (escuro profundo)
      bg_secondary: '#1a1f2e',    // Fundo secundário
      bg_tertiary: '#252d3d',     // Fundo terciário
      sidebar_bg: '#0f1419',      // Sidebar - mesmo fundo principal

      // Textos
      text_primary: '#ffffff',    // Texto principal
      text_secondary: '#e0e7ff',  // Texto secundário
      text_tertiary: '#a0aec0',   // Texto terciário
      text_disabled: '#718096',   // Texto desabilitado

      // Cinzas
      gray_50: '#0f1419',
      gray_100: '#1a1f2e',
      gray_200: '#252d3d',
      gray_300: '#2d3748',
      gray_400: '#4a5568',
      gray_500: '#718096',
      gray_600: '#a0aec0',
      gray_700: '#cbd5e0',
      gray_800: '#e2e8f0',
      gray_900: '#ffffff',

      // Bordas
      border_light: '#2d3748',
      border_default: '#4a5568',
      border_dark: '#718096',

      // Acento - Verde/Cyan vibrante (como no print)
      accent: '#10b981',          // Verde esmeralda
      accent_hover: '#059669',    // Verde mais escuro
      accent_light: '#6ee7b7',    // Verde mais claro

      // Status
      success: '#10b981',         // Verde (acento)
      warning: '#f59e0b',         // Amarelo/Laranja
      error: '#ef4444',           // Vermelho
      info: '#3b82f6',            // Azul

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
