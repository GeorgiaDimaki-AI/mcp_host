/**
 * MCP Configuration Context
 * Provides global access to MCP server configurations including trust levels
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TrustLevel } from '../types';

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  trustLevel?: TrustLevel;
}

interface MCPConfigContextType {
  servers: Record<string, Omit<MCPServerConfig, 'name'>>;
  getTrustLevel: (serverName: string) => TrustLevel;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const MCPConfigContext = createContext<MCPConfigContextType | undefined>(undefined);

export function MCPConfigProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<Record<string, Omit<MCPServerConfig, 'name'>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/mcp/config');
      if (!response.ok) {
        console.error('Failed to load MCP configuration');
        return;
      }

      const data = await response.json();
      setServers(data.mcpServers || {});
    } catch (err) {
      console.error('Error loading MCP configuration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const getTrustLevel = (serverName: string): TrustLevel => {
    const server = servers[serverName];
    return server?.trustLevel || 'unverified';
  };

  const reload = async () => {
    setIsLoading(true);
    await loadConfig();
  };

  return (
    <MCPConfigContext.Provider value={{ servers, getTrustLevel, isLoading, reload }}>
      {children}
    </MCPConfigContext.Provider>
  );
}

export function useMCPConfig() {
  const context = useContext(MCPConfigContext);
  if (!context) {
    throw new Error('useMCPConfig must be used within MCPConfigProvider');
  }
  return context;
}
