#!/bin/bash

# MCP Webview Host - Easy Test Script
# This script helps you quickly test the package

set -e

echo "🧪 MCP Webview Host - Test Script"
echo "=================================="
echo ""

# Function to display menu
show_menu() {
    echo "Choose a test option:"
    echo "  1) Quick NPX Test (recommended)"
    echo "  2) Full Test Suite"
    echo "  3) Build & Test"
    echo "  4) Development Mode"
    echo "  5) Clean & Rebuild"
    echo "  q) Quit"
    echo ""
}

# Quick NPX test
npx_test() {
    echo "🚀 Running NPX test..."
    echo "This will start the server from the published package"
    echo ""
    npx @gdimaki-ai/mcp-webview-host
}

# Full test suite
full_test() {
    echo "🧪 Running full test suite..."
    echo ""

    if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm run install:all
    fi

    echo ""
    echo "🏗️  Building..."
    npm run build:all

    echo ""
    echo "✅ Running tests..."
    npm test

    echo ""
    echo "✨ All tests passed!"
}

# Build and test
build_test() {
    echo "🏗️  Building and testing..."
    echo ""

    if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm run install:all
    fi

    npm run build:all
    npm test
}

# Development mode
dev_mode() {
    echo "🔧 Starting development mode..."
    echo ""
    echo "This will start both frontend and backend in development mode"
    echo "Press Ctrl+C to stop"
    echo ""

    if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm run install:all
    fi

    echo ""
    echo "Starting servers..."
    echo "- Backend: http://localhost:3000"
    echo "- Frontend: http://localhost:5173"
    echo ""

    # Start both in background
    (cd backend && npm run dev) &
    BACKEND_PID=$!

    (cd frontend && npm run dev) &
    FRONTEND_PID=$!

    # Wait for Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
    wait
}

# Clean and rebuild
clean_rebuild() {
    echo "🧹 Cleaning and rebuilding..."
    echo ""

    echo "Removing node_modules..."
    rm -rf backend/node_modules frontend/node_modules node_modules
    rm -rf backend/dist frontend/dist

    echo "Installing dependencies..."
    npm run install:all

    echo "Building..."
    npm run build:all

    echo "Running tests..."
    npm test

    echo ""
    echo "✨ Clean rebuild complete!"
}

# Main loop
while true; do
    show_menu
    read -p "Enter choice: " choice
    echo ""

    case $choice in
        1)
            npx_test
            break
            ;;
        2)
            full_test
            break
            ;;
        3)
            build_test
            break
            ;;
        4)
            dev_mode
            break
            ;;
        5)
            clean_rebuild
            break
            ;;
        q|Q)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please try again."
            echo ""
            ;;
    esac
done
