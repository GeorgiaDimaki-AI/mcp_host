/**
 * Model Settings Component
 * Modal dialog for configuring model settings per conversation
 */

import { useState, useEffect } from 'react';
import { ModelSettings as ModelSettingsType } from '../../services/conversationService';
import { PROMPT_PRESETS, getPreset } from '../../services/promptPresets';

export interface ModelSettingsProps {
  isOpen: boolean;
  currentModel: string;
  availableModels: string[];
  settings: ModelSettingsType;
  onClose: () => void;
  onSave: (model: string, settings: ModelSettingsType) => void;
}

export function ModelSettings({
  isOpen,
  currentModel,
  availableModels,
  settings,
  onClose,
  onSave,
}: ModelSettingsProps) {
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [temperature, setTemperature] = useState<number>(
    settings.temperature ?? 0.7
  );
  const [topP, setTopP] = useState<number>(settings.top_p ?? 0.9);
  const [topK, setTopK] = useState<number>(settings.top_k ?? 40);
  const [systemPrompt, setSystemPrompt] = useState<string>(
    settings.systemPrompt ?? ''
  );
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');

  useEffect(() => {
    if (isOpen) {
      setSelectedModel(currentModel);
      setTemperature(settings.temperature ?? 0.7);
      setTopP(settings.top_p ?? 0.9);
      setTopK(settings.top_k ?? 40);
      setSystemPrompt(settings.systemPrompt ?? '');

      // Detect if current system prompt matches a preset
      const matchingPreset = PROMPT_PRESETS.find(p => p.prompt === settings.systemPrompt);
      setSelectedPreset(matchingPreset ? matchingPreset.id : 'custom');
    }
  }, [isOpen, currentModel, settings]);

  const handleSave = () => {
    const newSettings: ModelSettingsType = {
      temperature,
      top_p: topP,
      top_k: topK,
      systemPrompt: systemPrompt || undefined,
    };
    onSave(selectedModel, newSettings);
    onClose();
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === 'custom') {
      setSystemPrompt('');
    } else {
      const preset = getPreset(presetId);
      if (preset) {
        setSystemPrompt(preset.prompt);
      }
    }
  };

  const handleReset = () => {
    setTemperature(0.7);
    setTopP(0.9);
    setTopK(40);
    setSystemPrompt('');
    setSelectedPreset('custom');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background-secondary rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary">
              Model Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-text-secondary transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Configure model and generation settings for this conversation
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Model Selection */}
          <div>
            <label
              htmlFor="model-select"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Model
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-border-dark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableModels.length === 0 ? (
                <option value="">No models available</option>
              ) : (
                availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              The language model to use for this conversation
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label
              htmlFor="temperature-slider"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Temperature: <span className="text-blue-600">{temperature.toFixed(2)}</span>
            </label>
            <input
              id="temperature-slider"
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-text-tertiary mt-1">
              <span>0 (Focused)</span>
              <span>1 (Balanced)</span>
              <span>2 (Creative)</span>
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              Controls randomness. Lower values make output more focused and
              deterministic. Higher values make output more creative and random.
            </p>
          </div>

          {/* Top P */}
          <div>
            <label
              htmlFor="top-p-slider"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Top P (Nucleus Sampling): <span className="text-blue-600">{topP.toFixed(2)}</span>
            </label>
            <input
              id="top-p-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-text-tertiary mt-1">
              <span>0.0</span>
              <span>0.5</span>
              <span>1.0</span>
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              Controls diversity via nucleus sampling. Lower values make output
              more focused, higher values make output more diverse.
            </p>
          </div>

          {/* Top K */}
          <div>
            <label
              htmlFor="top-k-slider"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Top K: <span className="text-blue-600">{topK}</span>
            </label>
            <input
              id="top-k-slider"
              type="range"
              min="1"
              max="100"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-text-tertiary mt-1">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              Limits the number of highest probability tokens to consider.
              Lower values make output more focused.
            </p>
          </div>

          {/* System Prompt Preset */}
          <div className="border-t border-border pt-6">
            <label
              htmlFor="preset-select"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              System Prompt Preset
            </label>
            <select
              id="preset-select"
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-border-dark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="custom">Custom / None</option>
              {PROMPT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            {selectedPreset !== 'custom' && (
              <p className="text-xs text-text-tertiary mt-1">
                {PROMPT_PRESETS.find(p => p.id === selectedPreset)?.description}
              </p>
            )}
          </div>

          {/* Custom System Prompt */}
          <div>
            <label
              htmlFor="system-prompt"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Custom System Prompt
            </label>
            <textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                setSelectedPreset('custom');
              }}
              rows={6}
              placeholder="Enter a custom system prompt to customize the model's behavior..."
              className="w-full px-3 py-2 border border-border-dark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-text-tertiary mt-1">
              The system prompt defines the model's role and behavior. Select a preset above or write your own.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
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
                <h4 className="text-sm font-medium text-blue-900">
                  Settings per Conversation
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  These settings are specific to this conversation and will be
                  remembered when you return to it. Different conversations can
                  have different models and settings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 bg-background-primary flex justify-between gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-text-secondary bg-background-secondary border border-border-dark rounded-lg hover:bg-background-primary transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-background-secondary border border-border-dark rounded-lg hover:bg-background-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
