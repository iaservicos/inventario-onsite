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
      // Primárias - escuro profundo como o print
      bg_primary: '#0d1117',      // Fundo principal (escuro profundo com toque azul)
      bg_secondary: '#161b22',    // Fundo secundário
      bg_tertiary: '#21262d',     // Fundo terciário
      sidebar_bg: '#0d1117',      // Sidebar - mesmo fundo principal

      // Textos
      text_primary: '#c9d1d9',    // Texto principal (cinza claro)
      text_secondary: '#e0e0e0',  // Texto secundário
      text_tertiary: '#8b949e',   // Texto terciário (cinza médio)
      text_disabled: '#6e7681',   // Texto desabilitado

      // Cinzas
      gray_50: '#0d1117',
      gray_100: '#161b22',
      gray_200: '#21262d',
      gray_300: '#30363d',
      gray_400: '#444c56',
      gray_500: '#6e7681',
      gray_600: '#8b949e',
      gray_700: '#c9d1d9',
      gray_800: '#e0e0e0',
      gray_900: '#ffffff',

      // Bordas
      border_light: '#30363d',
      border_default: '#444c56',
      border_dark: '#6e7681',

      // Acento - Cyan/Turquesa vibrante (como no print)
      accent: '#39c5cf',          // Cyan vibrante
      accent_hover: '#1f8f9c',    // Cyan mais escuro
      accent_light: '#58d4dd',    // Cyan mais claro

      // Status
      success: '#39c5cf',         // Cyan (acento)
      warning: '#f59e0b',         // Amarelo/Laranja
      error: '#ef4444',           // Vermelho
      info: '#58a6ff',            // Azul

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
