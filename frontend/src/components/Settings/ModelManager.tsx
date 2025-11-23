/**
 * Model Manager Component
 * Allows users to download/pull new models from Ollama
 */

import { useState } from 'react';

export interface ModelManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onModelPulled: () => void; // Callback to refresh model list
  installedModels: string[]; // List of already installed models
}

interface PopularModel {
  name: string;
  description: string;
  size: string;
}

const POPULAR_MODELS: PopularModel[] = [
  { name: 'llama3.2', description: 'Meta\'s Llama 3.2 (3B) - Fast and efficient', size: '~2GB' },
  { name: 'llama3.2:1b', description: 'Llama 3.2 1B - Ultra lightweight', size: '~1GB' },
  { name: 'llama3.1', description: 'Meta\'s Llama 3.1 (8B)', size: '~4.7GB' },
  { name: 'qwen2.5:latest', description: 'Alibaba Qwen 2.5 - Multilingual', size: '~4.7GB' },
  { name: 'phi3', description: 'Microsoft Phi-3 - Compact powerhouse', size: '~2.3GB' },
  { name: 'mistral', description: 'Mistral 7B - High quality', size: '~4.1GB' },
  { name: 'gemma2', description: 'Google Gemma 2 (2B)', size: '~1.6GB' },
];

export function ModelManager({ isOpen, onClose, onModelPulled, installedModels }: ModelManagerProps) {
  const [pulling, setPulling] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ status: string; percent?: number }>({ status: '' });
  const [customModel, setCustomModel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pullModel = async (modelName: string) => {
    setPulling(modelName);
    setProgress({ status: 'Starting download...' });
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error('Failed to start model download');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.done) {
                setProgress({ status: 'Download complete!', percent: 100 });
                setTimeout(() => {
                  setPulling(null);
                  setProgress({ status: '' });
                  onModelPulled(); // Refresh model list
                }, 1000);
                break;
              }

              if (data.error) {
                throw new Error(data.error);
              }

              // Calculate progress percentage
              let percent: number | undefined;
              if (data.completed && data.total) {
                percent = Math.round((data.completed / data.total) * 100);
              }

              setProgress({
                status: data.status || 'Downloading...',
                percent,
              });
            } catch (e) {
              console.error('Error parsing progress:', e);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error pulling model:', err);
      setError(err.message || 'Failed to download model');
      setPulling(null);
      setProgress({ status: '' });
    }
  };

  const handleCustomPull = () => {
    if (customModel.trim()) {
      pullModel(customModel.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background-secondary rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Download Models
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Download models from the Ollama library
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-text-secondary transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Custom model input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Custom Model Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g., llama3.2:3b, mistral:latest"
                className="flex-1 px-3 py-2 border border-border-dark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={pulling !== null}
              />
              <button
                onClick={handleCustomPull}
                disabled={!customModel.trim() || pulling !== null}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Pull
              </button>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              Visit <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ollama.com/library</a> to explore all available models
            </p>
          </div>

          {/* Progress indicator */}
          {pulling && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Downloading {pulling}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {progress.status}
                    {progress.percent !== undefined && ` (${progress.percent}%)`}
                  </p>
                </div>
              </div>
              {progress.percent !== undefined && (
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Popular models */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3">Popular Models</h3>
            <div className="grid gap-3">
              {POPULAR_MODELS.map((model) => {
                const isInstalled = installedModels.some(
                  (installed) =>
                    installed === model.name ||
                    installed.startsWith(model.name + ':')
                );

                return (
                  <div
                    key={model.name}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isInstalled
                        ? 'border-green-300 bg-green-50'
                        : 'border-border hover:border-blue-300'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-medium ${isInstalled ? 'text-green-900' : 'text-text-primary'}`}>
                          {model.name}
                        </h4>
                        {isInstalled && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-200 text-green-800 rounded">
                            ✓ Installed
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${isInstalled ? 'text-green-700' : 'text-text-secondary'}`}>
                        {model.description}
                      </p>
                      <p className={`text-xs mt-1 ${isInstalled ? 'text-green-600' : 'text-text-tertiary'}`}>
                        Size: {model.size}
                      </p>
                    </div>
                    <button
                      onClick={() => pullModel(model.name)}
                      disabled={pulling !== null || isInstalled}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pulling === model.name
                          ? 'bg-blue-100 text-blue-700'
                          : isInstalled
                          ? 'bg-surface text-text-tertiary cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:text-text-tertiary disabled:cursor-not-allowed'
                      }`}
                    >
                      {pulling === model.name ? 'Downloading...' : isInstalled ? 'Installed' : 'Download'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info box */}
          <div className="mt-6 bg-background-primary border border-border rounded-lg p-4">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-text-primary">About Model Downloads</h4>
                <p className="text-sm text-text-secondary mt-1">
                  Models are downloaded from Ollama's library and stored locally.
                  Download times vary based on your internet connection and model size.
                  Make sure you have enough disk space before downloading large models.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 bg-background-primary">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-text-secondary bg-background-secondary border border-border-dark rounded-lg hover:bg-background-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
