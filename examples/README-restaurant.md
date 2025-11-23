# La Maison Élégante - Restaurant MCP Server

A beautiful, fully-functional restaurant booking system demonstrating the power of MCP webviews.

## Features

### Core Functionality
- **Interactive Menu** - Browse appetizers, entrees, and desserts with wine pairings
- **Reservation System** - Multi-step booking form with date/time selection
- **Reservation Management** - View, modify, and cancel reservations
- **Confirmation Numbers** - Unique confirmation codes for each booking

### Creative Features
- **Sommelier Wine Pairing** - Expert wine recommendations
- **Chef's Daily Special** - Featured dish with chef's story
- **Beautiful UI** - Modern CSS with gradients, animations, and responsive design

## Installation

1. **Install Dependencies** (if not already installed):
   ```bash
   cd examples
   npm install @modelcontextprotocol/sdk
   ```

2. **Add to MCP Configuration**:
   Edit `/home/user/mcp_host/backend/mcp-config.json`:
   ```json
   {
     "mcpServers": {
       "restaurant": {
         "command": "node",
         "args": ["../examples/restaurant-mcp-server.js"],
         "env": {},
         "description": "La Maison Élégante restaurant booking system",
         "trustLevel": "verified"
       }
     }
   }
   ```

3. **Restart Backend**:
   ```bash
   cd backend
   npm run dev
   ```

4. **Refresh Frontend**:
   Open http://localhost:5173 and refresh the page

## Usage

### Quick Start Prompts

Try these prompts to interact with the restaurant:

1. **View Menu**:
   ```
   Show me the restaurant menu
   ```

2. **Make Reservation**:
   ```
   I'd like to make a reservation for dinner
   ```

3. **Get Wine Recommendations**:
   ```
   Recommend wines to pair with Boeuf Bourguignon
   ```

4. **View Chef Special**:
   ```
   What's today's chef special?
   ```

5. **Check Reservation**:
   ```
   Look up my reservation: RES123ABC
   ```

### Available Tools

#### 1. view_menu
Displays the restaurant menu with categories, dishes, prices, and wine pairings.

**Parameters:**
- `category` (optional): Filter by 'appetizers', 'entrees', 'desserts', 'wines', or 'all'

**Example:**
```
Show me the dessert menu
```

#### 2. make_reservation
Interactive multi-step form to create a new reservation.

**Collects:**
- Guest name, email, phone
- Date and time
- Party size
- Table preferences (window, patio, private, bar)
- Special occasion (birthday, anniversary, etc.)
- Dietary needs
- Special requests

**Example:**
```
I'd like to book a table for 4 people
```

#### 3. view_reservation
Look up reservation details by confirmation number.

**Parameters:**
- `confirmationNumber` (required): The reservation confirmation code

**Example:**
```
Show my reservation RES7K8M2P
```

#### 4. modify_reservation
Change reservation details (date, time, party size).

**Parameters:**
- `confirmationNumber` (required): The reservation to modify

**Example:**
```
Modify my reservation RES7K8M2P
```

#### 5. cancel_reservation
Cancel a reservation.

**Parameters:**
- `confirmationNumber` (required): The reservation to cancel
- `reason` (optional): Reason for cancellation

**Example:**
```
Cancel reservation RES7K8M2P
```

#### 6. sommelier_pairing
Get expert wine pairing recommendations.

**Parameters:**
- `dishes` (optional): Array of dish names
- `wineType` (optional): 'red', 'white', 'rosé', 'sparkling', or 'any'

**Example:**
```
Recommend wines for Bouillabaisse
```

#### 7. chef_special
View today's chef special with story and details.

**Example:**
```
What's the chef's special today?
```

## State Management

The server maintains in-memory state for:
- **Reservations**: Map of confirmation numbers to reservation objects
- **Menu Items**: Array of dishes with details
- **Wine Inventory**: Available wines with pairing notes
- **Daily Specials**: Chef's featured dishes

**Note:** State is lost when server restarts. For production, you would persist to a database.

## Customization

### Adding Menu Items

Edit the `menuItems` array in `restaurant-mcp-server.js`:

```javascript
menuItems: [
  {
    id: 'ent3',
    category: 'entrees',
    name: 'Coq au Vin',
    description: 'Chicken braised in red wine with mushrooms and pearl onions',
    price: 42,
    tags: ['signature', 'gluten-free'],
    wine: 'Burgundy Pinot Noir 2019'
  },
  // Add more items...
]
```

### Changing Colors/Styling

The CSS is embedded in the HTML generators. Look for these sections:

- **Primary Color**: `#667eea` (purple-blue gradient)
- **Secondary Color**: `#764ba2` (purple)
- **Dark Background**: `#1a1a2e`
- **Success Color**: `#28a745`

