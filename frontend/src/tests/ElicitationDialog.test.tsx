/**
 * Elicitation Dialog Tests
 * Tests for form mode and URL mode elicitation dialogs
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ElicitationDialog, ElicitationRequest } from '../components/Elicitation/ElicitationDialog';

describe('ElicitationDialog', () => {
  describe('URL Mode', () => {
    const urlRequest: ElicitationRequest = {
      serverName: 'test-server',
      message: 'Please complete authentication',
      requestId: 'url-123',
      mode: 'url',
      url: 'https://auth.example.com/login?session=abc123',
      elicitationId: 'elicit-456',
    };

    it('should render URL mode dialog', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={urlRequest} onResponse={onResponse} />);

      expect(screen.getByText('Secure Information Request')).toBeInTheDocument();
      expect(screen.getByText('test-server')).toBeInTheDocument();
      expect(screen.getByText('Please complete authentication')).toBeInTheDocument();
    });

    it('should display URL hostname prominently', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={urlRequest} onResponse={onResponse} />);

      expect(screen.getByText('auth.example.com')).toBeInTheDocument();
    });

    it('should show security warning for URL mode', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={urlRequest} onResponse={onResponse} />);

      expect(screen.getByText(/This will open in a new tab/)).toBeInTheDocument();
      expect(screen.getByText(/MCP server will not see your input/)).toBeInTheDocument();
    });

    it('should call onResponse with accept when Open button clicked', () => {
      const onResponse = vi.fn();
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<ElicitationDialog request={urlRequest} onResponse={onResponse} />);

      const openButton = screen.getByText('Open Secure Page');
      fireEvent.click(openButton);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        urlRequest.url,
        '_blank',
        'noopener,noreferrer'
      );
      expect(onResponse).toHaveBeenCalledWith({ action: 'accept' });

      windowOpenSpy.mockRestore();
    });

    it('should call onResponse with decline when Decline clicked', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={urlRequest} onResponse={onResponse} />);

      const declineButton = screen.getByText('Decline');
      fireEvent.click(declineButton);

      expect(onResponse).toHaveBeenCalledWith({ action: 'decline' });
    });

    it('should call onResponse with cancel when Cancel clicked', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={urlRequest} onResponse={onResponse} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onResponse).toHaveBeenCalledWith({ action: 'cancel' });
    });
  });

  describe('Form Mode', () => {
    const formRequest: ElicitationRequest = {
      serverName: 'api-server',
      message: 'Please enter your credentials',
      requestId: 'form-789',
      mode: 'form',
      requestedSchema: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            title: 'Username',
            description: 'Your account username',
          },
          password: {
            type: 'string',
            title: 'Password',
            format: 'password',
          },
        },
        required: ['username', 'password'],
      },
    };

    it('should render form mode dialog', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={formRequest} onResponse={onResponse} />);

      expect(screen.getByText('Information Request')).toBeInTheDocument();
      expect(screen.getByText('api-server')).toBeInTheDocument();
      expect(screen.getByText('Please enter your credentials')).toBeInTheDocument();
    });

    it('should render form fields from schema', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={formRequest} onResponse={onResponse} />);

      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Your account username')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={formRequest} onResponse={onResponse} />);

      // Required fields should have asterisk
      const requiredFields = screen.getAllByText('*');
      expect(requiredFields).toHaveLength(2); // username and password
    });

    it('should handle form submission with accept', () => {
      const onResponse = vi.fn();
      const { container } = render(<ElicitationDialog request={formRequest} onResponse={onResponse} />);

      // Find inputs by their labels since they don't have placeholders
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'testpass' } });

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      expect(onResponse).toHaveBeenCalledWith({
        action: 'accept',
        content: expect.objectContaining({
          username: 'testuser',
          password: 'testpass',
        }),
      });
    });

    it('should call onResponse with decline when Decline clicked', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={formRequest} onResponse={onResponse} />);

      const declineButton = screen.getByText('Decline');
      fireEvent.click(declineButton);

      expect(onResponse).toHaveBeenCalledWith({ action: 'decline' });
    });

    it('should call onResponse with cancel when Cancel clicked', () => {
      const onResponse = vi.fn();
      render(<ElicitationDialog request={formRequest} onResponse={onResponse} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onResponse).toHaveBeenCalledWith({ action: 'cancel' });
    });
  });

  describe('Form Field Types', () => {
    it('should render string fields as text inputs', () => {
      const request: ElicitationRequest = {
        serverName: 'test',
        message: 'Test',
        requestId: 'req1',
        mode: 'form',
        requestedSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', title: 'Name' },
          },
        },
      };

      const onResponse = vi.fn();
      render(<ElicitationDialog request={request} onResponse={onResponse} />);

      const input = document.querySelector('input[type="text"]');
      expect(input).toBeInTheDocument();
    });

    it('should render number fields as number inputs', () => {
      const request: ElicitationRequest = {
        serverName: 'test',
        message: 'Test',
        requestId: 'req2',
        mode: 'form',
        requestedSchema: {
          type: 'object',
          properties: {
            age: { type: 'number', title: 'Age' },
          },
        },
      };

      const onResponse = vi.fn();
      render(<ElicitationDialog request={request} onResponse={onResponse} />);

      const input = document.querySelector('input[type="number"]');
      expect(input).toBeInTheDocument();
    });

    it('should render boolean fields as checkboxes', () => {
      const request: ElicitationRequest = {
        serverName: 'test',
        message: 'Test',
        requestId: 'req3',
        mode: 'form',
        requestedSchema: {
          type: 'object',
          properties: {
            agree: { type: 'boolean', title: 'I Agree' },
          },
        },
      };

      const onResponse = vi.fn();
      render(<ElicitationDialog request={request} onResponse={onResponse} />);

      const checkbox = document.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeInTheDocument();
    });

    it('should render enum fields as select dropdowns', () => {
      const request: ElicitationRequest = {
        serverName: 'test',
        message: 'Test',
        requestId: 'req4',
        mode: 'form',
        requestedSchema: {
          type: 'object',
          properties: {
            color: {
              type: 'string',
              title: 'Color',
              enum: ['red', 'green', 'blue'],
            },
          },
        },
      };

      const onResponse = vi.fn();
      render(<ElicitationDialog request={request} onResponse={onResponse} />);

      const select = document.querySelector('select');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('red')).toBeInTheDocument();
      expect(screen.getByText('green')).toBeInTheDocument();
      expect(screen.getByText('blue')).toBeInTheDocument();
    });
  });

  describe('Invalid Schema Handling', () => {
    it('should handle missing schema gracefully', () => {
      const request: ElicitationRequest = {
        serverName: 'test',
        message: 'Test',
        requestId: 'req5',
        mode: 'form',
        // No requestedSchema
      };

      const onResponse = vi.fn();
      render(<ElicitationDialog request={request} onResponse={onResponse} />);

      expect(screen.getByText('Invalid schema')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should handle schema without properties', () => {
      const request: ElicitationRequest = {
        serverName: 'test',
        message: 'Test',
        requestId: 'req6',
        mode: 'form',
        requestedSchema: {
          type: 'object',
          // No properties
        },
      };

      const onResponse = vi.fn();
      render(<ElicitationDialog request={request} onResponse={onResponse} />);

      expect(screen.getByText('Invalid schema')).toBeInTheDocument();
    });
  });

  describe('Modal Overlay', () => {
    it('should render modal with backdrop', () => {
      const request: ElicitationRequest = {
        serverName: 'test',
        message: 'Test',
        requestId: 'req7',
        mode: 'url',
        url: 'https://example.com',
      };

      const onResponse = vi.fn();
      const { container } = render(<ElicitationDialog request={request} onResponse={onResponse} />);

      const overlay = container.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(overlay).toBeInTheDocument();
    });

    it('should center modal content', () => {
      const request: ElicitationRequest = {
        serverName: 'test',
        message: 'Test',
        requestId: 'req8',
        mode: 'url',
        url: 'https://example.com',
      };

      const onResponse = vi.fn();
      const { container } = render(<ElicitationDialog request={request} onResponse={onResponse} />);

      const modal = container.querySelector('.flex.items-center.justify-center');
      expect(modal).toBeInTheDocument();
    });
  });
});
