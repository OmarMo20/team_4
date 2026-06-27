'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/constants';

interface DashboardData {
    student: {
        name: string;
        code: string;
        grade: string;
        center: string;
        enrollmentDate: string;
    };
    stats: {
        attendancePercentage: number;
        attendedSessions: number;
        totalSessions: number;
        lastSessionDate: string | null;
    };
    exams: Array<{
        id: string;
        title: string;
        score: number;
        fullMark: number;
        date: string;
        percentage: number;
    }>;
    financial: {
        required: number;
        paid: number;
        remaining: number;
        currency: string;
    };
}

export default function StudentDashboardPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_URL}/students/portal/${code}/dashboard`);
                const json = await res.json();
                
                if (!res.ok) {
                    throw new Error(json.message || 'Failed to load data');
                }
                
                setData(json.data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (code) {
            fetchData();
        }
    }, [code]);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [passwordMessage, setPasswordMessage] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordStatus('error');
            setPasswordMessage('New passwords do not match');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordStatus('error');
            setPasswordMessage('Password must be at least 6 characters long');
            return;
        }

        setPasswordStatus('loading');
        setPasswordMessage('');

        try {
            const res = await fetch(`${API_URL}/students/portal/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: data?.student.code, // Use code from data
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.message || 'Failed to change password');
            }

            setPasswordStatus('success');
            setPasswordMessage('Password changed successfully');
            
            // Close modal after delay
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setPasswordStatus('idle');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordMessage('');
            }, 2000);

        } catch (err: any) {
            setPasswordStatus('error');
            setPasswordMessage(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
             <div className="text-center py-20">
                <div className="text-red-500 mb-4">{error}</div>
                <Link href="/portal" className="text-primary-600 underline">Back to Home</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-10">
            
            {/* 1. Student Info Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-indigo-500"></div>
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">Student Profile</h3>
                        <p className="text-sm text-gray-500">Basic Information</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 divide-y divide-gray-50">
                    <div className="flex justify-between items-center py-4">
                        <span className="text-gray-500 text-sm font-medium">Full Name</span>
                        <span className="font-bold text-gray-900 text-lg">{data.student.name}</span>
                    </div>
                     <div className="flex justify-between items-center py-4">
                        <span className="text-gray-500 text-sm font-medium">Student Code</span>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg tracking-wider font-mono text-lg">#{data.student.code}</span>
                    </div>
                     <div className="flex justify-between items-center py-4">
                        <span className="text-gray-500 text-sm font-medium">Grade / Year</span>
                        <span className="font-bold text-gray-900">{data.student.grade}</span>
                    </div>
                     <div className="flex justify-between items-center py-4">
                        <span className="text-gray-500 text-sm font-medium">Learning Center</span>
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            {data.student.center}
                        </span>
                    </div>
                </div>
            </div>

             {/* 5. Security Settings Card */}
             <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FCFCFC] rounded-2xl flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-gray-900">Security Settings</h3>
                            <p className="text-sm text-gray-500">Protect your account</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-[#FCFCFC] rounded-2xl p-5 flex items-center justify-between border border-gray-200 hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl">
                            <svg className="w-5 h-5 text-[#80848E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm">Password</p>
                            <p className="text-xs text-gray-500 mt-0.5">Change your account password</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="px-5 py-2.5 bg-white border border-gray-200 text-[#DBDEE1] text-sm font-bold rounded-xl hover:bg-[#FCFCFC] hover:border-[#35373C] transition-all shadow-xl"
                    >
                        Change
                    </button>
                </div>
            </div>

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-[#FCFCFC]/50">
                            <h3 className="font-bold text-lg">Change Password</h3>
                            <button 
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#80848E] hover:text-gray-500"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handlePasswordChange} className="p-6 space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#DBDEE1] mb-1.5">Current Password</label>
                                    <input 
                                        type="password" 
                                        value={passwordForm.currentPassword}
                                        onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-4 focus:ring-purple-50 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-[#DBDEE1] mb-1.5">New Password</label>
                                    <input 
                                        type="password" 
                                        value={passwordForm.newPassword}
                                        onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-4 focus:ring-purple-50 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Must be at least 6 characters long
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#DBDEE1] mb-1.5">Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        value={passwordForm.confirmPassword}
                                        onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-4 focus:ring-purple-50 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {passwordMessage && (
                                <div className={`p-4 rounded-xl text-sm flex items-center gap-3 ${
                                    passwordStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
                                }`}>
                                    {passwordStatus === 'error' ? (
                                        <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {passwordMessage}
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={passwordStatus === 'loading' || passwordStatus === 'success'}
                                    className="w-full bg-[#4F46E5] hover:bg-[#543093] text-white font-bold py-3.5 px-4 rounded-xl shadow-xl shadow-purple-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 transform active:scale-[0.98]"
                                >
                                    {passwordStatus === 'loading' && (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    )}
                                    {passwordStatus === 'success' ? 'Changed successfully' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Attendance Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-gray-900">Attendance & Absence</h3>
                            <p className="text-sm text-gray-500">Track attendance</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 text-center border border-indigo-100/50">
                        <div className="text-3xl font-black text-primary-600 mb-1 leading-tight">{data.stats.attendancePercentage}%</div>
                        <div className="text-xs font-bold text-primary-400 uppercase tracking-wide">Percentage</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-4 text-center border border-red-100/50">
                         <div className="text-3xl font-black text-red-500 mb-1 leading-tight">{data.stats.totalSessions - data.stats.attendedSessions}</div>
                         <div className="text-xs font-bold text-red-400 uppercase tracking-wide">Absence</div>
                    </div>
                     <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 text-center border border-green-100/50">
                         <div className="text-3xl font-black text-green-500 mb-1 leading-tight">{data.stats.attendedSessions}</div>
                         <div className="text-xs font-bold text-green-400 uppercase tracking-wide">Attended</div>
                    </div>
                </div>

                <div className="bg-[#FCFCFC] rounded-2xl p-5 flex justify-between items-center text-sm border border-gray-200">
                    <span className="text-gray-500 flex items-center gap-3 font-medium">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xl text-[#80848E]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        Last Session
                    </span>
                    <span className="font-bold text-gray-900 bg-white px-4 py-2 rounded-xl shadow-xl border border-gray-200">
                        {data.stats.lastSessionDate 
                            ? new Date(data.stats.lastSessionDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) 
                            : 'None'}
                    </span>
                </div>
            </div>

            {/* 3. Exams Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-400"></div>
                <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-gray-900">Exams</h3>
                            <p className="text-sm text-gray-500">Recent exam grades</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {data.exams.length > 0 ? (
                        data.exams.map((exam) => (
                            <div key={exam.id} className="bg-[#FCFCFC] rounded-2xl p-5 border border-gray-200 hover:border-gray-200 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="font-bold text-gray-900 text-lg">{exam.title}</span>
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${exam.percentage >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {exam.percentage >= 50 ? 'Passed' : 'Failed'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mb-2">
                                     <div className="flex-1 bg-white rounded-full h-3 border border-gray-200 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${exam.percentage >= 85 ? 'bg-green-500' : exam.percentage >= 50 ? 'bg-blue-500' : 'bg-red-500'}`} 
                                            style={{ width: `${exam.percentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-bold text-[#DBDEE1] whitespace-nowrap min-w-[3rem] text-left">{exam.percentage}%</span>
                                </div>
                                <div className="flex justify-between text-xs text-[#80848E] font-medium px-1">
                                    <span>Grade: <span className="text-gray-500">{exam.score}</span> / {exam.fullMark}</span>
                                    <span>{new Date(exam.date).toLocaleDateString('en-US')}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                         <div className="text-center py-12 bg-[#FCFCFC] rounded-2xl border-2 border-dashed border-gray-200">
                             <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-[#80848E]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                             </div>
                             <p className="text-gray-500 font-medium">No exams recorded yet</p>
                        </div>
                    )}
                </div>
            </div>

             {/* 4. Financial Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                 <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-gray-900">Financial Data</h3>
                            <p className="text-sm text-gray-500">Payment Status</p>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="border border-gray-200 bg-[#FCFCFC]/50 rounded-2xl p-5 text-center transition-colors hover:bg-[#FCFCFC]">
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Required</div>
                        <div className="text-2xl font-black text-gray-900">{data.financial.required} <span className="text-sm text-[#80848E] font-medium">EGP</span></div>
                     </div>
                      <div className="border border-green-100 bg-green-50/30 rounded-2xl p-5 text-center transition-colors hover:bg-green-50/50">
                        <div className="text-green-600/80 text-xs font-bold uppercase tracking-wider mb-2">Paid</div>
                        <div className="text-2xl font-black text-green-600">{data.financial.paid} <span className="text-sm text-green-400 font-medium">EGP</span></div>
                     </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-orange-900 font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                Remaining Payment
                            </span>
                            <span className="text-2xl font-black text-orange-600">{data.financial.remaining} <span className="text-sm font-medium opacity-70">EGP</span></span>
                        </div>
                        <div className="w-full bg-white/50 rounded-full h-3 backdrop-blur-sm overflow-hidden">
                             <div 
                                className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full shadow-xl transition-all duration-1000" 
                                style={{ width: `${Math.min(100, (data.financial.paid / data.financial.required) * 100)}%` }}
                             ></div>
                        </div>
                        <div className="flex justify-end mt-2">
                            <span className="text-xs font-bold text-orange-400">
                                Paid: {Math.round((data.financial.paid / data.financial.required) * 100) || 0}%
                            </span>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}
