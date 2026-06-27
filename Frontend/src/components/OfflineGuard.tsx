'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WifiOff, ArrowRight } from 'lucide-react';
import { useToast } from './ui';

// Pages that work offline
const OFFLINE_ALLOWED_PAGES = [
  '/dashboard/attendance',
  '/attendance',
  '/dashboard/sessions',
];

interface OfflineGuardProps {
  children: React.ReactNode;
}

export default function OfflineGuard({ children }: OfflineGuardProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  useEffect(() => {
    // Check initial online status
    const checkOnlineStatus = () => {
      if (typeof window !== 'undefined') {
        setIsOffline(!navigator.onLine);
        setIsChecking(false);
      }
    };

    checkOnlineStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isChecking || !isOffline || !pathname) return;

    // Normalize pathname
    const normalizedPath = pathname.split('?')[0].replace(/\/$/, '') || '/';
    
    // Check if current page is allowed in offline mode
    const isAllowed = OFFLINE_ALLOWED_PAGES.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '');
      return normalizedPath === normalizedAllowed || normalizedPath.startsWith(normalizedAllowed + '/');
    });

    if (!isAllowed) {
      showToast('You are offline and this page is not available offline', 'warning');
      
      console.log('🚫 OfflineGuard: Blocked access to non-allowed page:', {
        pathname,
        normalizedPath,
        allowedPages: OFFLINE_ALLOWED_PAGES,
      });
    }
  }, [isOffline, pathname, showToast, isChecking]);

  // Show loading while checking
  if (isChecking) {
    return <>{children}</>;
  }

  // If offline and page is not allowed, show blocking message
  if (isOffline && pathname) {
    const normalizedPath = pathname.split('?')[0].replace(/\/$/, '') || '/';
    
    const isAllowed = OFFLINE_ALLOWED_PAGES.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '');
      return normalizedPath === normalizedAllowed || normalizedPath.startsWith(normalizedAllowed + '/');
    });

    console.log('🔍 OfflineGuard check:', {
      pathname,
      normalizedPath,
      isOffline,
      isAllowed,
      allowedPages: OFFLINE_ALLOWED_PAGES,
    });

    if (!isAllowed) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FCFCFC] text-left" dir="ltr">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md mx-4 text-center flex flex-col items-center">
            <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <WifiOff className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Offline Mode
            </h2>
            <p className="text-gray-500 mb-6">
              You are offline and this page is not available offline
            </p>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/dashboard/attendance';
                }
              }}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <span>Go to Attendance Page</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
