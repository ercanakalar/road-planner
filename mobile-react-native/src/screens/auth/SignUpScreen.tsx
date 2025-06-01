import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, TouchableOpacity, ActivityIndicator } from 'react-native';
import localStorageService from 'services/localStorageService';
import { useSignUpMutation } from 'store/services/authenticationService';
import { SignUpResponse, TokenType } from 'types/libs/auth';

type SignUpRequest = {
    email: string;
    password: string;
    confirmPassword: string;
};

export default function SignUpScreen() {
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
        if (signUpForm.password !== signUpForm.confirmPassword) {
            setError('Passwords are not matched!');
            return;
        }
        if (!signUpForm.email || !signUpForm.password) {
            setError('Both email and password are required.');
            return;
        }
        try {
            const response = await signUp(signUpForm).unwrap() as SignUpResponse;
            localStorageService.setItem(TokenType.ACCESS_TOKEN, response.accessToken);
            localStorageService.setItem(TokenType.REFRESH_TOKEN, response.refreshToken);
            setError('');
        } catch (err) {
            setError('Sign-up failed. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>E-Mail</Text>
                <TextInput
                    style={styles.input}
                    value={signUpForm.email}
                    onChangeText={text => handleInputChange('email', text)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
            </View>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={styles.input}
                    value={signUpForm.password}
                    onChangeText={text => handleInputChange('password', text)}
                    secureTextEntry
                />
            </View>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                    style={styles.input}
                    value={signUpForm.confirmPassword}
                    onChangeText={text => handleInputChange('confirmPassword', text)}
                    secureTextEntry
                />
                <TouchableOpacity>
                    <Text style={styles.forgot}>Forgot Password</Text>
                </TouchableOpacity>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.buttonContainer}>
                {isLoading ? (
                    <ActivityIndicator />
                ) : (
                    <Button title="Sign Up" onPress={handleSubmit} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 4,
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    forgot: {
        marginTop: 8,
        color: '#007bff',
        textAlign: 'right',
    },
    error: {
        color: 'red',
        marginBottom: 12,
        textAlign: 'center',
    },
    buttonContainer: {
        marginTop: 12,
    },
});