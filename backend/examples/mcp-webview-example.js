#!/usr/bin/env node

/**
 * Example MCP Server with Webview Elicitation
 *
 * This is a complete, working example of an MCP server that uses webviews
 * for data collection (elicitation) and result presentation.
 *
 * Features demonstrated:
 * - Form elicitation for collecting user data
 * - Result visualization
 * - Multi-step workflows
 * - Data processing without LLM involvement
 *
 * To use:
 * 1. npm install @modelcontextprotocol/sdk
 * 2. Add this to backend/mcp-config.json:
 *    {
 *      "mcpServers": {
 *        "example": {
 *          "command": "node",
 *          "args": ["examples/mcp-webview-example.js"]
 *        }
 *      }
 *    }
 * 3. Restart backend
 * 4. Click "MCP Tools" button in UI
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// In-memory storage for collected data
const storage = {
  users: [],
  feedback: [],
  lastQuery: null,
};

// Create MCP server
const server = new Server(
  {
    name: 'webview-example-server',
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
        name: 'collect_user_info',
        description: 'Collect user information via interactive form',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'collect_feedback',
        description: 'Collect product feedback',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'show_data_summary',
        description: 'Show summary of collected data',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'query_builder',
        description: 'Build a database query interactively',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  switch (toolName) {
    case 'collect_user_info':
      return handleCollectUserInfo();

    case 'collect_feedback':
      return handleCollectFeedback();

    case 'show_data_summary':
      return handleShowDataSummary();

    case 'query_builder':
      return handleQueryBuilder();

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
});

/**
 * Tool: Collect User Info
 * Shows a form to collect user details
 */
function handleCollectUserInfo() {
  return {
    content: [
      {
        type: 'text',
        text: `Please provide your information:

\`\`\`webview:form
<div style="max-width: 500px;">
  <h2 style="margin-top: 0; color: #1f2937;">User Registration</h2>
  <p style="color: #6b7280; margin-bottom: 20px;">
    Please fill out the form below. This data is collected securely and will not be shared with the LLM.
  </p>

  <form id="userForm">
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">Full Name *</label>
      <input
        type="text"
        name="name"
        required
        placeholder="John Doe"
        style="width: 100%;"
      />
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">Email Address *</label>
      <input
        type="email"
        name="email"
        required
        placeholder="john@example.com"
        style="width: 100%;"
      />
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">Phone Number</label>
      <input
        type="tel"
        name="phone"
        placeholder="+1 (555) 123-4567"
        style="width: 100%;"
      />
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">Department</label>
      <select name="department" style="width: 100%;">
        <option value="">Select department...</option>
        <option value="engineering">Engineering</option>
        <option value="sales">Sales</option>
        <option value="marketing">Marketing</option>
        <option value="support">Support</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">
        <input type="checkbox" name="newsletter" value="yes" />
        Subscribe to newsletter
      </label>
    </div>

    <button type="submit" style="width: 100%; padding: 12px; font-size: 16px;">
      Submit Information
    </button>
  </form>

  <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
    <strong style="color: #1e40af;">Privacy Note:</strong>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #1e40af;">
      This data is collected directly by the MCP server and does not pass through the LLM chat.
    </p>
  </div>
</div>

<script>
document.getElementById('userForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const formData = {
    name: e.target.name.value,
    email: e.target.email.value,
    phone: e.target.phone.value || 'Not provided',
    department: e.target.department.value || 'Not specified',
    newsletter: e.target.newsletter.checked,
    timestamp: new Date().toISOString(),
  };

  // Send to MCP server (bypasses LLM completely)
  window.sendToHost({ type: 'form-submit', formData });
});
</script>
\`\`\``,
      },
    ],
  };
}

/**
 * Tool: Collect Feedback
 * Shows a feedback form
 */
