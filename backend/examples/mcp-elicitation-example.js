#!/usr/bin/env node

/**
 * MCP Server with True Elicitation Pattern
 *
 * This demonstrates TRUE elicitation where:
 * 1. User initiates a tool (e.g., "deploy app")
 * 2. Tool realizes it needs more info (e.g., environment, API keys)
 * 3. Tool PAUSES and sends elicitation request (webview form)
 * 4. User provides the information
 * 5. Tool RESUMES and completes the original task
 * 6. Returns final result
 *
 * This is different from just showing a form - the tool execution
 * is actually paused waiting for user input before continuing.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Storage for execution state (in production, use Redis or similar)
const executionState = new Map();

const server = new Server(
  {
    name: 'elicitation-example',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'deploy_application',
        description: 'Deploy an application (requires elicitation for config)',
        inputSchema: {
          type: 'object',
          properties: {
            appName: {
              type: 'string',
              description: 'Name of the application to deploy',
            },
            // These will be collected via elicitation if not provided
            environment: {
              type: 'string',
              description: 'Target environment (optional, will ask if not provided)',
            },
            apiKey: {
              type: 'string',
              description: 'API key (optional, will ask if not provided)',
            },
            confirmDeploy: {
              type: 'boolean',
              description: 'Confirmation (optional, will ask if not provided)',
            },
          },
          required: ['appName'],
        },
      },
      {
        name: 'query_database',
        description: 'Query database with interactive query builder',
        inputSchema: {
          type: 'object',
          properties: {
            // If query is provided, execute directly
            // If not, elicit via query builder
            query: {
              type: 'string',
              description: 'SQL query (optional, will use builder if not provided)',
            },
          },
        },
      },
      {
        name: 'configure_service',
        description: 'Multi-step service configuration',
        inputSchema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Name of service to configure',
            },
          },
          required: ['serviceName'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls with elicitation
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'deploy_application':
      return handleDeployApplication(args);

    case 'query_database':
      return handleQueryDatabase(args);

    case 'configure_service':
      return handleConfigureService(args);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * Example 1: Deploy Application
 * Elicits missing configuration before deploying
 */
function handleDeployApplication(args) {
  const { appName, environment, apiKey, confirmDeploy, _elicitationData } = args;

  // If this is a continuation from elicitation
  if (_elicitationData) {
    // Resume execution with collected data
    const config = {
      appName,
      environment: _elicitationData.environment,
      apiKey: _elicitationData.apiKey,
      confirmed: _elicitationData.confirmDeploy,
    };

    // Perform actual deployment
    return performDeployment(config);
  }

  // Check what information is missing
  const needsEnvironment = !environment;
  const needsApiKey = !apiKey;
  const needsConfirmation = confirmDeploy === undefined;

  if (needsEnvironment || needsApiKey || needsConfirmation) {
    // PAUSE execution and elicit missing information
    return elicitDeploymentConfig(appName, {
      needsEnvironment,
      needsApiKey,
      needsConfirmation,
      providedEnvironment: environment,
      providedApiKey: apiKey,
    });
  }

  // All info provided, proceed with deployment
  return performDeployment({ appName, environment, apiKey, confirmed: confirmDeploy });
}

/**
 * Elicit deployment configuration
 */
