import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Groq from 'groq-sdk';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { createRequire } from 'module';
import mammoth from 'mammoth';
import User from './models/User.js';
import Document from './models/Document.js';
import ChatMessage from './models/ChatMessage.js';
import ChatSession from './models/ChatSession.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from './middleware/auth.js';

import os from 'os';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Use env-configured path, falling back to system temp dir (works on any OS / Render)
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(os.tmpdir(), 'chatbot-uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// --- Groq Client ---
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// --- OpenRouter Configuration ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Available models with their IDs
const AVAILABLE_MODELS = {
  'groq-llama-3.1-8b': { name: 'Groq: Llama 3.1 8B (Fast)', provider: 'groq', id: 'llama-3.1-8b-instant' },
  'groq-llama-3.2-11b': { name: 'Groq: Llama 3.2 11B (Balanced)', provider: 'groq', id: 'llama-3.2-11b-vision-preview' },
  'openrouter-claude-3.5-sonnet': { name: 'OpenRouter: Claude 3.5 Sonnet', provider: 'openrouter', id: 'anthropic/claude-3.5-sonnet' },
  'openrouter-gpt-4-turbo': { name: 'OpenRouter: GPT-4 Turbo', provider: 'openrouter', id: 'openai/gpt-4-turbo' },
  'openrouter-llama-3.1-405b': { name: 'OpenRouter: Llama 3.1 405B', provider: 'openrouter', id: 'meta-llama/llama-3.1-405b-instruct' },
};

// Default model (use fast model for better availability)
const DEFAULT_MODEL = 'groq-llama-3.1-8b';

// --- Google OAuth Client ---
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- Middleware ---
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// --- Multer: in-memory storage, 100MB limit, PDF/DOCX/DOC only ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    const allowedExts = /\.(pdf|docx|doc)$/i;
    if (allowed.includes(file.mimetype) || allowedExts.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and DOC files are allowed'), false);
    }
  },
});

// --- Helper: Optimize text for token limits ---
function optimizeDocumentText(text, maxChars = 20000) {
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

// --- System Prompt ---
const SYSTEM_PROMPT = `You are a document assistant. Your job is to read uploaded documents (PDF or Word) and answer the user's questions based on the content of those documents.

## Answering questions
When the user asks a question:
- Answer ONLY using information found in the uploaded document(s).
- If the answer is present, give a clear and direct response and mention which section or part of the document it came from (e.g., "According to Section 3 of the document...").
- If the document contains partial information, share what is available and clearly note what is missing.
- If the answer is NOT in the document, respond with: "I couldn't find information about that in the uploaded document."

## Formatting rules
- Keep answers concise and readable.
- Use bullet points or numbered lists when listing multiple items from the document.
- For long answers, summarize first, then provide detail below.
- Never make up or assume information not present in the document.

## Tone
Be helpful, clear, and professional.`;

// --- POST /api/auth/signup ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- POST /api/auth/login ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate token
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- POST /api/auth/google ---
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ googleId });
    if (!user) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (existingUser.password) {
          return res.status(409).json({
            error: 'This email is already registered with a password. Please login with your username and password instead.',
          });
        }
        // Email exists but no password — link Google account
        existingUser.googleId = googleId;
        existingUser.avatarUrl = picture;
        await existingUser.save();
        user = existingUser;
      } else {
        const username = name.replace(/\s+/g, '').toLowerCase() + '_' + googleId.slice(-4);
        user = new User({ username, email, googleId, authProvider: 'google', avatarUrl: picture });
        await user.save();
      }
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

