import { createContext } from 'react';
import type { Profile, UserRole } from '../types/database';

export interface AuthContextType {
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  isOnline: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginDemo: (roleToUse: UserRole, targetId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
