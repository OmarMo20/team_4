'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '@/lib/constants';

export default function PortalLoginPage() {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/students/portal/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            // Redirect to dashboard
            router.push(`/portal/dashboard/${data.data.code}`);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto text-left" dir="ltr">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
                
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"></path>
                    </svg>
                </div>

                <h2 className="text-2xl font-bold mb-2">Student / Parent</h2>
                <p className="text-gray-500 mb-8">Login to monitor academic progress</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="text-left">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Student Code or Email</label>
                        <input
                            type="text"
                            placeholder="Enter student code or email"
                            className="w-full bg-[#FCFCFC] border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                    </div>

                    <div className="text-left">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
                        <input
                            type="password"
                            placeholder="*************"
                            className="w-full bg-[#FCFCFC] border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div className="mt-2 flex justify-start">
                            <Link href="/portal/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                    </div>
                    
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2 text-left">
                             <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#4F46E5] hover:bg-[#4F46E5]/80 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                        {loading ? 'Verifying...' : 'Login'}
                    </button>
                </form>
            </div>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#FCFCFC] text-gray-500">Don't have an account?</span>
                </div>
            </div>

            <Link 
                href="/portal/register"
                className="block w-full bg-[#4F46E5] border border-gray-200 hover:bg-[#4F46E5]/80 text-white rounded-xl py-3 font-medium text-center transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                </svg>
                Register New Student
            </Link>
        </div>
    );
}
