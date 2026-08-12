import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';
import { getMyInfo } from '../api';
import { COLORS } from '../Theme';
import ScreenBackground from '../ScreenBackground';

export default function SettingsScreen() {
  const { token, logOut } = useAuth();

  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMyInfo() {
      try {
        const result = await getMyInfo(token);
        setUserInfo(result);
      } catch (err) {
        console.log('Failed to fetch user info:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMyInfo();
  }, [token]);

  if (isLoading) {
    return (
      <ScreenBackground style={styles.centered}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>

        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color="#2F5D68" />
          </View>
          <Text style={styles.username}>{userInfo?.username}</Text>
          {userInfo?.createdAt && (
            <Text style={styles.memberSince}>
              Member since {new Date(userInfo.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.button} onPress={logOut}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 32,
  },
  profileCard: {
    width: '100%',
    backgroundColor: COLORS.tileBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.createTileBorder,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(56,189,248,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  memberSince: {
    fontSize: 13,
    color: '#6c6b6b',
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    width: '50%',
    height: 50,
    backgroundColor: '#ff443aae',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});