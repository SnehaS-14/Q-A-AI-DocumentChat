import { useRef, useState } from 'react';
import DocumentManager from './DocumentManager';
import LogoutModal from './LogoutModal';
import ModelSelector from './ModelSelector';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FileTypeBadge({ filename }) {
  const ext = filename?.split('.').pop()?.toUpperCase() || '';
  const colorMap = {
    PDF:  'bg-red-100 text-red-700',
    DOCX: 'bg-blue-100 text-blue-700',
    DOC:  'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${colorMap[ext] || 'bg-gray-100 text-gray-700'}`}>
      {ext}
    </span>
  );
}

function UserAvatar({ username }) {
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '?';
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500'];
  const color = colors[username?.charCodeAt(0) % colors.length] || 'bg-blue-500';
  return (
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function Sidebar({
  document, sessionId, isUploading, onFileUpload, onRemoveDocument, onShowHistory,
  user, onLogout, onNewChat, documents, selectedDocuments, onToggleDocument, onSearch,
  onDownloadDocument, onViewDocument,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const fileInputRef = useRef(null);

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  }

  function handleFileInputChange(e) {
    Array.from(e.target.files).forEach(file => {
      if (file) validateAndUpload(file);
    });
    e.target.value = '';
  }

  function validateAndUpload(file) {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-word.document.macroEnabled.12',
      'application/msword',
    ];
    const validExts = /\.(pdf|docx|doc|DOC|DOCX|PDF)$/;

    // Check file extension or MIME type
    const isValidExtension = validExts.test(file.name);
    const isValidMimeType = validTypes.includes(file.type);

    if (!isValidExtension && !isValidMimeType) {
      console.log('File validation failed:', { name: file.name, type: file.type });
      alert('Please upload a PDF, DOCX, or DOC file. Selected: ' + file.name);
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 100MB.`);
      return;
    }

    console.log('File validation passed, uploading:', file.name);
    onFileUpload(file);
  }

  function handleLogoutConfirm() {
    setShowLogoutModal(false);
    onLogout();
  }

  return (
    <>
      {showLogoutModal && (
        <LogoutModal
          username={user?.username}
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">📚</span>
            <span className="font-bold text-gray-800 text-sm sm:text-base truncate">Document Q&A</span>
          </div>

          {user && (
            <button
              onClick={() => setShowLogoutModal(true)}
              title="Sign out"
              className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400
                         hover:text-red-500 hover:bg-red-50 transition-all duration-150"
            >
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-xs font-medium">Sign out</span>
            </button>
          )}
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3 mx-2 sm:mx-4 my-2 sm:my-3 px-2 sm:px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex-shrink-0">
            <UserAvatar username={user.username} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400 leading-none mb-0.5">Logged in as</p>
              <p className="text-xs sm:text-sm font-semibold text-blue-700 truncate">{user.username}</p>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3 min-h-0">

          {/* Drop zone */}
          {!document && !isUploading && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2
                cursor-pointer transition-all duration-200 text-center min-h-[150px]
                ${isDragging
                  ? 'border-blue-500 bg-blue-50 text-blue-600 scale-[1.02]'
                  : 'border-gray-300 bg-gray-50 text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500'
                }
              `}
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium">Drop your document here</p>
              <p className="text-xs opacity-70">or click to browse</p>
            </div>
          )}

          {/* Uploading spinner */}
          {isUploading && (
            <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 min-h-[150px] bg-blue-50">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-blue-600 font-medium">Parsing document...</p>
            </div>
          )}

          {/* Document card */}
          {document && !isUploading && (
            <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{document.filename}</p>
                  {document.size && (
                    <p className="text-xs text-gray-400 mt-0.5">{formatBytes(document.size)}</p>
                  )}
                </div>
                <FileTypeBadge filename={document.filename} />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Ready to chat
              </div>

              <p className="text-xs text-gray-400">{document.charCount?.toLocaleString()} characters extracted</p>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={onNewChat}
                  className="flex-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  New Chat
                </button>
                <button
                  onClick={onRemoveDocument}
                  className="flex-1 text-xs bg-red-50 text-red-500 hover:bg-red-100 px-2 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  Change Doc
                </button>
              </div>

              {sessionId && onDownloadDocument && onViewDocument && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => onViewDocument(sessionId, document.filename)}
                    title="View document"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 px-2 py-1.5 rounded-lg font-semibold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                  <button
                    onClick={() => onDownloadDocument(sessionId, false)}
                    title="Download document"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-green-50 hover:text-green-600 px-2 py-1.5 rounded-lg font-semibold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Document Manager */}
          {document && !isUploading && documents.length > 0 && (
            <DocumentManager
              documents={documents}
              selectedDocuments={selectedDocuments}
              onToggleDocument={onToggleDocument}
              onSearch={onSearch}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-white flex flex-col flex-shrink-0">
          <ModelSelector onModelChange={() => {}} />

          <div className="px-2 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3 border-t border-gray-100 flex flex-col gap-1.5 sm:gap-2">
            <button
              onClick={onShowHistory}
              className="w-full py-1.5 sm:py-2 px-2 sm:px-3 bg-blue-50 text-blue-600 text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation"
            >
              <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">View Chat</span>
              <span className="sm:hidden">History</span>
            </button>
            <p className="text-xs text-gray-400 text-center leading-tight">
              PDF, DOCX, DOC · Max 100 MB
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInputChange}
          multiple
          className="hidden"
        />
      </aside>
    </>
  );
}