function elicitDeploymentConfig(appName, needs) {
  return {
    content: [
      {
        type: 'text',
        text: `Deploying **${appName}**. I need some additional information:

\`\`\`webview:form
<div style="max-width: 600px; padding: 20px;">
  <h2 style="margin-top: 0;">🚀 Deployment Configuration</h2>
  <p style="color: #6b7280; margin-bottom: 24px;">
    Please provide the following information to continue deployment:
  </p>

  <form id="deployForm">
    <input type="hidden" name="_elicitationResponse" value="true" />
    <input type="hidden" name="appName" value="${appName}" />

    ${
      needs.needsEnvironment
        ? `
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">
        Target Environment *
      </label>
      <select name="environment" required style="width: 100%;">
        <option value="">Select environment...</option>
        <option value="development">Development</option>
        <option value="staging">Staging</option>
        <option value="production">Production</option>
      </select>
      <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">
        Choose where to deploy the application
      </p>
    </div>
    `
        : `<input type="hidden" name="environment" value="${needs.providedEnvironment}" />`
    }

    ${
      needs.needsApiKey
        ? `
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">
        API Key *
      </label>
      <input
        type="password"
        name="apiKey"
        required
        placeholder="Enter your API key"
        style="width: 100%;"
      />
      <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">
        Your API key for deployment authentication
      </p>
    </div>
    `
        : `<input type="hidden" name="apiKey" value="${needs.providedApiKey || ''}" />`
    }

    ${
      needs.needsConfirmation
        ? `
    <div style="margin-bottom: 24px; padding: 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <label style="display: flex; align-items: center; cursor: pointer;">
        <input type="checkbox" name="confirmDeploy" required style="width: auto; margin-right: 8px;" />
        <span style="font-weight: 500;">
          I confirm that I want to deploy <strong>${appName}</strong>
        </span>
      </label>
    </div>
    `
        : ''
    }

    <div style="display: flex; gap: 12px;">
      <button type="submit" style="flex: 1; padding: 12px; font-size: 16px; background: #3b82f6;">
        Continue Deployment →
      </button>
      <button type="button" onclick="cancelDeployment()" style="flex: 0 0 auto; padding: 12px 24px; background: #6b7280;">
        Cancel
      </button>
    </div>
  </form>

  <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
    <strong style="color: #1e40af;">🔒 Privacy Note:</strong>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #1e40af;">
      This data is collected directly by the MCP server and does not pass through the LLM.
      Your API key is safe.
    </p>
  </div>
</div>

<script>
document.getElementById('deployForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const formData = {
    _continueExecution: true,
    _tool: 'deploy_application',
    _elicitationData: {
      environment: e.target.environment.value,
      apiKey: e.target.apiKey.value,
      confirmDeploy: e.target.confirmDeploy ? e.target.confirmDeploy.checked : true,
    },
    appName: e.target.appName.value,
  };

  window.sendToHost({ type: 'elicitation-response', formData });
});

function cancelDeployment() {
  window.sendToHost({ type: 'elicitation-cancelled' });
}
</script>
\`\`\``,
      },
    ],
  };
}

/**
 * Perform the actual deployment with collected config
 */
function performDeployment(config) {
  const { appName, environment, apiKey, confirmed } = config;

  // Simulate deployment process
  const deploymentId = 'deploy-' + Date.now();

  return {
    content: [
      {
        type: 'text',
        text: `✅ Deployment completed successfully!

\`\`\`webview:result
<div style="padding: 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="font-size: 48px; margin-bottom: 8px;">✅</div>
    <h2 style="margin: 0; color: #059669;">Deployment Successful</h2>
  </div>

  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #374151;">Deployment Details</h3>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280; width: 180px;">Application:</td>
        <td style="padding: 8px 0; font-weight: 600;">${appName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Environment:</td>
        <td style="padding: 8px 0; font-weight: 600;">${environment}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Deployment ID:</td>
        <td style="padding: 8px 0; font-family: monospace; font-size: 13px;">${deploymentId}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Status:</td>
        <td style="padding: 8px 0;">
          <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">
            Active
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Deployed At:</td>
        <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
  </div>

  <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
    <strong style="color: #065f46;">🎉 What's Next?</strong>
    <p style="margin: 8px 0 0 0; color: #047857; font-size: 14px;">
      Your application is now live! You can monitor its status in the dashboard.
    </p>
  </div>
</div>
\`\`\`

**Note:** The deployment was paused to collect your API key and confirmation, then resumed automatically. Your sensitive data never touched the LLM.`,
      },
    ],
  };
}

/**
 * Example 2: Query Database
 * Uses elicitation to build query interactively if not provided
 */
function handleQueryDatabase(args) {
  const { query, _elicitationData } = args;

  // If query provided directly, execute it
  if (query && !_elicitationData) {
    return executeQuery(query);
  }

  // If returning from elicitation with query
  if (_elicitationData && _elicitationData.query) {
    return executeQuery(_elicitationData.query);
  }

  // No query provided, elicit via query builder
  return elicitQueryBuilder();
}

