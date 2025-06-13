import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import localStorageService from 'services/localStorageService';
import { useSignUpMutation } from 'store/services/authenticationService';
import { SignUpResponse, TokenType } from 'types/libs/auth';

type SignUpRequest = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignUpScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [signUpForm, setSignUpForm] = useState<SignUpRequest>({
    email: 'test@test.com',
    password: '123456',
    confirmPassword: '123456',
  });
  const [error, setError] = useState<string>('');
  const [signUp, { isLoading }] = useSignUpMutation();

  const handleInputChange = (field: keyof SignUpRequest, value: string) => {
    setSignUpForm({ ...signUpForm, [field]: value });
  };

  const handleSubmit = async () => {
    if (
      !signUpForm.email ||
      !signUpForm.password ||
      !signUpForm.confirmPassword
    ) {
      setError('All fields are required.');
      return;
    }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const response = (await signUp(signUpForm).unwrap()) as SignUpResponse;
      await localStorageService.setItem(
        TokenType.ACCESS_TOKEN,
        response.accessToken
      );
      await localStorageService.setItem(
        TokenType.REFRESH_TOKEN,
        response.refreshToken
      );
      setError('');
      navigation.navigate('HomeTabNavigator');
    } catch {
      setError('Sign-up failed. Please try again.');
    }
  };

  const handleGoogleSignUp = () => {
    
  }

  return (
    <KeyboardAvoidingView
  style={styles.keyboardContainer}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
  <ScrollView contentContainerStyle={styles.scrollContainer}>
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Start exploring your routes</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder='Enter your email'
          value={signUpForm.email}
          onChangeText={(text) => handleInputChange('email', text)}
          autoCapitalize='none'
          keyboardType='email-address'
          placeholderTextColor="#aaa"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder='Enter your password'
          value={signUpForm.password}
          onChangeText={(text) => handleInputChange('password', text)}
          secureTextEntry
          placeholderTextColor="#aaa"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder='Confirm your password'
          value={signUpForm.confirmPassword}
          onChangeText={(text) => handleInputChange('confirmPassword', text)}
          secureTextEntry
          placeholderTextColor="#aaa"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.signUpButton}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color='#fff' />
        ) : (
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignUp}
      >
        <Icon
          name='google'
          size={20}
          color='#fff'
          style={styles.googleIcon}
        />
        <Text style={styles.googleButtonText}>Sign up with Google</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignInScreen')}>
          <Text style={styles.footerLink}> Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  </ScrollView>
</KeyboardAvoidingView>

  );
}

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
    error: {
      color: 'red',
      textAlign: 'center',
      fontSize: 14,
      marginTop: -6,
    },
    signUpButton: {
      backgroundColor: '#007AFF',
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    signUpButtonText: {
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
  