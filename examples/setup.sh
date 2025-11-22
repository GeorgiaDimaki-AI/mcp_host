#!/bin/bash

# Setup script for MCP Webview Example

echo "🔧 Setting up MCP Webview Example..."
echo ""

# Check if we're in the examples directory
if [ ! -f "webview-example-server.js" ]; then
    echo "❌ Error: Please run this script from the examples directory"
    echo "   cd examples && ./setup.sh"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Make script executable
echo "🔐 Making server script executable..."
chmod +x webview-example-server.js
echo "✅ Server script is executable"
echo ""

# Copy example config
echo "📝 Setting up MCP configuration..."

# Check if parent backend dir exists
if [ -d "../backend" ]; then
    CONFIG_FILE="../backend/mcp-config.json"

    if [ -f "$CONFIG_FILE" ]; then
        echo "⚠️  $CONFIG_FILE already exists"
        read -p "   Do you want to back it up and replace it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
            echo "   Backed up to ${CONFIG_FILE}.backup"
            cp mcp-config.example.json "$CONFIG_FILE"
            echo "   ✅ Configuration updated"
        else
            echo "   ℹ️  You'll need to manually add the example server to your config"
            echo "   See mcp-config.example.json for the configuration"
        fi
    else
        cp mcp-config.example.json "$CONFIG_FILE"
        echo "✅ Created $CONFIG_FILE"
    fi
else
    echo "⚠️  Parent backend directory not found"
    echo "   You'll need to manually configure the MCP server"
    echo "   See mcp-config.example.json for configuration"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Next steps:"
echo ""
echo "1. Start the MCP Webview Host:"
echo "   cd .. && npm start"
echo "   (or use: npx @gdimaki-ai/mcp-webview-host)"
echo ""
echo "2. Click 'MCP Tools' in the UI"
echo ""
echo "3. Try the example tools:"
echo "   - show_greeting_card"
echo "   - collect_user_info"
echo "   - create_todo_list"
echo "   - show_data_table"
echo "   - collect_api_key"
echo ""
echo "📖 Read examples/README.md for detailed usage instructions"
echo ""