function elicitQueryBuilder() {
  return {
    content: [
      {
        type: 'text',
        text: `I need more information to build your query:

\`\`\`webview:form
<div style="max-width: 700px; padding: 20px;">
  <h2 style="margin-top: 0;">🔍 Interactive Query Builder</h2>

  <form id="queryForm">
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">Table</label>
      <select name="table" required style="width: 100%;" onchange="updatePreview()">
        <option value="">Select table...</option>
        <option value="users">users</option>
        <option value="orders">orders</option>
        <option value="products">products</option>
      </select>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">Columns (comma-separated)</label>
      <input
        type="text"
        name="columns"
        value="*"
        style="width: 100%;"
        onkeyup="updatePreview()"
      />
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">WHERE clause (optional)</label>
      <input
        type="text"
        name="where"
        placeholder="status = 'active'"
        style="width: 100%;"
        onkeyup="updatePreview()"
      />
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">LIMIT</label>
      <input
        type="number"
        name="limit"
        value="10"
        style="width: 100%;"
        onkeyup="updatePreview()"
      />
    </div>

    <div style="margin-bottom: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
      <strong style="display: block; margin-bottom: 8px;">Generated Query:</strong>
      <pre id="preview" style="margin: 0; font-family: monospace; font-size: 14px; color: #1f2937; white-space: pre-wrap;">SELECT * FROM ...</pre>
    </div>

    <button type="submit" style="width: 100%; padding: 12px; font-size: 16px;">
      Execute Query →
    </button>
  </form>
</div>

<script>
function updatePreview() {
  const form = document.getElementById('queryForm');
  const table = form.table.value;
  const columns = form.columns.value || '*';
  const where = form.where.value;
  const limit = form.limit.value;

  let query = 'SELECT ' + columns;
  if (table) query += ' FROM ' + table;
  if (where) query += ' WHERE ' + where;
  if (limit) query += ' LIMIT ' + limit;

  document.getElementById('preview').textContent = query;
}

document.getElementById('queryForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const table = e.target.table.value;
  const columns = e.target.columns.value || '*';
  const where = e.target.where.value;
  const limit = e.target.limit.value;

  let query = 'SELECT ' + columns + ' FROM ' + table;
  if (where) query += ' WHERE ' + where;
  if (limit) query += ' LIMIT ' + limit;

  window.sendToHost({
    type: 'elicitation-response',
    formData: {
      _continueExecution: true,
      _tool: 'query_database',
      _elicitationData: { query }
    }
  });
});
</script>
\`\`\``,
      },
    ],
  };
}

function executeQuery(query) {
  // Simulate query execution
  const mockResults = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive' },
  ];

  const resultsHtml = mockResults
    .map(
      row => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${row.id}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${row.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${row.email}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        <span style="background: ${row.status === 'active' ? '#d1fae5' : '#fee2e2'};
                     color: ${row.status === 'active' ? '#065f46' : '#991b1b'};
                     padding: 4px 8px; border-radius: 4px; font-size: 12px;">
          ${row.status}
        </span>
      </td>
    </tr>
  `
    )
    .join('');

  return {
    content: [
      {
        type: 'text',
        text: `Query executed successfully:

\`\`\`webview:result
<div style="padding: 20px;">
  <h3 style="margin-top: 0;">Query Results</h3>

  <div style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 4px; font-family: monospace; font-size: 13px; color: #1f2937;">
    ${query}
  </div>

  <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <thead>
      <tr style="background: #f9fafb;">
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">ID</th>
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Name</th>
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Email</th>
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${resultsHtml}
    </tbody>
  </table>

  <div style="margin-top: 16px; color: #6b7280; font-size: 14px;">
    Showing ${mockResults.length} results
  </div>
</div>
\`\`\``,
      },
    ],
  };
}

/**
 * Example 3: Multi-step Service Configuration
 */
function handleConfigureService(args) {
  const { serviceName, _elicitationData, _step } = args;

  const currentStep = _step || 1;

  if (currentStep === 1) {
    // Step 1: Basic configuration
    return elicitStep1(serviceName);
  } else if (currentStep === 2 && _elicitationData) {
    // Step 2: Advanced settings
    return elicitStep2(serviceName, _elicitationData);
  } else if (currentStep === 3 && _elicitationData) {
    // Final step: Confirmation and apply
    return applyConfiguration(serviceName, _elicitationData);
  }

  return { content: [{ type: 'text', text: 'Invalid configuration state' }] };
}

