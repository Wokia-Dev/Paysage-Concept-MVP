import { useContext } from 'react';
import { ThemeContext, type ThemeContextType } from './theme-context-base';

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme doit être utilisé à l'intérieur de ThemeProvider");
  }
  return context;
}
