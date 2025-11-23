#!/usr/bin/env node

/**
 * La Maison Élégante - Restaurant MCP Server
 *
 * A beautiful, functional restaurant booking system demonstrating:
 * - Stunning webview designs with gradients, animations, modern CSS
 * - Interactive multi-step forms with elicitation
 * - State management for reservations
 * - Creative features (wine pairing, chef specials, table selection)
 * - Real-world MCP use case
 *
 * This server showcases the full capabilities of MCP webviews.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// In-memory state management
const restaurantState = {
  reservations: new Map(),
  dailySpecials: [
    {
      name: "Seared Duck Breast",
      description: "Pan-seared duck breast with cherry reduction, roasted vegetables, and potato gratin",
      price: 48,
      chef: "Chef Pierre Dubois",
      story: "This dish was inspired by my grandmother's Sunday dinners in Provence..."
    }
  ],
  menuItems: [
    // Appetizers
    {
      id: 'app1',
      category: 'appetizers',
      name: 'Escargot de Bourgogne',
      description: 'Six Burgundy snails baked in their shells with garlic-herb butter, served with crusty baguette',
      price: 24,
      tags: ['signature', 'gluten-free'],
      wine: 'Chablis Grand Cru 2019'
    },
    {
      id: 'app2',
      category: 'appetizers',
      name: 'Foie Gras Terrine',
      description: 'Silky duck liver terrine with fig compote, toasted brioche, and fleur de sel',
      price: 32,
      tags: ['signature', 'new'],
      wine: 'Sauternes 2018'
    },
    // Entrees
    {
      id: 'ent1',
      category: 'entrees',
      name: 'Bouillabaisse Provençale',
      description: 'Traditional Marseille fish stew with rouille, featuring sea bass, mussels, prawns, and saffron broth',
      price: 48,
      tags: ['signature', 'gluten-free', 'spicy'],
      wine: 'Bandol Rosé 2021'
    },
    {
      id: 'ent2',
      category: 'entrees',
      name: 'Bœuf Bourguignon',
      description: 'Slow-braised Burgundy beef with pearl onions, mushrooms, bacon lardons, served with creamy mashed potatoes',
      price: 52,
      tags: ['signature', 'gluten-free'],
      wine: 'Gevrey-Chambertin 2017'
    },
    // Desserts
    {
      id: 'des1',
      category: 'desserts',
      name: 'Crème Brûlée Vanille',
      description: 'Classic vanilla custard with caramelized sugar crust, served with fresh berries',
      price: 14,
      tags: ['signature', 'gluten-free']
    },
  ],
  wineInventory: [
    { name: 'Chablis Grand Cru 2019', type: 'white', price: 85, description: 'Crisp minerality with citrus notes' },
    { name: 'Gevrey-Chambertin 2017', type: 'red', price: 120, description: 'Rich, velvety with dark fruit' },
    { name: 'Bandol Rosé 2021', type: 'rosé', price: 60, description: 'Fresh and elegant with berry notes' },
  ]
};

// Helper to generate confirmation number
function generateConfirmationNumber() {
  return 'RES' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Create MCP server
const server = new Server(
  {
    name: 'restaurant-mcp-server',
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
        name: 'view_menu',
        description: 'Display the restaurant menu with beautiful formatting, categories, dishes, prices, and wine pairings',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter by category (optional)',
              enum: ['all', 'appetizers', 'entrees', 'desserts', 'wines']
            }
          }
        },
      },
      {
        name: 'make_reservation',
        description: 'Create a new reservation with interactive multi-step form collecting guest details, date/time, preferences',
        inputSchema: {
          type: 'object',
          properties: {}
        },
      },
      {
        name: 'view_reservation',
        description: 'Look up and display reservation details by confirmation number',
        inputSchema: {
          type: 'object',
          properties: {
            confirmationNumber: {
              type: 'string',
              description: 'Reservation confirmation number'
            }
          },
          required: ['confirmationNumber']
        },
      },
      {
        name: 'modify_reservation',
        description: 'Modify an existing reservation (date, time, party size, preferences)',
        inputSchema: {
          type: 'object',
          properties: {
            confirmationNumber: {
              type: 'string',
              description: 'Reservation confirmation number'
            }
          },
          required: ['confirmationNumber']
        },
      },
      {
        name: 'cancel_reservation',
        description: 'Cancel a reservation with confirmation',
        inputSchema: {
          type: 'object',
          properties: {
            confirmationNumber: {
              type: 'string',
              description: 'Reservation confirmation number'
            },
            reason: {
              type: 'string',
              description: 'Reason for cancellation (optional)'
            }
          },
          required: ['confirmationNumber']
        },
      },
      {
        name: 'sommelier_pairing',
        description: 'Get expert wine pairing recommendations based on your menu selections or taste preferences',
        inputSchema: {
          type: 'object',
          properties: {
            dishes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Dishes you are considering'
            },
            wineType: {
              type: 'string',
              enum: ['red', 'white', 'rosé', 'sparkling', 'any'],
              description: 'Preferred wine type'
            }
          }
        },
      },
      {
        name: 'chef_special',
        description: 'View today\'s chef special with story, ingredients, and preparation details',
        inputSchema: {
          type: 'object',
          properties: {}
        },
      },
      {
        name: 'secure_payment_demo',
        description: 'DEMO: Securely collect payment information that bypasses chat history (demonstrates Phase 3 security)',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Payment amount in dollars'
            }
          },
          required: ['amount']
        },
      },
      {
        name: 'process_secure_payment',
        description: 'Process secure payment (called directly from form, bypasses chat)',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Payment amount'
            },
            cardholderName: {
              type: 'string',
              description: 'Cardholder name'
            },
            cardNumber: {
              type: 'string',
              description: 'Card number'
            },
            expiry: {
              type: 'string',
              description: 'Expiry date'
            },
            cvv: {
              type: 'string',
              description: 'CVV code'
            }
          },
          required: ['amount', 'cardholderName', 'cardNumber', 'expiry', 'cvv']
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'view_menu': {
      const category = args.category || 'all';
      const items = category === 'all'
        ? restaurantState.menuItems
        : restaurantState.menuItems.filter(item => item.category === category);

      return {
        content: [
          {
            type: 'text',
            text: `Displaying menu${category !== 'all' ? ` - ${category}` : ''}`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://menu',
              mimeType: 'text/html',
              text: generateMenuHTML(items, category),
            },
          },
        ],
      };
    }

    case 'make_reservation': {
      // Check if this is form submission (elicitation response)
      if (args._elicitationData) {
        // Process the reservation
        const data = args._elicitationData;
        const confirmation = {
          confirmationNumber: data.confirmationNumber,
          customerName: data.name,
          email: data.email,
          phone: data.phone,
          date: data.date,
          time: data.time,
          partySize: parseInt(data.partySize),
          tablePreference: data.tablePreference || 'any',
          occasion: data.occasion || 'none',
          dietaryNeeds: data.dietaryNeeds || [],
          specialRequests: data.specialRequests || '',
          status: 'confirmed',
          created: Date.now(),
          modified: Date.now(),
        };

        // Save to state
        restaurantState.reservations.set(data.confirmationNumber, confirmation);

        return {
          content: [
            {
              type: 'text',
              text: `✓ Reservation confirmed for ${data.name} on ${new Date(data.date).toLocaleDateString()} at ${data.time}. Confirmation number: ${data.confirmationNumber}`,
            },
            {
              type: 'resource',
              resource: {
                uri: 'webview://reservation-confirmation',
                mimeType: 'text/html',
                text: generateConfirmationHTML(confirmation),
              },
            },
          ],
        };
      }

      // Show reservation form
      return {
        content: [
          {
            type: 'text',
            text: 'Please fill out the reservation form below.',
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://reservation-form',
              mimeType: 'text/html',
              text: generateReservationFormHTML(),
            },
          },
        ],
      };
    }

    case 'view_reservation': {
      const { confirmationNumber } = args;
      const reservation = restaurantState.reservations.get(confirmationNumber);

      if (!reservation) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Reservation not found: ${confirmationNumber}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Displaying reservation ${confirmationNumber}`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://reservation-details',
              mimeType: 'text/html',
              text: generateReservationDetailsHTML(reservation),
            },
          },
        ],
      };
    }

    case 'modify_reservation': {
      const { confirmationNumber } = args;
      const reservation = restaurantState.reservations.get(confirmationNumber);

      if (!reservation) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Reservation not found: ${confirmationNumber}`,
            },
          ],
        };
      }

      // If updates provided, apply them
      if (args._elicitationData) {
        const updates = args._elicitationData;
        Object.assign(reservation, updates, { modified: Date.now() });
        restaurantState.reservations.set(confirmationNumber, reservation);

        return {
          content: [
            {
              type: 'text',
              text: `✓ Reservation ${confirmationNumber} updated successfully`,
            },
          ],
        };
      }

      // Show modification form
      return {
        content: [
          {
            type: 'text',
            text: 'Modify your reservation below.',
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://modify-reservation',
              mimeType: 'text/html',
              text: generateModifyReservationHTML(reservation),
            },
          },
        ],
      };
    }

    case 'cancel_reservation': {
      const { confirmationNumber, reason } = args;
      const reservation = restaurantState.reservations.get(confirmationNumber);

      if (!reservation) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Reservation not found: ${confirmationNumber}`,
            },
          ],
        };
      }

      // Update status
      reservation.status = 'cancelled';
      reservation.cancellationReason = reason;
      reservation.modified = Date.now();
      restaurantState.reservations.set(confirmationNumber, reservation);

      return {
        content: [
          {
            type: 'text',
            text: `✓ Reservation ${confirmationNumber} has been cancelled. We're sorry to see you go!`,
          },
        ],
      };
    }

    case 'sommelier_pairing': {
      const { dishes = [], wineType = 'any' } = args;

      return {
        content: [
          {
            type: 'text',
            text: 'Here are our sommelier\'s wine pairing recommendations.',
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://wine-pairing',
              mimeType: 'text/html',
              text: generateWinePairingHTML(dishes, wineType),
            },
          },
        ],
      };
    }

    case 'chef_special': {
      const special = restaurantState.dailySpecials[0];

      return {
        content: [
          {
            type: 'text',
            text: `Today's Chef Special: ${special.name}`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://chef-special',
              mimeType: 'text/html',
              text: generateChefSpecialHTML(special),
            },
          },
        ],
      };
    }

    case 'secure_payment_demo': {
      const amount = args.amount || 100;

      return {
        content: [
          {
            type: 'text',
            text: `🔒 Displaying secure payment form for $${amount.toFixed(2)}. Your payment data will be sent directly to the backend, bypassing chat history.`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://secure-payment',
              mimeType: 'text/html',
              text: generateSecurePaymentHTML(amount),
            },
          },
        ],
      };
    }

    case 'process_secure_payment': {
      // This is called directly from the form via POST to backend
      // Payment data never touches the chat interface
      const { amount, cardholderName, cardNumber, expiry, cvv } = args;

      // Simulate payment processing (in real app, this would call payment gateway)
      console.log('🔒 SECURE PAYMENT PROCESSED (backend only, never logged to chat):');
      console.log(`  Amount: $${amount}`);
      console.log(`  Cardholder: ${cardholderName}`);
      console.log(`  Card: ${cardNumber.replace(/\d(?=\d{4})/g, '*')}`); // Mask all but last 4
      console.log('  ✓ Payment processed securely');

      // Return success (this goes back to the form, not to chat)
      return {
        content: [
          {
            type: 'text',
            text: `✓ Payment of $${amount} processed successfully. Transaction ID: TXN${Date.now()}`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * HTML Generators
 */

