import { AxiosError } from 'axios';

export const extractErrorMessage = (error: unknown): string => {
    if (error instanceof AxiosError) {
        // Network errors (no response from server)
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
            return 'Server connection error. Please check your internet connection or make sure the server is running.';
        }

        // Check if server sent a specific error message
        if (error.response?.data?.message) {
            return error.response.data.message;
        }

        // Check for specific status codes
        if (error.response?.status === 400) {
            return 'Invalid data. Please check the inputs.';
        }
        if (error.response?.status === 401) {
            return 'Unauthorized access. Please log in.';
        }
        if (error.response?.status === 403) {
            return 'You do not have permission to perform this action.';
        }
        if (error.response?.status === 404) {
            return 'Resource not found.';
        }
        if (error.response?.status === 500) {
            return 'A server error occurred. Please try again later.';
        }
    }

    if (error instanceof Error) {
        // Handle network-related error messages
        if (error.message.includes('Network') || error.message.includes('network')) {
            return 'Server connection error. Please check your internet connection.';
        }
        return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
};

export const extractFormErrors = (error: unknown): Record<string, string> => {
    const formErrors: Record<string, string> = {};

    if (error instanceof AxiosError) {
        // Handle validation errors from express-validator backend
        if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
            error.response.data.errors.forEach((err: { field: string; message: string }) => {
                if (err.field && err.message) {
                    formErrors[err.field] = err.message;
                }
            });
        }
    }

    // If no specific field errors were found, or just to provide a summary
    // we also populate the general error message
    // If the error is generic (not validation), this will be the only error.
    formErrors.general = extractErrorMessage(error);

    return formErrors;
};
