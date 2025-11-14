/**
 * Elicitation Dialog Component
 * Handles both form mode and URL mode elicitation requests from MCP servers
 */

import { useState } from 'react';

export interface ElicitationRequest {
  serverName: string;
  message: string;
  requestId: string;
  mode: 'form' | 'url';
  // Form mode fields
  requestedSchema?: any;
  // URL mode fields
  url?: string;
  elicitationId?: string;
}

interface ElicitationDialogProps {
  request: ElicitationRequest;
  onResponse: (response: { action: 'accept' | 'decline' | 'cancel'; content?: Record<string, any> }) => void;
}

export function ElicitationDialog({ request, onResponse }: ElicitationDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  if (request.mode === 'url') {
    return <URLModeDialog request={request} onResponse={onResponse} />;
  }

  return <FormModeDialog request={request} onResponse={onResponse} formData={formData} setFormData={setFormData} />;
}

/**
 * URL Mode Dialog - Shows consent and opens URL in system browser
 */
function URLModeDialog({ request, onResponse }: ElicitationDialogProps) {
  const [isOpening, setIsOpening] = useState(false);

  const handleAccept = () => {
    setIsOpening(true);

    // Open URL in new tab (system browser)
    if (request.url) {
      window.open(request.url, '_blank', 'noopener,noreferrer');
    }

    // Return accept response
    onResponse({ action: 'accept' });
  };

  const handleDecline = () => {
    onResponse({ action: 'decline' });
  };

  const handleCancel = () => {
    onResponse({ action: 'cancel' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-gray-900">Secure Information Request</h3>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-semibold">{request.serverName}</span> needs additional information
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-4">{request.message}</p>

          {request.url && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-xs font-semibold text-yellow-800 mb-1">You will be redirected to:</p>
              <div className="bg-white rounded px-2 py-1 font-mono text-xs break-all">
                <span className="font-bold text-blue-600">{new URL(request.url).hostname}</span>
                <span className="text-gray-600">{new URL(request.url).pathname + new URL(request.url).search}</span>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                ⚠️ This will open in a new tab. The MCP server will not see your input.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            disabled={isOpening}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isOpening ? 'Opening...' : 'Open Secure Page'}
          </button>
          <button
            onClick={handleDecline}
            disabled={isOpening}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Decline
          </button>
          <button
            onClick={handleCancel}
            disabled={isOpening}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            Cancel
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Security: Data entered on the external page will not pass through this application.
        </p>
      </div>
    </div>
  );
}

/**
 * Form Mode Dialog - Shows auto-generated form from schema
 */
function FormModeDialog({
  request,
  onResponse,
  formData,
  setFormData,
}: ElicitationDialogProps & {
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}) {
  const schema = request.requestedSchema;

  if (!schema || !schema.properties) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <p className="text-red-600">Invalid schema</p>
          <button onClick={() => onResponse({ action: 'cancel' })} className="mt-4 px-4 py-2 bg-gray-200 rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onResponse({ action: 'accept', content: formData });
  };

  const handleDecline = () => {
    onResponse({ action: 'decline' });
  };

  const handleCancel = () => {
    onResponse({ action: 'cancel' });
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">Information Request</h3>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-semibold">{request.serverName}</span>
          </p>
        </div>

        <p className="text-sm text-gray-700 mb-4">{request.message}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(schema.properties).map(([key, fieldSchema]: [string, any]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {fieldSchema.title || key}
                {schema.required?.includes(key) && <span className="text-red-500 ml-1">*</span>}
              </label>

              {fieldSchema.description && (
                <p className="text-xs text-gray-500 mb-1">{fieldSchema.description}</p>
              )}

              {renderFormField(key, fieldSchema, formData[key] || fieldSchema.default, handleInputChange, schema.required?.includes(key))}
            </div>
          ))}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Render form field based on schema type
 */
function renderFormField(
  key: string,
  fieldSchema: any,
  value: any,
  onChange: (key: string, value: any) => void,
  required: boolean
) {
  const baseClasses = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  // Enum (select dropdown)
  if (fieldSchema.enum) {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(key, e.target.value)}
        required={required}
        className={baseClasses}
      >
        <option value="">Select...</option>
        {fieldSchema.enum.map((option: string, idx: number) => (
          <option key={option} value={option}>
            {fieldSchema.enumNames?.[idx] || option}
          </option>
        ))}
      </select>
    );
  }

  // oneOf (select with const values)
  if (fieldSchema.oneOf) {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(key, e.target.value)}
        required={required}
        className={baseClasses}
      >
        <option value="">Select...</option>
        {fieldSchema.oneOf.map((option: any) => (
          <option key={option.const} value={option.const}>
            {option.title || option.const}
          </option>
        ))}
      </select>
    );
  }

  // Boolean (checkbox)
  if (fieldSchema.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={value || false}
        onChange={(e) => onChange(key, e.target.checked)}
        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
    );
  }

  // Number
  if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
    return (
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(key, fieldSchema.type === 'integer' ? parseInt(e.target.value, 10) : parseFloat(e.target.value))}
        required={required}
        min={fieldSchema.minimum}
        max={fieldSchema.maximum}
        step={fieldSchema.type === 'integer' ? 1 : 'any'}
        className={baseClasses}
      />
    );
  }

  // String with format
  if (fieldSchema.type === 'string') {
    if (fieldSchema.format === 'email') {
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(key, e.target.value)}
          required={required}
          minLength={fieldSchema.minLength}
          maxLength={fieldSchema.maxLength}
          className={baseClasses}
        />
      );
    }

    if (fieldSchema.format === 'uri') {
      return (
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(key, e.target.value)}
          required={required}
          minLength={fieldSchema.minLength}
          maxLength={fieldSchema.maxLength}
          className={baseClasses}
        />
      );
    }

    if (fieldSchema.format === 'date') {
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(key, e.target.value)}
          required={required}
          className={baseClasses}
        />
      );
    }

    if (fieldSchema.format === 'date-time') {
      return (
        <input
          type="datetime-local"
          value={value || ''}
          onChange={(e) => onChange(key, e.target.value)}
          required={required}
          className={baseClasses}
        />
      );
    }

    // Default string input
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(key, e.target.value)}
        required={required}
        minLength={fieldSchema.minLength}
        maxLength={fieldSchema.maxLength}
        pattern={fieldSchema.pattern}
        className={baseClasses}
      />
    );
  }

  // Fallback
  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(key, e.target.value)}
      required={required}
      className={baseClasses}
    />
  );
}
