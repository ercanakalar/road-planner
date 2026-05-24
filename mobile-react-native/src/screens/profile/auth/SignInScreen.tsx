import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import React, { useState } from 'react';
import { NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  useGoogleMobileSignInMutation,
  useSignInMutation,
} from 'store/services/authenticationService';
import { SignInRequest, SignInResponse, TokenType } from 'types/libs/auth';
import localStorageService from 'services/localStorageService';
import { useDispatch } from 'react-redux';
import { setUserId } from 'store/slices/authSlice';

const SignInScreen = ({ navigation }: { navigation: NavigationProp<any> }) => {
  const dispatch = useDispatch();
  const [signInForm, setSignInForm] = useState<SignInRequest>({
    email: 'test@test.com',
    password: '123456',
  });
  const [error, setError] = useState<string>('');
  const [signIn, { isLoading }] = useSignInMutation();
  const [googleMobileSignIn] = useGoogleMobileSignInMutation();

  const handleInputChange = (field: keyof SignInRequest, value: string) => {
    setSignInForm({ ...signInForm, [field]: value });
  };

  const handleSubmit = async () => {
    if (!signInForm.email || !signInForm.password) {
      setError('Both email and password are required.');
      return;
    }

    try {
      const response = ((await signIn(signInForm).unwrap()) as SignInResponse);
      dispatch(setUserId(response.userId));
      await localStorageService.setItem(
        TokenType.ACCESS_TOKEN,
        response.accessToken,
      );
      await localStorageService.setItem(
        TokenType.REFRESH_TOKEN,
        response.refreshToken,
      );

      setError('');
      navigation.navigate('HomeTabNavigator', { screen: 'Home' });
    } catch {
      setError('Sign-in failed. Please check your credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    await googleMobileSignIn({
      code: 'awda',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter your email'
              value={signInForm.email}
              onChangeText={(text) => handleInputChange('email', text)}
              autoCapitalize='none'
              keyboardType='email-address'
              placeholderTextColor='#aaa'
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter your password'
              value={signInForm.password}
              onChangeText={(text) => handleInputChange('password', text)}
              secureTextEntry
              placeholderTextColor='#aaa'
            />
            <TouchableOpacity>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color='#fff' />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
          >
            <Icon
              name='google'
              size={20}
              color='#fff'
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignUpScreen')}
            >
              <Text style={styles.footerLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  container: {
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#000',
  },
  forgot: {
    marginTop: 6,
    fontSize: 14,
    color: '#007BFF',
    alignSelf: 'flex-end',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    fontSize: 14,
    marginTop: -6,
  },
  signInButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  signInButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DB4437',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  googleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  googleIcon: {
    paddingRight: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#555',
    fontSize: 14,
  },
  footerLink: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SignInScreen;
