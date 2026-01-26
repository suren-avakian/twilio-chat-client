import { useState, useRef, useEffect } from 'react';
import { useTwilioConversation } from '../hooks/useTwilioConversation';
import { getStoredToken } from '../utils/auth';
import type { Message } from '@twilio/conversations';
import './Chat.css';

interface ChatProps {
  backendUrl?: string;
  conversationSid?: string;
}

export const Chat = ({ backendUrl, conversationSid }: ChatProps) => {
  const [messageInput, setMessageInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [useBackend, setUseBackend] = useState(!!backendUrl);
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isConnected,
    isLoading,
    error,
    sendMessage,
    connect,
    conversation,
  } = useTwilioConversation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear connection error when successfully connected
  useEffect(() => {
    if (isConnected) {
      setConnectionError(null);
    }
  }, [isConnected]);

  // Get current identity from conversation when connected
  useEffect(() => {
    if (conversation && isConnected) {
      // Identity is set by backend from JWT, we can get it from conversation
      // or from the first message we send
      // For now, we'll extract it from conversation attributes or use a default
      conversation.getAttributes().then((attrs) => {
        // Backend might store identity in attributes
        if (attrs && typeof attrs === 'object' && 'identity' in attrs) {
          setCurrentIdentity(attrs.identity as string);
        }
      }).catch(() => {
        // If attributes don't have identity, we'll determine from messages
      });
    }
  }, [conversation, isConnected]);

  const handleConnect = async () => {
    setConnectionError(null); // Clear previous errors
    
    try {
      let token: string;
      let finalConversationSid = conversationSid;

      if (useBackend && backendUrl) {
        // Get JWT from localStorage using auth service
        const authToken = getStoredToken();
        
        if (!authToken) {
          throw new Error('Please login first - authentication token not found');
        }
        
        // Step 1: Get Twilio token (passing JWT)
        // Identity will be extracted from JWT on backend
        console.log('[Chat] Requesting Twilio token from backend...');
        const tokenResponse = await fetch(`${backendUrl}/api/twilio/token`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Auth-Token': authToken,
            'X-Auth-Token': authToken,
          },
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}));
          console.error('[Chat] Token request failed:', errorData);
          throw new Error(errorData.error || 'Failed to get Twilio token');
        }

         const tokenData = await tokenResponse.json();
         token = tokenData.token;
         const identityFromBackend = tokenData.identity;
         const userIdFromBackend = tokenData.userId;
         
         console.log('[Chat] ✅ Token received');
         console.log('[Chat] Identity:', identityFromBackend);
         console.log('[Chat] User ID:', userIdFromBackend);
         
         if (!identityFromBackend) {
           throw new Error('Backend did not return identity');
         }
         
         // Store identity for message comparison
         setCurrentIdentity(identityFromBackend);
        
        // Step 2: Create or get conversation if not provided
        // Pass all required parameters including identity
        if (!finalConversationSid) {
          try {
            console.log('[Chat] Creating conversation...');
            console.log('[Chat] Request body:', {
              userId: userIdFromBackend,
              uniqueName: identityFromBackend,
              identity: identityFromBackend,
              jwtToken: authToken ? 'present' : 'missing'
            });
            
            const conversationResponse = await fetch(`${backendUrl}/api/twilio/conversation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Auth-Token': authToken, // JWT in header
              },
              body: JSON.stringify({ 
                userId: userIdFromBackend || identityFromBackend,
                uniqueName: identityFromBackend, // Use identity as uniqueName fallback
                identity: identityFromBackend, // CRITICAL: Pass identity to add as participant
                jwtToken: authToken, // JWT in body for attributes
              }),
            });

            if (conversationResponse.ok) {
              const conversationData = await conversationResponse.json();
              finalConversationSid = conversationData.conversationSid;
              console.log('[Chat] ✅ Created/retrieved conversation:', finalConversationSid);
              console.log('[Chat] ✅ Participant added:', identityFromBackend);
              
              // Small delay to ensure participant is fully added
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              const errorData = await conversationResponse.json().catch(() => ({}));
              console.error('[Chat] ❌ Failed to create conversation:', errorData);
              throw new Error(errorData.error || 'Failed to create conversation');
            }
          } catch (err) {
            console.error('[Chat] ❌ Error creating conversation:', err);
            throw err; // Don't continue without conversation
          }
        } else {
          // If conversation SID is provided, ensure participant is added
          try {
            const participantResponse = await fetch(`${backendUrl}/api/twilio/conversation/${finalConversationSid}/participant`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Auth-Token': authToken, // JWT in header
              },
              body: JSON.stringify({ 
                identity: identityFromBackend, // CRITICAL: Pass identity
                jwtToken: authToken, // JWT in body
              }),
            });

            if (participantResponse.ok) {
              const data = await participantResponse.json();
              console.log('[Chat] Participant status:', data.message || 'Added to conversation');
            } else {
              const errorData = await participantResponse.json().catch(() => ({}));
              // If participant already exists (409), that's OK
              if (participantResponse.status === 409 || errorData.error?.includes('already')) {
                console.log('[Chat] Participant already exists in conversation');
              } else {
                console.warn('[Chat] Failed to add participant:', errorData);
              }
            }
            
            // Small delay to ensure participant is fully added
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (err) {
            console.warn('[Chat] Error adding participant:', err);
            // Continue anyway - participant might already exist
          }
        }
      } else if (tokenInput.trim()) {
        token = tokenInput.trim();
      } else {
        setConnectionError('Please provide a token (either via backend or paste manually)');
        return;
      }

      await connect(token, finalConversationSid);
    } catch (err) {
      console.error('Connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setConnectionError(`Failed to connect: ${errorMessage}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !isConnected) return;

    await sendMessage(messageInput.trim());
    setMessageInput('');
  };

  const formatMessage = (message: Message) => {
    const date = new Date(message.dateCreated || Date.now());
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Determine if message is from current user
    // Twilio sets message.index to null for messages sent by current user
    // Also compare message.author with currentIdentity if available
    let isFromMe = false;
    
    if (message.index === null) {
      // Twilio marks messages from current user with index = null
      isFromMe = true;
    } else if (currentIdentity && message.author) {
      // Compare author with stored identity
      isFromMe = message.author === currentIdentity;
    }

    // Update currentIdentity from message if we don't have it yet
    if (!currentIdentity && message.index === null && message.author) {
      setCurrentIdentity(message.author);
    }

    return {
      body: message.body || '',
      author: message.author || 'Unknown',
      time,
      isFromMe,
    };
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Twilio Conversations Chat</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '●' : '○'}
          </span>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {!isConnected && (
        <div className="connection-panel">
          {useBackend && backendUrl ? (
            <>
              <div className="input-group">
                <label>Backend URL:</label>
                <input
                  type="text"
                  value={backendUrl}
                  disabled
                  placeholder="URL of the backend NodeJS"
                />
              </div>
              {conversationSid && (
                <div className="input-group">
                  <label>Conversation SID:</label>
                  <input
                    type="text"
                    value={conversationSid}
                    disabled
                  />
                </div>
              )}
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="connect-button"
              >
                {isLoading ? 'Connecting to Chat...' : 'Connect to Chat'}
              </button>
            </>
          ) : (
            <>
              <div className="input-group">
                <label>Twilio Token (paste manually):</label>
                <textarea
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste your Twilio Access Token here"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
              <div className="input-group">
                <label>
                  <input
                    type="checkbox"
                    checked={useBackend}
                    onChange={(e) => setUseBackend(e.target.checked)}
                    disabled={!backendUrl}
                  />
                  Use Backend API (if available)
                </label>
              </div>
              <button
                onClick={handleConnect}
                disabled={isLoading || !tokenInput.trim()}
                className="connect-button"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {connectionError && (
        <div className="error-message">
          <strong>Connection Error:</strong> {connectionError}
        </div>
      )}

      <div className="messages-container">
        {messages.length === 0 && isConnected && (
          <div className="empty-state">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((message) => {
          const formatted = formatMessage(message);
          return (
            <div
              key={message.sid}
              className={`message ${formatted.isFromMe ? 'message-own' : 'message-other'}`}
            >
              <div className="message-header">
                <span className="message-author">{formatted.author}</span>
                <span className="message-time">{formatted.time}</span>
              </div>
              <div className="message-body">{formatted.body}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {isConnected && (
        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type your message..."
            className="message-input"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || !messageInput.trim()}
            className="send-button"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
};

