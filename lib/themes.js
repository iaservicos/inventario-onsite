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
      // Primárias - Dark Mode com alto contraste
      bg_primary: '#0f172a',      // Fundo principal (azul muito escuro)
      bg_secondary: '#1e293b',    // Fundo secundário (cinza escuro com toque azul)
      bg_tertiary: '#334155',     // Fundo terciário (cinza mais claro)
      sidebar_bg: '#0f172a',      // Sidebar

      // Textos - MUITO claros para contraste
      text_primary: '#f1f5f9',    // Texto principal (branco quase puro)
      text_secondary: '#e2e8f0',  // Texto secundário
      text_tertiary: '#94a3b8',   // Texto terciário (cinza)
      text_disabled: '#64748b',   // Texto desabilitado

      // Cinzas
      gray_50: '#0f172a',
      gray_100: '#1e293b',
      gray_200: '#334155',
      gray_300: '#475569',
      gray_400: '#64748b',
      gray_500: '#94a3b8',
      gray_600: '#cbd5e0',
      gray_700: '#e2e8f0',
      gray_800: '#f1f5f9',
      gray_900: '#ffffff',

      // Bordas - MUITO visíveis
      border_light: '#475569',
      border_default: '#64748b',
      border_dark: '#94a3b8',

      // Acento - Cyan VIBRANTE
      accent: '#06b6d4',          // Cyan vibrante
      accent_hover: '#0891b2',    // Cyan mais escuro
      accent_light: '#22d3ee',    // Cyan claro

      // Status
      success: '#06b6d4',         // Cyan
      warning: '#f59e0b',         // Laranja
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
