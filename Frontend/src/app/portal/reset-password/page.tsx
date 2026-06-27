'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/constants';

function ResetPasswordArgs() {
    const searchParams = useSearchParams();
    const defaultCode = searchParams?.get('code') || '';
    
    const [formData, setFormData] = useState({
        code: defaultCode,
        otp: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.newPassword !== formData.confirmPassword) {
            setStatus('error');
            setMessage('New password fields do not match');
            return;
        }

        if (formData.newPassword.length < 6) {
            setStatus('error');
            setMessage('Password must be at least 6 characters');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch(`${API_URL}/students/portal/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: formData.code,
                    otp: formData.otp,
                    newPassword: formData.newPassword
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            setStatus('success');
            setMessage('Password changed successfully');

            // Redirect to login page after delay
            setTimeout(() => {
                router.push('/portal');
            }, 2000);

        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="max-w-md mx-auto text-left" dir="ltr">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
                
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                </div>

                <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
                <p className="text-gray-500 mb-8 text-sm">Enter the verification code sent to your email</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-left">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Student Code</label>
                        <input
                            type="text"
                            name="code"
                            placeholder="Enter student code"
                            className="w-full bg-[#FCFCFC] border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            value={formData.code}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="text-left">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Verification Code (OTP)</label>
                        <input
                            type="text"
                            name="otp"
                            placeholder="Enter the 6-digit code"
                            className="w-full bg-[#FCFCFC] border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all tracking-widest text-center font-mono font-bold"
                            value={formData.otp}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="text-left">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">New Password</label>
                        <input
                            type="password"
                            name="newPassword"
                            placeholder="*************"
                            className="w-full bg-[#FCFCFC] border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="text-left">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="*************"
                            className="w-full bg-[#FCFCFC] border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
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
                        className="w-full bg-[#4F46E5] hover:bg-[#4F46E5]/80 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2 mt-4"
                    >
                        {status === 'loading' && (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        )}
                        {status === 'success' ? 'Changed' : 'Save New Password'}
                    </button>
                    
                    <Link 
                        href="/portal"
                        className="block w-full text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors pt-4"
                    >
                        Cancel and Go Back
                    </Link>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
            <ResetPasswordArgs />
        </Suspense>
    );
}