// --- GET /api/auth/profile ---
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- POST /api/sessions (create new chat session) ---
app.post('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const { name = 'New Chat' } = req.body;
    const session = new ChatSession({
      userId: req.user.id,
      name,
      documentIds: [],
    });
    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/sessions (list all user sessions) ---
app.get('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user.id })
      .populate('documentIds', 'filename charCount')
      .sort({ updatedAt: -1 });
    res.json({ sessions });
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- POST /api/sessions/:sessionId/documents (add document to session) ---
app.post('/api/sessions/:sessionId/documents', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.body;
    const session = await ChatSession.findOne({ _id: req.params.sessionId, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (!session.documentIds.includes(documentId)) {
      session.documentIds.push(documentId);
      await session.save();
    }
    res.json(session);
  } catch (err) {
    console.error('Add document error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- DELETE /api/sessions/:sessionId/documents/:documentId ---
app.delete('/api/sessions/:sessionId/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.sessionId, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    session.documentIds = session.documentIds.filter(id => id.toString() !== req.params.documentId);
    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Remove document error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/search ---
app.get('/api/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query too short' });
    }
    const results = await Document.find(
      { userId: req.user.id, filename: { $regex: q, $options: 'i' } },
      { filename: 1, charCount: 1, uploadedAt: 1, sessionId: 1, filePath: 1 }
    ).limit(10);
    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/models ---
app.get('/api/models', (req, res) => {
  const models = Object.entries(AVAILABLE_MODELS).map(([key, model]) => ({
    id: key,
    name: model.name,
    provider: model.provider,
    available: model.provider === 'groq' || !!OPENROUTER_API_KEY,
  }));
  res.json({ models, default: DEFAULT_MODEL });
});

// --- GET /api/health ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- POST /api/upload ---
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = req.file;
    let text = '';

    if (mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      text = data.text;
    } else {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    text = text.trim();

    // Create a new session for this document upload
    const sessionId = uuidv4();

    // Save file to D drive
    const fileExt = path.extname(originalname);
    const fileName = `${sessionId}${fileExt}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    // Save document to MongoDB
    const doc = new Document({
      userId: req.user.id,
      filename: originalname,
      text,
      charCount: text.length,
      fileSize: req.file.size,
      fileType: mimetype,
      filePath,
      sessionId,
    });

    await doc.save();

    res.json({
      success: true,
      sessionId,
      documentId: doc._id,
      filename: originalname,
      text,
      charCount: text.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- POST /api/chat ---
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, documentTexts = [], documentText, history = [], sessionId, documentId, model = DEFAULT_MODEL } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Validate and get model configuration
    const modelConfig = AVAILABLE_MODELS[model];
    if (!modelConfig) {
      return res.status(400).json({ error: 'Invalid model selected' });
    }

    if (modelConfig.provider === 'openrouter' && !OPENROUTER_API_KEY) {
      return res.status(400).json({ error: 'OpenRouter API key not configured' });
    }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    // Always inject fresh document context so adding/removing docs mid-chat takes effect immediately
    const activeDocs = Array.isArray(documentTexts) && documentTexts.length > 0
      ? documentTexts
      : documentText ? [{ filename: 'Document', text: documentText }] : [];

    if (activeDocs.length > 0) {
      let docContent = '';
      activeDocs.forEach((doc, idx) => {
        // Optimize each document to prevent token limit issues
        const optimizedText = optimizeDocumentText(doc.text, 18000);
        docContent += `<document name="${doc.filename || `Document ${idx + 1}`}">\n${optimizedText}\n</document>\n\n`;
      });
      messages.push({
        role: 'user',
        content: `Here are the ${activeDocs.length} document(s) you must use to answer my questions:\n\n${docContent}`,
      });
      messages.push({
        role: 'assistant',
        content: `Understood. I have read ${activeDocs.length === 1 ? `the document "${activeDocs[0].filename}"` : `all ${activeDocs.length} documents: ${activeDocs.map(d => `"${d.filename}"`).join(', ')}`}. Ask me anything about ${activeDocs.length === 1 ? 'it' : 'them'}.`,
      });
    }

    // Replay conversation history (clean messages only, no embedded doc text)
    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({ role: 'user', content: message });

    // Call appropriate API based on model provider
    let reply;

    if (modelConfig.provider === 'groq') {
      const response = await groq.chat.completions.create({
        model: modelConfig.id,
        max_tokens: 1024,
        messages,
      });
      reply = response.choices[0].message.content;
    } else if (modelConfig.provider === 'openrouter') {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
          'X-Title': 'Document Q&A',
        },
        body: JSON.stringify({
          model: modelConfig.id,
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      reply = data.choices[0].message.content;
    } else {
      throw new Error('Unknown model provider');
    }

    // Save messages to MongoDB
    if (sessionId && documentId) {
      // Save user message
      const userMsg = new ChatMessage({
        userId: req.user.id,
        sessionId,
        documentId,
        role: 'user',
        content: message,
      });
      await userMsg.save();

      // Save assistant response
      const assistantMsg = new ChatMessage({
        userId: req.user.id,
        sessionId,
        documentId,
        role: 'assistant',
        content: reply,
      });
      await assistantMsg.save();
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/documents/:sessionId ---
app.get('/api/documents/:sessionId', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ sessionId: req.params.sessionId, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({
      id: doc._id,
      filename: doc.filename,
      charCount: doc.charCount,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt,
    });
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/document/file/:sessionId ---
app.get('/api/document/file/:sessionId', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ sessionId: req.params.sessionId, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    const download = req.query.download === 'true';
    if (download) {
      res.download(doc.filePath, doc.filename);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
      res.sendFile(doc.filePath);
    }
  } catch (err) {
    console.error('Download file error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/chat-history/:sessionId ---
app.get('/api/chat-history/:sessionId', authenticateToken, async (req, res) => {
  try {
    const messages = await ChatMessage.find(
      { sessionId: req.params.sessionId, userId: req.user.id },
      { content: 1, role: 1, timestamp: 1 }
    ).sort({ timestamp: 1 });

    res.json({
      sessionId: req.params.sessionId,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
    });
  } catch (err) {
    console.error('Get chat history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/all-sessions ---
app.get('/api/all-sessions', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user.id }, { filename: 1, sessionId: 1, uploadedAt: 1, charCount: 1 }).sort({ uploadedAt: -1 });
    res.json({ documents });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/user-documents ---
app.get('/api/user-documents', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user.id }, { filename: 1, charCount: 1, text: 1, _id: 1, uploadedAt: 1, sessionId: 1 }).sort({ uploadedAt: -1 });
    res.json({ documents });
  } catch (err) {
    console.error('Get user documents error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- DELETE /api/session/:sessionId ---
app.delete('/api/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await Document.deleteOne({ sessionId, userId: req.user.id });
    await ChatMessage.deleteMany({ sessionId, userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Serve static frontend files in production ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// --- Error handler for multer ---
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File too large. Max 100MB allowed.' });
  }
  res.status(400).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
