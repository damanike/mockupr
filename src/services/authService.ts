import Cookies from 'js-cookie';
import { User, LoginCredentials } from '../types';

// Hardcoded credentials for personal use
const AUTHORIZED_EMAIL = 'access@pengidentity.co';
const AUTHORIZED_PASSWORD = 'D4milol4'; // Direct password for simplicity
const JWT_SECRET = 'mockupr-secret-2024';
const COOKIE_NAME = 'mockupr-auth';

class AuthService {
  private currentUser: User | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Don't initialize immediately, let the app control when to initialize
  }

  initializeAuth(): boolean {
    if (this.isInitialized) {
      return this.isAuthenticated();
    }
    
    const token = Cookies.get(COOKIE_NAME);
    
    if (token) {
      try {
        // Simple token validation without JWT for now
        const decoded = JSON.parse(atob(token));
        
        if (decoded.email === AUTHORIZED_EMAIL && decoded.expires > Date.now()) {
          this.currentUser = {
            email: decoded.email,
            isAuthenticated: true
          };
          this.isInitialized = true;
          return true;
        } else {
          this.logout();
          this.isInitialized = true;
          return false;
        }
      } catch (error) {
        this.logout();
        this.isInitialized = true;
        return false;
      }
    } else {
      this.isInitialized = true;
      return false;
    }
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string }> {
    const { email, password, stayLoggedIn = false } = credentials;


    // Check email
    if (email !== AUTHORIZED_EMAIL) {
      return { success: false, message: 'Invalid email address' };
    }

    // Check password
    const isPasswordValid = password.trim() === AUTHORIZED_PASSWORD;
    
    if (!isPasswordValid) {
      return { success: false, message: 'Invalid password' };
    }

    // Create simple token (base64 encoded JSON)
    const tokenData = {
      email: AUTHORIZED_EMAIL,
      timestamp: Date.now(),
      expires: Date.now() + (stayLoggedIn ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)
    };
    const token = btoa(JSON.stringify(tokenData));

    // Set cookie
    const cookieOptions = {
      expires: stayLoggedIn ? 30 : 7, // days
      secure: window.location.protocol === 'https:',
      sameSite: 'strict' as const
    };

    Cookies.set(COOKIE_NAME, token, cookieOptions);

    // Set current user
    this.currentUser = {
      email: AUTHORIZED_EMAIL,
      isAuthenticated: true
    };

    return { success: true, message: 'Login successful' };
  }

  logout(): void {
    Cookies.remove(COOKIE_NAME);
    this.currentUser = null;
    this.isInitialized = false;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    if (!this.isInitialized) {
      this.initializeAuth();
    }
    return this.currentUser?.isAuthenticated || false;
  }

  getAuthToken(): string | undefined {
    return Cookies.get(COOKIE_NAME);
  }
}

export const authService = new AuthService();