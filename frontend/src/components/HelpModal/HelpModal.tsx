import React, { useState } from 'react';
import './HelpModal.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Section = 'intro' | 'getting-started' | 'building' | 'webviews' | 'testing' | 'schema' | 'examples' | 'troubleshooting';

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<Section>('intro');

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sections = [
    { id: 'intro' as Section, title: 'Introduction', icon: '📖' },
    { id: 'getting-started' as Section, title: 'Getting Started', icon: '🚀' },
    { id: 'building' as Section, title: 'Building Servers', icon: '🔨' },
    { id: 'webviews' as Section, title: 'Webview Features', icon: '🎨' },
    { id: 'testing' as Section, title: 'Testing', icon: '🧪' },
    { id: 'schema' as Section, title: 'Tool Schema', icon: '📋' },
    { id: 'examples' as Section, title: 'Examples', icon: '💡' },
    { id: 'troubleshooting' as Section, title: 'Troubleshooting', icon: '🔧' },
  ];

  return (
    <div className="help-modal-backdrop" onClick={handleBackdropClick}>
      <div className="help-modal">
        {/* Header */}
        <div className="help-modal-header">
          <div>
            <h2>MCP Developer Guide</h2>
            <p>Build and test Model Context Protocol servers</p>
          </div>
          <button className="help-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="help-modal-content">
          {/* Sidebar Navigation */}
          <nav className="help-modal-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`help-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="help-nav-icon">{section.icon}</span>
                <span className="help-nav-title">{section.title}</span>
              </button>
            ))}
          </nav>

          {/* Content Area */}
          <div className="help-modal-body">
            {activeSection === 'intro' && <IntroSection />}
            {activeSection === 'getting-started' && <GettingStartedSection />}
            {activeSection === 'building' && <BuildingSection />}
            {activeSection === 'webviews' && <WebviewsSection />}
            {activeSection === 'testing' && <TestingSection />}
            {activeSection === 'schema' && <SchemaSection />}
            {activeSection === 'examples' && <ExamplesSection />}
            {activeSection === 'troubleshooting' && <TroubleshootingSection />}
          </div>
        </div>

        {/* Footer */}
        <div className="help-modal-footer">
          <div className="help-modal-footer-links">
            <a href="https://github.com/GeorgiaDimaki-AI/mcp_host" target="_blank" rel="noopener noreferrer">
              📚 Full Documentation
            </a>
            <a href="https://github.com/modelcontextprotocol/sdk" target="_blank" rel="noopener noreferrer">
              🔗 MCP SDK
            </a>
          </div>
          <button className="help-modal-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const IntroSection: React.FC = () => (
  <div className="help-section">
    <h3>Welcome to MCP Development</h3>
    <p>
      This guide will help you build and test MCP (Model Context Protocol) servers that integrate with this application.
      You'll learn how to create tools that LLMs can discover and use during conversations.
    </p>

    <h4>What is MCP?</h4>
    <p>
      The Model Context Protocol enables Large Language Models to interact with external tools and services.
      MCP servers expose tools that LLMs can call with specific parameters to perform tasks, retrieve data,
      or display interactive content.
    </p>

    <h4>Key Concepts</h4>
    <ul>
      <li><strong>MCP Server:</strong> A service that exposes one or more tools</li>
      <li><strong>Tool:</strong> A function that the LLM can call with specific parameters</li>
      <li><strong>Elicitation:</strong> A mechanism for requesting user input during tool execution</li>
      <li><strong>Webview:</strong> Interactive HTML content displayed to users (forms, visualizations, results)</li>
      <li><strong>Tool Schema:</strong> JSON Schema defining the inputs a tool accepts</li>
    </ul>

    <h4>What You'll Learn</h4>
    <ul>
      <li>How to create a basic MCP server</li>
      <li>Building tools with rich webview interfaces</li>
      <li>Testing your server with this application</li>
      <li>Best practices for security and user experience</li>
      <li>Troubleshooting common issues</li>
    </ul>

    <div className="help-info-box">
      <strong>📘 Prerequisites:</strong> Node.js 18+, basic JavaScript/TypeScript knowledge, and familiarity with JSON Schema.
    </div>
  </div>
);

