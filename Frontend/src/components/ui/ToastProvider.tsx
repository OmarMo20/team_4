'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // During static generation, providers aren't available
    // Return a no-op function to prevent build errors
    if (typeof window === 'undefined') {
      return { showToast: () => {} };
    }
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    toastId += 1;
    const id = toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-full max-w-xs md:max-w-sm" dir="rtl">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              animate-slide-in-up rounded-xl px-4 py-3 text-sm shadow-lg border
              ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : ''}
              ${toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-900' : ''}
              ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : ''}
              ${toast.type === 'info' ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : ''}
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};


