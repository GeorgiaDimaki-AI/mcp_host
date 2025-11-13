# Quick Start Guide

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** installed
   ```bash
   node --version  # Should be 18 or higher
   ```

2. **Ollama** installed and running
   - Download from: https://ollama.ai
   - Install a model (e.g., `ollama pull llama2`)
   - Start Ollama: `ollama serve`

## Installation

### Step 1: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 2: Configure Environment

Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

Edit `.env` if needed (defaults should work for most setups):
```
PORT=3000
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=llama2
CORS_ORIGIN=http://localhost:5173
```

## Running the Application

### Step 1: Start Ollama

In a terminal:
```bash
ollama serve
```

### Step 2: Start the Backend

In a new terminal:
```bash
cd backend
npm run dev
```

You should see:
```
Server running on http://localhost:3000
WebSocket server ready
Ollama URL: http://localhost:11434
Default model: llama2
```

### Step 3: Start the Frontend

In another terminal:
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 4: Open the Application

Open your browser and navigate to: **http://localhost:5173**

## Testing the Application

### Basic Chat

1. Type a message in the input box
2. Press Enter or click Send
3. Wait for the LLM to respond

### Testing Webviews

Try these prompts to test webview functionality:

1. **Simple form:**
   ```
   Create a form to collect user information with fields for name and email
   ```

2. **Data display:**
   ```
   Show me a table with the first 5 prime numbers and their squares
   ```

3. **Interactive element:**
   ```
   Create a simple temperature converter (Celsius to Fahrenheit)
   ```

## Troubleshooting

### "Failed to connect to server"

- Make sure the backend is running on port 3000
- Check that no other application is using port 3000
- Try `lsof -i :3000` to see what's using the port

### "Ollama disconnected"

- Ensure Ollama is running: `ollama serve`
- Check the Ollama URL in `.env` matches your setup
- Verify a model is installed: `ollama list`

### "No models available"

- Pull a model: `ollama pull llama2` (or another model)
- Wait for the download to complete
- Restart the backend server

### WebSocket connection issues

- Check browser console for errors
- Ensure backend WebSocket is running (should log "WebSocket server ready")
- Try refreshing the page

## Available Models

To see available Ollama models:
```bash
ollama list
```

To pull a new model:
```bash
ollama pull <model-name>
```

Popular models:
- `llama2` - Good general-purpose model
- `codellama` - Optimized for code
- `mistral` - Fast and capable
- `neural-chat` - Conversational model

## Next Steps

- Read [WEBVIEW_GUIDE.md](./WEBVIEW_GUIDE.md) to learn about webview capabilities
- Check [README.md](./README.md) for architecture details
- Experiment with different models
- Build custom webviews for your use cases

## Development

### Backend Development

The backend automatically reloads when you make changes (using tsx watch).

### Frontend Development

Vite provides hot module replacement, so changes appear instantly.

### Building for Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the console logs (backend and browser)
- Ensure all dependencies are installed correctly
