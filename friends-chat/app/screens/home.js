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
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { baseURL } from '../constants';
import {SvgDiamond,MeanderDivider} from '../components';
import { useAuth } from '../AuthContext';
import { getRooms, joinRoom,createRoom,updateRoomMemberKey } from '../api';
import { generateRoomKey, encryptRoomKeyForMember, ensureKeypairExists } from '../crypto';
import ScreenBackground from '../ScreenBackground';
import { COLORS} from '../Theme';



const Stack = createNativeStackNavigator();

// Grid math: 2 columns, fixed spacing between/around tiles
const NUM_COLUMNS = 3;
const SPACING = 15;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_SIZE = (SCREEN_WIDTH - SPACING * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
const GRID_SIZE = 40; 

const SCREEN_HEIGHT = Dimensions.get('window').height;
const TOP_HEADER_HEIGHT = SCREEN_HEIGHT * 0.14; // 15% of total screen height

const ICON_OPTIONS = [
  // General
  'chatbubbles-outline',
  'people-outline',
  'megaphone-outline',

  // Interests / hobbies
  'game-controller-outline',
  'musical-notes-outline',
  'film-outline',
  'book-outline',
  'football-outline',
  'basketball-outline',

  // Technology
  'code-slash-outline',
  'laptop-outline',
  'hardware-chip-outline',

  // School / learning
  'school-outline',
  'library-outline',
  'flask-outline',

  // Lifestyle
  'restaurant-outline',
  'fitness-outline',
  'airplane-outline',
  'car-outline',

  // Social / trending
  'flame-outline',
  'heart-outline',
  'star-outline',
  'sparkles-outline',
  'planet-outline',
];

export default function HomeScreen({ navigation }) {
  const { token,userId } = useAuth();
  
  const [modalTab, setModalTab] = useState('create')
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);


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
 
  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [token])
  );
 

  function handleCloseButton(){
    setRoomName('');
    setRoomPassword('')

    setModalVisible(false);
  }

// Add near your other state:
const [joinRoomId, setJoinRoomId] = useState('');

async function handleCreateRoomPress() {
  try {
    const result = await createRoom(roomName, roomPassword, token, selectedIcon);
    await fetchRooms();


    const roomKeyBytes = generateRoomKey();
    const myPublicKeyB64 = await ensureKeypairExists();
    const encryptedForSelf = await encryptRoomKeyForMember(roomKeyBytes, myPublicKeyB64);
    await updateRoomMemberKey(token, result.id, userId, encryptedForSelf);
  } catch (error) {
    Alert.alert('Room Create failed', error.message || 'Could not create new room.');
  } finally {
    setModalVisible(false);
    setRoomName('');
    setRoomPassword('');
    setSelectedIcon(ICON_OPTIONS[0]);
  }
}