function handleCollectFeedback() {
  return {
    content: [
      {
        type: 'text',
        text: `We'd love your feedback:

\`\`\`webview:form
<div style="max-width: 500px;">
  <h2 style="margin-top: 0; color: #1f2937;">Product Feedback</h2>

  <form id="feedbackForm">
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">
        How would you rate your experience?
      </label>
      <div style="display: flex; gap: 8px; justify-content: space-between; max-width: 300px;">
        <label style="cursor: pointer;">
          <input type="radio" name="rating" value="1" required />
          <span style="margin-left: 4px;">1</span>
        </label>
        <label style="cursor: pointer;">
          <input type="radio" name="rating" value="2" required />
          <span style="margin-left: 4px;">2</span>
        </label>
        <label style="cursor: pointer;">
          <input type="radio" name="rating" value="3" required />
          <span style="margin-left: 4px;">3</span>
        </label>
        <label style="cursor: pointer;">
          <input type="radio" name="rating" value="4" required />
          <span style="margin-left: 4px;">4</span>
        </label>
        <label style="cursor: pointer;">
          <input type="radio" name="rating" value="5" required />
          <span style="margin-left: 4px;">5</span>
        </label>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; max-width: 300px;">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">
        What did you like most?
      </label>
      <textarea
        name="likes"
        rows="3"
        placeholder="Tell us what worked well..."
        style="width: 100%;"
      ></textarea>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">
        What could be improved?
      </label>
      <textarea
        name="improvements"
        rows="3"
        placeholder="Help us get better..."
        style="width: 100%;"
      ></textarea>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">
        Would you recommend us?
      </label>
      <select name="recommend" required style="width: 100%;">
        <option value="">Select...</option>
        <option value="definitely">Definitely</option>
        <option value="probably">Probably</option>
        <option value="maybe">Maybe</option>
        <option value="probably-not">Probably not</option>
        <option value="definitely-not">Definitely not</option>
      </select>
    </div>

    <button type="submit" style="width: 100%; padding: 12px; font-size: 16px;">
      Submit Feedback
    </button>
  </form>
</div>

<script>
document.getElementById('feedbackForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const formData = {
    rating: e.target.rating.value,
    likes: e.target.likes.value,
    improvements: e.target.improvements.value,
    recommend: e.target.recommend.value,
    timestamp: new Date().toISOString(),
  };

  window.sendToHost({ type: 'form-submit', formData });
});
</script>
\`\`\``,
      },
    ],
  };
}

/**
 * Tool: Show Data Summary
 * Displays collected data in a nice visualization
 */
function handleShowDataSummary() {
  const userCount = storage.users.length;
  const feedbackCount = storage.feedback.length;
  const avgRating =
    feedbackCount > 0
      ? (storage.feedback.reduce((sum, f) => sum + parseInt(f.rating), 0) / feedbackCount).toFixed(
          1
        )
      : 'N/A';

  return {
    content: [
      {
        type: 'text',
        text: `Data Summary:

\`\`\`webview:result
<div style="padding: 20px;">
  <h2 style="margin-top: 0; color: #1f2937;">Data Collection Summary</h2>

  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 8px; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Users Registered</div>
      <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${userCount}</div>
    </div>

    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Feedback Submissions</div>
      <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${feedbackCount}</div>
    </div>

    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 20px; border-radius: 8px; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Average Rating</div>
      <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${avgRating}</div>
    </div>
  </div>

  <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
    <h3 style="margin-top: 0; color: #374151;">Recent Activity</h3>
    <div style="font-size: 14px; color: #6b7280;">
      ${
        userCount > 0
          ? `Last user registered: ${storage.users[userCount - 1]?.name || 'Unknown'}`
          : 'No users registered yet'
      }
      <br/>
      ${
        feedbackCount > 0
          ? `Last feedback: ${storage.feedback[feedbackCount - 1]?.timestamp || 'Unknown'}`
          : 'No feedback received yet'
      }
    </div>
  </div>

  <div style="margin-top: 24px; padding: 16px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
    <strong style="color: #1e40af;">Note:</strong>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #1e40af;">
      This data was collected directly by the MCP server without going through the LLM.
      It demonstrates secure data collection for sensitive information.
    </p>
  </div>
</div>
\`\`\``,
      },
    ],
  };
}

