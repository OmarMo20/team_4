'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

export default function UnauthorizedPage() {
    const router = useRouter();
    const { user } = useAuth();

    const handleGoBack = () => {
        // Redirect assistants to attendance, others to dashboard
        if (user?.role === 'assistant') {
            router.push(ROUTES.ATTENDANCE);
        } else {
            router.push(ROUTES.DASHBOARD);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FBFAFF] via-white to-white flex items-center justify-center p-4" dir="ltr">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center flex flex-col items-center justify-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Access Denied
                </h1>
                
                <p className="text-gray-500 mb-8">
                    You are not allowed to visit this page.
                </p>

                <p className="text-sm text-gray-500 mb-8">
                    You do not have the necessary permissions to access this page. Please contact the administrator if you believe this is a mistake.
                </p>

                <button
                    onClick={handleGoBack}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Go to Home Page</span>
                </button>
            </div>
        </div>
    );
}
