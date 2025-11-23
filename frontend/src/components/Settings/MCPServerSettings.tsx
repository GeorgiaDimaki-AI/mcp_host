/**
 * MCP Server Settings Component
 * Allows users to manage their MCP server configurations
 */

import { useState, useEffect } from 'react';

export type TrustLevel = 'verified' | 'trusted' | 'unverified';

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  trustLevel?: TrustLevel; // Default: 'unverified'
}

interface MCPServerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MCPServerSettings({ isOpen, onClose }: MCPServerSettingsProps) {
  const [servers, setServers] = useState<Record<string, Omit<MCPServerConfig, 'name'>>>({});
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [newServer, setNewServer] = useState<MCPServerConfig>({
    name: '',
    command: '',
    args: [],
    env: {},
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load servers on mount
  useEffect(() => {
    if (isOpen) {
      loadServers();
    }
  }, [isOpen]);

  const loadServers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/mcp/config');
      if (!response.ok) throw new Error('Failed to load MCP configuration');

      const data = await response.json();
      setServers(data.mcpServers || {});
      setError(null);
    } catch (err) {
      setError('Failed to load MCP servers: ' + (err as Error).message);
    }
  };

  const saveServers = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:3000/api/mcp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpServers: servers }),
      });

      if (!response.ok) throw new Error('Failed to save MCP configuration');

      setSuccess('Configuration saved! Restart the backend to apply changes.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Failed to save configuration: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const addServer = () => {
    if (!newServer.name || !newServer.command) {
      setError('Server name and command are required');
      return;
    }

    if (servers[newServer.name]) {
      setError('A server with this name already exists');
      return;
    }

    setServers({
      ...servers,
      [newServer.name]: {
        command: newServer.command,
        args: newServer.args && newServer.args.length > 0 ? newServer.args : undefined,
        env: newServer.env && Object.keys(newServer.env).length > 0 ? newServer.env : undefined,
      },
    });

    setNewServer({ name: '', command: '', args: [], env: {} });
    setIsAddingNew(false);
    setError(null);
  };

  const updateServer = (oldName: string, server: MCPServerConfig) => {
    const updated = { ...servers };
    delete updated[oldName];
    updated[server.name] = {
      command: server.command,
      args: server.args && server.args.length > 0 ? server.args : undefined,
      env: server.env && Object.keys(server.env).length > 0 ? server.env : undefined,
    };
    setServers(updated);
    setEditingServer(null);
  };

  const deleteServer = (name: string) => {
    if (!confirm(`Are you sure you want to delete the server "${name}"?`)) return;

    const updated = { ...servers };
    delete updated[name];
    setServers(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">MCP Server Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Server List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Configured Servers</h3>
              <button
                onClick={() => setIsAddingNew(!isAddingNew)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {isAddingNew ? 'Cancel' : '+ Add Server'}
              </button>
            </div>

            {/* Add New Server Form */}
            {isAddingNew && (
              <ServerForm
                server={newServer}
                onChange={setNewServer}
                onSave={addServer}
                onCancel={() => {
                  setIsAddingNew(false);
                  setNewServer({ name: '', command: '', args: [], env: {} });
                }}
                isNew={true}
              />
            )}

            {/* Existing Servers */}
            {Object.entries(servers).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No MCP servers configured</p>
                <p className="text-sm mt-1">Click "Add Server" to get started</p>
              </div>
            ) : (
              Object.entries(servers).map(([name, config]) => (
                <div key={name} className="border border-gray-200 rounded-lg p-4">
                  {editingServer === name ? (
                    <ServerForm
                      server={{ ...config, name }}
                      onChange={(updated) => updateServer(name, updated)}
                      onSave={() => setEditingServer(null)}
                      onCancel={() => setEditingServer(null)}
                      isNew={false}
                    />
                  ) : (
                    <ServerDisplay
                      name={name}
                      config={config}
                      onEdit={() => setEditingServer(name)}
                      onDelete={() => deleteServer(name)}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">ℹ️ Configuration Info</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Changes require backend restart to take effect</li>
              <li>• Configuration is saved to <code className="bg-blue-100 px-1 rounded">backend/mcp-config.json</code></li>
              <li>• Command must be a valid executable (e.g., <code className="bg-blue-100 px-1 rounded">node</code>, <code className="bg-blue-100 px-1 rounded">python</code>)</li>
              <li>• Args are passed to the command as an array</li>
              <li>• Environment variables are optional key-value pairs</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveServers}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Server Display Component
interface ServerDisplayProps {
  name: string;
  config: Omit<MCPServerConfig, 'name'>;
  onEdit: () => void;
  onDelete: () => void;
}

function ServerDisplay({ name, config, onEdit, onDelete }: ServerDisplayProps) {
  // Get trust badge info
  const trustLevel = config.trustLevel || 'unverified';
  const getTrustBadge = () => {
    switch (trustLevel) {
      case 'verified':
        return { icon: '✓', label: 'Verified', color: 'text-green-700', bg: 'bg-green-100' };
      case 'trusted':
        return { icon: '⚡', label: 'Trusted', color: 'text-blue-700', bg: 'bg-blue-100' };
      default:
        return { icon: '⚠️', label: 'Unverified', color: 'text-yellow-700', bg: 'bg-yellow-100' };
    }
  };
  const badge = getTrustBadge();

  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{name}</h4>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.color}`}>
              {badge.icon} {badge.label}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              {config.command} {config.args?.join(' ')}
            </code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            title="Edit server"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
            title="Delete server"
          >
            Delete
          </button>
        </div>
      </div>

      {config.env && Object.keys(config.env).length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-700 mb-1">Environment Variables:</p>
          <div className="bg-gray-50 rounded p-2 text-xs font-mono">
            {Object.entries(config.env).map(([key, value]) => (
              <div key={key} className="text-gray-600">
                {key}={value}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Server Form Component
interface ServerFormProps {
  server: MCPServerConfig;
  onChange: (server: MCPServerConfig) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}

function ServerForm({ server, onChange, onSave, onCancel, isNew }: ServerFormProps) {
  const [argsText, setArgsText] = useState(server.args?.join('\n') || '');
  const [envText, setEnvText] = useState(
    Object.entries(server.env || {})
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
  );

  const handleArgsChange = (text: string) => {
    setArgsText(text);
    const args = text.split('\n').filter(line => line.trim());
    onChange({ ...server, args });
  };

  const handleEnvChange = (text: string) => {
    setEnvText(text);
    const env: Record<string, string> = {};
    text.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && key.trim()) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    onChange({ ...server, env });
  };

  return (
    <div className="space-y-4 bg-gray-50 rounded-lg p-4">
      {/* Server Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Server Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={server.name}
          onChange={(e) => onChange({ ...server, name: e.target.value })}
          disabled={!isNew}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="my-mcp-server"
        />
        {!isNew && (
          <p className="text-xs text-gray-500 mt-1">Server name cannot be changed after creation</p>
        )}
      </div>

      {/* Command */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Command <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={server.command}
          onChange={(e) => onChange({ ...server, command: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="node"
        />
        <p className="text-xs text-gray-500 mt-1">Executable command (e.g., node, python, ./script.sh)</p>
      </div>

      {/* Arguments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Arguments (one per line)
        </label>
        <textarea
          value={argsText}
          onChange={(e) => handleArgsChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          rows={3}
          placeholder="examples/my-server.js&#10;--port&#10;8080"
        />
        <p className="text-xs text-gray-500 mt-1">Command-line arguments passed to the command</p>
      </div>

      {/* Environment Variables */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Environment Variables (KEY=VALUE format, one per line)
        </label>
        <textarea
          value={envText}
          onChange={(e) => handleEnvChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          rows={3}
          placeholder="API_KEY=your-key&#10;DEBUG=true&#10;PORT=3000"
        />
        <p className="text-xs text-gray-500 mt-1">Optional environment variables for the MCP server</p>
      </div>

      {/* Trust Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Trust Level
        </label>
        <select
          value={server.trustLevel || 'unverified'}
          onChange={(e) => onChange({ ...server, trustLevel: e.target.value as TrustLevel })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="unverified">⚠️ Unverified (Static HTML only - safest)</option>
          <option value="trusted">⚡ Trusted (Scripts and forms enabled)</option>
          <option value="verified">✓ Verified (Full capabilities - officially verified)</option>
        </select>
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          <p className="font-medium mb-1">Trust Level Guide:</p>
          <ul className="space-y-1">
            <li><strong>Unverified:</strong> HTML is sanitized, scripts removed, forms disabled. Safest option.</li>
            <li><strong>Trusted:</strong> You explicitly trust this server. Interactive features enabled.</li>
            <li><strong>Verified:</strong> Officially verified by maintainers. Full capabilities.</li>
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {isNew ? 'Add Server' : 'Update Server'}
        </button>
      </div>
    </div>
  );
}
