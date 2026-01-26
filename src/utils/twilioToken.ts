/**
 * Generate Twilio Access Token
 * In production, this should be done on your backend for security
 * This is a client-side implementation for testing purposes only
 */

export interface TwilioConfig {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  serviceSid: string;
  identity: string;
}

/**
 * Generate a Twilio Access Token
 * NOTE: In production, this should be done on your backend!
 * This function is for local testing only.
 */
export async function generateTwilioToken(
  _config: TwilioConfig
): Promise<string> {
  // For production, call your backend API:
  // const response = await fetch('/api/twilio/token', {
  //   method: 'POST',
  //   body: JSON.stringify({ identity: config.identity })
  // });
  // return response.json().token;

  // For local testing, we'll use a simple approach
  // You'll need to implement JWT generation on your backend
  throw new Error(
    'Token generation must be done on the backend. Please use your backend API endpoint.'
  );
}

/**
 * Fetch token from backend API
 * Identity will be extracted from JWT token on backend
 */
export async function fetchTwilioTokenFromBackend(
  backendUrl: string,
  identity: string = '',
  jwtToken?: string
): Promise<string> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add JWT token if provided (using Auth-Token header to match Rails API expectations)
    if (jwtToken) {
      headers['Auth-Token'] = jwtToken;
      headers['X-Auth-Token'] = jwtToken; // Send both for compatibility
    }
    
    // Build URL - identity is optional, backend will extract it from JWT
    const url = identity 
      ? `${backendUrl}/api/twilio/token?identity=${identity}`
      : `${backendUrl}/api/twilio/token`;
    
    console.log('[Twilio Token] Requesting token from:', url);
    console.log('[Twilio Token] JWT token provided:', !!jwtToken);
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      // Try to parse error response
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (parseError) {
        console.error('[Twilio Token] Failed to parse error response:', parseError);
      }
      
      // Construct detailed error message
      const errorMessage = errorData.error || `Server error: ${response.statusText}`;
      const errorDetails = errorData.details || '';
      const errorHint = errorData.hint || '';
      
      console.error('[Twilio Token] Error response:', {
        status: response.status,
        error: errorMessage,
        details: errorDetails,
        hint: errorHint
      });
      
      // Create user-friendly error message
      let userMessage = errorMessage;
      if (errorDetails) {
        userMessage += `\n\nDetails: ${errorDetails}`;
      }
      if (errorHint) {
        userMessage += `\n\n💡 ${errorHint}`;
      }
      
      // Add specific guidance based on error type
      if (response.status === 401) {
        userMessage += '\n\n🔐 Please make sure you are logged in with a valid account.';
      } else if (response.status === 500) {
        userMessage += '\n\n⚠️ Server error. Please try again or contact support if the issue persists.';
      }
      
      throw new Error(userMessage);
    }

    const data = await response.json();
    
    // Log warnings if present
    if (data.warnings) {
      console.warn('[Twilio Token] Token generated with warnings:', data.warnings);
    }
    
    console.log('[Twilio Token] Token received successfully');
    console.log('[Twilio Token] Identity:', data.identity);
    console.log('[Twilio Token] User ID:', data.userId);
    console.log('[Twilio Token] Inmate Photos User ID:', data.inmatePhotosUserId);
    
    return data.token;
  } catch (error) {
    console.error('[Twilio Token] Error fetching token:', error);
    throw error;
  }
}

