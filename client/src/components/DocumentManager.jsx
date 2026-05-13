import { useState } from 'react';

export default function DocumentManager({ documents, selectedDocuments, onToggleDocument, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');

  function handleSearch(e) {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      onSearch(query);
    }
  }

  return (
    <div className="p-2 sm:p-4 border-t border-gray-200 bg-gray-50  overflow-y-auto">
      <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Documents in Chat</h3>

      {/* Search Box */}
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={handleSearch}
        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg mb-2 sm:mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />

      {/* Selected Documents */}
      {selectedDocuments.length > 0 && (
        <div className="mb-2 sm:mb-4">
          <p className="text-xs text-gray-600 font-medium mb-1.5 sm:mb-2">Selected ({selectedDocuments.length})</p>
          <div className="space-y-1.5 sm:space-y-2">
            {selectedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-white p-1.5 sm:p-2 rounded border border-green-200 bg-green-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{doc.filename}</p>
                  <p className="text-xs text-gray-500">{(doc.charCount / 1000).toFixed(1)}K chars</p>
                </div>
                <button
                  onClick={() => onToggleDocument(doc.id, false)}
                  className="text-xs text-red-500 hover:text-red-700 ml-1 sm:ml-2 flex-shrink-0 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Documents */}
      {documents.length > selectedDocuments.length && (
        <div>
          <p className="text-xs text-gray-600 font-medium mb-2">Available</p>
          <div className="space-y-2">
            {documents
              .filter((doc) => !selectedDocuments.find((d) => d.id === doc.id))
              .map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onToggleDocument(doc.id, true)}
                  className="w-full text-left flex items-center justify-between bg-white p-2 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-500">{(doc.charCount / 1000).toFixed(1)}K chars</p>
                  </div>
                  <span className="text-xs text-blue-600 font-semibold ml-2 flex-shrink-0">+</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
