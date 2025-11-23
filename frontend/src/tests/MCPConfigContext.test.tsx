/**
 * MCP Configuration Context Tests
 * Tests for Phase 3 global MCP configuration management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MCPConfigProvider, useMCPConfig } from '../contexts/MCPConfigContext';
import { ReactNode } from 'react';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('MCPConfigContext', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MCPConfigProvider>{children}</MCPConfigProvider>
  );

  describe('Initial Load', () => {
    it('should load MCP configuration on mount', async () => {
      const mockConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
            trustLevel: 'trusted' as const,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.servers).toEqual(mockConfig.mcpServers);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/mcp/config');
    });

    it('should handle empty configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mcpServers: {} }),
      });

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.servers).toEqual({});
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.servers).toEqual({});
    });

    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.servers).toEqual({});
    });
  });

  describe('getTrustLevel', () => {
    it('should return trust level for existing server', async () => {
      const mockConfig = {
        mcpServers: {
          'verified-server': {
            command: 'node',
            trustLevel: 'verified' as const,
          },
          'trusted-server': {
            command: 'node',
            trustLevel: 'trusted' as const,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getTrustLevel('verified-server')).toBe('verified');
      expect(result.current.getTrustLevel('trusted-server')).toBe('trusted');
    });

    it('should return unverified for non-existent server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mcpServers: {} }),
      });

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getTrustLevel('unknown-server')).toBe('unverified');
    });

    it('should return unverified when server has no trust level set', async () => {
      const mockConfig = {
        mcpServers: {
          'no-trust-server': {
            command: 'node',
            // No trustLevel specified
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getTrustLevel('no-trust-server')).toBe('unverified');
    });
  });

  describe('reload', () => {
    it('should reload configuration when called', async () => {
      const initialConfig = {
        mcpServers: {
          'server-1': { command: 'node', trustLevel: 'trusted' as const },
        },
      };

      const updatedConfig = {
        mcpServers: {
          'server-1': { command: 'node', trustLevel: 'verified' as const },
          'server-2': { command: 'python', trustLevel: 'trusted' as const },
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialConfig,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedConfig,
        });

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.servers).toEqual(initialConfig.mcpServers);
      expect(result.current.getTrustLevel('server-1')).toBe('trusted');

      // Reload configuration
      await result.current.reload();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.servers).toEqual(updatedConfig.mcpServers);
      expect(result.current.getTrustLevel('server-1')).toBe('verified');
      expect(result.current.getTrustLevel('server-2')).toBe('trusted');
    });
  });

  describe('Phase 3: Race Condition Prevention', () => {
    it('should have trust levels immediately available after load', async () => {
      const mockConfig = {
        mcpServers: {
          'quick-server': {
            command: 'node',
            trustLevel: 'trusted' as const,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trust level should be synchronously available
      const trustLevel = result.current.getTrustLevel('quick-server');
      expect(trustLevel).toBe('trusted');
    });

    it('should not cause flash of unverified content', async () => {
      const mockConfig = {
        mcpServers: {
          'flash-test-server': {
            command: 'node',
            trustLevel: 'verified' as const,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const { result } = renderHook(() => useMCPConfig(), { wrapper });

      // Even during loading, getTrustLevel should work (return unverified)
      expect(result.current.getTrustLevel('flash-test-server')).toBe('unverified');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // After load, correct trust level
      expect(result.current.getTrustLevel('flash-test-server')).toBe('verified');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useMCPConfig());
      }).toThrow('useMCPConfig must be used within MCPConfigProvider');
    });
  });
});
