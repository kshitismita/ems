import axios, { AxiosError } from 'axios';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: string;
}

class TokenManager {
  private refreshPromise: Promise<TokenResponse> | null = null;
  private isRefreshing = false;

  constructor() {
    // Setup axios interceptors for automatic token refresh
    this.setupAxiosInterceptors();
  }

  private setupAxiosInterceptors() {
    // Request interceptor - add auth token
    axios.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && 
            (error.response.data as any)?.requiresRefresh && 
            !originalRequest._retry) {
          
          originalRequest._retry = true;

          try {
            const newTokenData = await this.refreshToken();
            
            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokenData.accessToken}`;
            
            // Update stored tokens
            this.setTokens(newTokenData);
            
            // Retry the original request
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Handle session expiry
        if (error.response?.status === 401 && 
            (error.response.data as any)?.code === 'SESSION_EXPIRED') {
          this.clearTokens();
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    );
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken') || 
           this.getCookie('auth_token') || 
           null;
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken') || 
           this.getCookie('refresh_token') || 
           null;
  }

  getSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sessionId') || 
           this.getCookie('session_id') || 
           null;
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  setTokens(tokenData: TokenResponse) {
    if (typeof window === 'undefined') return;

    // Store in localStorage for easy access
    localStorage.setItem('accessToken', tokenData.accessToken);
    localStorage.setItem('refreshToken', tokenData.refreshToken);
    localStorage.setItem('sessionId', tokenData.sessionId);
    localStorage.setItem('expiresAt', tokenData.expiresAt);

    // Also store in cookies for server-side access
    this.setCookie('auth_token', tokenData.accessToken, 15 * 60); // 15 minutes
    this.setCookie('refresh_token', tokenData.refreshToken, 7 * 24 * 60 * 60); // 7 days
    this.setCookie('session_id', tokenData.sessionId, 7 * 24 * 60 * 60); // 7 days
  }

  private setCookie(name: string, value: string, maxAge: number) {
    if (typeof document === 'undefined') return;
    
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  }

  clearTokens() {
    if (typeof window === 'undefined') return;

    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('expiresAt');

    // Clear cookies
    this.deleteCookie('auth_token');
    this.deleteCookie('refresh_token');
    this.deleteCookie('session_id');
  }

  private deleteCookie(name: string) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('expiresAt');
    if (!expiresAt) return false;
    
    return new Date() >= new Date(expiresAt);
  }

  async refreshToken(): Promise<TokenResponse> {
    // Prevent multiple refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.performTokenRefresh(refreshToken);
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await axios.post('/api/auth/refresh', {
        refreshToken
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.requiresLogin) {
        throw new Error('Login required');
      }
      throw error;
    }
  }

  async logout(logoutAll = false): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      
      await axios.post('/api/auth/logout', {
        sessionId,
        logoutAll
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
      window.location.href = '/login';
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const sessionId = this.getSessionId();
    
    return !!(token && sessionId && !this.isTokenExpired());
  }

  // Get token expiry time in minutes
  getTokenExpiryMinutes(): number {
    const expiresAt = localStorage.getItem('expiresAt');
    if (!expiresAt) return 0;
    
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  }
}

// Create singleton instance
export const tokenManager = new TokenManager();

// Export types and utilities
export { TokenManager };
