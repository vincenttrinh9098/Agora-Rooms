import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text,ActivityIndicator} from 'react-native';
import React, { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import 'react-native-get-random-values';

import LoginScreen from './screens/login';
import MainTabs from './MainTabs';
import ChatRoomScreen from './screens/chatroom';
import RoomInfoScreen from './screens/roominfo';

import AuthContext from './AuthContext';
import {setUnauthorizedHandler, updatePublicKey} from './api';
import { ensureKeypairExists } from './crypto';
import ScreenBackground from './ScreenBackground';
const TOKEN_KEY = 'auth_token';
const Stack = createNativeStackNavigator();

export default function App() {
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  setUnauthorizedHandler(handleLogout);
}, []);

  useEffect(() => {
    async function checkForExistingToken() {
      try {
        const result = await SecureStore.getItemAsync(TOKEN_KEY);
        if (result) {
          setToken(result);
          setUserId(jwtDecode(result).userId);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.log('Failed to retrieve token:', err);
      } finally {
        setIsLoading(false);
      }
    }
    checkForExistingToken();
  }, []);


  useEffect(() => {
      async function syncPublicKey() {
        if (!isLoggedIn || !token) return;

        try {
          const publicKey = await ensureKeypairExists();
          console.log('Generated/derived public key:', publicKey);
          await updatePublicKey(token, publicKey);
          console.log('Public key upload succeeded');
        } catch (err) {
          console.log('Public key sync failed:', err.message);
        }
      }

    syncPublicKey();
  }, [isLoggedIn, token]);

  async function handleLoginSuccess(newToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setToken(newToken);
    setUserId(jwtDecode(newToken).userId);
    setIsLoggedIn(true);
  }

  async function handleLogout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUserId(null);
    setIsLoggedIn(false);
  }

  if (isLoading) {
    return (
      <ScreenBackground style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </ScreenBackground>
    );
  }
  




  return (
    <AuthContext.Provider value={{ token, userId, isLoggedIn, logOut: handleLogout }}>
      <NavigationContainer>
        <Stack.Navigator   
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#100B2B' }, // matches your theme's gradientStart
        }}>
          {isLoggedIn ? (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
              <Stack.Screen name="RoomInfo" component={RoomInfoScreen} />
            </>
          ) : (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});