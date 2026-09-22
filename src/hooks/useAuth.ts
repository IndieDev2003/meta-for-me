import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { User, AuthState } from '../types';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  useEffect(() => {
    // Set up auth listener
    authService.setupAuthListener(setAuthState);

    // Initialize auth
    authService.initialize();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return authService.signIn(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    return authService.signUp(email, password, name);
  }, []);

  const signOut = useCallback(async () => {
    return authService.signOut();
  }, []);

  const validateEmail = useCallback((email: string) => {
    return authService.validateCollegeEmail(email);
  }, []);

  return {
    user: authState.user,
    isLoading: authState.isLoading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    signIn,
    signUp,
    signOut,
    validateEmail,
  };
};
