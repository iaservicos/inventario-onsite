'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getTheme } from '@/lib/themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Carregar tema salvo ou usar dark como padrão
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    applyTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const applyTheme = (themeName) => {
    const themeData = getTheme(themeName);
    const root = document.documentElement;

    // Aplicar data-theme attribute
    root.setAttribute('data-theme', themeName);

    // Aplicar todas as cores como CSS variables
    Object.entries(themeData.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Exportar para window para ThemeToggle acessar
    window.__currentTheme__ = themeName;
    window.__lightTheme__ = getTheme('light').colors;
    window.__darkTheme__ = getTheme('dark').colors;

    // Salvar preferência
    localStorage.setItem('theme', themeName);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  if (!mounted) return children;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, currentColors: getTheme(theme).colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}
