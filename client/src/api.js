const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Estimate tokens (rough: ~1 token per 4 characters)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Smart document truncation to fit within API limits
function optimizeDocumentText(text, maxTokens = 5000) {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }

  // Try to truncate at sentence boundary
  let truncated = text.substring(0, maxChars);
  const lastSentence = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (lastSentence > maxChars * 0.8) {
    return truncated.substring(0, lastSentence + 1);
  }
  return truncated + '...';
}

// Extract key sections for better context
function extractKeyContent(text, query) {
  const lines = text.split('\n').filter(l => l.trim());
  const queryWords = query.toLowerCase().split(' ');

  // Find lines matching query keywords
  const relevantLines = lines.filter(line => {
    const lineLower = line.toLowerCase();
    return queryWords.some(word => lineLower.includes(word));
  });

  // If no matches, return the beginning of the document
  if (relevantLines.length === 0) {
    return lines.slice(0, 50).join('\n');
  }

  // Return relevant lines with context
  return relevantLines.slice(0, 30).join('\n');
}

export function getAuthHeader() {
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
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch (e) {
    // Clear corrupted localStorage data
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    return null;
  }
}

export async function getAvailableModels() {
  const res = await fetch(`${API_URL}/api/models`);
  if (!res.ok) {
    throw new Error('Failed to fetch models');
  }
  return res.json();
}

export function getSelectedModel() {
  return localStorage.getItem('selectedModel') || null;
}

export function setSelectedModel(model) {
  localStorage.setItem('selectedModel', model);
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

export async function sendMessage(message, documentText, history, sessionId, documentId, documentTexts = [], model = null) {
  // Optimize document texts to avoid token limit issues
  let optimizedTexts = documentTexts.map(doc => ({
    ...doc,
    // First try to extract relevant content
    text: extractKeyContent(doc.text, message),
  })).map(doc => ({
    ...doc,
    // Then optimize if still too large
    text: optimizeDocumentText(doc.text, 4000),
  }));

  // Also optimize single document if provided
  let optimizedText = documentText;
  if (documentText) {
    optimizedText = extractKeyContent(documentText, message);
    optimizedText = optimizeDocumentText(optimizedText, 4000);
  }

  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({
      message,
      documentText: optimizedText,
      documentTexts: optimizedTexts,
      history,
      sessionId,
      documentId,
      model,
    }),
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

export async function downloadDocument(sessionId, view = false) {
  const res = await fetch(`${API_URL}/api/document/file/${sessionId}`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) throw new Error('Failed to fetch document');

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="(.+)"/)?.[1] || 'document';
  const url = URL.createObjectURL(blob);

  if (view) {
    window.open(url, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
