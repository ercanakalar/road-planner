import { Dimensions, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useGetUserQuery } from 'store/services/profileService';
import { useAppSelector } from 'store/hook';
import jwtService from 'services/jwtService';

const ProfileScreen = () => {
  const [userId, setUserId] = React.useState<string | null>(null);
  const data = useAppSelector((state) => state.auth);

  const { data: profile, isLoading, error, refetch } = useGetUserQuery({ userId, token: data.accessToken }) as any;

  useFocusEffect(
    useCallback(() => {
      const fetchAndSetUserId = async () => {
        const decoded: any = await jwtService.decodeToken();
        setUserId(decoded?.userId || null);
        refetch();
      };
      fetchAndSetUserId();
      return () => {
        console.log('Screen was unfocused');
      };
    }, [refetch])
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.textContainer}>Failed to load profile. Please try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.textContainer}>ProfileScreen</Text>
      <Text style={styles.textContainer}>Email: {profile?.email}</Text>
      <Text style={styles.textContainer}>First Name: {profile?.firstName || 'N/A'}</Text>
      <Text style={styles.textContainer}>Last Name: {profile?.lastName || 'N/A'}</Text>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  textContainer: {
    marginBottom: 10,
    fontSize: 16,
  },
});