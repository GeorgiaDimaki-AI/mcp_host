/**
 * Main App Component
 */

import { Chat } from './components/Chat/Chat';
import { MCPConfigProvider } from './contexts/MCPConfigContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <MCPConfigProvider>
        <Chat />
      </MCPConfigProvider>
    </ThemeProvider>
  );
}

export default App;
