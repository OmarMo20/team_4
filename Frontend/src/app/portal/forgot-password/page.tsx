'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/constants';

export default function ForgotPasswordPage() {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch(`${API_URL}/students/portal/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            setStatus('success');
            setMessage(data.message);

            // Redirect to reset password page after delay
            setTimeout(() => {
                router.push(`/portal/reset-password?code=${code}`);
            }, 2000);

        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="max-w-md mx-auto text-left" dir="ltr">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
                
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                    </svg>
                </div>

                <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
                <p className="text-gray-500 mb-8 text-sm">Enter student code to receive verification code</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-left">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Student Code</label>
                        <input
                            type="text"
                            placeholder="Enter student code"
                            className="w-full bg-[#FCFCFC] border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                    </div>
                    
                    {message && (
                        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 text-left ${
                            status === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                        }`}>
                             {status === 'error' ? (
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'loading' || status === 'success'}
                        className="w-full bg-[#4F46E5] hover:bg-[#4F46E5]/80 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                    >
                        {status === 'loading' && (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        )}
                        {status === 'success' ? 'Sent' : 'Send Code'}
                    </button>

                    <Link 
                        href="/portal"
                        className="block w-full text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors"
                    >
                        Back to Login
                    </Link>
                </form>
            </div>
        </div>
    );
}
