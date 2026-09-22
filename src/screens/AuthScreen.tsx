import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../services/authService';
import { COLORS, SPACING, TYPOGRAPHY, APP_CONFIG } from '../utils/constants';

type RootStackParamList = {
  Waiting: undefined;
  Broadcaster: undefined;
  Auth: undefined;
};

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

export const AuthScreen: React.FC = () => {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignIn, setIsSignIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState(authService.getAuthState());

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      await authService.initialize();
      setAuthState(authService.getAuthState());
    };

    checkAuth();

    // Set up auth listener
    authService.setupAuthListener(setAuthState);

    // Navigate to Waiting screen if already authenticated
    if (authState.user) {
      navigation.navigate('Waiting');
    }
  }, [authState.user, navigation]);

  // Navigate to Waiting screen when auth state changes
  useEffect(() => {
    if (authState.user) {
      navigation.navigate('Waiting');
    }
  }, [authState.user, navigation]);

  // Handle sign in
  const handleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!email || !password) {
        setError('Please enter email and password');
        setIsLoading(false);
        return;
      }

      const result = await authService.signIn(email, password);

      if (!result.success) {
        setError(result.error || 'Sign in failed');
      }
    } catch (err) {
      setError('Sign in failed. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  // Handle sign up
  const handleSignUp = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!email || !password) {
        setError('Please enter email and password');
        setIsLoading(false);
        return;
      }

      // Validate college email
      const isValidEmail = authService.validateCollegeEmail(email);
      if (!isValidEmail) {
        setError(`Please use your college email (${APP_CONFIG.COLLEGE_EMAIL_DOMAIN})`);
        setIsLoading(false);
        return;
      }

      const result = await authService.signUp(email, password, name || email.split('@')[0]);

      if (!result.success) {
        setError(result.error || 'Sign up failed');
      } else {
        // Show verification message
        Alert.alert(
          'Sign Up Successful',
          'Please check your email for verification. You can now sign in.',
          [{ text: 'OK', onPress: () => setIsSignIn(true) }]
        );
      }
    } catch (err) {
      setError('Sign up failed. Please try again.');
      console.error('Sign up error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, name]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      await authService.signOut();
      setAuthState(authService.getAuthState());
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, []);

  // Toggle between sign in and sign up
  const toggleMode = useCallback(() => {
    setIsSignIn(!isSignIn);
    setError(null);
    setPassword('');
  }, [isSignIn]);

  // Navigate back
  const navigateBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (authState.isLoading && !authState.user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.text, { marginTop: SPACING.md }]}>Checking authentication...</Text>
      </View>
    );
  }

  if (authState.user) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={[styles.text, { marginBottom: SPACING.xl }]}>
            You are signed in as {authState.user.email}
          </Text>

          <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.backButton]} onPress={navigateBack}>
            <Text style={[styles.buttonText, { color: COLORS.primary }]}>Back to App</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>{isSignIn ? 'Sign In' : 'Create Account'}</Text>
        <Text style={styles.subtitle}>
          {isSignIn ? 'Access your account' : 'Join the campus bus tracker'}
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          {!isSignIn && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder={`your-email${APP_CONFIG.COLLEGE_EMAIL_DOMAIN}`}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={isSignIn ? handleSignIn : handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{isSignIn ? 'Sign In' : 'Sign Up'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={[styles.toggleText, styles.toggleLink]}>
                {isSignIn ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              🔒 Only {APP_CONFIG.COLLEGE_EMAIL_DOMAIN} email addresses are allowed
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: SPACING.xl,
    paddingTop: SPACING['2xl'],
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY['3xl'].fontSize,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  text: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.text,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.base.fontSize,
  },
  button: {
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.sm,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  signOutButton: {
    backgroundColor: COLORS.danger,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: TYPOGRAPHY.base.fontSize,
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.base.fontSize,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  toggleText: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.textSecondary,
  },
  toggleLink: {
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  infoContainer: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    color: COLORS.primary,
    textAlign: 'center',
  },
});
