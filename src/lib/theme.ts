import type { ResolvedTheme, ThemePreference } from '../types/theme.ts';

export const THEME_STORAGE_KEY = 'paysage_theme_preference';
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';
export const LIGHT_THEME_COLOR = '#15302F';
export const DARK_THEME_COLOR = '#0F1D1C';

interface StorageReader {
  getItem: (key: string) => string | null;
}

interface StorageWriter {
  setItem: (key: string, value: string) => void;
}

/**
 * Vérifie si une valeur inconnue correspond à une préférence de thème valide.
 */
export function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Lit la préférence de thème persistée dans localStorage (avec repli sur 'system').
 */
export function readStoredThemePreference(storage?: StorageReader | null): ThemePreference {
  const target =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;

  if (!target) {
    return DEFAULT_THEME_PREFERENCE;
  }

  try {
    const raw = target.getItem(THEME_STORAGE_KEY);
    return isValidThemePreference(raw) ? raw : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

/**
 * Persiste la préférence de thème dans localStorage sans lever d'erreur bloquante.
 */
export function writeStoredThemePreference(
  preference: ThemePreference,
  storage?: StorageWriter | null
): void {
  const target =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;

  if (!target) {
    return;
  }

  try {
    target.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Stockage privé ou quota indisponible : ne pas bloquer le changement visuel en session
  }
}

/**
 * Résout le thème effectif ('light' | 'dark') à partir de la préférence et du thème OS.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === 'dark') {
    return 'dark';
  }
  if (preference === 'light') {
    return 'light';
  }
  return systemPrefersDark ? 'dark' : 'light';
}

/**
 * Détecte si le système préfère actuellement le mode sombre.
 */
export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/**
 * Synchronise la classe .dark sur <html>, color-scheme, le fond racine et <meta name="theme-color">.
 */
export function applyThemeToDocument(
  resolvedTheme: ResolvedTheme,
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined
): void {
  if (!doc) {
    return;
  }

  const root = doc.documentElement;
  const isDark = resolvedTheme === 'dark';

  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
  root.style.colorScheme = resolvedTheme;
  root.style.backgroundColor = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;

  const themeColorMeta = doc.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
}