const GettingStartedSection: React.FC = () => (
  <div className="help-section">
    <h3>Getting Started</h3>

    <h4>Installation</h4>
    <p>First, install the MCP SDK in your project:</p>
    <pre><code>npm install @modelcontextprotocol/sdk</code></pre>

    <h4>Project Structure</h4>
    <p>Organize your MCP server like this:</p>
    <pre><code>{`my-mcp-server/
├── server.js           # Main server file
├── tools/              # Tool implementations
│   ├── greeting.js
│   └── calculator.js
├── templates/          # HTML templates
│   └── form.html
└── package.json`}</code></pre>

    <h4>Basic Server Template</h4>
    <p>Here's a minimal MCP server to get you started:</p>
    <pre><code>{`import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'my-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'greet',
        description: 'Greets a user by name',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name to greet' },
          },
          required: ['name'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'greet') {
    return {
      content: [{
        type: 'text',
        text: \`Hello, \${args.name}!\`,
      }],
    };
  }

  throw new Error(\`Unknown tool: \${name}\`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running');
}

main().catch(console.error);`}</code></pre>

    <div className="help-success-box">
      <strong>✅ Next Step:</strong> Save this as <code>server.js</code> and test it by running <code>node server.js</code>
    </div>
  </div>
);

const BuildingSection: React.FC = () => (
  <div className="help-section">
    <h3>Building MCP Servers</h3>

    <h4>Adding Your Server to Configuration</h4>
    <p>Add your server to <code>backend/mcp-config.json</code>:</p>
    <pre><code>{`{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"],
      "env": {},
      "description": "My custom MCP server",
      "trustLevel": "trusted"
    }
  }
}`}</code></pre>

    <div className="help-warning-box">
      <strong>⚠️ Important:</strong> Use absolute paths in the <code>args</code> field for reliability.
    </div>

    <h4>Trust Levels</h4>
    <ul>
      <li><strong>verified:</strong> Officially verified servers (green badge)</li>
      <li><strong>trusted:</strong> Manually trusted by you (blue badge)</li>
      <li><strong>unverified:</strong> Default for new servers (gray badge)</li>
    </ul>

    <h4>Tool Definition Best Practices</h4>
    <ul>
      <li>Write clear, descriptive tool names and descriptions</li>
      <li>Use comprehensive JSON schemas for input validation</li>
      <li>Include helpful parameter descriptions</li>
      <li>Mark required parameters appropriately</li>
      <li>Handle errors gracefully with user-friendly messages</li>
    </ul>

    <h4>Example: Calculator Tool</h4>
    <pre><code>{`{
  name: 'calculator',
  description: 'Performs basic arithmetic operations',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The operation to perform',
      },
      a: { type: 'number', description: 'First number' },
      b: { type: 'number', description: 'Second number' },
    },
    required: ['operation', 'a', 'b'],
  },
}`}</code></pre>
  </div>
);

const WebviewsSection: React.FC = () => (
  <div className="help-section">
    <h3>Webview Features</h3>
    <p>
      Webviews allow your tools to display rich, interactive HTML content including forms,
      charts, tables, and custom visualizations.
    </p>

    <h4>Types of Webviews</h4>
    <ul>
      <li><strong>HTML Webview</strong> (<code>webview:html</code>) - General-purpose HTML content</li>
      <li><strong>Form Webview</strong> (<code>webview:form</code>) - Interactive forms for user input</li>
      <li><strong>Result Webview</strong> (<code>webview:result</code>) - Display results, charts, tables</li>
    </ul>

    <h4>Creating a Form Webview</h4>
    <p>Forms use the elicitation system to request user input:</p>
    <pre><code>{`const formHtml = \`
  <!DOCTYPE html>
  <html>
  <body>
    <h2>User Form</h2>
    <form id="myForm">
      <input type="text" name="name" required>
      <button type="submit">Submit</button>
    </form>
    <script>
      document.getElementById('myForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Send data back to server
        window.parent.postMessage({
          type: 'form-submit',
          formData: data
        }, '*');
      });
    </script>
  </body>
  </html>
\`;

// Request user input
const response = await server.elicitUserInput({
  prompt: 'Please fill out the form',
  metadata: {
    type: 'webview',
    webviewType: 'form',
    html: formHtml,
  },
});

// Process submitted data
const userData = response.data;`}</code></pre>

    <h4>Displaying Results</h4>
    <p>Return webview content in markdown code blocks:</p>
    <pre><code>{`return {
  content: [{
    type: 'text',
    text: '\`\`\`webview:result\\n' + chartHtml + '\\n\`\`\`',
  }],
};`}</code></pre>

    <div className="help-info-box">
      <strong>💡 Tip:</strong> You can use libraries like Chart.js, D3.js, or any HTML/CSS/JS in your webviews!
    </div>
  </div>
);