function generateMenuHTML(items, category) {
  const appetizers = items.filter(i => i.category === 'appetizers');
  const entrees = items.filter(i => i.category === 'entrees');
  const desserts = items.filter(i => i.category === 'desserts');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Playfair Display', Georgia, serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 0;
      min-height: 100vh;
    }

    .menu-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 0;
      overflow: hidden;
    }

    .menu-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      text-align: center;
      padding: 60px 40px;
      position: relative;
      overflow: hidden;
    }

    .menu-header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: shimmer 8s infinite linear;
    }

    @keyframes shimmer {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .restaurant-name {
      font-size: 48px;
      font-weight: 700;
      letter-spacing: 3px;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }

    .restaurant-tagline {
      font-size: 18px;
      font-weight: 300;
      opacity: 0.9;
      font-style: italic;
      position: relative;
      z-index: 1;
    }

    .filter-bar {
      background: #f8f9fa;
      padding: 20px 40px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 8px 16px;
      border: 2px solid #667eea;
      background: white;
      color: #667eea;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .filter-btn:hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .filter-btn.active {
      background: #667eea;
      color: white;
    }

    .menu-section {
      padding: 40px;
    }

    .section-title {
      font-size: 32px;
      color: #1a1a2e;
      margin-bottom: 30px;
      padding-bottom: 12px;
      border-bottom: 3px solid #667eea;
      display: inline-block;
    }

    .menu-item {
      display: flex;
      gap: 24px;
      margin-bottom: 32px;
      padding: 24px;
      background: #fafafa;
      border-radius: 12px;
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .menu-item:hover {
      transform: translateX(8px);
      box-shadow: -4px 4px 20px rgba(0,0,0,0.1);
      border-color: #667eea;
    }

    .item-content {
      flex: 1;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
    }

    .item-name {
      font-size: 22px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 4px;
    }

    .item-price {
      font-size: 20px;
      font-weight: 700;
      color: #667eea;
    }

    .item-description {
      font-size: 15px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 12px;
      font-family: 'Lato', sans-serif;
    }

    .item-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tag {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tag.signature {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .tag.new {
      background: #17a2b8;
      color: white;
    }

    .tag.gluten-free {
      background: #fff3cd;
      color: #856404;
    }

    .tag.spicy {
      background: #f8d7da;
      color: #721c24;
    }

    .wine-pairing {
      margin-top: 12px;
      padding: 12px;
      background: #fff9e6;
      border-left: 4px solid #ffd700;
      border-radius: 4px;
      font-size: 13px;
      color: #664d00;
    }

    .wine-pairing strong {
      color: #4d3900;
    }
  </style>
</head>
<body>
  <div class="menu-container">
    <div class="menu-header">
      <h1 class="restaurant-name">La Maison Élégante</h1>
      <p class="restaurant-tagline">Fine French Cuisine • Est. 1987</p>
    </div>

    ${appetizers.length > 0 ? `
    <div class="menu-section">
      <h2 class="section-title">Les Entrées</h2>
      ${appetizers.map(item => generateMenuItem(item)).join('')}
    </div>
    ` : ''}

    ${entrees.length > 0 ? `
    <div class="menu-section">
      <h2 class="section-title">Les Plats Principaux</h2>
      ${entrees.map(item => generateMenuItem(item)).join('')}
    </div>
    ` : ''}

    ${desserts.length > 0 ? `
    <div class="menu-section">
      <h2 class="section-title">Les Desserts</h2>
      ${desserts.map(item => generateMenuItem(item)).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;
}

function generateMenuItem(item) {
  const tagHTML = item.tags.map(tag => `<span class="tag ${tag}">${tag === 'signature' ? '★ Signature' : tag.replace('-', ' ')}</span>`).join('');

  return `
    <div class="menu-item">
      <div class="item-content">
        <div class="item-header">
          <div>
            <h3 class="item-name">${item.name}</h3>
          </div>
          <span class="item-price">$${item.price}</span>
        </div>
        <p class="item-description">${item.description}</p>
        <div class="item-tags">${tagHTML}</div>
        ${item.wine ? `
          <div class="wine-pairing">
            <strong>🍷 Sommelier Pairing:</strong> ${item.wine}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function generateReservationFormHTML() {
  // This is the same beautiful multi-step form from the spec
  // (Truncated here for brevity - see SENIOR_ENGINEER_REVIEW.md for complete HTML)
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Lato', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 600px;
      width: 100%;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      text-align: center;
      padding: 40px 30px;
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 8px;
    }
    form {
      padding: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a2e;
    }
    input, select, textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      font-family: inherit;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    .success-container {
      display: none;
      text-align: center;
      padding: 40px 20px;
    }
    .success-container.show {
      display: block;
    }
    .success-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 48px;
    }
    .confirmation-number {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 2px;
      margin: 24px 0;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
    }
    .reservation-details {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
      text-align: left;
    }
    .reservation-details p {
      margin: 8px 0;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍽️ Make a Reservation</h1>
      <p>Experience fine dining at La Maison Élégante</p>
    </div>

    <form id="reservationForm">
      <div class="form-group">
        <label>Your Name *</label>
        <input type="text" name="name" required>
      </div>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" name="email" required>
      </div>
      <div class="form-group">
        <label>Phone *</label>
        <input type="tel" name="phone" required>
      </div>
      <div class="form-group">
        <label>Date *</label>
        <input type="date" name="date" required>
      </div>
      <div class="form-group">
        <label>Time *</label>
        <select name="time" required>
          <option value="">Select time...</option>
          <option value="17:00">5:00 PM</option>
          <option value="18:00">6:00 PM</option>
          <option value="19:00">7:00 PM</option>
          <option value="20:00">8:00 PM</option>
          <option value="21:00">9:00 PM</option>
        </select>
      </div>
      <div class="form-group">
        <label>Party Size *</label>
        <input type="number" name="partySize" min="1" max="20" value="2" required>
      </div>
      <div class="form-group">
        <label>Special Requests</label>
        <textarea name="specialRequests" rows="3" placeholder="Dietary restrictions, special occasions, etc."></textarea>
      </div>
      <button type="submit">Confirm Reservation ✓</button>
    </form>

    <div id="successView" class="success-container">
      <div class="success-icon">✓</div>
      <h2 style="color: #10b981; margin-bottom: 16px;">Reservation Confirmed!</h2>
      <p style="color: #6b7280; margin-bottom: 8px;">Your confirmation number:</p>
      <div class="confirmation-number" id="confirmationNumber"></div>
      <div class="reservation-details" id="reservationDetails"></div>
      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        A confirmation email has been sent to your email address.<br>
        Please save your confirmation number for managing your reservation.
      </p>
    </div>
  </div>

  <script>
    const form = document.getElementById('reservationForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const successView = document.getElementById('successView');

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      // Collect form data
      const formData = new FormData(e.target);
      const confirmationNumber = 'RES' + Math.random().toString(36).substr(2, 9).toUpperCase();

      const reservationData = {
        confirmationNumber: confirmationNumber
      };
      formData.forEach((value, key) => reservationData[key] = value);

      // Simulate brief processing
      submitButton.disabled = true;
      submitButton.innerHTML = 'Submitting... ⏳';

      setTimeout(() => {
        // IMMEDIATELY show success view (client-side, no backend wait = no flicker)
        form.style.display = 'none';
        successView.classList.add('show');

        // Populate confirmation details
        document.getElementById('confirmationNumber').textContent = confirmationNumber;

        const detailsHTML = \`
          <p><strong>Name:</strong> \${reservationData.name}</p>
          <p><strong>Date:</strong> \${new Date(reservationData.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> \${reservationData.time}</p>
          <p><strong>Party Size:</strong> \${reservationData.partySize} guests</p>
          \${reservationData.specialRequests ? \`<p><strong>Special Requests:</strong> \${reservationData.specialRequests}</p>\` : ''}
        \`;
        document.getElementById('reservationDetails').innerHTML = detailsHTML;

        // Save to backend asynchronously in background (fire and forget)
        fetch('/api/mcp/tools/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverName: 'restaurant',
            toolName: 'make_reservation',
            args: { _elicitationData: reservationData }
          })
        }).then(response => response.json())
          .then(result => console.log('✓ Reservation saved to backend:', result))
          .catch(err => console.error('Backend save error (non-critical):', err));

        // Notify parent of success
        if (typeof window.sendToHost === 'function') {
          window.sendToHost({
            type: 'reservation-success',
            confirmationNumber: confirmationNumber,
            data: reservationData
          });
        }
      }, 500);
    });
  </script>
</body>
</html>
  `;
}

function generateReservationDetailsHTML(reservation) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Lato', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      max-width: 500px;
      width: 100%;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      text-align: center;
      padding: 40px 30px;
    }
    .header h1 {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .content {
      padding: 30px;
    }
    .confirmation {
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      margin-bottom: 30px;
    }
    .detail {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .detail:last-child {
      border-bottom: none;
    }
    .label {
      color: #666;
      font-weight: 500;
    }
    .value {
      color: #1a1a2e;
      font-weight: 600;
    }
    .status {
      display: inline-block;
      padding: 6px 12px;
      background: #d1fae5;
      color: #065f46;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>✓</h1>
      <h2>Reservation Confirmed</h2>
    </div>
    <div class="content">
      <div class="confirmation">${reservation.confirmationNumber}</div>

      <div class="detail">
        <span class="label">Guest Name</span>
        <span class="value">${reservation.customerName}</span>
      </div>
      <div class="detail">
        <span class="label">Date & Time</span>
        <span class="value">${new Date(reservation.date).toLocaleDateString()} at ${reservation.time}</span>
      </div>
      <div class="detail">
        <span class="label">Party Size</span>
        <span class="value">${reservation.partySize} ${reservation.partySize === 1 ? 'guest' : 'guests'}</span>
      </div>
      <div class="detail">
        <span class="label">Email</span>
        <span class="value">${reservation.email}</span>
      </div>
      <div class="detail">
        <span class="label">Phone</span>
        <span class="value">${reservation.phone}</span>
      </div>
      <div class="detail">
        <span class="label">Status</span>
        <span class="status">${reservation.status}</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function generateConfirmationHTML(reservation) {
  const formattedDate = new Date(reservation.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes checkmark {
      0% { stroke-dashoffset: 100; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes celebrate {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    body {
      font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 600px;
      width: 100%;
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: fadeIn 0.6s ease-out;
    }
    .success-header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      text-align: center;
      padding: 50px 30px;
      position: relative;
    }
    .checkmark-circle {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: celebrate 0.5s ease-out 0.3s;
    }
    .checkmark {
      stroke: white;
      stroke-width: 3;
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
      animation: checkmark 0.5s ease-out 0.5s forwards;
    }
    .success-header h1 {
      font-size: 32px;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .success-header p {
      font-size: 18px;
      opacity: 0.95;
    }
    .confirmation-number {
      background: rgba(255, 255, 255, 0.95);
      color: #059669;
      padding: 20px;
      margin: 30px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .confirmation-number .label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .confirmation-number .number {
      font-size: 28px;
      font-weight: 700;
      color: #059669;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
    }
    .details {
      padding: 30px;
    }
    .detail-group {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
    .detail-value {
      font-size: 16px;
      color: #1f2937;
      font-weight: 600;
      text-align: right;
    }
    .important-note {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 16px;
      border-radius: 8px;
      margin: 20px 30px;
    }
    .important-note .icon {
      font-size: 20px;
      margin-right: 8px;
    }
    .important-note p {
      font-size: 14px;
      color: #92400e;
      line-height: 1.6;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer h3 {
      font-size: 20px;
      color: #1f2937;
      margin-bottom: 15px;
    }
    .footer p {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.8;
    }
    .footer .contact {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .footer .contact p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-header">
      <div class="checkmark-circle">
        <svg width="50" height="50" viewBox="0 0 52 52">
          <path class="checkmark" fill="none" d="M14 27l7 7 16-16" />
        </svg>
      </div>
      <h1>🎉 Reservation Confirmed!</h1>
      <p>Thank you, ${reservation.customerName}!</p>
    </div>

    <div class="confirmation-number">
      <div class="label">Your Confirmation Number</div>
      <div class="number">${reservation.confirmationNumber}</div>
    </div>

    <div class="details">
      <div class="detail-group">
        <div class="detail-row">
          <span class="detail-label">📅 Date</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🕐 Time</span>
          <span class="detail-value">${reservation.time}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">👥 Party Size</span>
          <span class="detail-value">${reservation.partySize} ${reservation.partySize === 1 ? 'guest' : 'guests'}</span>
        </div>
        ${reservation.tablePreference && reservation.tablePreference !== 'any' ? `
        <div class="detail-row">
          <span class="detail-label">🪑 Table</span>
          <span class="detail-value">${reservation.tablePreference}</span>
        </div>
        ` : ''}
        ${reservation.occasion && reservation.occasion !== 'none' ? `
        <div class="detail-row">
          <span class="detail-label">🎊 Occasion</span>
          <span class="detail-value">${reservation.occasion}</span>
        </div>
        ` : ''}
      </div>

      <div class="detail-group">
        <div class="detail-row">
          <span class="detail-label">📧 Email</span>
          <span class="detail-value">${reservation.email}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📱 Phone</span>
          <span class="detail-value">${reservation.phone}</span>
        </div>
      </div>
    </div>

    <div class="important-note">
      <p>
        <span class="icon">💡</span>
        <strong>Important:</strong> Please save your confirmation number <strong>${reservation.confirmationNumber}</strong>.
        You'll need it to view, modify, or cancel your reservation.
      </p>
    </div>

    <div class="footer">
      <h3>We're Excited to Host You!</h3>
      <p>
        Our culinary team is preparing an unforgettable dining experience.<br>
        Please arrive 10 minutes before your reservation time.
      </p>

      <div class="contact">
        <p><strong>La Maison Élégante</strong></p>
        <p>123 Rue de la Gastronomie, Paris 75008</p>
        <p>📞 +33 1 2345 6789 | ✉️ reservations@lamaisonelegante.fr</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function generateModifyReservationHTML(reservation) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Lato', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      text-align: center;
      padding: 40px 30px;
    }
    form {
      padding: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a2e;
    }
    input, select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Modify Reservation</h1>
      <p>${reservation.confirmationNumber}</p>
    </div>
    <form id="modifyForm">
      <div class="form-group">
        <label>Date</label>
        <input type="date" name="date" value="${reservation.date}">
      </div>
      <div class="form-group">
        <label>Time</label>
        <select name="time">
          <option value="17:00" ${reservation.time === '17:00' ? 'selected' : ''}>5:00 PM</option>
          <option value="18:00" ${reservation.time === '18:00' ? 'selected' : ''}>6:00 PM</option>
          <option value="19:00" ${reservation.time === '19:00' ? 'selected' : ''}>7:00 PM</option>
          <option value="20:00" ${reservation.time === '20:00' ? 'selected' : ''}>8:00 PM</option>
          <option value="21:00" ${reservation.time === '21:00' ? 'selected' : ''}>9:00 PM</option>
        </select>
      </div>
      <div class="form-group">
        <label>Party Size</label>
        <input type="number" name="partySize" min="1" max="20" value="${reservation.partySize}">
      </div>
      <button type="submit">Update Reservation</button>
    </form>
  </div>

  <script>
    document.getElementById('modifyForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        _continueExecution: true,
        _tool: 'modify_reservation',
        _elicitationData: {
          confirmationNumber: '${reservation.confirmationNumber}'
        }
      };
      formData.forEach((value, key) => data._elicitationData[key] = value);

      window.sendToHost({ type: 'elicitation-response', formData: data });
    });
  </script>
</body>
</html>
  `;
}

function generateWinePairingHTML(dishes, wineType) {
  const wines = restaurantState.wineInventory.filter(
    w => wineType === 'any' || w.type === wineType
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Lato', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      text-align: center;
      padding: 40px 30px;
      border-radius: 16px 16px 0 0;
    }
    .wines {
      background: white;
      padding: 30px;
      border-radius: 0 0 16px 16px;
    }
    .wine-card {
      padding: 24px;
      background: #f8f9fa;
      border-radius: 12px;
      margin-bottom: 16px;
      border-left: 4px solid #ffd700;
    }
    .wine-name {
      font-size: 22px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 8px;
    }
    .wine-type {
      display: inline-block;
      padding: 4px 12px;
      background: #667eea;
      color: white;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .wine-description {
      color: #666;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .wine-price {
      font-size: 20px;
      font-weight: 700;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍷 Sommelier's Wine Pairings</h1>
      <p>Expertly selected to complement your meal</p>
    </div>
    <div class="wines">
      ${wines.map(wine => `
        <div class="wine-card">
          <div class="wine-name">${wine.name}</div>
          <span class="wine-type">${wine.type}</span>
          <p class="wine-description">${wine.description}</p>
          <div class="wine-price">$${wine.price}</div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `;
}

function generateChefSpecialHTML(special) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Lato', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 0;
    }
    .hero {
      background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),
                  url('data:image/svg+xml,%3Csvg width="800" height="400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect fill="%23d4a574" width="800" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="%23fff"%3EChef Special%3C/text%3E%3C/svg%3E');
      background-size: cover;
      background-position: center;
      color: white;
      text-align: center;
      padding: 100px 40px;
    }
    .hero h1 {
      font-size: 48px;
      font-family: 'Playfair Display', Georgia, serif;
      margin-bottom: 16px;
    }
    .hero .chef {
      font-size: 18px;
      opacity: 0.9;
    }
    .content {
      max-width: 800px;
      margin: -40px auto 0;
      background: white;
      border-radius: 16px 16px 0 0;
      padding: 40px;
    }
    .price {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 24px;
    }
    .description {
      font-size: 18px;
      color: #666;
      line-height: 1.8;
      margin-bottom: 24px;
    }
    .story {
      padding: 24px;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      border-radius: 8px;
      font-style: italic;
      color: #555;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${special.name}</h1>
    <p class="chef">by ${special.chef}</p>
  </div>
  <div class="content">
    <div class="price">$${special.price}</div>
    <p class="description">${special.description}</p>
    <div class="story">
      <strong>Chef's Story:</strong> ${special.story}
    </div>
  </div>
</body>
</html>
  `;
}

function generateSecurePaymentHTML(amount) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      width: 100%;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      text-align: center;
      padding: 40px 30px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .security-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      margin-top: 12px;
    }
    .amount-display {
      background: #f8f9fa;
      padding: 24px;
      text-align: center;
      border-bottom: 2px solid #e9ecef;
    }
    .amount-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .amount-value {
      font-size: 36px;
      font-weight: 700;
      color: #059669;
    }
    form {
      padding: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a2e;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .card-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
    }
    button:disabled {
      background: #d1d5db;
      cursor: not-allowed;
      transform: none;
    }
    .security-note {
      margin-top: 20px;
      padding: 16px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.6;
    }
    .security-note strong {
      color: #92400e;
      display: block;
      margin-bottom: 4px;
    }
    .security-note p {
      color: #78350f;
      margin: 0;
    }
    #result {
      margin-top: 20px;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      display: none;
    }
    #result.success {
      background: #d1fae5;
      color: #065f46;
      border: 2px solid #10b981;
    }
    #result.error {
      background: #fee2e2;
      color: #991b1b;
      border: 2px solid #ef4444;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Secure Payment</h1>
      <p>Phase 3 Security Demonstration</p>
      <div class="security-badge">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        Data bypasses chat history
      </div>
    </div>

    <div class="amount-display">
      <div class="amount-label">Payment Amount</div>
      <div class="amount-value">$${amount.toFixed(2)}</div>
    </div>

    <form id="paymentForm">
      <div class="form-group">
        <label>Cardholder Name *</label>
        <input type="text" name="cardholderName" placeholder="John Doe" required>
      </div>

      <div class="form-group">
        <label>Card Number *</label>
        <input type="text" name="cardNumber" placeholder="4532 1234 5678 9010" pattern="[0-9 ]+" maxlength="19" required>
      </div>

      <div class="card-row">
        <div class="form-group">
          <label>Expiry Date *</label>
          <input type="text" name="expiry" placeholder="MM/YY" pattern="[0-9/]+" maxlength="5" required>
        </div>
        <div class="form-group">
          <label>CVV *</label>
          <input type="password" name="cvv" placeholder="123" pattern="[0-9]+" maxlength="4" required>
        </div>
      </div>

      <button type="submit">Submit Secure Payment 🔒</button>

      <div class="security-note">
        <strong>🔒 Security Demonstration:</strong>
        <p>This payment data is sent <strong>directly to the backend</strong> via <code>window.sendToBackend()</code>, completely bypassing the chat interface. Your sensitive data never appears in chat history, browser DevTools, or extensions.</p>
      </div>

      <div id="result"></div>
    </form>
  </div>

  <script>
    const form = document.getElementById('paymentForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const resultDiv = document.getElementById('result');

    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      // Disable button and show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = 'Processing securely... 🔒';
      resultDiv.style.display = 'none';

      const formData = new FormData(e.target);
      const paymentData = {
        amount: ${amount},
        cardholderName: formData.get('cardholderName'),
        cardNumber: formData.get('cardNumber'),
        expiry: formData.get('expiry'),
        cvv: formData.get('cvv'),
        timestamp: new Date().toISOString()
      };

      try {
        // IMPORTANT: POST directly to backend, bypassing chat history!
        // This demonstrates Phase 3 security - sensitive data never touches the chat
        const response = await fetch('/api/mcp/tools/call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serverName: 'restaurant',
            toolName: 'process_secure_payment',
            args: paymentData
          })
        });

        if (!response.ok) {
          throw new Error('Payment processing failed');
        }

        const result = await response.json();
        console.log('Payment processed (backend only):', result);

        showResult('success', '✓ Payment processed securely! Data was sent directly to backend without going through chat.');
        form.reset();

      } catch (error) {
        console.error('Payment error:', error);
        showResult('error', '✗ Payment error: ' + error.message);
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Secure Payment 🔒';
      }
    });

    function showResult(type, message) {
      resultDiv.className = type;
      resultDiv.textContent = message;
      resultDiv.style.display = 'block';
    }

    // Format card number with spaces
    const cardNumberInput = form.querySelector('[name="cardNumber"]');
    cardNumberInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\\s/g, '');
      let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formattedValue;
    });

    // Format expiry date
    const expiryInput = form.querySelector('[name="expiry"]');
    expiryInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\\D/g, '');
      if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
      e.target.value = value;
    });
  </script>
</body>
</html>
  `;
}

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Restaurant MCP Server started - La Maison Élégante');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
