import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserCredentials } from '@/types';
import { login as apiLogin } from '@/services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: UserCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      
      login: async (credentials: UserCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await apiLogin(credentials);
          set({ 
            user, 
            token, 
            isLoading: false, 
            isAuthenticated: true,
            error: null
          });
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to login. Please check your credentials.';
          set({ 
            isLoading: false, 
            error: errorMessage, 
            isAuthenticated: false 
          });
        }
      },
      
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
      },
      
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;