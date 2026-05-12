import { useState, useEffect } from 'react';
import { getAvailableModels, getSelectedModel, setSelectedModel } from '../api';

export default function ModelSelector({ onModelChange }) {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelected] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      setLoading(true);
      const data = await getAvailableModels();
      setModels(data.models);

      const stored = getSelectedModel();
      const selected = stored || data.default;
      setSelected(selected);
      setSelectedModel(selected);
      onModelChange?.(selected);
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load models');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectModel(modelId) {
    setSelected(modelId);
    setSelectedModel(modelId);
    onModelChange?.(modelId);
    setIsOpen(false);
  }

  const selectedModelData = models.find(m => m.id === selectedModel);
  const availableModels = models.filter(m => m.available);

  if (loading) {
    return (
      <div className="text-xs text-gray-400 text-center py-2">Loading models...</div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-500 text-center py-2">{error}</div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
      <label className="block text-xs font-semibold text-gray-700 mb-2">AI Model</label>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-300 rounded-lg hover:border-blue-400 transition-colors text-sm font-medium text-gray-700"
        >
          <span className="truncate text-left flex-1">
            {selectedModelData?.name || 'Select model...'}
          </span>
          <svg className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {availableModels.length > 0 ? (
              availableModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 last:border-b-0 transition-colors hover:bg-blue-50 ${
                    selectedModel === model.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{model.name}</span>
                    {selectedModel === model.id && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{model.provider}</p>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No models available. Configure OpenRouter API key.
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        {selectedModelData?.provider === 'groq' ? '⚡ Free tier' : '🚀 Premium model'}
      </p>
    </div>
  );
}
