import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ModelSelector from './ModelSelector';

const SUGGESTION_CHIPS = [
  "What is this document about?",
  "Summarize the key points",
  "What are the main conclusions?",
];

export default function ChatArea({ selectedDocuments = [], history, isSending, error, onSendMessage, onClearChat, onDownloadDocument, onToggleMobileSidebar, onModelChange }) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const hasDocuments = selectedDocuments.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isSending]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const msg = inputValue.trim();
    if (!msg || isSending || !hasDocuments) return;
    onSendMessage(msg);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  const canSend = hasDocuments && !isSending && inputValue.trim().length > 0;

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
      <header className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="font-semibold text-sm sm:text-base text-gray-800 truncate">
              {!hasDocuments ? 'Document Chat' : selectedDocuments.length === 1 ? selectedDocuments[0].filename : `${selectedDocuments.length} documents`}
            </h1>
            {hasDocuments && (
              <p className="text-xs text-gray-400 mt-0.5">Ask anything about your document{selectedDocuments.length > 1 ? 's' : ''}</p>
            )}
          </div>
          {hasDocuments && onDownloadDocument && selectedDocuments.length === 1 && selectedDocuments[0].sessionId && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onDownloadDocument(selectedDocuments[0].sessionId, true)}
                title="View document"
                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                onClick={() => onDownloadDocument(selectedDocuments[0].sessionId, false)}
                title="Download document"
                className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {history.length > 0 && (
            <button
              onClick={onClearChat}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              Clear chat
            </button>
          )}
          <ModelSelector onModelChange={onModelChange} compact={true} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:gap-4 min-h-0">
        {hasDocuments && selectedDocuments.some(d => d.charCount > 30000) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3 flex items-start gap-2 sm:gap-3">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m0-4h4m0 0h4m-4 0h-4m4 0V9m0 4V5m0 4v4m0 4v2" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-amber-900">Large document detected</p>
              <p className="text-xs text-amber-800 mt-1">System will focus on relevant content for faster responses.</p>
            </div>
          </div>
        )}

        {!hasDocuments && history.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 sm:gap-3 text-center text-gray-400 px-4">
            <svg className="w-12 sm:w-16 h-12 sm:h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base sm:text-lg font-medium text-gray-300">No documents selected</p>
            <p className="text-xs sm:text-sm">Tap the menu to upload or select documents</p>
          </div>
        )}

        {hasDocuments && history.length === 0 && !isSending && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4">
            <p className="text-gray-400 text-xs sm:text-sm">Document{selectedDocuments.length > 1 ? 's' : ''} ready. Try asking:</p>
            <div className="flex flex-wrap gap-2 justify-center px-2">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onSendMessage(chip)}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-full text-xs sm:text-sm text-gray-600
                             hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((turn, index) => (
          <MessageBubble key={index} role={turn.role} content={turn.content} />
        ))}

        {isSending && <TypingIndicator />}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            Error: {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex-shrink-0">
        {!hasDocuments && (
          <p className="text-center text-xs sm:text-sm text-gray-400 mb-2">Select documents to start chatting</p>
        )}
        <div className="flex items-end gap-2 sm:gap-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasDocuments || isSending}
            placeholder={hasDocuments ? "Ask a question..." : "Select documents first"}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
                       max-h-[150px] overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center
                       hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
