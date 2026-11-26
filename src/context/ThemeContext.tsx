import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { ThemePreference } from '../types/theme';
import {
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  getSystemPrefersDark,
  isValidThemePreference,
  readStoredThemePreference,
  resolveTheme,
  writeStoredThemePreference,
} from '../lib/theme';
import { ThemeContext } from './theme-context-base';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => readStoredThemePreference());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemPrefersDark());

  const resolvedTheme = resolveTheme(theme, systemPrefersDark);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }

    // Fallback navigateurs Safari/WebView anciens
    mediaQuery.addListener(handleMediaChange);
    return () => mediaQuery.removeListener(handleMediaChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        setThemeState(
          isValidThemePreference(event.newValue) ? event.newValue : 'system'
        );
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    const validNext: ThemePreference = isValidThemePreference(next) ? next : 'system';
    writeStoredThemePreference(validNext);
    setThemeState(validNext);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
