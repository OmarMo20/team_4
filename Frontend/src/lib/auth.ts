import Cookies from 'js-cookie';
import { TOKEN_KEY } from './constants';
import type { User } from '@/types/auth';

// Token management
export const getToken = (): string | undefined => {
    return Cookies.get(TOKEN_KEY);
};

export const setToken = (token: string): void => {
    // Set cookie with 7 day expiry
    Cookies.set(TOKEN_KEY, token, {
        expires: 7,
        secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
        sameSite: 'lax'
    });
};

export const removeToken = (): void => {
    Cookies.remove(TOKEN_KEY);
};

export const isAuthenticated = (): boolean => {
    return !!getToken();
};

// Parse JWT token to get user info
export const parseToken = (token: string): { id: string; exp: number; role?: string; email?: string } | null => {
    try {
        const base64Payload = token.split('.')[1];
        const payload = Buffer.from(base64Payload, 'base64').toString('utf8');
        return JSON.parse(payload);
    } catch {
        return null;
    }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
    const decoded = parseToken(token);
    if (!decoded) return true;

    // exp is in seconds, Date.now() is in milliseconds
    return decoded.exp * 1000 < Date.now();
};

// User storage (for client-side persistence)
export const getUserFromStorage = (): User | null => {
    if (typeof window === 'undefined') return null;

    try {
        const userStr = localStorage.getItem('auth_user');
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
};

export const setUserToStorage = (user: User): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_user', JSON.stringify(user));
};

export const removeUserFromStorage = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_user');
};
