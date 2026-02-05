/**
 * Authentication service for login and token management
 */

export interface AuthResponse {
  access_token: string;
  token_expiration_time: string;
}

const TOKEN_STORAGE_KEY = 'auth_token';

/**
 * Get API route from environment variable
 * CORS is configured on Rails backend for localhost:3000
 */
function getApiRoute(): string {
  const envRoute = import.meta.env.VITE_INMATE_PHOTOS_API_ROUTE;
  
  // If custom route is provided, use it
  if (envRoute) {
    return envRoute;
  }
  
  // Use staging API directly (CORS is configured on backend for localhost:3000)
  return 'https://stagingimages.com/api-mobile/v2';
}

/**
 * Get X-App-Token-2 from environment variable
 */
function getAppToken(): string {
  const token = import.meta.env.VITE_X_APP_TOKEN;
  if (!token) {
    console.error('❌ VITE_X_APP_TOKEN is not configured');
    throw new Error('VITE_X_APP_TOKEN environment variable is required');
  }
  return token;
}

/**
 * Login user with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const apiRoute = getApiRoute();
  const appToken = getAppToken();

  try {
    const response = await fetch(`${apiRoute}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token-2': appToken,
      },
      body: JSON.stringify({
        user: {
          email,
          password,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid email or password');
      }
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      token_expiration_time: data.token_expiration_time,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error. Please check your connection and try again.');
  }
}

/**
 * Get stored authentication token from localStorage
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Store authentication token in localStorage
 */
export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

/**
 * Clear authentication token from localStorage
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Check if user is authenticated (token exists in localStorage)
 */
export function isAuthenticated(): boolean {
  return getStoredToken() !== null;
}

