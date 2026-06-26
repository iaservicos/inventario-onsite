'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getTheme } from '@/lib/themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detectar preferência do sistema
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (themeName) => {
    const themeData = getTheme(themeName);
    const root = document.documentElement;

    // Aplicar todas as cores como CSS variables
    Object.entries(themeData.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Aplicar no body para background
    document.body.style.backgroundColor = themeData.colors.bg_primary;
    document.body.style.color = themeData.colors.text_primary;

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
