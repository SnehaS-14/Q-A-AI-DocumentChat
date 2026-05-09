function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function SessionHistory({ sessions, onSelectSession, onDeleteSession, onClose }) {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="font-semibold text-gray-800">Chat History</h1>
        <button
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          Close
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-center text-gray-400">No chat history yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectSession(session)}>
                    <p className="text-sm font-medium text-gray-800 truncate hover:text-blue-600">
                      {session.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {session.charCount.toLocaleString()} characters
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(session.uploadedAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteSession(session.sessionId)}
                    className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
