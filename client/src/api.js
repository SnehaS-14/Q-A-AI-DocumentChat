const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getAuthHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// --- Auth Functions ---
export async function signup(username, email, password) {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Signup failed');
  }

  const data = await res.json();
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }

  const data = await res.json();
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function googleAuth(credential) {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Google sign-in failed');
  }

  const data = await res.json();
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

export function getAuthToken() {
  return localStorage.getItem('authToken');
}

export function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }

  return res.json();
}

export async function sendMessage(message, documentText, history, sessionId, documentId, documentTexts = []) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ message, documentText, documentTexts, history, sessionId, documentId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Chat request failed');
  }

  return res.json();
}

export async function getChatHistory(sessionId) {
  const res = await fetch(`${API_URL}/api/chat-history/${sessionId}`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch history');
  }

  return res.json();
}

export async function getAllSessions() {
  const res = await fetch(`${API_URL}/api/all-sessions`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch sessions');
  }

  return res.json();
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${API_URL}/api/session/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete session');
  }

  return res.json();
}

// --- Multi-Document Chat Functions ---
export async function createChatSession(name = 'New Chat') {
  const res = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create session');
  }

  return res.json();
}

export async function getChatSessions() {
  const res = await fetch(`${API_URL}/api/sessions`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch sessions');
  }

  return res.json();
}

export async function addDocumentToSession(sessionId, documentId) {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ documentId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add document');
  }

  return res.json();
}

export async function removeDocumentFromSession(sessionId, documentId) {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to remove document');
  }

  return res.json();
}

export async function searchDocuments(query) {
  const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to search documents');
  }

  return res.json();
}

export async function getUserDocuments() {
  const res = await fetch(`${API_URL}/api/user-documents`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch documents');
  }

  return res.json();
}

export async function getDocumentBySessionId(sessionId) {
  const res = await fetch(`${API_URL}/api/documents/${sessionId}`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch document');
  }

  return res.json();
}
