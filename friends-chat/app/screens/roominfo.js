
import React, { useState, useEffect, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  Text,
  Button,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { baseURL } from '../constants';
import {SvgDiamond, MeanderDivider} from '../components';
import ScreenBackground from '../ScreenBackground';
import { useAuth } from '../AuthContext';
import { COLORS} from '../Theme';


import { getMembers ,updateRoomMemberKey,getPublicKey, deleteRoom,getRoom,rotateRoomKey} from '../api';
import { decryptRoomKey, encryptRoomKeyForMember, ensureKeypairExists, generateRoomKey} from '../crypto';


const SCREEN_HEIGHT_RI = require('react-native').Dimensions.get('window').height;
const TOP_SECTION_HEIGHT = SCREEN_HEIGHT_RI * 0.45; // 35% of screen
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function RoomInfoScreen({ route, navigation }) {
  //console.log("route received in RoomInfoScreen:", route);
  //console.log("route.params specifically:", route?.params);
   const { roomId, roomName } = route.params;
   const { token, userId } = useAuth();
   

    const [members,setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [createdBy, setCreatedBy] = useState(null);
    const [roomIcon, setRoomIcon] = useState('chatbubbles-outline');
    const [activeTab, setActiveTab] = useState('members'); // 'members' | 'settings'
    const isCreator = createdBy === userId;

    
    const currentUserEntry = members.find((m) => m.id === userId);
    const currentUserIsPending = currentUserEntry ? currentUserEntry.isPending : true;

      const flatListRef = useRef(null);


    async function fetchMembers(){
     console.log('getMembers called with token:', !!token, 'roomId:', roomId);
        try{

            const result = await getMembers(token, roomId);
            console.log('Members fetched:', JSON.stringify(result));
            setMembers(result)

        }catch(error){
            console.log("Error")
            console.log(error.message);
        }finally{
            setIsLoading(false);
        }

    }

 
    async function fetchRoomDetails() {
      try {
        const room = await getRoom(token, roomId);
        setCreatedBy(room.createdBy);
        setRoomIcon(room.icon || 'chatbubbles-outline');
      } catch (err) {
        console.log('Failed to fetch room details:', err.message);
      }
    }

    useEffect(()=>{
        fetchMembers();
        fetchRoomDetails();
    },[token,roomId]);





    async function handleInvitePress(member) {
    try {
        // 1. Get my own public key (used as the "sender" when decrypting my
        //    own stored key, since I encrypted it for myself originally).
        const myPublicKeyB64 = await ensureKeypairExists();

        // 2. Decrypt MY OWN room key using my own public/private key pair.
        const roomKeyBytes = await decryptRoomKey(
        currentUserEntry.myEncryptedRoomKey,
        myPublicKeyB64
        );

        if (!roomKeyBytes) {
        Alert.alert('Accept failed', 'Could not unlock your own room key.');
        return;
        }



        const memberPublicKey = await getPublicKey(token,member.id);
        const encryptedForThem = await encryptRoomKeyForMember(roomKeyBytes, memberPublicKey.publicKey);

        await updateRoomMemberKey(token, roomId, member.id, encryptedForThem);

        await fetchMembers(); // refresh so their "Pending" badge disappears
    } catch (err) {
        //console.log('Invite error:', err.message);
        Alert.alert('Accept failed', 'Could not send the room key. Please try again.');
    }
    }


  function handleDeleteRoomPress() {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${roomName}"? This will permanently delete all messages and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteRoom
        },
      ]
    );
  }
  
function handleRotateKeyPress() {
  Alert.alert(
    'Rotate Room Key',
    'This will permanently delete all messages in this room and generate a new key. This cannot be undone. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Rotate', style: 'destructive', onPress: confirmRotateKey },
    ]
  );
}
async function confirmDeleteRoom() {
  try {
    await deleteRoom(token, roomId);
    navigation.navigate('MainTabs'); // back to Home, since this room no longer exists
  } catch (err) {
    Alert.alert('Delete failed', 'Could not delete the room. Please try again.');
  }
}

