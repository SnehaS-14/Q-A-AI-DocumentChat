import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import SessionHistory from './components/SessionHistory';
import { ToastContainer, useToast } from './components/Toast';
import {
  uploadDocument, sendMessage, getChatHistory, getAllSessions, deleteSession,
  logout, getCurrentUser, getUserDocuments, searchDocuments, getDocumentBySessionId,
} from './api';

function normalizeDoc(doc) {
  return { ...doc, id: doc._id };
}

export default function ChatApp() {
  const [document, setDocument] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [history, setHistory] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const { toasts, toast, removeToast } = useToast();

  useEffect(() => {
    setUser(getCurrentUser());
    const savedSessionId = localStorage.getItem('lastSessionId');
    if (savedSessionId) {
      Promise.all([loadSessions(), loadUserDocuments(), restoreSession(savedSessionId)]);
    } else {
      Promise.all([loadSessions(), loadUserDocuments()]);
    }
  }, []);

  // Auto-select document when restored session's doc becomes available in the documents list
  useEffect(() => {
    if (document && documents.length > 0 && selectedDocuments.length === 0) {
      const fullDoc = documents.find(d => d._id === document.id);
      if (fullDoc) {
        setSelectedDocuments([normalizeDoc(fullDoc)]);
      }
    }
  }, [document, documents]);

  async function restoreSession(savedSessionId) {
    try {
      const [result, doc] = await Promise.all([
        getChatHistory(savedSessionId),
        getDocumentBySessionId(savedSessionId),
      ]);
      setSessionId(savedSessionId);
      setDocument({ filename: doc.filename, charCount: doc.charCount, id: doc.id });
      setHistory(result.messages || []);
    } catch (err) {
      console.error('Error restoring session:', err);
    }
  }

  async function loadSessions() {
    try {
      const result = await getAllSessions();
      setSessions(result.documents || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  }

  async function loadUserDocuments() {
    try {
      const result = await getUserDocuments();
      setDocuments((result.documents || []).map(normalizeDoc));
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  }

  async function handleFileUpload(file) {
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadDocument(file);
      setSessionId(result.sessionId);
      localStorage.setItem('lastSessionId', result.sessionId);
      const newDoc = {
        filename: result.filename,
        text: result.text,
        charCount: result.charCount,
        size: file.size,
        type: file.type,
        id: result.documentId,
        _id: result.documentId,
      };
      setDocument(newDoc);
      setSelectedDocuments([newDoc]);
      setDocuments(prev => [newDoc, ...prev.filter(d => d._id !== result.documentId)]);
      setHistory([]);
      setShowHistory(false);
      await loadSessions();
      toast.success(`"${result.filename}" uploaded successfully!`, 'Document Ready');
    } catch (err) {
      toast.error(err.message, 'Upload Failed');
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveDocument() {
    setDocument(null);
    setSessionId(null);
    setHistory([]);
    setError(null);
    setSelectedDocuments([]);
    localStorage.removeItem('lastSessionId');
    toast.info('Document removed. Upload a new one to continue.', 'Cleared');
  }

  function handleToggleDocument(docId, isAdding) {
    if (isAdding) {
      const doc = documents.find(d => d._id === docId);
      if (doc && !selectedDocuments.find(d => d.id === docId)) {
        setSelectedDocuments(prev => [...prev, normalizeDoc(doc)]);
        toast.info(`"${doc.filename}" added to chat`, 'Document Added');
      }
    } else {
      const doc = selectedDocuments.find(d => d.id === docId);
      setSelectedDocuments(prev => prev.filter(d => d.id !== docId));
      if (doc) toast.info(`"${doc.filename}" removed from chat`, 'Document Removed');
    }
  }

  async function handleSearchDocuments(query) {
    if (query.length < 2) return;
    try {
      const result = await searchDocuments(query);
      const normalizedResults = (result.results || []).map(normalizeDoc);
      setDocuments(prev => [
        ...prev.filter(d => !normalizedResults.find(s => s._id === d._id)),
        ...normalizedResults,
      ]);
    } catch (err) {
      console.error('Search error:', err);
    }
  }

  async function handleLoadSession(session) {
    try {
      const result = await getChatHistory(session.sessionId);
      setSessionId(session.sessionId);
      localStorage.setItem('lastSessionId', session.sessionId);
      setDocument({ filename: session.filename, charCount: session.charCount, id: session._id });
      setHistory(result.messages || []);
      setError(null);
      setShowHistory(false);
      toast.success(`Loaded "${session.filename}"`, 'Session Restored');
    } catch (err) {
      toast.error(err.message, 'Failed to Load Session');
    }
  }

  async function handleDeleteSession(targetSessionId) {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSession(targetSessionId);
        await loadSessions();
        if (targetSessionId === sessionId) {
          handleRemoveDocument();
        }
        toast.success('Session deleted', 'Done');
      } catch (err) {
        toast.error(err.message, 'Delete Failed');
      }
    }
  }

  async function handleSendMessage(message) {
    if (!message.trim() || isSending || selectedDocuments.length === 0) return;

    // Store the raw message — server always injects fresh doc context itself
    setHistory(prev => [...prev, { role: 'user', content: message }]);
    setIsSending(true);
    setError(null);

    try {
      const documentTexts = selectedDocuments.map(d => ({ filename: d.filename, text: d.text }));
      const { reply } = await sendMessage(message, '', history, sessionId, selectedDocuments[0]?.id, documentTexts);
      setHistory(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      toast.error(err.message, 'Message Failed');
      setError(err.message);
      setHistory(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  }

  function handleClearChat() {
    setHistory([]);
    setError(null);
    toast.info('Chat cleared', 'New Conversation');
  }

  function handleNewChat() {
    setSessionId(null);
    setHistory([]);
    setError(null);
    toast.info('Started a new chat', 'New Chat');
  }

  function handleLogout() {
    toast.success('You have been logged out. See you soon!', 'Goodbye');
    setTimeout(() => {
      logout();
      window.location.reload();
    }, 1000);
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          document={document}
          isUploading={isUploading}
          onFileUpload={handleFileUpload}
          onRemoveDocument={handleRemoveDocument}
          onShowHistory={() => setShowHistory(!showHistory)}
          onNewChat={handleNewChat}
          user={user}
          onLogout={handleLogout}
          documents={documents}
          selectedDocuments={selectedDocuments}
          onToggleDocument={handleToggleDocument}
          onSearch={handleSearchDocuments}
        />
        {showHistory ? (
          <SessionHistory
            sessions={sessions}
            onSelectSession={handleLoadSession}
            onDeleteSession={handleDeleteSession}
            onClose={() => setShowHistory(false)}
          />
        ) : (
          <ChatArea
            selectedDocuments={selectedDocuments}
            history={history}
            isSending={isSending}
            error={error}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
          />
        )}
      </div>
    </>
  );
}
