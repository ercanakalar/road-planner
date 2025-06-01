import { StyleSheet, Text, View, TextInput, Button, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { NavigationProp } from '@react-navigation/native';

import { useSignInMutation } from 'store/services/authenticationService';
import { SignInRequest, SignInResponse, TokenType } from 'types/libs/auth';
import localStorageService from 'services/localStorageService';

const SignInScreen = ({ navigation }: { navigation: NavigationProp<any> }) => {
    const [signInForm, setSignInForm] = useState<SignInRequest>({
        email: 'test@test.com',
        password: '123456',
    });
    const [error, setError] = useState<string>('');
    const [signIn, { isLoading }] = useSignInMutation();

    const handleInputChange = (field: keyof SignInRequest, value: string) => {
        setSignInForm({ ...signInForm, [field]: value });
    };
    const handleSubmit = async () => {
        if (!signInForm.email || !signInForm.password) {
            setError('Both email and password are required.');
            return;
        }
        try {
            const response = await signIn(signInForm).unwrap() as SignInResponse;
            await localStorageService.setItem(TokenType.ACCESS_TOKEN, response.accessToken);
            await localStorageService.setItem(TokenType.REFRESH_TOKEN, response.refreshToken);
            navigation.navigate("HomeTabNavigator");
            setError('');
        } catch (err) {
            setError('Sign-in failed. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>E-Mail</Text>
                <TextInput
                    style={styles.input}
                    value={signInForm.email}
                    onChangeText={text => handleInputChange('email', text)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
            </View>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={styles.input}
                    value={signInForm.password}
                    onChangeText={text => handleInputChange('password', text)}
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
                    <Button title="Sign In" onPress={handleSubmit} />
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

export default SignInScreen;