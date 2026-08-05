import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { getMessages, sendMessage, editMessage, getMembers, deleteMessage } from '../api';
import {ensureKeypairExists, decryptRoomKey,encryptMessage,decryptMessage} from '../crypto';
import { useAuth } from '../AuthContext';
import { io } from 'socket.io-client';
import { baseURL } from '../constants';
import {SvgDiamond} from '../components';
import ScreenBackground from '../ScreenBackground';
import { useFocusEffect } from '@react-navigation/native';


const SCREEN_HEIGHT = Dimensions.get('window').height;
const BASE_LINE_HEIGHT = 20;
const MAX_BUBBLE_HEIGHT = SCREEN_HEIGHT * 0.4;
const MAX_LINES = Math.floor(MAX_BUBBLE_HEIGHT / BASE_LINE_HEIGHT);
const SCREEN_WIDTH = Dimensions.get('window').width;
const TOP_HEADER_HEIGHT = SCREEN_HEIGHT * 0.15; // 15% of total screen height


export default function ChatRoomScreen({ route, navigation }) {
  const { token, userId } = useAuth();
  const { roomId, roomName } = route.params;

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [sendError, setSendError] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [poppedScale, setPoppedScale] = useState(1);
  const [isPendingKey, setIsPendingKey] = useState(false)
  const inputRef = useRef(null);

  // Holds the full message object currently selected via long-press, or null.
  const [activeMessage, setActiveMessage] = useState(null);

  const flatListRef = useRef(null);



    const socketRef = useRef(null);
    useEffect(() => {
      const socket = io(baseURL);
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_room', roomId);
      });

      socket.on('new_message', () => {
        fetchChat();
      });

      return () => {
        socket.disconnect();
      };
    }, [roomId]);
    
  console.log("Roomid: ", roomId);
  async function fetchChat() {
    try {
      const result = await getMessages(token, roomId);

      if (!roomKeyBytes.current) {
        
        console.log('No room key available — cannot decrypt messages yet.');
        setMessages([]);
        return;
      }

      const decrypted = result.map((msg) => {
        const text = decryptMessage(msg.ciphertext, msg.nonce, roomKeyBytes.current);
        return {
          ...msg,
          text: text !== null ? text : '[Unable to decrypt this message]',
        };
      });

      setMessages(decrypted);
    } catch (err) {
      console.log('Chat fetch error:', err.message);
      Alert.alert('Chat fetch failed', 'Could not load your chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }


  async function sendMsg(message) {
    try {
      const {ciphertext,nonce} =  encryptMessage(message, roomKeyBytes.current);
      await sendMessage(token, roomId, ciphertext,nonce );
      setMsg('');
      setSendError(null);
      fetchChat();
    } catch (err) {
      console.log('Send error:', err.message);
      setSendError('Message failed to send. Check your connection and try again.');
    }
  }


  const roomKeyBytes = useRef(null);

  async function loadRoomKey() {
    try {
      const members = await getMembers(token, roomId);
      const myEntry = members.find((m) => m.id === userId);
  
      if (!myEntry || !myEntry.myEncryptedRoomKey) {
        setIsPendingKey(true);
        return;
      }
  
      const myPublicKeyB64 = await ensureKeypairExists();
      const decrypted = await decryptRoomKey(myEntry.myEncryptedRoomKey, myPublicKeyB64);
  
      roomKeyBytes.current = decrypted;
      setIsPendingKey(!decrypted); 
    } catch (err) {
      console.log('Failed to load room key:', err.message);
      setIsPendingKey(true);
    }
  }
 

useFocusEffect(
  useCallback(() => {
    async function init() {
      roomKeyBytes.current = null; // clear any stale key before reloading
      setIsPendingKey(false);
      await loadRoomKey();
      await fetchChat();
    }
    init();
  }, [token, roomId])
);
  


async function modifyMsg(messageId, message) {
  try {
    const {ciphertext,nonce} =  encryptMessage(message, roomKeyBytes.current);
    await editMessage(token, messageId, ciphertext,nonce);
    setEditingMessageId(null);
    setMsg('');
    setActiveMessage(null);
  } catch (err) {
    console.log(err.message);
    Alert.alert('Edit failed', 'Could not save your changes. Please try again.');
  } finally {
    fetchChat();
  }
}

  async function deleteMsg(messageId) {
    try {
      await deleteMessage(token, messageId);
    } catch (err) {
      //console.log('Delete error:', err.message);
      Alert.alert('Delete failed', 'Could not delete the message. Please try again.');
    } finally {
      fetchChat();
    }
  }

  function handleSendPress() {
    if (editingMessageId) {
      modifyMsg(editingMessageId, msg);
    } else {
      sendMsg(msg);
    }
  }

  function handleLongPress(item) {
    setPoppedScale(1);
    setActiveMessage(item);
  }

  function closeActionMenu() {
    setActiveMessage(null);
    setEditingMessageId(null);
    setMsg('');
  }
  function handleEditPress() {
    setEditingMessageId(activeMessage.id);
    setMsg(activeMessage.text);
    setTimeout(() => inputRef.current?.focus(), 50);
  }


  async function handleSaveEdit() {
    await modifyMsg(activeMessage.id, msg);
    closeActionMenu(); 
  }

  function handleCancelEdit() {
    setEditingMessageId(null);
    setMsg('');
    // back to showing the Edit/Delete menu, modal stays open
  }

  function handleDeletePress() {
    deleteMsg(activeMessage.id);
    closeActionMenu();
  }


  function handlePoppedLayout(event) {
  const { height } = event.nativeEvent.layout;
  const screenHeight = Dimensions.get('window').height;
  const maxAllowedHeight = screenHeight * 0.5;
 
  if (height > maxAllowedHeight) {
    const scale = Math.max(maxAllowedHeight / height, 0.75);
    setPoppedScale(scale);
  } else {
    setPoppedScale(1);
  }
}

  function parseServerDate(sentAt) {
    const isoString = sentAt.replace(' ', 'T') + 'Z';
    return new Date(isoString);
  }

  function formatTime(sentAt) {
    return parseServerDate(sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function formatDateHeader(sentAt) {
    return parseServerDate(sentAt).toLocaleDateString([], { month: '2-digit', day: '2-digit', year: '2-digit' });
  }

  function buildListWithDateSeparators(msgs) {
    const result = [];
    let lastDateKey = null;

    for (const m of msgs) {
      const dateKey = formatDateHeader(m.sentAt);
      if (dateKey !== lastDateKey) {
        result.push({ type: 'date', id: `date-${dateKey}`, label: dateKey });
        lastDateKey = dateKey;
      }
      result.push({ type: 'message', ...m });
    }

    return result;
  }

function renderBubbleContent(item, isMine, fontScale = 1) {
  const textStyle = fontScale !== 1 ? { fontSize: 16 * fontScale } : null;

  return (
    <View>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[isMine ? styles.textMine : styles.textTheirs, styles.messageText, textStyle]}>
          {item.text}
        </Text>
      </View>

      <View style={[styles.metaRow, isMine ? styles.metaRowMine : styles.metaRowTheirs]}>
        {item.editedAt && (
          <Text style={styles.editedLabel}>Edited</Text>
        )}
        <Text style={styles.timestamp}>{formatTime(item.sentAt)}</Text>
      </View>
    </View>
  );
}

 
  function renderMessage({ item }) {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{item.label}</Text>
        </View>
      );
    }

    const isMine = item.senderId === userId;

    return (
      <View style={[styles.bubbleRow, isMine ? styles.rowMine : styles.rowTheirs]}>
        <View style={styles.bubbleColumn}>
          {!isMine && <Text style={styles.senderName}>{item.senderUsername}</Text>}

          <TouchableOpacity
            activeOpacity={isMine ? 0.7 : 1}
            onLongPress={() => isMine && handleLongPress(item)}
          >
            {renderBubbleContent(item, isMine)}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <ScreenBackground style={styles.centered}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </ScreenBackground>
    );
  }

  if (isPendingKey) {
  return (
    <ScreenBackground>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{roomName}</Text>
      </View>

      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
        <Text style={styles.pendingTitle}>Waiting for access</Text>
        <Text style={styles.pendingSubtitle}>
          Ask an existing member to invite you from the Room Info screen.
        </Text>
      </View>
    </ScreenBackground>
  );
}

  const activeIsMine = activeMessage && activeMessage.senderId === userId;

  function handleRoomInfoPress(roomId, roomName){
    navigation.navigate('RoomInfo', { roomId: roomId, roomName: roomName });
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <Text
          style={styles.headerTitle}
          onPress={() => handleRoomInfoPress(roomId,roomName)}
        >
          {roomName}
        </Text>
      </View>


        <FlatList
          ref={flatListRef}
          style={styles.messagesArea}
          data={buildListWithDateSeparators(messages)}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />



        {activeMessage !== null && (
          <TouchableWithoutFeedback onPress={closeActionMenu}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.bubbleColumn} onLayout={handlePoppedLayout}>
                  {renderBubbleContent(activeMessage, activeIsMine, poppedScale)}

                    {!editingMessageId && (
                      <View style={styles.actionMenu}>
                        <TouchableOpacity style={styles.actionRow} onPress={handleEditPress}>
                          <Text style={styles.actionRowText}>Edit</Text>
                          <Ionicons name="pencil-outline" size={18} color="#38BDF8" />
                        </TouchableOpacity>
                        <View style={styles.actionDivider} />
                        <TouchableOpacity style={styles.actionRow} onPress={handleDeletePress}>
                          <Text style={[styles.actionRowText, styles.deleteText]}>Delete</Text>
                          <Ionicons name="trash-outline" size={18} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    )}

                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}


        {sendError && <Text style={styles.sendErrorText}>{sendError}</Text>}
        <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              value={msg}
              onChangeText={setMsg}
              maxLength={400}
              keyboardAppearance="dark"
              onBlur={() => {
                if (editingMessageId) {
                  closeActionMenu();
                }
              }}
            />
          
          <Pressable 
          onPress={handleSendPress}
          style={{
            paddingHorizontal: 10,
            borderRadius: 9999,
          }}
          >
            <Ionicons
              name={editingMessageId ? "checkmark" : "send"}
              size={24}
              color="#007AFF"
              
            />
          </Pressable>
        </View>


      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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

backButtonText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 16,
},
  messagesArea: { flex: 1, paddingHorizontal: 12 },

  bubbleRow: { flexDirection: 'row', marginVertical: 4 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },

  bubbleColumn: {
    maxWidth: '70%',
  },

  bubble: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageText: {
    flexShrink: 1,
    flexWrap: 'wrap',
  },

  bubbleMine: { backgroundColor: '#007AFF' },
  bubbleTheirs: { backgroundColor: '#e5e5ea' },
  textMine: { color: '#fff', fontSize: 16 },
  textTheirs: { color: '#000', fontSize: 16 },

  inputBar: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.3)', // Cyber yellow border accent
    backgroundColor: 'rgb(5, 12, 26)', // Slightly darkened backdrop

  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    color: '#fff', 
    fontSize:17
  },

  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  

  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
    marginLeft: 8,
  },

metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaRowMine: {
    justifyContent: 'flex-end',
  },
  metaRowTheirs: {
    justifyContent: 'flex-start',
  },
editedLabel: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#94A3B8',
    marginRight: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
    marginLeft: 8,
  },

  // --- Modal / long-press menu ---
overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '50%', // consistently a bit above true vertical center
    paddingHorizontal: 24,
  },
  overlayCentered: {
    justifyContent: 'center',
  },
  overlayEditing: {
    justifyContent: 'flex-start',
    paddingTop: 100,
  },

actionMenu: {
    width: 220,
    backgroundColor: '#0F172A', // matches your tile background
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#244387', // matches your tile border accent
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionRowText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E2E8F0', // matches your tile text color
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  deleteText: {
    color: '#FF453A',
  },
sendErrorText: {
  color: '#FF3B30',
  fontSize: 13,
  fontWeight: "700" ,
  textAlign: 'center',
  paddingVertical: 4,
},

pendingTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#E2E8F0',
  marginTop: 16,
},
pendingSubtitle: {
  fontSize: 14,
  color: '#94A3B8',
  textAlign: 'center',
  marginTop: 8,
  paddingHorizontal: 32,
},

});