import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS} from '../Theme';

export default function SettingsScreen() {
  const { logOut } = useAuth();

  return (

      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >

      
        <Text style={styles.title}>Settings</Text>

        <TouchableOpacity style={styles.button} onPress={logOut}>
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>
      </LinearGradient>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
  },
  button: {
    width: '60%',
    height: 50,
    backgroundColor: '#000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});