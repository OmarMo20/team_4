'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState } from 'react';

function SuccessValues() {
    const searchParams = useSearchParams();
    const [hasScreenShot, setHasScreenShot] = useState(false);
    const code = searchParams.get('code');
    const name = searchParams.get('name');
    const password = searchParams.get('password');

    const handleScreenshot = () => {
        window.print();
        setHasScreenShot(true);
    };

    return (
        <div className="max-w-md mx-auto text-center" dir="ltr">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>

                <h2 className="text-2xl font-bold mb-2">Account Created Successfully!</h2>
                <p className="text-gray-500 mb-8">Welcome, {name}</p>

                <div className="grid grid-cols-1 gap-4 mb-8">
                    <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Student Code</p>
                        <p className="text-2xl font-bold text-primary-700 tracking-wider font-mono">{code}</p>
                    </div>
                    <div className="bg-[#fff4ec] rounded-xl p-6 border border-orange-100">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Password</p>
                        <p className="text-2xl font-bold text-orange-600 tracking-wider font-mono">{password}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {!hasScreenShot ? (
                        <>
                            <button 
                                onClick={handleScreenshot}
                                className="w-full bg-white border border-primary-600 text-primary-600 hover:bg-primary-50 rounded-xl py-3 font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                                Take a Screenshot
                            </button>

                            <Link 
                                href={`/portal/dashboard/${code}`}
                                className="block w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 font-medium transition-colors flex items-center justify-center gap-2 opacity-50 pointer-events-none"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                View My Details (Please save code first)
                            </Link>
                        </>
                    ) : (
                        <Link 
                            href="/portal"
                            className="block w-full bg-[#4F46E5] hover:bg-[#502d8e] text-white rounded-xl py-3 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                            </svg>
                            Go to Login
                        </Link>
                    )}
                </div>

            </div>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessValues />
        </Suspense>
    );
}
