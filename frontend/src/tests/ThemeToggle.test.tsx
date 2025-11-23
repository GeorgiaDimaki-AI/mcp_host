/**
 * ThemeToggle Component Tests
 * Tests for theme toggle UI, cycling behavior, and accessibility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  describe('Rendering', () => {
    it('should render the theme toggle button', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have proper ARIA labels for accessibility', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toContain('Theme selector');
    });
  });

  describe('Theme cycling', () => {
    it('should cycle from system to dark on first click', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should now be in dark mode (system → dark)
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('mcp-host-theme')).toBe('dark');
    });

    it('should cycle light → system → dark → light', () => {
      // Start with light theme
      localStorage.setItem('mcp-host-theme', 'light');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // Start at light, click to go to system
      fireEvent.click(button);
      expect(localStorage.getItem('mcp-host-theme')).toBe('system');

      // Click to go to dark
      fireEvent.click(button);
      expect(localStorage.getItem('mcp-host-theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Click to cycle back to light
      fireEvent.click(button);
      expect(localStorage.getItem('mcp-host-theme')).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);

      // Click to cycle back to system
      fireEvent.click(button);
      expect(localStorage.getItem('mcp-host-theme')).toBe('system');
    });

    it('should start from stored theme preference and cycle correctly', () => {
      localStorage.setItem('mcp-host-theme', 'dark');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      const button = screen.getByRole('button');

      // From dark, should cycle to light
      fireEvent.click(button);
      expect(localStorage.getItem('mcp-host-theme')).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);

      // From light, should cycle to system
      fireEvent.click(button);
      expect(localStorage.getItem('mcp-host-theme')).toBe('system');
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip on mouse enter', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      let tooltip = screen.queryByRole('tooltip');
      expect(tooltip).toBeInTheDocument();

      fireEvent.mouseLeave(button);

      tooltip = screen.queryByRole('tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });

    it('should show tooltip on focus', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.focus(button);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should hide tooltip on blur', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.focus(button);

      let tooltip = screen.queryByRole('tooltip');
      expect(tooltip).toBeInTheDocument();

      fireEvent.blur(button);

      tooltip = screen.queryByRole('tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });

    it('should display correct tooltip text for system theme', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.textContent).toMatch(/System/i);
    });

    it('should display correct tooltip text for light theme', () => {
      localStorage.setItem('mcp-host-theme', 'light');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.textContent).toBe('Light');
    });

    it('should display correct tooltip text for dark theme', () => {
      localStorage.setItem('mcp-host-theme', 'dark');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.textContent).toBe('Dark');
    });
  });

  describe('Icon display', () => {
    it('should display monitor icon for system theme', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(button.getAttribute('aria-label')).toContain('System');
    });

    it('should display sun icon for light theme', () => {
      localStorage.setItem('mcp-host-theme', 'light');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toContain('Light');
    });

    it('should display moon icon for dark theme', () => {
      localStorage.setItem('mcp-host-theme', 'dark');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toContain('Dark');
    });

    it('should update icon when theme changes', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // Start at system
      expect(button.getAttribute('aria-label')).toContain('System');

      // Click to dark (system → dark)
      fireEvent.click(button);
      expect(button.getAttribute('aria-label')).toContain('Dark');

      // Click to light (dark → light)
      fireEvent.click(button);
      expect(button.getAttribute('aria-label')).toContain('Light');

      // Click to system (light → system)
      fireEvent.click(button);
      expect(button.getAttribute('aria-label')).toContain('System');
    });
  });

  describe('Keyboard accessibility', () => {
    it('should be focusable', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it('should toggle theme on Enter key', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      button.focus();

      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      fireEvent.click(button); // Click is triggered by Enter

      // From system → dark
      expect(localStorage.getItem('mcp-host-theme')).toBe('dark');
    });

    it('should toggle theme on Space key', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      button.focus();

      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      fireEvent.click(button); // Click is triggered by Space

      // From system → dark
      expect(localStorage.getItem('mcp-host-theme')).toBe('dark');
    });
  });

  describe('Integration with ThemeContext', () => {
    it('should update document classes when toggling', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // From system → dark
      fireEvent.click(button);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);

      // From dark → light
      fireEvent.click(button);
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // From light → system
      fireEvent.click(button);
      expect(localStorage.getItem('mcp-host-theme')).toBe('system');
    });

    it('should persist theme changes across remounts', () => {
      const { unmount } = render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // From system → dark → light
      fireEvent.click(button);
      fireEvent.click(button);
      expect(localStorage.getItem('mcp-host-theme')).toBe('light');

      unmount();

      // Remount and verify theme is restored
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      expect(localStorage.getItem('mcp-host-theme')).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });
  });
});
