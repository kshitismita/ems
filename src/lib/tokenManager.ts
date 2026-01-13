import axios, { AxiosError } from 'axios';

export interface TokenResponse {
  token: string;
}

class TokenManager {
  constructor() {
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

    // Response interceptor - handle unauthorized
    axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      this.getCookie('auth_token') ||
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

  setTokens(token: string) {
    if (typeof window === 'undefined') return;

    localStorage.setItem('token', token);
    localStorage.setItem('accessToken', token);

    // Set cookie for compatibility
    this.setCookie('auth_token', token, 7 * 24 * 60 * 60); // 7 days
  }

  private setCookie(name: string, value: string, maxAge: number) {
    if (typeof document === 'undefined') return;

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  }

  clearTokens() {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    this.deleteCookie('auth_token');
    this.deleteCookie('refresh_token');
  }

  private deleteCookie(name: string) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  async logout(): Promise<void> {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const tokenManager = new TokenManager();
export { TokenManager };
