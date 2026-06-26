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
      // Primárias - escuro elegante com melhor contraste
      bg_primary: '#1a1f2e',      // Fundo principal (cinza escuro elegante)
      bg_secondary: '#242d3d',    // Fundo secundário
      bg_tertiary: '#2d3748',     // Fundo terciário
      sidebar_bg: '#1a1f2e',      // Sidebar - mesmo fundo principal

      // Textos
      text_primary: '#e2e8f0',    // Texto principal (branco suave)
      text_secondary: '#cbd5e0',  // Texto secundário
      text_tertiary: '#a0aec0',   // Texto terciário (cinza médio)
      text_disabled: '#718096',   // Texto desabilitado

      // Cinzas
      gray_50: '#1a1f2e',
      gray_100: '#242d3d',
      gray_200: '#2d3748',
      gray_300: '#4a5568',
      gray_400: '#718096',
      gray_500: '#a0aec0',
      gray_600: '#cbd5e0',
      gray_700: '#e2e8f0',
      gray_800: '#f7fafc',
      gray_900: '#ffffff',

      // Bordas
      border_light: '#4a5568',
      border_default: '#718096',
      border_dark: '#a0aec0',

      // Acento - Cyan/Turquesa vibrante
      accent: '#00d9ff',          // Cyan brilhante
      accent_hover: '#00b8cc',    // Cyan mais escuro
      accent_light: '#40e0d0',    // Turquesa claro

      // Status
      success: '#00d9ff',         // Cyan (acento)
      warning: '#f6ad55',         // Laranja/Amber
      error: '#fc8181',           // Vermelho claro
      info: '#63b3ed',            // Azul claro

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