/**
 * Tool: Query Builder
 * Interactive query builder
 */
function handleQueryBuilder() {
  return {
    content: [
      {
        type: 'text',
        text: `Build your database query:

\`\`\`webview:form
<div style="max-width: 600px;">
  <h2 style="margin-top: 0; color: #1f2937;">Query Builder</h2>

  <form id="queryForm">
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">Select Table</label>
      <select name="table" required style="width: 100%;" onchange="updateColumns(this.value)">
        <option value="">Choose a table...</option>
        <option value="users">users</option>
        <option value="orders">orders</option>
        <option value="products">products</option>
      </select>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">Select Columns</label>
      <div id="columns" style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
        <em style="color: #6b7280;">Select a table first</em>
      </div>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">WHERE clause (optional)</label>
      <input
        type="text"
        name="where"
        placeholder="e.g., status = 'active'"
        style="width: 100%;"
      />
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">ORDER BY (optional)</label>
      <input
        type="text"
        name="orderBy"
        placeholder="e.g., created_at DESC"
        style="width: 100%;"
      />
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 4px; font-weight: 500;">LIMIT</label>
      <input
        type="number"
        name="limit"
        value="10"
        min="1"
        max="1000"
        style="width: 100%;"
      />
    </div>

    <div style="margin-bottom: 20px; padding: 12px; background: #f3f4f6; border-radius: 4px; font-family: monospace; font-size: 14px; overflow-x: auto;">
      <strong>Preview:</strong>
      <div id="queryPreview" style="margin-top: 8px; color: #1f2937;">
        SELECT * FROM ...
      </div>
    </div>

    <button type="submit" style="width: 100%; padding: 12px; font-size: 16px;">
      Execute Query
    </button>
  </form>
</div>

<script>
const columnsByTable = {
  users: ['id', 'name', 'email', 'created_at'],
  orders: ['id', 'user_id', 'total', 'status', 'created_at'],
  products: ['id', 'name', 'price', 'stock', 'category'],
};

let selectedColumns = [];

function updateColumns(table) {
  const columnsDiv = document.getElementById('columns');
  if (!table) {
    columnsDiv.innerHTML = '<em style="color: #6b7280;">Select a table first</em>';
    return;
  }

  const columns = columnsByTable[table];
  columnsDiv.innerHTML = columns
    .map(
      col => \`
      <label style="display: block; margin: 4px 0; cursor: pointer;">
        <input type="checkbox" name="column" value="\${col}" onchange="updatePreview()" />
        \${col}
      </label>
    \`
    )
    .join('');

  updatePreview();
}

function updatePreview() {
  const form = document.getElementById('queryForm');
  const table = form.table.value;
  const checkboxes = form.querySelectorAll('input[name="column"]:checked');
  const columns = Array.from(checkboxes).map(cb => cb.value);
  const where = form.where.value;
  const orderBy = form.orderBy.value;
  const limit = form.limit.value;

  let query = \`SELECT \${columns.length > 0 ? columns.join(', ') : '*'}\`;
  if (table) query += \` FROM \${table}\`;
  if (where) query += \` WHERE \${where}\`;
  if (orderBy) query += \` ORDER BY \${orderBy}\`;
  if (limit) query += \` LIMIT \${limit}\`;

  document.getElementById('queryPreview').textContent = query;
}

document.getElementById('queryForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const checkboxes = e.target.querySelectorAll('input[name="column"]:checked');
  const columns = Array.from(checkboxes).map(cb => cb.value);

  const queryData = {
    table: e.target.table.value,
    columns: columns.length > 0 ? columns : ['*'],
    where: e.target.where.value,
    orderBy: e.target.orderBy.value,
    limit: parseInt(e.target.limit.value),
  };

  window.sendToHost({ type: 'form-submit', formData: queryData });
});
</script>
\`\`\``,
      },
    ],
  };
}

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);

console.error('MCP Webview Example Server running');
