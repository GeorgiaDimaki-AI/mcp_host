/**
 * Main App Component
 */

import { Chat } from './components/Chat/Chat';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { MCPConfigProvider } from './contexts/MCPConfigContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MCPConfigProvider>
          <Chat />
        </MCPConfigProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
