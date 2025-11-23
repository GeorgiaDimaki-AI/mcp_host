/**
 * Model Settings Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSettings, ModelSettingsProps } from '../components/Settings/ModelSettings';
import { ModelSettings as ModelSettingsType } from '../services/conversationService';

describe('ModelSettings', () => {
  let mockProps: ModelSettingsProps;

  beforeEach(() => {
    mockProps = {
      isOpen: true,
      currentModel: 'llama3.2',
      availableModels: ['llama3.2', 'gpt-4', 'claude-3'],
      settings: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
      },
      onClose: vi.fn(),
      onSave: vi.fn(),
    };
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<ModelSettings {...mockProps} isOpen={false} />);

      expect(screen.queryByText('Model Settings')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ModelSettings {...mockProps} />);

      expect(screen.getByText('Model Settings')).toBeInTheDocument();
    });

    it('should render all settings controls', () => {
      render(<ModelSettings {...mockProps} />);

      expect(screen.getByLabelText(/Model/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Temperature/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Top P/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Top K/)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<ModelSettings {...mockProps} />);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    it('should display description text', () => {
      render(<ModelSettings {...mockProps} />);

      expect(
        screen.getByText(/Configure model and generation settings/i)
      ).toBeInTheDocument();
    });

    it('should display info box about per-conversation settings', () => {
      render(<ModelSettings {...mockProps} />);

      expect(screen.getByText('Settings per Conversation')).toBeInTheDocument();
      expect(
        screen.getByText(/These settings are specific to this conversation/i)
      ).toBeInTheDocument();
    });
  });

  describe('Model Selection', () => {
    it('should display current model as selected', () => {
      render(<ModelSettings {...mockProps} />);

      const select = screen.getByLabelText(/Model/) as HTMLSelectElement;
      expect(select.value).toBe('llama3.2');
    });

    it('should render all available models', () => {
      render(<ModelSettings {...mockProps} />);

      const select = screen.getByLabelText(/Model/) as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.value);

      expect(options).toContain('llama3.2');
      expect(options).toContain('gpt-4');
      expect(options).toContain('claude-3');
    });

    it('should update selected model on change', () => {
      render(<ModelSettings {...mockProps} />);

      const select = screen.getByLabelText(/Model/) as HTMLSelectElement;

      fireEvent.change(select, { target: { value: 'gpt-4' } });

      expect(select.value).toBe('gpt-4');
    });

    it('should show message when no models available', () => {
      render(<ModelSettings {...mockProps} availableModels={[]} />);

      expect(screen.getByText('No models available')).toBeInTheDocument();
    });
  });

  describe('Temperature Setting', () => {
    it('should display current temperature value', () => {
      render(<ModelSettings {...mockProps} />);

      expect(screen.getByText('Temperature:')).toBeInTheDocument();
      expect(screen.getByText('0.70')).toBeInTheDocument();
    });

    it('should update temperature on slider change', () => {
      render(<ModelSettings {...mockProps} />);

      const slider = screen.getByLabelText(/Temperature/) as HTMLInputElement;

      fireEvent.change(slider, { target: { value: '1.5' } });

      expect(screen.getByText('1.50')).toBeInTheDocument();
    });

    it('should have correct temperature range', () => {
      render(<ModelSettings {...mockProps} />);

      const slider = screen.getByLabelText(/Temperature/) as HTMLInputElement;

      expect(slider.min).toBe('0');
      expect(slider.max).toBe('2');
      expect(slider.step).toBe('0.01');
    });

    it('should display temperature help text', () => {
      render(<ModelSettings {...mockProps} />);

      expect(
        screen.getByText(/Controls randomness/i)
      ).toBeInTheDocument();
    });

    it('should use default temperature if not provided', () => {
      const propsWithoutTemp: ModelSettingsProps = {
        ...mockProps,
        settings: {},
      };

      render(<ModelSettings {...propsWithoutTemp} />);

      expect(screen.getByText('0.70')).toBeInTheDocument();
    });
  });

  describe('Top P Setting', () => {
    it('should display current top_p value', () => {
      render(<ModelSettings {...mockProps} />);

      expect(screen.getByText(/Top P/)).toBeInTheDocument();
      expect(screen.getByText('0.90')).toBeInTheDocument();
    });

    it('should update top_p on slider change', () => {
      render(<ModelSettings {...mockProps} />);

      const slider = screen.getByLabelText(/Top P/) as HTMLInputElement;

      fireEvent.change(slider, { target: { value: '0.5' } });

      expect(screen.getByText('0.50')).toBeInTheDocument();
    });

    it('should have correct top_p range', () => {
      render(<ModelSettings {...mockProps} />);

      const slider = screen.getByLabelText(/Top P/) as HTMLInputElement;

      expect(slider.min).toBe('0');
      expect(slider.max).toBe('1');
      expect(slider.step).toBe('0.01');
    });

    it('should display top_p help text', () => {
      render(<ModelSettings {...mockProps} />);

      expect(
        screen.getByText(/Controls diversity via nucleus sampling/i)
      ).toBeInTheDocument();
    });

    it('should use default top_p if not provided', () => {
      const propsWithoutTopP: ModelSettingsProps = {
        ...mockProps,
        settings: {},
      };

      render(<ModelSettings {...propsWithoutTopP} />);

      expect(screen.getByText('0.90')).toBeInTheDocument();
    });
  });

  describe('Top K Setting', () => {
    it('should display current top_k value', () => {
      render(<ModelSettings {...mockProps} />);

      expect(screen.getByText(/Top K:/)).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
    });

    it('should update top_k on slider change', () => {
      render(<ModelSettings {...mockProps} />);

      const slider = screen.getByLabelText(/Top K/) as HTMLInputElement;

      fireEvent.change(slider, { target: { value: '80' } });

      expect(screen.getByText('80')).toBeInTheDocument();
    });

    it('should have correct top_k range', () => {
      render(<ModelSettings {...mockProps} />);

      const slider = screen.getByLabelText(/Top K/) as HTMLInputElement;

      expect(slider.min).toBe('1');
      expect(slider.max).toBe('100');
      expect(slider.step).toBe('1');
    });

    it('should display top_k help text', () => {
      render(<ModelSettings {...mockProps} />);

      expect(
        screen.getByText(/Limits the number of highest probability tokens/i)
      ).toBeInTheDocument();
    });

    it('should use default top_k if not provided', () => {
      const propsWithoutTopK: ModelSettingsProps = {
        ...mockProps,
        settings: {},
      };

      render(<ModelSettings {...propsWithoutTopK} />);

      expect(screen.getByText('40')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onClose when Cancel clicked', () => {
      render(<ModelSettings {...mockProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when X button clicked', () => {
      render(<ModelSettings {...mockProps} />);

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop clicked', () => {
      const { container } = render(<ModelSettings {...mockProps} />);

      const backdrop = container.querySelector('.fixed.inset-0');
      expect(backdrop).toBeInTheDocument();

      fireEvent.click(backdrop!);

      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content clicked', () => {
      const { container } = render(<ModelSettings {...mockProps} />);

      const modalContent = container.querySelector('.bg-background-secondary.rounded-lg');
      expect(modalContent).toBeInTheDocument();

      fireEvent.click(modalContent!);

      expect(mockProps.onClose).not.toHaveBeenCalled();
    });

    it('should call onSave with updated settings when Save clicked', () => {
      render(<ModelSettings {...mockProps} />);

      // Change model
      const modelSelect = screen.getByLabelText(/Model/) as HTMLSelectElement;
      fireEvent.change(modelSelect, { target: { value: 'gpt-4' } });

      // Change temperature
      const tempSlider = screen.getByLabelText(/Temperature/) as HTMLInputElement;
      fireEvent.change(tempSlider, { target: { value: '1.2' } });

      // Change top_p
      const topPSlider = screen.getByLabelText(/Top P/) as HTMLInputElement;
      fireEvent.change(topPSlider, { target: { value: '0.8' } });

      // Change top_k
      const topKSlider = screen.getByLabelText(/Top K/) as HTMLInputElement;
      fireEvent.change(topKSlider, { target: { value: '50' } });

      // Click Save
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      expect(mockProps.onSave).toHaveBeenCalledWith('gpt-4', {
        temperature: 1.2,
        top_p: 0.8,
        top_k: 50,
      });
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should reset settings to defaults when Reset clicked', () => {
      render(<ModelSettings {...mockProps} />);

      // Change some settings
      const tempSlider = screen.getByLabelText(/Temperature/) as HTMLInputElement;
      fireEvent.change(tempSlider, { target: { value: '1.5' } });

      const topPSlider = screen.getByLabelText(/Top P/) as HTMLInputElement;
      fireEvent.change(topPSlider, { target: { value: '0.5' } });

      // Verify changes
      expect(screen.getByText('1.50')).toBeInTheDocument();
      expect(screen.getByText('0.50')).toBeInTheDocument();

      // Click Reset
      const resetButton = screen.getByText('Reset to Defaults');
      fireEvent.click(resetButton);

      // Verify defaults restored
      expect(screen.getByText('0.70')).toBeInTheDocument();
      expect(screen.getByText('0.90')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should reset state when reopened', () => {
      const { rerender } = render(<ModelSettings {...mockProps} />);

      // Change temperature
      const slider = screen.getByLabelText(/Temperature/) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '1.5' } });
      expect(screen.getByText('1.50')).toBeInTheDocument();

      // Close modal
      rerender(<ModelSettings {...mockProps} isOpen={false} />);

      // Reopen with different settings
      const newSettings: ModelSettingsType = {
        temperature: 0.3,
        top_p: 0.5,
        top_k: 20,
      };
      rerender(
        <ModelSettings
          {...mockProps}
          isOpen={true}
          settings={newSettings}
        />
      );

      // Should show new settings
      expect(screen.getByText('0.30')).toBeInTheDocument();
      expect(screen.getByText('0.50')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should update when currentModel changes', () => {
      const { rerender } = render(<ModelSettings {...mockProps} />);

      let select = screen.getByLabelText(/Model/) as HTMLSelectElement;
      expect(select.value).toBe('llama3.2');

      // Rerender with different model
      rerender(<ModelSettings {...mockProps} currentModel="gpt-4" />);

      select = screen.getByLabelText(/Model/) as HTMLSelectElement;
      expect(select.value).toBe('gpt-4');
    });

    it('should maintain local changes until saved or cancelled', () => {
      render(<ModelSettings {...mockProps} />);

      // Change temperature
      const slider = screen.getByLabelText(/Temperature/) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '1.5' } });

      expect(screen.getByText('1.50')).toBeInTheDocument();

      // Don't save or cancel - value should persist
      expect(slider.value).toBe('1.5');
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme temperature values', () => {
      render(<ModelSettings {...mockProps} />);

      const slider = screen.getByLabelText(/Temperature/) as HTMLInputElement;

      fireEvent.change(slider, { target: { value: '0' } });
      expect(screen.getByText('0.00')).toBeInTheDocument();

      fireEvent.change(slider, { target: { value: '2' } });
      expect(screen.getByText('2.00')).toBeInTheDocument();
    });

    it('should handle extreme top_p values', () => {
      render(<ModelSettings {...mockProps} />);

      const slider = screen.getByLabelText(/Top P/) as HTMLInputElement;

      fireEvent.change(slider, { target: { value: '0' } });
      expect(screen.getByText('0.00')).toBeInTheDocument();

      fireEvent.change(slider, { target: { value: '1' } });
      expect(screen.getByText('1.00')).toBeInTheDocument();
    });

    it('should handle extreme top_k values', () => {
      render(<ModelSettings {...mockProps} />);

      const slider = screen.getByLabelText(/Top K/) as HTMLInputElement;

      fireEvent.change(slider, { target: { value: '1' } });
      expect(slider.value).toBe('1');

      fireEvent.change(slider, { target: { value: '100' } });
      expect(slider.value).toBe('100');
    });

    it('should handle empty model list gracefully', () => {
      render(<ModelSettings {...mockProps} availableModels={[]} />);

      expect(screen.getByText('No models available')).toBeInTheDocument();
    });

    it('should handle undefined settings values', () => {
      const propsWithUndefined: ModelSettingsProps = {
        ...mockProps,
        settings: {
          temperature: undefined,
          top_p: undefined,
          top_k: undefined,
        },
      };

      render(<ModelSettings {...propsWithUndefined} />);

      // Should use defaults
      expect(screen.getByText('0.70')).toBeInTheDocument();
      expect(screen.getByText('0.90')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<ModelSettings {...mockProps} />);

      expect(screen.getByLabelText(/Model/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Temperature/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Top P/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Top K/)).toBeInTheDocument();
    });

    it('should have close button with aria-label', () => {
      render(<ModelSettings {...mockProps} />);

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      const { container } = render(<ModelSettings {...mockProps} />);

      const h2 = container.querySelector('h2');
      expect(h2?.textContent).toBe('Model Settings');

      const h4 = container.querySelector('h4');
      expect(h4?.textContent).toBe('Settings per Conversation');
    });
  });
});
