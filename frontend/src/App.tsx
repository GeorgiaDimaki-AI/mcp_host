/**
 * Main App Component
 */

import { Chat } from './components/Chat/Chat';
import { MCPConfigProvider } from './contexts/MCPConfigContext';
import './index.css';

function App() {
  return (
    <MCPConfigProvider>
      <Chat />
    </MCPConfigProvider>
  );
}

export default App;
