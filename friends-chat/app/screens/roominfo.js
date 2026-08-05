
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
import { SvgDiamond } from '../components';
import ScreenBackground from '../ScreenBackground';
import { useAuth } from '../AuthContext';


import { getMembers ,updateRoomMemberKey,getPublicKey, deleteRoom,getRoom,rotateRoomKey} from '../api';
import { decryptRoomKey, encryptRoomKeyForMember, ensureKeypairExists, generateRoomKey} from '../crypto';


const SCREEN_HEIGHT_RI = require('react-native').Dimensions.get('window').height;
const TOP_SECTION_HEIGHT = SCREEN_HEIGHT_RI * 0.45; // 35% of screen

export default function RoomInfoScreen({ route, navigation }) {
  //console.log("route received in RoomInfoScreen:", route);
  //console.log("route.params specifically:", route?.params);
   const { roomId, roomName } = route.params;
   const { token, userId } = useAuth();

    const [members,setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [createdBy, setCreatedBy] = useState(null);
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
        console.log('Room details fetched:', JSON.stringify(room));
        setCreatedBy(room.createdBy);
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
          onPress: confirmDeleteRoom,
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
        <View style={styles.memberRow}>
        <Text style={styles.memberName}>{item.username}</Text>
    
        {item.isPending && (
            <View style={styles.memberRight}>
            <Text style={styles.pendingBadge}>Pending Invite</Text>
    
            {!currentUserIsPending && (
                <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => handleInvitePress(item)}
                >
                <Text style={styles.inviteButtonText}>Accept User</Text>
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
                <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>   
            </View>
            
            <View style={styles.roomHeader}>
                <SvgDiamond size={140} color="#00ffff" />
                <Text style={styles.headerText}>{roomName}</Text>
            </View>
            </View>
            

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
  content:{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomHeader:{
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,

    borderBottomWidth: 5,
    borderBottomColor:'#ffff'
    //borderBottomColor: 'rgba(255, 215, 0, 0.3)' // gold
  },
 headerText: {
    justifyContent:'center',
    alignItems:'center',
    marginTop: 30,
    color: '#ffffff',
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)', // Cyber yellow border accent
    backgroundColor: 'rgb(5, 12, 26)', // Slightly darkened backdrop

  },
  headerTitle: { 
    color: '#94A3B8',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,

   },
  backButton: {
  backgroundColor: "#007AFF", // blue
  paddingVertical: 5,
  paddingHorizontal: 15,
  borderRadius: 9999, // pill shape
  justifyContent: "center",
  alignItems: "center",
},
  deleteButton: {
  backgroundColor: "#ff0000", // blue
  paddingVertical: 5,
  paddingHorizontal: 15,
  borderRadius: 9999, // pill shape
  justifyContent: "center",
  alignItems: "center",
},

backButtonText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 16,
},
deleteButtonText: {
  color: "#000000",
  fontWeight: "600",
  fontSize: 16,
},
deleteRoomButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 20,
  marginHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#FF453A',
},
deleteRoomButtonText: {
  color: '#FF453A',
  fontWeight: '700',
  marginLeft: 8,
},
membersArea: {
  flex: 1,
},

memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingBadge: {
    fontSize: 12,
    color: '#F59E0B',
    marginRight: 10,
  },
  inviteButton: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#0A0F1D',
    fontWeight: '700',
    fontSize: 13,
  },


  rotateKeyButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 12,
  marginHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#F59E0B',
},
rotateKeyButtonText: {
  color: '#F59E0B',
  fontWeight: '700',
  marginLeft: 8,
},

tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#244387',
  },
  tabButtonText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: '#E2E8F0',
  },
  settingsArea: {
    flex: 1,
    paddingTop: 8,
  },


})
