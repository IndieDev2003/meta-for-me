import { supabase } from './supabaseClient';
import { User } from '../types';
import { APP_CONFIG } from '../utils/constants';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    isLoading: false,
    error: null,
  };

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Get current auth state
  getAuthState(): AuthState {
    return this.authState;
  }

  // Initialize auth listener
  async initialize(): Promise<void> {
    this.authState.isLoading = true;
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        this.authState.error = error.message;
        this.authState.isLoading = false;
        return;
      }

      if (user) {
        // Check if email is from college domain
        const isValidEmail = this.validateCollegeEmail(user.email || '');
        
        if (isValidEmail) {
          const userProfile = await this.getUserProfile(user.id);
          this.authState.user = {
            id: user.id,
            email: user.email || '',
            name: userProfile?.name || user.user_metadata.name,
            is_broadcaster: userProfile?.is_broadcaster || false,
            current_trip_id: userProfile?.current_trip_id,
          };
        } else {
          // Sign out if email is not from college domain
          await this.signOut();
          this.authState.error = 'Please use your college email address';
        }
      }
    } catch (err) {
      this.authState.error = 'Failed to initialize auth';
    } finally {
      this.authState.isLoading = false;
    }
  }

  // Set up auth listener for real-time updates
  setupAuthListener(callback: (state: AuthState) => void): void {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        this.handleSignIn(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        this.handleSignOut();
      } else if (event === 'USER_UPDATED') {
        this.handleUserUpdate(session?.user || null);
      }
      callback(this.authState);
    });
  }

  private async handleSignIn(user: any): Promise<void> {
    this.authState.isLoading = true;
    
    try {
      if (!user?.email) {
        throw new Error('No email provided');
      }

      const isValidEmail = this.validateCollegeEmail(user.email);
      
      if (!isValidEmail) {
        await this.signOut();
        this.authState.error = 'Please use your college email address';
        this.authState.isLoading = false;
        return;
      }

      // Check or create user profile
      const userProfile = await this.getOrCreateUserProfile(user);
      
      this.authState.user = {
        id: user.id,
        email: user.email,
        name: userProfile.name || user.user_metadata?.name,
        is_broadcaster: userProfile.is_broadcaster,
        current_trip_id: userProfile.current_trip_id,
      };
      this.authState.error = null;
    } catch (err) {
      this.authState.error = 'Failed to sign in';
      this.authState.user = null;
    } finally {
      this.authState.isLoading = false;
    }
  }

  private async handleSignOut(): Promise<void> {
    this.authState.user = null;
    this.authState.error = null;
  }

  private async handleUserUpdate(user: any): Promise<void> {
    if (!this.authState.user) return;
    
    this.authState.user.email = user?.email || this.authState.user.email;
    this.authState.user.name = user?.user_metadata?.name || this.authState.user.name;
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.authState.isLoading = true;
    this.authState.error = null;

    try {
      const isValidEmail = this.validateCollegeEmail(email);
      
      if (!isValidEmail) {
        return { success: false, error: 'Please use your college email address' };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Sign in failed' };
    } finally {
      this.authState.isLoading = false;
    }
  }

  // Sign up with email and password
  async signUp(email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> {
    this.authState.isLoading = true;
    this.authState.error = null;

    try {
      const isValidEmail = this.validateCollegeEmail(email);
      
      if (!isValidEmail) {
        return { success: false, error: 'Please use your college email address' };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Sign up failed' };
    } finally {
      this.authState.isLoading = false;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.authState.user = null;
    this.authState.error = null;
  }

  // Validate college email domain
  validateCollegeEmail(email: string): boolean {
    const domain = process.env.EXPO_PUBLIC_COLLEGE_DOMAIN || APP_CONFIG.COLLEGE_EMAIL_DOMAIN;
    return email.endsWith(domain);
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  // Get or create user profile
  async getOrCreateUserProfile(user: any): Promise<any> {
    const existingProfile = await this.getUserProfile(user.id);
    
    if (existingProfile) {
      return existingProfile;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email.split('@')[0],
        is_verified: true,
        is_broadcaster: false,
        total_trips: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return { id: user.id, email: user.email, name: user.email.split('@')[0] };
    }

    return data;
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<any>): Promise<boolean> {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }

    // Update local state
    if (this.authState.user?.id === userId) {
      this.authState.user = { ...this.authState.user, ...updates };
    }

    return true;
  }

  // Toggle broadcaster mode
  async toggleBroadcasterMode(userId: string, isBroadcaster: boolean): Promise<boolean> {
    return this.updateUserProfile(userId, { is_broadcaster: isBroadcaster });
  }

  // Get current session
  async getSession(): Promise<any> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return data.session;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