Example:
```javascript
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

Change to your brand colors:
```javascript
background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
```

### Adding New Tools

1. **Add to tools list**:
   ```javascript
   server.setRequestHandler(ListToolsRequestSchema, async () => {
     return {
       tools: [
         // ... existing tools
         {
           name: 'your_new_tool',
           description: 'Description of what it does',
           inputSchema: {
             type: 'object',
             properties: {
               // Define parameters
             }
           }
         }
       ]
     };
   });
   ```

2. **Handle in CallToolRequestSchema**:
   ```javascript
   case 'your_new_tool': {
     // Implementation
     return {
       content: [
         {
           type: 'text',
           text: 'Result description'
         },
         {
           type: 'resource',
           resource: {
             uri: 'webview://your-tool',
             mimeType: 'text/html',
             text: generateYourHTML()
           }
         }
       ]
     };
   }
   ```

## Design Patterns

### Multi-Step Forms with Elicitation

The reservation form demonstrates a complex elicitation flow:

1. **Show Form**: Display interactive HTML form
2. **Collect Data**: User fills out form, clicks submit
3. **Submit with Special Fields**: Include `_continueExecution: true`, `_tool`, `_elicitationData`
4. **Process in Tool Handler**: Check for `args._elicitationData` to detect submission
5. **Save and Respond**: Process data and return confirmation

**Key Code**:
```javascript
// In form JavaScript:
const data = {
  _continueExecution: true,
  _tool: 'make_reservation',
  _elicitationData: {
    // Form fields here
  }
};
window.sendToHost({ type: 'elicitation-response', formData: data });

// In tool handler:
if (args._elicitationData) {
  // This is form submission - process it
  const reservation = args._elicitationData;
  // ... save to state
  return { content: [{ type: 'text', text: 'Confirmed!' }] };
}

// Otherwise show form
return {
  content: [{
    type: 'resource',
    resource: {
      uri: 'webview://form',
      mimeType: 'text/html',
      text: generateFormHTML()
    }
  }]
};
```

### State Management

Simple in-memory Map for reservations:

```javascript
const restaurantState = {
  reservations: new Map(),
  // ... other state
};

// Save
restaurantState.reservations.set(confirmationNumber, reservation);

// Retrieve
const reservation = restaurantState.reservations.get(confirmationNumber);

// Update
const existing = restaurantState.reservations.get(confirmationNumber);
Object.assign(existing, updates);
restaurantState.reservations.set(confirmationNumber, existing);

// Delete
restaurantState.reservations.delete(confirmationNumber);
```

### Responsive HTML Templates

All templates use:
- Flexbox for layouts
- `max-width` for content containers
- Relative units (%, rem, em)
- Mobile-first approach

**Example**:
```css
.container {
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
}

@media (max-width: 640px) {
  .container {
    padding: 16px;
  }
}
```

## Troubleshooting

### Server doesn't start
- Check that you're in the correct directory
- Verify `@modelcontextprotocol/sdk` is installed
- Check Node.js version (requires 18+)

### Tools not showing
- Make sure `trustLevel: "verified"` is set in mcp-config.json
- Restart the backend after config changes
- Refresh the frontend

### Forms not submitting
- Check browser console for JavaScript errors
- Verify `window.sendToHost` is available (trust level must be verified/trusted)
- Check that `_continueExecution`, `_tool`, and `_elicitationData` are included

### Webviews not rendering
- Check trust level in MCP settings
- Ensure HTML is valid (no syntax errors)
- Look for CSP violations in browser console

## Production Considerations

For a production restaurant booking system, you would want to add:

1. **Database Persistence**
   - PostgreSQL or MongoDB for reservations
   - Redis for session management

2. **Authentication**
   - User accounts
   - JWT tokens
   - Password reset flows

3. **Email Notifications**
   - Confirmation emails
   - Reminder emails (24 hours before)
   - Cancellation receipts

4. **SMS Integration**
   - Text confirmations
   - Reminders

5. **Payment Integration**
   - Stripe for deposits
   - Refund handling

6. **Availability Management**
   - Real table inventory
   - Capacity limits
   - Time slot blocking

7. **Admin Dashboard**
   - Reservation management
   - Menu editing
   - Analytics

8. **Calendar Integration**
   - Google Calendar sync
   - iCal exports

9. **Waitlist System**
   - Queue management
   - Automatic notifications

10. **Review System**
    - Post-dining surveys
    - Ratings collection

## License

MIT - Feel free to use this as a template for your own MCP servers!

## Credits

Created as a demonstration of MCP webview capabilities for the MCP Webview Host application.

**Restaurant Name**: La Maison Élégante (The Elegant House)
**Cuisine**: Fine French Dining
**Established**: 1987 (fictional)

---

Bon appétit! 🍽️
