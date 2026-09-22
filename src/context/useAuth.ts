import { useContext } from 'react';
import { AuthContext, type AuthContextType } from './auth-context-base';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider");
  }
  return context;
}
