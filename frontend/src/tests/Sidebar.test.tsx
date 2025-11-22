/**
 * Sidebar Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar, SidebarProps } from '../components/Sidebar/Sidebar';
import { Conversation } from '../services/conversationService';

describe('Sidebar', () => {
  let mockProps: SidebarProps;

  const createMockConversation = (overrides?: Partial<Conversation>): Conversation => ({
    id: 'conv-1',
    title: 'Test Conversation',
    created: Date.now() - 3600000, // 1 hour ago
    modified: Date.now() - 1800000, // 30 minutes ago
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      },
    ],
    model: 'llama3.2',
    settings: {},
    ...overrides,
  });

  beforeEach(() => {
    mockProps = {
      conversations: [],
      currentConversationId: null,
      isCollapsed: false,
      onToggleCollapse: vi.fn(),
      onSelectConversation: vi.fn(),
      onCreateConversation: vi.fn(),
      onDeleteConversation: vi.fn(),
    };
  });

  describe('Collapsed State', () => {
    it('should render collapsed sidebar', () => {
      render(<Sidebar {...mockProps} isCollapsed={true} />);

      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
      expect(screen.queryByText('Conversations')).not.toBeInTheDocument();
    });

    it('should call onToggleCollapse when expand button clicked', () => {
      render(<Sidebar {...mockProps} isCollapsed={true} />);

      fireEvent.click(screen.getByLabelText('Expand sidebar'));

      expect(mockProps.onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('should show new conversation button in collapsed state', () => {
      render(<Sidebar {...mockProps} isCollapsed={true} />);

      const newButton = screen.getByLabelText('New conversation');
      expect(newButton).toBeInTheDocument();

      fireEvent.click(newButton);
      expect(mockProps.onCreateConversation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Expanded State', () => {
    it('should render expanded sidebar with header', () => {
      render(<Sidebar {...mockProps} />);

      expect(screen.getByText('Conversations')).toBeInTheDocument();
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
    });

    it('should call onToggleCollapse when collapse button clicked', () => {
      render(<Sidebar {...mockProps} />);

      fireEvent.click(screen.getByLabelText('Collapse sidebar'));

      expect(mockProps.onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('should show "New Chat" button', () => {
      render(<Sidebar {...mockProps} />);

      const newButton = screen.getByText('New Chat');
      expect(newButton).toBeInTheDocument();

      fireEvent.click(newButton);
      expect(mockProps.onCreateConversation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('should show empty state message when no conversations', () => {
      render(<Sidebar {...mockProps} conversations={[]} />);

      expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Start a new chat/i)).toBeInTheDocument();
    });

    it('should show "0 conversations" in footer', () => {
      render(<Sidebar {...mockProps} conversations={[]} />);

      expect(screen.getByText('0 conversations')).toBeInTheDocument();
    });
  });

  describe('Conversation List', () => {
    it('should render list of conversations', () => {
      const conversations = [
        createMockConversation({ id: 'conv-1', title: 'Conversation 1' }),
        createMockConversation({ id: 'conv-2', title: 'Conversation 2' }),
        createMockConversation({ id: 'conv-3', title: 'Conversation 3' }),
      ];

      render(<Sidebar {...mockProps} conversations={conversations} />);

      expect(screen.getByText('Conversation 1')).toBeInTheDocument();
      expect(screen.getByText('Conversation 2')).toBeInTheDocument();
      expect(screen.getByText('Conversation 3')).toBeInTheDocument();
    });

    it('should display conversation metadata', () => {
      const conversation = createMockConversation({
        title: 'Test Chat',
        model: 'gpt-4',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() },
          { id: 'msg-2', role: 'assistant', content: 'Hi', timestamp: Date.now() },
        ],
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      expect(screen.getByText('Test Chat')).toBeInTheDocument();
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('2 msgs')).toBeInTheDocument();
    });

    it('should show message count as singular for 1 message', () => {
      const conversation = createMockConversation({
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() },
        ],
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      expect(screen.getByText('1 msg')).toBeInTheDocument();
    });

    it('should display last message preview', () => {
      const conversation = createMockConversation({
        messages: [
          { id: 'msg-1', role: 'user', content: 'First message', timestamp: Date.now() },
          { id: 'msg-2', role: 'assistant', content: 'Last message preview', timestamp: Date.now() },
        ],
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      expect(screen.getByText('Last message preview')).toBeInTheDocument();
    });

    it('should highlight current conversation', () => {
      const conversations = [
        createMockConversation({ id: 'conv-1', title: 'Current' }),
        createMockConversation({ id: 'conv-2', title: 'Other' }),
      ];

      const { container } = render(<Sidebar {...mockProps} conversations={conversations} currentConversationId="conv-1" />);

      const currentConv = container.querySelector('.bg-blue-50.border-blue-200');
      expect(currentConv).toBeInTheDocument();
      expect(currentConv?.textContent).toContain('Current');
    });

    it('should call onSelectConversation when conversation clicked', () => {
      const conversations = [createMockConversation({ id: 'conv-1', title: 'Test' })];

      render(<Sidebar {...mockProps} conversations={conversations} />);

      const convElement = screen.getByText('Test');
      fireEvent.click(convElement);

      expect(mockProps.onSelectConversation).toHaveBeenCalledWith('conv-1');
    });

    it('should show conversation count in footer', () => {
      const conversations = [
        createMockConversation({ id: 'conv-1' }),
        createMockConversation({ id: 'conv-2' }),
        createMockConversation({ id: 'conv-3' }),
      ];

      render(<Sidebar {...mockProps} conversations={conversations} />);

      expect(screen.getByText('3 conversations')).toBeInTheDocument();
    });

    it('should show singular "conversation" for count of 1', () => {
      const conversations = [createMockConversation()];

      render(<Sidebar {...mockProps} conversations={conversations} />);

      expect(screen.getByText('1 conversation')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should show "Just now" for very recent conversations', () => {
      const conversation = createMockConversation({
        modified: Date.now() - 30000, // 30 seconds ago
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should show minutes ago for recent conversations', () => {
      const conversation = createMockConversation({
        modified: Date.now() - 300000, // 5 minutes ago
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      expect(screen.getByText(/5m ago/)).toBeInTheDocument();
    });

    it('should show hours ago for conversations from today', () => {
      const conversation = createMockConversation({
        modified: Date.now() - 7200000, // 2 hours ago
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      expect(screen.getByText(/2h ago/)).toBeInTheDocument();
    });

    it('should show days ago for recent conversations', () => {
      const conversation = createMockConversation({
        modified: Date.now() - 172800000, // 2 days ago
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      expect(screen.getByText(/2d ago/)).toBeInTheDocument();
    });

    it('should show date for older conversations', () => {
      const conversation = createMockConversation({
        modified: Date.now() - 864000000, // 10 days ago
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      // Should show abbreviated month and day (e.g., "Jan 15")
      const dateElement = screen.getByText(/\w{3} \d{1,2}/);
      expect(dateElement).toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('should show delete button on hover', () => {
      const conversations = [createMockConversation({ title: 'Test' })];

      render(<Sidebar {...mockProps} conversations={conversations} />);

      const deleteButton = screen.getByLabelText('Delete conversation');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should require double-click to confirm delete', () => {
      const conversations = [createMockConversation({ id: 'conv-1', title: 'Test' })];

      render(<Sidebar {...mockProps} conversations={conversations} />);

      const deleteButton = screen.getByLabelText('Delete conversation');

      // First click - should ask for confirmation
      fireEvent.click(deleteButton);
      expect(mockProps.onDeleteConversation).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Confirm delete conversation')).toBeInTheDocument();

      // Second click - should delete
      fireEvent.click(deleteButton);
      expect(mockProps.onDeleteConversation).toHaveBeenCalledWith('conv-1');
    });

    it('should cancel delete confirmation after timeout', async () => {
      vi.useFakeTimers();

      const conversations = [createMockConversation({ title: 'Test' })];

      render(<Sidebar {...mockProps} conversations={conversations} />);

      const deleteButton = screen.getByLabelText('Delete conversation');

      // First click
      fireEvent.click(deleteButton);
      expect(screen.getByLabelText('Confirm delete conversation')).toBeInTheDocument();

      // Wait for timeout and run all timers
      await vi.advanceTimersByTimeAsync(3100);

      // Now the button should be back to normal
      expect(screen.queryByLabelText('Confirm delete conversation')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Delete conversation')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should stop propagation when delete button clicked', () => {
      const conversations = [createMockConversation({ id: 'conv-1', title: 'Test' })];

      render(<Sidebar {...mockProps} conversations={conversations} />);

      const deleteButton = screen.getByLabelText('Delete conversation');

      fireEvent.click(deleteButton);

      // onSelectConversation should not be called because event propagation stopped
      expect(mockProps.onSelectConversation).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle conversations with no messages', () => {
      const conversation = createMockConversation({
        messages: [],
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      expect(screen.getByText('Test Conversation')).toBeInTheDocument();
      expect(screen.queryByText(/msg/)).not.toBeInTheDocument();
    });

    it('should truncate long conversation titles', () => {
      const longTitle = 'A'.repeat(100);
      const conversation = createMockConversation({
        title: longTitle,
      });

      const { container } = render(<Sidebar {...mockProps} conversations={[conversation]} />);

      const titleElement = container.querySelector('.truncate');
      expect(titleElement).toBeInTheDocument();
    });

    it('should handle conversations with no model set', () => {
      const conversation = createMockConversation({
        model: '',
      });

      render(<Sidebar {...mockProps} conversations={[conversation]} />);

      expect(screen.getByText('Test Conversation')).toBeInTheDocument();
    });

    it('should handle multiple delete confirmations at once', () => {
      const conversations = [
        createMockConversation({ id: 'conv-1', title: 'First' }),
        createMockConversation({ id: 'conv-2', title: 'Second' }),
      ];

      const { container } = render(<Sidebar {...mockProps} conversations={conversations} />);

      const deleteButtons = screen.getAllByLabelText('Delete conversation');

      // Start confirming delete on first
      fireEvent.click(deleteButtons[0]);

      // Check that first button is in confirm state
      let confirmButton = screen.getByLabelText('Confirm delete conversation');
      expect(confirmButton).toBeInTheDocument();

      // Start confirming delete on second - should cancel first
      fireEvent.click(deleteButtons[1]);

      // Only second should be in confirm state
      const confirmButtons = screen.getAllByLabelText('Confirm delete conversation');
      expect(confirmButtons).toHaveLength(1);
    });

    it('should handle rapid clicks on new conversation button', () => {
      render(<Sidebar {...mockProps} />);

      const newButton = screen.getByText('New Chat');

      fireEvent.click(newButton);
      fireEvent.click(newButton);
      fireEvent.click(newButton);

      expect(mockProps.onCreateConversation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Sidebar {...mockProps} />);

      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
    });

    it('should have proper ARIA labels in collapsed state', () => {
      render(<Sidebar {...mockProps} isCollapsed={true} />);

      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
      expect(screen.getByLabelText('New conversation')).toBeInTheDocument();
    });

    it('should show title attributes on buttons', () => {
      render(<Sidebar {...mockProps} />);

      const collapseButton = screen.getByLabelText('Collapse sidebar');
      expect(collapseButton).toHaveAttribute('title', 'Collapse sidebar');
    });

    it('should update delete button title for confirmation', () => {
      const conversations = [createMockConversation()];

      render(<Sidebar {...mockProps} conversations={conversations} />);

      const deleteButton = screen.getByLabelText('Delete conversation');
      expect(deleteButton).toHaveAttribute('title', 'Delete conversation');

      fireEvent.click(deleteButton);

      const confirmButton = screen.getByLabelText('Confirm delete conversation');
      expect(confirmButton).toHaveAttribute('title', 'Click to confirm deletion');
    });
  });
});
