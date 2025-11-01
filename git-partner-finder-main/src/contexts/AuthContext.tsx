import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { githubAPI } from '@/lib/github';

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// GitHub OAuth configuration
const CLIENT_ID = 'Ov23liyjgdSKhTbso1ns'; // Replace with your GitHub OAuth app client ID
const REDIRECT_URI = `${window.location.origin}/auth/callback`;
const SCOPES = 'read:user user:email';
const OAUTH_ENABLED = true; 

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing authentication on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('oauth_state');

    if (code && state && state === storedState) {
      handleOAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('github_token');
      if (token) {
        githubAPI.setToken(token);
        const userData = await fetchUserData();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('github_token');
          githubAPI.setToken('');
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Authentication check failed');
      localStorage.removeItem('github_token');
      githubAPI.setToken('');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async (): Promise<GitHubUser | null> => {
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        throw new Error('No token available');
      }

      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid or expired token');
        } else if (response.status === 403) {
          throw new Error('Token lacks required permissions (read:user, user:email)');
        } else {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      throw err; // Re-throw so we can handle it in setManualToken
    }
  };

  const login = () => {
    // Check if OAuth is properly configured
    if (!OAUTH_ENABLED || !CLIENT_ID) {
      setError('GitHub OAuth is not configured. Please use a Personal Access Token instead.');
      return;
    }

    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);

    // Redirect to GitHub OAuth
    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `state=${state}`;

    window.location.href = authUrl;
  };

  const logout = () => {
    localStorage.removeItem('github_token');
    localStorage.removeItem('oauth_state');
    githubAPI.setToken('');
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  };

  const handleOAuthCallback = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      
      setError('OAuth app setup required. Please provide your GitHub personal access token manually.');
      
    } catch (err) {
      console.error('OAuth callback failed:', err);
      setError('Authentication failed');
    } finally {
      setIsLoading(false);
      localStorage.removeItem('oauth_state');
    }
  };

  // Method to manually set token (fallback for demo)
  const setManualToken = async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate token format
      if (!token.startsWith('ghp_') && !token.startsWith('gho_') && !token.startsWith('ghu_') && !token.startsWith('ghs_')) {
        throw new Error('Invalid token format. GitHub tokens should start with ghp_, gho_, ghu_, or ghs_');
      }

      if (token.length < 36) {
        throw new Error('Token appears to be too short. GitHub tokens are typically 40+ characters');
      }

      // Test the token by making an API call
      githubAPI.setToken(token);
      
      // Store temporarily for fetchUserData to use
      localStorage.setItem('github_token', token);
      
      const userData = await fetchUserData();
      
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        throw new Error('Failed to fetch user data with provided token');
      }
    } catch (err) {
      console.error('Token validation failed:', err);
      
      // Clean up on failure
      localStorage.removeItem('github_token');
      githubAPI.setToken('');
      
      if (err instanceof Error) {
        if (err.message.includes('Invalid or expired token')) {
          setError('The provided token is invalid or has expired. Please generate a new Personal Access Token.');
        } else if (err.message.includes('lacks required permissions')) {
          setError('Token lacks required permissions. Please ensure your token has "read:user" and "user:email" scopes.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to validate token. Please check your token and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthState = {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    logout
  };

  // Add setManualToken to the context for the login component
  const extendedValue = {
    ...value,
    setManualToken
  };

  return (
    <AuthContext.Provider value={extendedValue as any}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { AuthState, GitHubUser };