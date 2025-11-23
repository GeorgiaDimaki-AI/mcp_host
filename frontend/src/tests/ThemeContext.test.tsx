/**
 * ThemeContext Tests
 * Tests for theme state management, persistence, and system preference detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

// Test component that uses the theme hook
function TestComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div>
      <div data-testid="theme">Theme: {theme}</div>
      <div data-testid="resolved-theme">Resolved: {resolvedTheme}</div>
      <button onClick={() => setTheme('light')} data-testid="light-btn">
        Light
      </button>
      <button onClick={() => setTheme('dark')} data-testid="dark-btn">
        Dark
      </button>
      <button onClick={() => setTheme('system')} data-testid="system-btn">
        System
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage and DOM before each test
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('class');
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('ThemeProvider', () => {
    it('should throw error when useTheme is used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleError.mockRestore();
    });

    it('should provide default theme context', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: system');
    });

    it('should initialize with stored theme preference', () => {
      localStorage.setItem('mcp-host-theme', 'dark');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');
    });

    it('should ignore invalid stored themes', () => {
      localStorage.setItem('mcp-host-theme', 'invalid');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: system');
    });
  });

  describe('Theme switching', () => {
    it('should switch to light theme', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const lightBtn = screen.getByTestId('light-btn');
      fireEvent.click(lightBtn);

      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('should switch to dark theme', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const darkBtn = screen.getByTestId('dark-btn');
      fireEvent.click(darkBtn);

      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should switch to system theme', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const systemBtn = screen.getByTestId('system-btn');
      fireEvent.click(systemBtn);

      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: system');
    });

    it('should update multiple themes correctly', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const lightBtn = screen.getByTestId('light-btn');
      const darkBtn = screen.getByTestId('dark-btn');

      fireEvent.click(lightBtn);
      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');

      fireEvent.click(darkBtn);
      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');

      fireEvent.click(lightBtn);
      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');
    });
  });

  describe('Theme persistence', () => {
    it('should persist theme to localStorage', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const darkBtn = screen.getByTestId('dark-btn');
      fireEvent.click(darkBtn);

      expect(localStorage.getItem('mcp-host-theme')).toBe('dark');
    });

    it('should restore theme from localStorage on remount', () => {
      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const darkBtn = screen.getByTestId('dark-btn');
      fireEvent.click(darkBtn);

      expect(localStorage.getItem('mcp-host-theme')).toBe('dark');

      unmount();

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');
    });
  });

  describe('CSS class management', () => {
    it('should add light class to document element', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const lightBtn = screen.getByTestId('light-btn');
      fireEvent.click(lightBtn);

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should add dark class to document element', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const darkBtn = screen.getByTestId('dark-btn');
      fireEvent.click(darkBtn);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('should remove old theme class when switching', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const lightBtn = screen.getByTestId('light-btn');
      const darkBtn = screen.getByTestId('dark-btn');

      fireEvent.click(lightBtn);
      expect(document.documentElement.classList.contains('light')).toBe(true);

      fireEvent.click(darkBtn);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Resolved theme', () => {
    it('should resolve system theme to light when system prefers light', () => {
      // Mock matchMedia to prefer light
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('Resolved: light');
    });

    it('should resolve system theme to dark when system prefers dark', () => {
      // Mock matchMedia to prefer dark
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('Resolved: dark');
    });

    it('should not change resolved theme when in light mode', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const lightBtn = screen.getByTestId('light-btn');
      fireEvent.click(lightBtn);

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('Resolved: light');
    });

    it('should not change resolved theme when in dark mode', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const darkBtn = screen.getByTestId('dark-btn');
      fireEvent.click(darkBtn);

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('Resolved: dark');
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage to throw error
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: system');
      expect(consoleError).toHaveBeenCalled();

      getItemSpy.mockRestore();
      consoleError.mockRestore();
    });

    it('should handle localStorage write errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const darkBtn = screen.getByTestId('dark-btn');
      fireEvent.click(darkBtn);

      expect(consoleError).toHaveBeenCalled();
      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');

      setItemSpy.mockRestore();
      consoleError.mockRestore();
    });
  });
});
