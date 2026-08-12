import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View
} from 'react-native';
import { login } from '../api';
import ScreenBackground from '../ScreenBackground';
import { COLORS } from '../Theme';
import { Ionicons } from '@expo/vector-icons';


export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await login(username, password);
      if (result) {
        onLoginSuccess(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenBackground style={styles.container}>
        <View style={styles.headerArea}>
          <Text style={styles.topHeaderText}>Agora Rooms</Text>
          <Ionicons
            name="chatbubbles-outline"
            size={24}
            color="#2F5D68"
          />
        </View>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#8A8780"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#8A8780"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 24,
  paddingBottom: 120,
},
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.headerTitle,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#8A8780',
    marginTop: 6,
    marginBottom: 32,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.tileBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: COLORS.tileText,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.tileBorder,
  },
  button: {
    width: '50%',
    height: 50,
    backgroundColor: COLORS.createTileBackground,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.createTileText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#D64545',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },

  topHeaderText: {
  color: COLORS.headerText,
  fontSize: 30,
  fontWeight: '700',
  letterSpacing: 2,
},

headerArea: {
  marginTop: 50,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},
});