async function confirmRotateKey() {
  try {
    await rotateRoomKey(token, roomId);

    const newRoomKeyBytes = generateRoomKey();
    const myPublicKeyB64 = await ensureKeypairExists();
    const encryptedForSelf = await encryptRoomKeyForMember(newRoomKeyBytes, myPublicKeyB64);
    await updateRoomMemberKey(token, roomId, userId, encryptedForSelf);
 
    await fetchMembers(); // refresh so everyone shows pending except me
    Alert.alert('Room key rotated', 'Invite members again to give them access.');
  } catch (err) {
    Alert.alert('Rotation failed', 'Could not rotate the room key. Please try again.');
  }
}



    if (isLoading) {
    return (
        <ScreenBackground style={styles.centered}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading room info...</Text>
        </ScreenBackground>
    );
    }


  function renderMembers({ item }) {
    return (
      <View style={styles.memberCard}>
        <View style={styles.memberAvatarCircle}>
          <Ionicons name="person" size={20} color={COLORS.createTileBackground} />
        </View>

        <Text style={styles.memberName}>{item.username}</Text>

        {item.isPending && (
          <View style={styles.memberRight}>
            <Text style={styles.pendingBadge}>Pending</Text>

            {!currentUserIsPending && (
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => handleInvitePress(item)}
              >
                <Text style={styles.inviteButtonText}>Accept</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }
 




    return(
        <ScreenBackground>


            <View style={[styles.topSection, { height: TOP_SECTION_HEIGHT }]}>
              <View style={styles.header}>
                  <Pressable onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={30} color="#2F5D68" />
                  </Pressable>   
              </View>
              <MeanderDivider width={SCREEN_WIDTH - 0} />
            
              <View style={styles.roomHeader}>
                  <SvgDiamond size={140} color="#2F5D68">
                    <Ionicons name={roomIcon} size={64} color="#ffffff" />
                  </SvgDiamond>
                  <Text style={styles.headerText}>
                    {roomName.length > 20 ? `${roomName.slice(0, 20)}...` : roomName}
                  </Text>
              </View>
            </View>
            <MeanderDivider width={SCREEN_WIDTH - 0} />

            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'members' && styles.tabButtonActive]}
                onPress={() => setActiveTab('members')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'members' && styles.tabButtonTextActive]}>
                  Members
                </Text>
              </TouchableOpacity>
            
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
                onPress={() => setActiveTab('settings')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'settings' && styles.tabButtonTextActive]}>
                  Advanced
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'members' ? (
              <FlatList
                ref={flatListRef}
                style={styles.membersArea}
                data={members}
                renderItem={renderMembers}
                keyExtractor={(item) => item.id.toString()}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
              />
            ) : (
              <View style={styles.settingsArea}>
                {!currentUserIsPending && (
                  <TouchableOpacity style={styles.rotateKeyButton} onPress={handleRotateKeyPress}>
                    <Ionicons name="refresh-outline" size={18} color="#F59E0B" />
                    <Text style={styles.rotateKeyButtonText}>Rotate Key</Text>
                  </TouchableOpacity>
                )}
            
                {isCreator && (
                  <TouchableOpacity style={styles.deleteRoomButton} onPress={handleDeleteRoomPress}>
                    <Ionicons name="trash-outline" size={18} color="#FF453A" />
                    <Text style={styles.deleteRoomButtonText}>Delete Room</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

        </ScreenBackground>
    );


}



const styles = StyleSheet.create({
  topSection: {
    width: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomHeader: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerText: {
    marginTop: 30,
    color: COLORS.headerTitle,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 2,
  },
  header: {
    height: 100,
    paddingTop: 35,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.headerBackground,
  },
  headerTitle: {
    color: COLORS.headerText,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  backButton: {
    backgroundColor: COLORS.headerButton,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  deleteRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D64545',
    backgroundColor: 'rgba(214, 69, 69, 0.37)',
    width: '50%'
  },
  deleteRoomButtonText: {
    color: '#D64545',
    fontWeight: '700',
    marginLeft: 8,
  },

  membersArea: {
    flex: 1,
  },memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tileBackground,
    borderWidth: 1,
    borderColor: COLORS.tileBorder,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  memberAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(47,93,104,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.tileText,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingBadge: {
    fontSize: 12,
    color: '#B8860B',
    marginRight: 10,
  },
  inviteButton: {
    backgroundColor: COLORS.createTileBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: COLORS.createTileText,
    fontWeight: '700',
    fontSize: 13,
  },

  rotateKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B8860B',
    backgroundColor: 'rgba(184, 135, 11, 0.31)',
    width: '50%'
  },
  rotateKeyButtonText: {
    color: '#B8860B',
    fontWeight: '700',
    marginLeft: 8,
  },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: COLORS.tileBackground,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.tileBorder,
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

settingsArea: {
  flex: 1,
  justifyContent: 'flex-start',
  alignItems: 'center',
  paddingTop: 16,
  gap: 12,
},
});