const TestingSection: React.FC = () => (
  <div className="help-section">
    <h3>Testing Your MCP Server</h3>

    <h4>Step 1: Test Standalone</h4>
    <p>First, verify your server starts correctly:</p>
    <pre><code>node your-server.js</code></pre>
    <p>The server should start without errors and wait for stdio input.</p>

    <h4>Step 2: Add to Configuration</h4>
    <p>Edit <code>backend/mcp-config.json</code> to include your server.</p>

    <h4>Step 3: Restart the Application</h4>
    <pre><code>npm start</code></pre>

    <h4>Step 4: Test in Chat</h4>
    <ol>
      <li>Start a new conversation</li>
      <li>Select your MCP server from the dropdown menu</li>
      <li>Click the info icon (ⓘ) to view available tools</li>
      <li>Ask the LLM to use your tool:
        <ul>
          <li>"Please greet me by name"</li>
          <li>"Show me the user registration form"</li>
          <li>"Calculate 5 plus 3"</li>
        </ul>
      </li>
    </ol>

    <h4>Step 5: Monitor Logs</h4>
    <p>Check the application logs for debugging information:</p>
    <ul>
      <li>Server connection status</li>
      <li>Tool calls and parameters</li>
      <li>Errors and warnings</li>
    </ul>

    <div className="help-success-box">
      <strong>✅ Pro Tip:</strong> Use <code>console.error()</code> for debug logging in your server
      (console.log interferes with stdio communication).
    </div>
  </div>
);

const SchemaSection: React.FC = () => (
  <div className="help-section">
    <h3>Tool Schema Reference</h3>
    <p>
      Tools use JSON Schema to define their input parameters. This enables proper validation
      and helps the LLM understand how to call your tools.
    </p>

    <h4>Supported Types</h4>
    <pre><code>{`{
  type: 'object',
  properties: {
    stringParam: {
      type: 'string',
      description: 'A text parameter',
      enum: ['option1', 'option2'] // Optional: limit to specific values
    },
    numberParam: {
      type: 'number',
      description: 'A numeric parameter',
      minimum: 0,
      maximum: 100
    },
    booleanParam: {
      type: 'boolean',
      description: 'A true/false flag'
    },
    arrayParam: {
      type: 'array',
      items: { type: 'string' },
      description: 'An array of strings'
    },
    objectParam: {
      type: 'object',
      properties: {
        nested: { type: 'string' }
      },
      description: 'A nested object'
    }
  },
  required: ['stringParam', 'numberParam']
}`}</code></pre>

    <h4>Output Format</h4>
    <p>Tools return responses in this format:</p>
    <pre><code>{`return {
  content: [
    {
      type: 'text',
      text: 'Your response here',
    },
    // Can include multiple content items
  ],
};`}</code></pre>

    <h4>Webview Output</h4>
    <p>Include webviews using markdown code blocks:</p>
    <pre><code>{`// For forms
text: '\`\`\`webview:form\\n<html>...</html>\\n\`\`\`'

// For results
text: '\`\`\`webview:result\\n<html>...</html>\\n\`\`\`'

// For general HTML
text: '\`\`\`webview:html\\n<html>...</html>\\n\`\`\`'`}</code></pre>
  </div>
);