function elicitStep1(serviceName) {
  return {
    content: [
      {
        type: 'text',
        text: `Starting configuration for **${serviceName}** (Step 1/2):

\`\`\`webview:form
<div style="max-width: 600px; padding: 20px;">
  <div style="margin-bottom: 24px;">
    <h2 style="margin: 0 0 8px 0;">⚙️ Service Configuration</h2>
    <div style="background: #eff6ff; padding: 12px; border-radius: 4px; font-size: 14px; color: #1e40af;">
      Step 1 of 2: Basic Settings
    </div>
  </div>

  <form id="configForm">
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">Port</label>
      <input type="number" name="port" value="3000" required style="width: 100%;" />
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">Host</label>
      <input type="text" name="host" value="localhost" required style="width: 100%;" />
    </div>

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">Protocol</label>
      <select name="protocol" required style="width: 100%;">
        <option value="http">HTTP</option>
        <option value="https">HTTPS</option>
      </select>
    </div>

    <button type="submit" style="width: 100%; padding: 12px; font-size: 16px;">
      Next Step →
    </button>
  </form>
</div>

<script>
document.getElementById('configForm').addEventListener('submit', function(e) {
  e.preventDefault();

  window.sendToHost({
    type: 'elicitation-response',
    formData: {
      _continueExecution: true,
      _tool: 'configure_service',
      _step: 2,
      _elicitationData: {
        port: e.target.port.value,
        host: e.target.host.value,
        protocol: e.target.protocol.value,
      },
      serviceName: '${serviceName}'
    }
  });
});
</script>
\`\`\``,
      },
    ],
  };
}

function elicitStep2(serviceName, step1Data) {
  return {
    content: [
      {
        type: 'text',
        text: `Continuing configuration for **${serviceName}** (Step 2/2):

\`\`\`webview:form
<div style="max-width: 600px; padding: 20px;">
  <div style="margin-bottom: 24px;">
    <h2 style="margin: 0 0 8px 0;">⚙️ Service Configuration</h2>
    <div style="background: #eff6ff; padding: 12px; border-radius: 4px; font-size: 14px; color: #1e40af;">
      Step 2 of 2: Advanced Settings
    </div>
  </div>

  <form id="configForm">
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">Max Connections</label>
      <input type="number" name="maxConnections" value="100" required style="width: 100%;" />
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">Timeout (seconds)</label>
      <input type="number" name="timeout" value="30" required style="width: 100%;" />
    </div>

    <div style="margin-bottom: 20px;">
      <label style="display: flex; align-items: center; cursor: pointer;">
        <input type="checkbox" name="enableLogging" checked style="width: auto; margin-right: 8px;" />
        <span>Enable logging</span>
      </label>
    </div>

    <button type="submit" style="width: 100%; padding: 12px; font-size: 16px; background: #10b981;">
      Apply Configuration
    </button>
  </form>
</div>

<script>
document.getElementById('configForm').addEventListener('submit', function(e) {
  e.preventDefault();

  window.sendToHost({
    type: 'elicitation-response',
    formData: {
      _continueExecution: true,
      _tool: 'configure_service',
      _step: 3,
      _elicitationData: {
        // Combine step 1 and step 2 data
        ...${JSON.stringify(step1Data)},
        maxConnections: e.target.maxConnections.value,
        timeout: e.target.timeout.value,
        enableLogging: e.target.enableLogging.checked,
      },
      serviceName: '${serviceName}'
    }
  });
});
</script>
\`\`\``,
      },
    ],
  };
}

function applyConfiguration(serviceName, config) {
  return {
    content: [
      {
        type: 'text',
        text: `✅ Configuration applied successfully for **${serviceName}**!

\`\`\`webview:result
<div style="padding: 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="font-size: 48px;">✅</div>
    <h2 style="margin: 8px 0 0 0; color: #059669;">Configuration Applied</h2>
  </div>

  <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
    <h3 style="margin-top: 0;">Final Configuration</h3>
    <pre style="background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 4px; overflow-x: auto; font-size: 13px;">${JSON.stringify(
      config,
      null,
      2
    )}</pre>
  </div>

  <div style="margin-top: 16px; padding: 16px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px;">
    <strong style="color: #065f46;">Note:</strong>
    <p style="margin: 4px 0 0 0; color: #047857; font-size: 14px;">
      This configuration was collected through a 2-step elicitation process.
      The tool execution was paused after each step to collect your input.
    </p>
  </div>
</div>
\`\`\``,
      },
    ],
  };
}

// Start server
const transport = new StdioServerTransport();
server.connect(transport);

console.error('MCP Elicitation Example Server running');
