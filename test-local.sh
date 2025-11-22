#!/bin/bash

# Test the local package build before publishing

set -e

echo "🧪 Testing Local Package Build"
echo "==============================="
echo ""

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if tarball exists
TARBALL="gdimaki-ai-mcp-webview-host-0.1.0-beta.1.tgz"

if [ ! -f "$TARBALL" ]; then
    echo "📦 Creating package tarball..."
    npm pack
fi

echo "✅ Tarball ready: $TARBALL"
echo ""
echo "Choose a test method:"
echo "  1) Test with NPX (recommended - quick test)"
echo "  2) Install globally and test"
echo "  3) Test in temporary directory"
echo "  4) Just show me the commands"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Testing with NPX..."
        echo "Running: npx ./$TARBALL"
        echo ""
        npx "./$TARBALL"
        ;;
    2)
        echo ""
        echo "🌍 Installing globally..."
        npm install -g "./$TARBALL"
        echo ""
        echo "✅ Installed! Running: mcp-webview-host"
        echo ""
        mcp-webview-host
        echo ""
        echo "To uninstall: npm uninstall -g @gdimaki-ai/mcp-webview-host"
        ;;
    3)
        echo ""
        echo "📁 Testing in temporary directory..."
        TEMP_DIR="/tmp/test-mcp-$RANDOM"
        mkdir -p "$TEMP_DIR"
        cd "$TEMP_DIR"
        echo "Created test directory: $TEMP_DIR"
        echo ""
        npm install "$OLDPWD/$TARBALL"
        echo ""
        echo "✅ Installed! Running..."
        npx @gdimaki-ai/mcp-webview-host
        ;;
    4)
        echo ""
        echo "📋 Test Commands:"
        echo ""
        echo "Method 1 - NPX (quick):"
        echo "  npx ./gdimaki-ai-mcp-webview-host-0.1.0-beta.1.tgz"
        echo ""
        echo "Method 2 - Global install:"
        echo "  npm install -g ./gdimaki-ai-mcp-webview-host-0.1.0-beta.1.tgz"
        echo "  mcp-webview-host"
        echo "  npm uninstall -g @gdimaki-ai/mcp-webview-host"
        echo ""
        echo "Method 3 - Test directory:"
        echo "  mkdir /tmp/test-mcp && cd /tmp/test-mcp"
        echo "  npm install /home/user/mcp_host/gdimaki-ai-mcp-webview-host-0.1.0-beta.1.tgz"
        echo "  npx @gdimaki-ai/mcp-webview-host"
        echo ""
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
