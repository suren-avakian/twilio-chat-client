import { useState } from 'react';
import { Chat } from './components/Chat';
import { Login } from './components/Login';
import { isAuthenticated } from './utils/auth';
import './App.css';

function App() {
  // Initialize auth state by checking localStorage
  const [isAuth, setIsAuth] = useState(() => isAuthenticated());

  // You can set these via environment variables or pass them as props
  const backendUrl = import.meta.env.VITE_NODE_JS_MICROSERVICE_BACKEND_URL || 'http://localhost:3000';
  const conversationSid = import.meta.env.VITE_CONVERSATION_SID;

  const handleLoginSuccess = () => {
    setIsAuth(true);
  };

  return (
    <div className="App">
      {isAuth ? (
        <Chat backendUrl={backendUrl} conversationSid={conversationSid} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
