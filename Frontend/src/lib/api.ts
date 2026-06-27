import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL, TOKEN_KEY } from './constants';
import Cookies from 'js-cookie';

// Log API URL on initialization (client-side only)
if (typeof window !== 'undefined') {
    console.log('🔗 API Base URL:', API_URL);
}

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // Reduced timeout to 15s for faster failure detection
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = Cookies.get(TOKEN_KEY);
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request for debugging
        if (typeof window !== 'undefined') {
            const baseURL = config.baseURL || '';
            const url = config.url || '';
            console.log('📤 API Request:', {
                method: config.method?.toUpperCase(),
                url: url,
                baseURL: baseURL,
                fullURL: baseURL + url,
            });
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => {
        // Log successful responses for debugging
        if (typeof window !== 'undefined') {
            console.log('✅ API Response:', {
                status: response.status,
                url: response.config.url,
            });
        }
        return response;
    },
    (error: AxiosError) => {
        if (error.response) {
            const res = error.response;
            const raw = res.data;
            const emptyObject =
                raw &&
                typeof raw === 'object' &&
                !Array.isArray(raw) &&
                Object.keys(raw as object).length === 0;
            const missingBody =
                raw == null ||
                emptyObject ||
                (typeof raw === 'string' && !String(raw).trim());

            if (missingBody) {
                if (res.status === 403) {
                    res.data = {
                        success: false,
                        status: 'fail',
                        message:
                            'You do not have permission to perform this action. Please verify that your role in the system is "teacher" or "admin".',
                    };
                } else {
                    const statusMessages: Record<number, string> = {
                        400: 'Invalid request',
                        401: 'Unauthorized - please login',
                        403: 'You do not have permission to perform this action',
                        404: 'Resource not found',
                        500: 'An error occurred in the server',
                    };
                    res.data = {
                        success: false,
                        status: res.status >= 500 ? 'error' : 'fail',
                        message:
                            statusMessages[res.status] ||
                            res.statusText ||
                            'An unexpected error occurred',
                    };
                }
            }
        }

        // Log network errors for debugging (always log in browser)
        if (typeof window !== 'undefined') {
            const baseURL = error.config?.baseURL || '';
            const url = error.config?.url || '';
            const fullURL = baseURL + url;

            // Check if device is offline
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;

            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
                // Check if it's a timeout error
                const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
                
                // Only log network errors if online and not during sync (to avoid spam)
                const isDuringSync = url?.includes('/attendance') || url?.includes('/sessions');
                
                if (!isOffline && !isDuringSync) {
                    const details = {
                        message: error.message || '(empty)',
                        code: error.code ?? '(none)',
                        method: (error.config?.method || '?').toUpperCase(),
                        url,
                        baseURL,
                        fullURL: fullURL || `${baseURL}${url}` || API_URL,
                        apiUrlFromEnv: API_URL,
                    };
                    // Next overlay often renders object literals as {}; use string + JSON for clarity
                    console.error(
                        '❌ Network error (no HTTP response — usually: server not running, wrong API link, or CORS):\n',
                        JSON.stringify(details, null, 2)
                    );
                } else if (isTimeout) {
                    // Log timeout errors during sync as info (expected during sync)
                    console.log(`⏱️ Request timeout during sync: ${url}`, { code: error.code });
                } else {
                    // Silent fail in offline mode or during sync - user should use cached data
                    console.log('📴 Network error during sync (will retry):', url);
                }
            } else if (error.response) {
                const res = error.response;

                // Check if it's a validation error (400/404) - these are expected during sync
                const isValidationError = res.status === 400 || res.status === 404;

                // Check if it's an auth endpoint (login/register) - these should always be logged
                const isAuthEndpoint = url?.includes('/auth/login') || url?.includes('/auth/register');

                // Only log API errors if online (to avoid spam in offline mode)
                // Also skip logging validation errors during sync (they're handled gracefully)
                // But always log auth errors for debugging
                if (!isOffline && (!isValidationError || isAuthEndpoint)) {
                    const responseData = res.data as Record<string, unknown> | string | undefined;
                    const hasData =
                        responseData &&
                        (typeof responseData === 'object'
                            ? Object.keys(responseData).length > 0
                            : true);

                    if (isAuthEndpoint || hasData) {
                        const d =
                            responseData && typeof responseData === 'object' && !Array.isArray(responseData)
                                ? (responseData as Record<string, unknown>)
                                : null;
                        const msgRaw = d?.message ?? d?.error;
                        const errorMessage =
                            typeof msgRaw === 'string'
                                ? msgRaw
                                : msgRaw != null
                                  ? String(msgRaw)
                                  : res.statusText || `HTTP ${res.status}`;

                        const logPayload = {
                            status: res.status,
                            message: errorMessage,
                            url: fullURL,
                            method: (error.config?.method || '?').toUpperCase(),
                            data:
                                hasData && typeof responseData === 'object'
                                    ? responseData
                                    : typeof responseData === 'string'
                                      ? responseData.slice(0, 200)
                                      : responseData,
                        };
                        console.error(
                            '❌ API Error:\n',
                            JSON.stringify(logPayload, null, 2)
                        );
                    }
                } else if (isOffline) {
                    // Silent fail in offline mode (except for auth)
                    if (!isAuthEndpoint) {
                        console.log('📴 Offline mode: API error response (expected behavior)');
                    }
                }
            } else {
                console.error('❌ Unknown Error:', error);
            }
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            // Clear auth data on 401
            Cookies.remove(TOKEN_KEY);

            // Redirect to login if on client side and NOT already on login page
            // Also avoid redirect if the 401 came from the login endpoint itself
            if (typeof window !== 'undefined') {
                const isLoginPage = window.location.pathname === '/login';
                const isLoginRequest = error.config?.url?.includes('/auth/login');
                const isRegisterPage = window.location.pathname === '/register';
                const isRegisterRequest = error.config?.url?.includes('/auth/register');

                if (!isLoginPage && !isLoginRequest && !isRegisterPage && !isRegisterRequest) {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
