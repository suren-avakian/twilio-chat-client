import { useState, useEffect, useCallback } from 'react';
import { Client, Conversation, Message } from '@twilio/conversations';

interface MessageMetadata {
  jwtToken?: string;
  userId?: string;
  [key: string]: any; // Allow additional fields
}

interface UseTwilioConversationReturn {
  client: Client | null;
  conversation: Conversation | null;
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  sendMessage: (messageBody: string, metadata?: MessageMetadata) => Promise<void>;
  connect: (token: string, conversationSid?: string) => Promise<void>;
}

export const useTwilioConversation = (): UseTwilioConversationReturn => {
  const [client, setClient] = useState<Client | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (token: string, conversationSid?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Ensure token is provided
      if (!token) {
        throw new Error('Twilio token is required to connect');
      }

      // Initialize Twilio Client
      const twilioClient = new Client(token);

      twilioClient.on('connectionStateChanged', (state) => {
        console.log('Connection state:', state);
        setIsConnected(state === 'connected');
      });

      twilioClient.on('tokenAboutToExpire', async () => {
        console.log('Token about to expire, refreshing...');
        // In production, fetch a new token from your backend and call:
        // const newToken = await fetchNewToken();
        // twilioClient.updateToken(newToken);
      });

      // .on registers an event listener and does not return a Promise — do not await it
      twilioClient.on('stateChanged', (state) => {
        console.log('Client state:', state);
      });

      setClient(twilioClient);

      // Wait for client to be ready (connected state)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Client connection timeout after 10 seconds. Check your token and Twilio configuration.'));
        }, 10000);

        const checkState = () => {
          try {
            const state = twilioClient.connectionState;
            console.log('[Twilio] Current connection state:', state);
            
            if (state === 'connected') {
              clearTimeout(timeout);
              resolve();
            } else if (state === 'denied') {
              clearTimeout(timeout);
              reject(new Error('Connection denied. Please check: 1) Token is valid, 2) Twilio credentials are correct, 3) API Key matches Account SID, 4) Conversations Service SID is correct'));
            } else if (state === 'disconnected') {
              clearTimeout(timeout);
              reject(new Error('Connection disconnected. Please check your token and try again.'));
            }
            // If connecting, wait for state change
          } catch (err) {
            clearTimeout(timeout);
            reject(new Error(`Error checking connection state: ${err instanceof Error ? err.message : 'Unknown error'}`));
          }
        };

        // Check immediately
        checkState();

        // Listen for state changes
        const stateHandler = (state: string) => {
          console.log('[Twilio] Connection state changed:', state);
          if (state === 'connected') {
            clearTimeout(timeout);
            twilioClient.off('connectionStateChanged', stateHandler);
            resolve();
          } else if (state === 'denied') {
            clearTimeout(timeout);
            twilioClient.off('connectionStateChanged', stateHandler);
            reject(new Error('Connection denied. Please check: 1) Token is valid, 2) Twilio credentials are correct, 3) API Key matches Account SID, 4) Conversations Service SID is correct'));
          } else if (state === 'disconnected') {
            clearTimeout(timeout);
            twilioClient.off('connectionStateChanged', stateHandler);
            reject(new Error('Connection disconnected. Please check your token and try again.'));
          }
        };

        twilioClient.on('connectionStateChanged', stateHandler);
      });

      // Get or create conversation
      let conv: Conversation;
      if (conversationSid) {
        try {
          // First, try to get from subscribed conversations
          const subscribedConversations = await twilioClient.getSubscribedConversations();
          const existingConv = subscribedConversations.items.find(
            (c) => c.sid === conversationSid
          );

          if (existingConv) {
            conv = existingConv;
            console.log('[Twilio] Found conversation in subscribed conversations:', conversationSid);
          } else {
            // If not subscribed, try to get by SID (this will auto-subscribe if user is participant)
            // Wait a bit for participant to be fully added
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            let retries = 3;
            let lastError: Error | null = null;
            
            while (retries > 0) {
              try {
                console.log(`[Twilio] Attempting to get conversation (${4 - retries}/3)...`);
                conv = await twilioClient.getConversationBySid(conversationSid);
                console.log('[Twilio] Successfully connected to conversation:', conversationSid);
                break;
              } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                console.warn(`[Twilio] Attempt failed: ${lastError.message}`);
                retries--;
                
                if (retries > 0) {
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Try refreshing subscribed conversations
                  try {
                    const refreshed = await twilioClient.getSubscribedConversations();
                    const found = refreshed.items.find((c) => c.sid === conversationSid);
                    if (found) {
                      conv = found;
                      console.log('[Twilio] Found conversation after refresh');
                      break;
                    }
                  } catch (refreshErr) {
                    console.warn('[Twilio] Error refreshing conversations:', refreshErr);
                  }
                }
              }
            }
            
            if (!conv) {
              // Final attempt: get all subscribed conversations
              try {
                const allConversations = await twilioClient.getSubscribedConversations();
                const foundConv = allConversations.items.find((c) => c.sid === conversationSid);
                
                if (foundConv) {
                  conv = foundConv;
                  console.log('[Twilio] Found conversation in final attempt');
                } else {
                  throw new Error(
                    `Conversation ${conversationSid} not found after multiple attempts. ` +
                    `Please ensure: 1) Conversation exists, 2) You are added as a participant, ` +
                    `3) Wait a few seconds and try again. ` +
                    `Original error: ${lastError?.message || 'Unknown error'}`
                  );
                }
              } catch (finalErr) {
                throw new Error(
                  `Failed to get conversation ${conversationSid}: ${lastError?.message || 'Unknown error'}. ` +
                  `Make sure the conversation exists and you are added as a participant.`
                );
              }
            }
          }
        } catch (err) {
          console.error('[Twilio] Error getting conversation:', err);
          throw new Error(
            `Failed to get conversation ${conversationSid}: ${err instanceof Error ? err.message : 'Unknown error'}. ` +
            `Make sure the conversation exists and you are added as a participant.`
          );
        }
      } else {
        // Try to get from subscribed conversations
        try {
          const conversations = await twilioClient.getSubscribedConversations();
          if (conversations.items.length > 0) {
            conv = conversations.items[0];
            console.log('[Twilio] Using first subscribed conversation:', conv.sid);
          } else {
            throw new Error('No subscribed conversations found. Please provide a conversation SID or create one via backend.');
          }
        } catch (err) {
          console.error('[Twilio] Error getting subscribed conversations:', err);
          throw new Error(`Failed to get conversations: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      setConversation(conv);

      // Load existing messages
      const existingMessages = await conv.getMessages();
      setMessages(existingMessages.items);

      // Listen for new messages
      conv.on('messageAdded', (message: Message) => {
        setMessages((prev) => [...prev, message]);
      });

      // Listen for message updates
      conv.on('messageUpdated', ({ message }) => {
        setMessages((prev) =>
          prev.map((msg) => (msg.sid === message.sid ? message : msg))
        );
      });

      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Connection error:', err);
    }
  }, []);

  const sendMessage = useCallback(
    async (messageBody: string, metadata?: MessageMetadata) => {
      if (!conversation) {
        setError('Not connected to a conversation');
        return;
      }

      try {
        // Send message with attributes (hidden metadata)
        const attributes: Record<string, any> = {
          timestamp: new Date().toISOString(),
        };

        // Add JWT and userId if provided
        if (metadata?.jwtToken) {
          attributes.jwtToken = metadata.jwtToken;
        }
        if (metadata?.userId) {
          attributes.userId = metadata.userId;
        }

        // Add any additional metadata fields
        if (metadata) {
          Object.keys(metadata).forEach(key => {
            if (key !== 'jwtToken' && key !== 'userId' && metadata[key] !== undefined) {
              attributes[key] = metadata[key];
            }
          });
        }

        await conversation.sendMessage(messageBody, attributes);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        console.error('Send message error:', err);
      }
    },
    [conversation]
  );

  useEffect(() => {
    return () => {
      if (client) {
        client.shutdown();
      }
    };
  }, [client]);

  return {
    client,
    conversation,
    messages,
    isConnected,
    isLoading,
    error,
    sendMessage,
    connect,
  };
};

