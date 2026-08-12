import { baseURL } from './constants';

let onUnauthorized = null;
 
function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function authFetch(url, options = {}) {
  const response = await fetch(url, options);
 
  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }
 
  return response;
}


async function login(username, password) {
  //console.log('Attempting login at:', `${baseURL}/login`);
  const response = await fetch(`${baseURL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Same generic error the server sent, whatever the failure reason
    throw new Error(data.error || 'Login failed');
  }

  return data.token;
}


async function getRooms(token) {
  const response = await authFetch(`${baseURL}/rooms`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
 
  const data = await response.json();
 
  if (!response.ok) {
    throw new Error(data.error || 'Fetching Rooms failed');
  }
 
  return data;
}

async function joinRoom(token, roomId, roomName, roomPassword) {
  const response = await authFetch(`${baseURL}/rooms/${roomId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ roomName, roomPassword}),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Joining room failed');
  }

  return data;
}


async function createRoom(roomName, roomPassword, token, icon) {
  const response = await authFetch(`${baseURL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ roomName, roomPassword, icon}),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Creating room failed');
  }

  return data;
}







async function getMessages(token, roomId) {
  const response = await authFetch(`${baseURL}/rooms/${roomId}/messages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Fetching messages failed');
  }

  return data;
}

async function sendMessage(token, roomId, ciphertext, nonce) {
  const response = await authFetch(`${baseURL}/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ ciphertext, nonce }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Sending message failed');
  }

  return data;
}
 
async function editMessage(token, messageId, ciphertext,nonce) {
  const response = await authFetch(`${baseURL}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ ciphertext, nonce }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Editing message failed');
  }

  return data;
}

async function deleteMessage(token, messageId) {
  const response = await authFetch(`${baseURL}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Deleting message failed');
  }

  return data;
}



async function getMembers(token,roomId){
  const response = await authFetch(`${baseURL}/rooms/${roomId}/members`,{
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const data = await response.json();
 
  if (!response.ok) {
    throw new Error(data.error || 'Fetching room members failed');
  }


  return data;

}


//------------------------------------------------------------------

async function updatePublicKey(token, publicKey){
  const response = await authFetch(`${baseURL}/users/me/public-key`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ publicKey }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Patching public key failed');
  }

  return data;
}

async function updateRoomMemberKey(token,roomId, memberId, encryptedRoomKey){
  const response = await authFetch(`${baseURL}/rooms/${roomId}/members/${memberId}/key`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ encryptedRoomKey }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Patching public key failed');
  }

  return data;

}


async function getPublicKey(token,userId){
  const response = await authFetch(`${baseURL}/users/${userId}/public-key`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Patching public key failed');
  }

  return data;
}





async function deleteRoom(token, roomId) {
  const response = await authFetch(`${baseURL}/rooms/${roomId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Deleting room failed');
  }

  return data;
}



//------------------------------------------------------------------

async function getRoom(token, roomId){
  const response = await authFetch(`${baseURL}/rooms/${roomId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Deleting room failed');
  }

  return data;

}

async function rotateRoomKey(token, roomId){
  const response = await authFetch(`${baseURL}/rooms/${roomId}/rotate-key`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Rotate key failed');
  }

  return data; 
}


async function getMyInfo(token) {
  const response = await authFetch(`${baseURL}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
 
  const data = await response.json();
 
  if (!response.ok) {
    throw new Error(data.error || 'Fetching user info failed');
  }
 
  return data;
}
 


 
async function updateRoomName(token, roomId, name,icon) {
  const response = await authFetch(`${baseURL}/rooms/${roomId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ name,icon}),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Updating room name failed');
  }

  return data;
}


export { 
    login, 
    getRooms, 
    joinRoom,
    createRoom,
    getMessages, 
    sendMessage, 
    editMessage, 
    deleteMessage,
    getMembers, 
    setUnauthorizedHandler, 
    updatePublicKey,
    updateRoomMemberKey,
    getPublicKey,
    deleteRoom,
    getRoom,
    rotateRoomKey,
    getMyInfo,
    updateRoomName
  }; 