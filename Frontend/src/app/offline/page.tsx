'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Pages that work offline - if user was trying to access these, redirect them
const OFFLINE_ALLOWED_PAGES = [
  '/dashboard/attendance',
  '/attendance',
  '/dashboard/sessions',
];

export default function OfflinePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(false);
  const [intendedPath, setIntendedPath] = useState<string | null>(null);

  useEffect(() => {
    // Check if user was trying to access an allowed offline page
    // Service Worker might have redirected here, so check sessionStorage for the original URL
    if (typeof window !== 'undefined') {
      const storedPath = sessionStorage.getItem('offline_intended_path');
      if (storedPath) {
        setIntendedPath(storedPath);
        sessionStorage.removeItem('offline_intended_path');
      } else {
        // Try to get from referrer or document.referrer
        const referrer = document.referrer;
        if (referrer) {
          try {
            const referrerUrl = new URL(referrer);
            const referrerPath = referrerUrl.pathname;
            if (OFFLINE_ALLOWED_PAGES.some(allowed => referrerPath.startsWith(allowed))) {
              setIntendedPath(referrerPath);
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    // If user was trying to access an allowed offline page, redirect them there immediately
    if (intendedPath && OFFLINE_ALLOWED_PAGES.some(allowed => intendedPath.startsWith(allowed))) {
      console.log('🔄 Redirecting to allowed offline page:', intendedPath);
      router.push(intendedPath);
      return;
    }

    // If no intended path but user is on /offline page, try to redirect to attendance page
    // This handles cases where Service Worker redirected to /offline but we want to show attendance
    if (!intendedPath) {
      const shouldRedirectToAttendance = true; // Always try to redirect to attendance if on /offline
      
      if (shouldRedirectToAttendance) {
        console.log('🔄 Auto-redirecting to attendance page from /offline');
        router.replace('/dashboard/attendance');
        return;
      }
    }

    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [intendedPath, router]);

  useEffect(() => {
    // Auto-redirect when connection is restored
    if (isOnline) {
      const timer = setTimeout(() => {
        if (intendedPath) {
          router.push(intendedPath);
        } else {
          router.push('/');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, router, intendedPath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4" dir="ltr text-left">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-[#80848E]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 11-1.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You are offline
        </h1>

        <p className="text-gray-500 mb-6">
          No internet connection. You can continue recording attendance and data will sync automatically once connection is restored.
        </p>

        {isOnline ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-700">
              ✓ Connection restored! Redirecting shortly...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-700 text-sm">
                💡 You can continue using the app in offline mode
              </p>
            </div>

            <button
              onClick={() => router.push('/dashboard/attendance')}
              className="w-full bg-[#414141] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#333] transition-colors"
            >
              Go to Attendance Page
            </button>

            <button
              onClick={() => router.back()}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Teacher Attendance System - PWA
          </p>
        </div>
      </div>
    </div>
  );
}