async function handleJoinRoomPress() {

  if (!joinRoomId.trim() || !roomName.trim() || !roomPassword.trim()) {
    Alert.alert('Missing info', 'Please fill out room ID, name, and password.');
    return;
  }
  
  try {
    await joinRoom(token, joinRoomId, roomName, roomPassword);
    await fetchRooms();
    // Note: no key-resolution here — joining always lands as pending,
    // per your existing design. An existing member must Invite you.
  } catch (error) {
    Alert.alert('Join failed', error.message || 'Could not join the room.');
  } finally {
    setModalVisible(false);
    setRoomName('');
    setRoomPassword('');
    setJoinRoomId('');
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
        <View style={styles.headerArea}>
          <Text style={styles.topHeaderText}>Agora Rooms</Text>
          <Ionicons
            name="chatbubbles-outline"
            size={24}
            color="#2F5D68"
          />
        </View>
      </View>


      <MeanderDivider width={SCREEN_WIDTH - 25} />

      {/* --- Main Screen Content --- */}
      <ScrollView contentContainerStyle={styles.grid}>
        {/* Create Room tile */}
        <TouchableOpacity
          style={[styles.tile, styles.createTile]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.createTileText}>Create Room</Text>
        </TouchableOpacity>

        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >

          <View style={styles.overlay}>
            <View style={styles.modalContainer}>

              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tabButton, modalTab === 'create' && styles.tabButtonActive]}
                  onPress={() => setModalTab('create')}
                >
                  <Text style={[styles.tabButtonText, modalTab === 'create' && styles.tabButtonTextActive]}>
                    Create
                  </Text>
                </TouchableOpacity>
              
                <TouchableOpacity
                  style={[styles.tabButton, modalTab === 'join' && styles.tabButtonActive]}
                  onPress={() => setModalTab('join')}
                >
                  <Text style={[styles.tabButtonText, modalTab === 'join' && styles.tabButtonTextActive]}>
                    Join
                  </Text>
                </TouchableOpacity>
              </View>

              {modalTab ==='create' ?(
                  <View>
                    <Text style={styles.modaltitle}></Text>

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


                    <Text style={styles.iconPickerLabel}>Choose an icon</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.iconPickerRow}
                    >
                      {ICON_OPTIONS.map((iconName) => (
                        <TouchableOpacity
                          key={iconName}
                          style={[
                            styles.iconOption,
                            selectedIcon === iconName && styles.iconOptionSelected,
                          ]}
                          onPress={() => setSelectedIcon(iconName)}
                        >
                          <Ionicons
                            name={iconName}
                            size={22}
                            color={selectedIcon === iconName ? COLORS.createTileText : COLORS.tileText}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>


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
                        <Text style={styles.modalConfirmText}>Create</Text>
                      </TouchableOpacity>
                    </View>

                    
                  </View>

              ):(
                  <View>
                    <Text style={styles.modaltitle}></Text>

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

                    <TextInput
                      style={styles.input}
                      placeholder="Enter room ID"
                      placeholderTextColor="#64748B"
                      value={joinRoomId}
                      onChangeText={setJoinRoomId}
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
                        onPress={handleJoinRoomPress}
                      >
                        <Text style={styles.modalConfirmText}>Join</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
            </View>
          </View>
        </Modal>

        {/* Real rooms */}
        {rooms.map((room) => (

          <TouchableOpacity
            activeOpacity={1}
            key={room.id}
            style={[styles.tile, { width: TILE_SIZE, height: TILE_SIZE }]}
            onPress={() => handleRoomPress(room)}
          >

            <SvgDiamond size={80} color="#2F5D68">
              <Ionicons 
              name={room.icon || 'chatbubbles-outline'}
              size={40} 
              color={COLORS.backgroundColorOne}
              style={styles.tileIcon}
              />
            </SvgDiamond>

            <Text style={styles.roomName}>
              {room.name.length > 10? `${room.name.slice(0, 10)}...` : room.name}
            </Text>
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
  backgroundColor: COLORS.tileBackground, 
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 8,
  borderWidth: 1,
  // Subtle blue/cyan accent border defines the edge cleanly
  borderColor: COLORS.tileBorder
},
roomName: {
  fontSize: 15,
  fontWeight: '600',
  textAlign: 'center',
  color: COLORS.tileText,
},
createTile: {
  backgroundColor: COLORS.createTileBackground,
  borderWidth: 2,
  borderColor: COLORS.createTileBorder,
  borderStyle: 'dashed',
},
createTileText: {
  fontWeight: '600',
  textAlign: 'center',
  color: COLORS.createTileText,
},
overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    paddingTop: 100, 
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor:COLORS.createTileModal,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#244387',
    maxHeight:'65%'
  },

    tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.tileBackground,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.tileBorder,
    marginBottom:0
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.createTileBackground,
  },
  tabButtonText: {
    color: '#8A8780',
    fontWeight: '600',
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: COLORS.createTileText,
  },
  
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E2E8F0',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: COLORS.headerText,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.headerText,
  },
  modaltitle: {
    color: COLORS.headerText,
    marginBottom: 10,
    textAlign: 'center',
  },

  iconPickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8780',
    marginBottom: 8,
  },
  iconPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.tileBorder,
    backgroundColor: COLORS.tileBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOptionSelected: {
    backgroundColor: COLORS.createTileBackground,
    borderColor: COLORS.createTileBackground,
  },
  tileIcon: {
    marginBottom: 6,
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
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
  },
  modalCancelText: {
    color:  '#000000',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.headerButton,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: COLORS.backgroundColorOne,
    fontWeight: '700',
  },
topHeader: {
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20,
  backgroundColor: COLORS.headerBackground // Slightly darkened backdrop
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