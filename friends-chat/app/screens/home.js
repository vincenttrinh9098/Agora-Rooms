import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
  Button,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { baseURL } from '../constants';
import {SvgDiamond} from '../components';
import { useAuth } from '../AuthContext';
import { getRooms, joinRoom,updateRoomMemberKey } from '../api';
import { generateRoomKey, encryptRoomKeyForMember, ensureKeypairExists } from '../crypto';
import ScreenBackground from '../ScreenBackground';

const Stack = createNativeStackNavigator();

// Grid math: 2 columns, fixed spacing between/around tiles
const NUM_COLUMNS = 2;
const SPACING = 30;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_SIZE = (SCREEN_WIDTH - SPACING * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
const GRID_SIZE = 40; 

const SCREEN_HEIGHT = Dimensions.get('window').height;
const TOP_HEADER_HEIGHT = SCREEN_HEIGHT * 0.15; // 15% of total screen height


export default function HomeScreen({ navigation }) {
  const { token,userId } = useAuth();
  
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  async function fetchRooms() {
    try {
      const result = await getRooms(token);
      setRooms(result);
    } catch (err) {
      Alert.alert('Room fetch failed', 'Could not load your room. Please try again.');
    } finally {
      setRoomName('');
      setRoomPassword('')
      setIsLoading(false);
    }
  }
 
  useEffect(() => {
    fetchRooms();
  }, [token]);

  function handleCloseButton(){
    setRoomName('');
    setRoomPassword('')

    setModalVisible(false);
  }

  async function handleCreateRoomPress() {
    console.log('Create room tapped');
    try {
      const result = await joinRoom(roomName, roomPassword, token);
      console.log("result.id:" , result.id);
      await fetchRooms();

      if (result.created) {
        const roomKeyBytes = generateRoomKey();
        const myPublicKeyB64 = await ensureKeypairExists(); 
        const encryptedForSelf = await encryptRoomKeyForMember(roomKeyBytes, myPublicKeyB64);
        await updateRoomMemberKey(token, result.id, userId, encryptedForSelf);
      }


    } catch (error) {
      console.log('Create room error:', error.message);
      Alert.alert('Room Create failed', 'Could not create new room. Please try again.');
    } finally {
      setRoomName('');
      setRoomPassword('')
      setModalVisible(false);
    }
  }

  function handleRoomPress(room) {
    console.log('Room tapped:', room.name);
    navigation.navigate('ChatRoom', { roomId: room.id, roomName: room.name });
  }

if (isLoading) {
  return (
    <ScreenBackground style={styles.centered}>
      <ActivityIndicator size="large" color="#38BDF8" />
      <Text style={styles.loadingText}>Loading rooms...</Text>
    </ScreenBackground>
  );
}

  return (

    <ScreenBackground>
      
      <View style={[styles.topHeader, { height: TOP_HEADER_HEIGHT }]}>
        <Text style={styles.topHeaderText}>Agora Rooms</Text>
        <View style={styles.topHeaderBorderLine} />
      </View>

      {/* --- Main Screen Content --- */}
      <ScrollView contentContainerStyle={styles.grid}>
        {/* Create Room tile */}
        <TouchableOpacity
          style={[styles.tile, styles.createTile]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.createTileText}>+ Create Room</Text>
        </TouchableOpacity>

        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.title}>Create or Join a Room</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter room name"
                placeholderTextColor="#64748B"
                value={roomName}
                onChangeText={setRoomName}
                autoCapitalize="none"
                keyboardAppearance="dark"
              />

              <TextInput
                style={styles.input}
                placeholder="Enter room password"
                placeholderTextColor="#64748B"
                value={roomPassword}
                onChangeText={setRoomPassword}
                secureTextEntry
                keyboardAppearance="dark"
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => handleCloseButton()}
                >
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleCreateRoomPress}
                >
                  <Text style={styles.modalConfirmText}>Create/Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Real rooms */}
        {rooms.map((room) => (
          <TouchableOpacity
            activeOpacity={1} // 1 = 100% solid (no transparency on click)
            key={room.id}
            style={styles.tile}
            onPress={() => handleRoomPress(room)}
          >
            <Text style={styles.roomName}>{room.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING,
    gap: SPACING,
    paddingBottom: 120,
  },

tile: {
  width: TILE_SIZE,
  height: TILE_SIZE,
  backgroundColor: '#0F172A', 
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 8,
  borderWidth: 1,
  // Subtle blue/cyan accent border defines the edge cleanly
  borderColor: '#244387', 
},
roomName: {
  fontSize: 15,
  fontWeight: '600',
  textAlign: 'center',
  color: '#E2E8F0',
},
createTile: {
  backgroundColor: '#0A0F1D', 
  borderWidth: 1.5,
  borderColor: '#1e6380', // Subtle cyan highlight for the create action
  borderStyle: 'dashed',
},
createTileText: {
  fontWeight: '600',
  textAlign: 'center',
  color: '#38BDF8',
},
overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    paddingTop: 150, 
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#244387',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#244387',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#0A0F1D',
    fontWeight: '700',
  },
topHeader: {
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(255, 215, 0, 0.3)', // Cyber yellow border accent
  backgroundColor: 'rgb(5, 12, 26)', // Slightly darkened backdrop
},
topHeaderText: {
  marginTop: 30,
  color: '#94A3B8',
  fontSize: 30,
  fontWeight: '700',
  letterSpacing: 2,
},
});