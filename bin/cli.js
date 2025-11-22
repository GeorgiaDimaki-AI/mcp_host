#!/usr/bin/env node

/**
 * MCP Webview Host CLI
 * Starts the MCP webview host server and opens browser
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.join(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIST = path.join(ROOT_DIR, 'frontend', 'dist');
const PORT = process.env.PORT || 3000;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'cyan');

  // Check if frontend is built
  if (!fs.existsSync(FRONTEND_DIST)) {
    log('❌ Frontend not built. Building now...', 'yellow');
    log('   This may take a minute on first run.', 'yellow');
    return false;
  }

  // Check if backend dist exists
  const backendDist = path.join(BACKEND_DIR, 'dist');
  if (!fs.existsSync(backendDist)) {
    log('❌ Backend not built. Building now...', 'yellow');
    return false;
  }

  log('✓ Prerequisites met', 'green');
  return true;
}

function buildIfNeeded() {
  if (!checkPrerequisites()) {
    log('\n📦 Building MCP Webview Host...', 'blue');

    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const build = spawn(npm, ['run', 'build:all'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true,
    });

    return new Promise((resolve, reject) => {
      build.on('close', (code) => {
        if (code !== 0) {
          log(`\n❌ Build failed with code ${code}`, 'red');
          reject(new Error('Build failed'));
        } else {
          log('\n✓ Build successful', 'green');
          resolve();
        }
      });

      build.on('error', (err) => {
        log(`\n❌ Build error: ${err.message}`, 'red');
        reject(err);
      });
    });
  }
  return Promise.resolve();
}

async function checkOllama() {
  log('\n🔍 Checking for Ollama...', 'cyan');

  try {
    const response = await fetch('http://localhost:11434/api/version');
    if (response.ok) {
      const data = await response.json();
      log(`✓ Ollama is running (version: ${data.version || 'unknown'})`, 'green');
      return true;
    }
  } catch (err) {
    // Ollama not running
  }

  log('\n⚠️  Ollama is not running', 'yellow');
  log('', 'reset');
  log('The MCP Webview Host can still run for webview features,', 'reset');
  log('but chat functionality requires Ollama.', 'reset');
  log('', 'reset');
  log('To install Ollama:', 'cyan');
  log('', 'reset');

  const platform = process.platform;
  if (platform === 'darwin') {
    log('  macOS:', 'bright');
    log('    brew install ollama', 'green');
    log('    ollama serve', 'green');
  } else if (platform === 'linux') {
    log('  Linux:', 'bright');
    log('    curl -fsSL https://ollama.com/install.sh | sh', 'green');
    log('    ollama serve', 'green');
  } else if (platform === 'win32') {
    log('  Windows:', 'bright');
    log('    Download from https://ollama.com/download', 'green');
  } else {
    log('  Visit: https://ollama.com/download', 'green');
  }

  log('', 'reset');
  log('Or visit: https://ollama.com for installation instructions', 'cyan');
  log('', 'reset');
  log('Continuing without Ollama (webview features only)...', 'yellow');

  return false;
}

async function openBrowser(url) {
  try {
    const open = (await import('open')).default;
    await open(url);
    log(`\n🌐 Browser opened at ${url}`, 'green');
  } catch (err) {
    log(`\n⚠️  Could not open browser automatically: ${err.message}`, 'yellow');
    log(`   Please open your browser and navigate to: ${url}`, 'cyan');
  }
}

async function startServer() {
  log('\n🚀 Starting MCP Webview Host...', 'bright');

  const serverPath = path.join(BACKEND_DIR, 'dist', 'server.js');

  if (!fs.existsSync(serverPath)) {
    log(`❌ Server file not found: ${serverPath}`, 'red');
    process.exit(1);
  }

  const server = spawn('node', [serverPath], {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
    env: { ...process.env, PORT },
  });

  server.on('error', (err) => {
    log(`\n❌ Server error: ${err.message}`, 'red');
    process.exit(1);
  });

  server.on('close', (code) => {
    if (code !== 0) {
      log(`\n❌ Server exited with code ${code}`, 'red');
      process.exit(code);
    }
  });

  // Open browser after a short delay to let server start
  setTimeout(() => {
    openBrowser(`http://localhost:${PORT}`);
  }, 2000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n\n👋 Shutting down MCP Webview Host...', 'yellow');
    server.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('\n\n👋 Shutting down MCP Webview Host...', 'yellow');
    server.kill('SIGTERM');
    process.exit(0);
  });
}

// Main execution
(async () => {
  try {
    log('╔════════════════════════════════════════════╗', 'cyan');
    log('║   MCP Webview Host - Secure LLM Webviews  ║', 'cyan');
    log('╚════════════════════════════════════════════╝', 'cyan');

    await buildIfNeeded();
    await checkOllama();
    await startServer();
  } catch (err) {
    log(`\n❌ Fatal error: ${err.message}`, 'red');
    process.exit(1);
  }
})();