const ExamplesSection: React.FC = () => (
  <div className="help-section">
    <h3>Examples</h3>

    <h4>Complete Working Example</h4>
    <p>
      Check out <code>examples/webview-example-server.js</code> for a complete MCP server
      demonstrating:
    </p>
    <ul>
      <li>Multiple tool types</li>
      <li>Form-based user input</li>
      <li>Chart visualizations with Chart.js</li>
      <li>Todo list management</li>
      <li>Modern UI styling</li>
      <li>Proper error handling</li>
    </ul>

    <h4>Quick Example: Data Table</h4>
    <pre><code>{`const data = [
  { id: 1, name: 'Alice', score: 95 },
  { id: 2, name: 'Bob', score: 87 },
];

const tableHtml = \`
  <style>
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; border-bottom: 1px solid #ddd; }
    th { background: #4CAF50; color: white; }
  </style>
  <table>
    <thead>
      <tr><th>ID</th><th>Name</th><th>Score</th></tr>
    </thead>
    <tbody>
      \${data.map(row => \`
        <tr>
          <td>\${row.id}</td>
          <td>\${row.name}</td>
          <td>\${row.score}</td>
        </tr>
      \`).join('')}
    </tbody>
  </table>
\`;

return {
  content: [{
    type: 'text',
    text: '\`\`\`webview:result\\n' + tableHtml + '\\n\`\`\`',
  }],
};`}</code></pre>

    <div className="help-info-box">
      <strong>💡 Explore:</strong> The example server is pre-configured and ready to use!
      Select "webview-example" from the MCP dropdown to try it.
    </div>
  </div>
);

const TroubleshootingSection: React.FC = () => (
  <div className="help-section">
    <h3>Troubleshooting</h3>

    <h4>Server Won't Connect</h4>
    <ul>
      <li>✓ Check command and args in mcp-config.json</li>
      <li>✓ Verify Node.js version is 18+</li>
      <li>✓ Use absolute paths for server files</li>
      <li>✓ Check server logs for startup errors</li>
    </ul>

    <h4>Tools Not Showing in UI</h4>
    <ul>
      <li>✓ Ensure ListToolsRequestSchema handler is implemented</li>
      <li>✓ Verify server is connected (check backend logs)</li>
      <li>✓ Restart the application after config changes</li>
      <li>✓ Click the info icon (ⓘ) to view available tools</li>
    </ul>

    <h4>Webview Not Rendering</h4>
    <ul>
      <li>✓ Validate HTML syntax</li>
      <li>✓ Check browser console for errors (F12)</li>
      <li>✓ Verify correct webview type (html/form/result)</li>
      <li>✓ Ensure proper markdown format: <code>```webview:type</code></li>
    </ul>

    <h4>Form Submission Not Working</h4>
    <ul>
      <li>✓ Check that <code>postMessage</code> is called correctly</li>
      <li>✓ Verify data structure: <code>{`{ type: 'form-submit', formData: {...} }`}</code></li>
      <li>✓ Look for JavaScript errors in console</li>
      <li>✓ Ensure <code>event.preventDefault()</code> is called</li>
    </ul>

    <h4>LLM Not Calling Tools</h4>
    <ul>
      <li>✓ Select the MCP server from dropdown before chatting</li>
      <li>✓ Write clear, descriptive tool descriptions</li>
      <li>✓ Verify tool appears in MCP Info panel</li>
      <li>✓ Try asking more explicitly (e.g., "Use the calculator tool...")</li>
    </ul>

    <h4>Debug Logging</h4>
    <p>Add debug logging to your server:</p>
    <pre><code>{`console.error('[DEBUG] Tool called:', name);
console.error('[DEBUG] Args:', args);
console.error('[DEBUG] Response:', response);`}</code></pre>
    <p className="help-note">Note: Use <code>console.error()</code> for logging, not <code>console.log()</code></p>

    <div className="help-warning-box">
      <strong>⚠️ Still having issues?</strong> Check the full documentation at
      <code>docs/MCP_DEVELOPER_GUIDE.md</code> or open a GitHub issue.
    </div>
  </div>
);

export default HelpModal;
