# Document Q&A Chatbot

A full-stack web application that lets you upload PDF or Word documents and chat with them using Claude AI.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS v3
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)
- **File Parsing**: pdf-parse (PDF), mammoth (DOCX/DOC)

## Setup

### Prerequisites
- Node.js v18+ and npm v9+
- An Anthropic API key from https://console.anthropic.com

### Installation

1. Clone/download this repository.
2. From the `document-chatbot/` root, install all dependencies:
   ```powershell
   npm install
   ```
3. Set up environment variables:
   ```powershell
   Copy-Item server\.env.example server\.env
   Copy-Item client\.env.example client\.env
   ```
4. Edit `server/.env` and replace `your_key_here` with your actual Anthropic API key.

### Running the App

```powershell
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173) simultaneously.

Open your browser at **http://localhost:5173**.

### Individual processes

```powershell
npm run dev:server   # Backend only
npm run dev:client   # Frontend only
```

## How to Use

1. Upload a PDF, DOCX, or DOC file (max 10MB) using the left sidebar.
2. Wait for the "Ready to chat" confirmation.
3. Type your question in the input box and press **Enter** to send.
4. Use **Shift+Enter** to add a newline without sending.
5. Click suggestion chips for quick-start questions.
6. Use the **Clear chat** button to start a new conversation.

## Folder Structure

```
document-chatbot/
├── client/                  React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ChatArea.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   └── TypingIndicator.jsx
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example
├── server/                  Express backend
│   ├── index.js
│   └── .env.example
├── package.json             Root (npm workspaces)
└── README.md
```
