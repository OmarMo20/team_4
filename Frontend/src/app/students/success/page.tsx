'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Copy, Share2, UserPlus } from 'lucide-react';
import { useState, Suspense, useEffect } from 'react';
import { getStudentById, Student } from '@/features/students';
import { ROUTES } from '@/lib/constants';

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);

    // Get student ID and password from query params
    const studentId = searchParams?.get('id');
    const studentPassword = searchParams?.get('pwd');

    useEffect(() => {
        const fetchStudent = async () => {
            if (!studentId) return;
            try {
                setLoading(true);
                const response = await getStudentById(studentId);
                if (response.success && response.data) {
                    setStudent(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch student:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudent();
    }, [studentId]);

    useEffect(() => {
        const fetchQr = async () => {
            if (!studentId) return;
            try {
                setQrLoading(true);
                const res = await fetch(`/api/students/${studentId}/qr`, { cache: 'no-store' });
                const json = await res.json();
                if (json?.success && json?.data?.qrDataUrl) {
                    setQrDataUrl(json.data.qrDataUrl);
                }
            } catch (error) {
                console.error('Failed to fetch student QR:', error);
            } finally {
                setQrLoading(false);
            }
        };

        fetchQr();
    }, [studentId]);

    const handleCopyCode = async () => {
        if (!student?.studentCode && !student?.nationalId) return;
        try {
            await navigator.clipboard.writeText(student.studentCode || student.nationalId || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async () => {
        if (!student) return;
        const code = student.studentCode || student.nationalId || '';
        const shareData = {
            title: 'Student Code',
            text: `Student Code for ${student.fullName}: ${code}`,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Failed to share:', err);
            }
        } else {
            handleCopyCode();
        }
    };

    const handleAddAnother = () => {
        router.push(ROUTES.STUDENTS_ADD);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="text-center py-10 text-left" dir="ltr">
                <p className="text-gray-500">Student details not found</p>
                <button
                    onClick={handleAddAnother}
                    className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                    Back to Add Student
                </button>
            </div>
        );
    }

    return (
        <div className="text-left" dir="ltr">
            {/* Page Title */}
            <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-gray-900">New Student Added</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Right (on desktop): Student Summary Card */}
                <div className="bg-white rounded-2xl p-6 border-2 border-black/5 shadow-2xl shadow-black/10 flex flex-col lg:order-2">
                    <h3 className="text-lg font-extrabold text-gray-900 mb-6">Student Details Summary</h3>

                    <div className="space-y-0 divide-y-2 divide-[#2B2D31] border-t-2 border-b-2 border-gray-200">
                        <div className="flex justify-between items-center py-3 border-b-2 border-gray-200">
                            <span className="text-sm text-gray-500 font-medium">Name</span>
                            <span className="font-semibold text-gray-900">{student.fullName}</span>
                        </div>

                        {student.studentPhone && (
                            <div className="flex justify-between items-center py-3 border-b-2 border-gray-200">
                                <span className="text-sm text-gray-500 font-medium">Student Phone</span>
                                <span className="font-semibold text-gray-900">{student.studentPhone}</span>
                            </div>
                        )}

                        {student.parentPhone && (
                            <div className="flex justify-between items-center py-3 border-b-2 border-gray-200">
                                <span className="text-sm text-gray-500 font-medium">Parent Phone</span>
                                <span className="font-semibold text-gray-900">{student.parentPhone}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center py-3 border-b-2 border-gray-200">
                            <span className="text-sm text-gray-500 font-medium">Grade</span>
                            <span className="font-semibold text-gray-900">{student.grade}</span>
                        </div>

                        {student.classroom && (
                            <div className="flex justify-between items-center py-3 border-b-2 border-gray-200">
                                <span className="text-sm text-gray-500 font-medium">Center</span>
                                <span className="font-semibold text-gray-900">{student.classroom}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center py-3 border-b-2 border-gray-200">
                            <span className="text-sm text-gray-500 font-medium">Monthly Fee</span>
                            <span className="font-semibold text-gray-900">{student.monthlyFee} EGP</span>
                        </div>

                        <div className="flex justify-between items-center py-3">
                            <span className="text-sm text-gray-500 font-medium">Payment Status</span>
                            <span className="font-semibold text-emerald-600">Paid</span>
                        </div>
                    </div>
                </div>

                {/* Left (on desktop): Success Message and Code */}
                <div className="space-y-6 flex flex-col lg:order-1">
                    {/* Success Card */}
                    <div className="bg-white rounded-2xl p-8 border-2 border-black/5 shadow-2xl shadow-black/10 text-center flex flex-col items-center justify-between flex-1">
                        {/* Success Icon */}
                        <div>
                            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="h-12 w-12 text-emerald-500" />
                            </div>

                            <h3 className="text-xl font-extrabold text-gray-900 mb-2">
                                Student Added Successfully!
                            </h3>
                            <p className="text-base text-gray-500 mb-8">{student.fullName}</p>
                        </div>

                        <div className="w-full max-w-sm mx-auto">
                            {/* Student Code */}
                            <div className="rounded-2xl p-6 bg-[#f4ecff] mb-4">
                                <p className="text-sm text-gray-500 mb-2 font-medium">Student Code</p>
                                <p className="text-4xl font-extrabold tracking-[0.25em] text-indigo-700">
                                    {student.studentCode || student.nationalId || '0000'}
                                </p>
                            </div>

                            {/* Student Password */}
                            {studentPassword && (
                                <div className="rounded-2xl p-6 bg-[#fff4ec] mb-6">
                                    <p className="text-sm text-gray-500 mb-2 font-medium">Password</p>
                                    <p className="text-2xl font-extrabold tracking-[0.1em] text-orange-600 font-mono">
                                        {studentPassword}
                                    </p>
                                </div>
                            )}

                            {/* Student QR */}
                            <div className="rounded-2xl p-6 bg-white border-2 border-black/5 shadow-xl mb-6 flex flex-col items-center">
                                <p className="text-sm text-gray-500 mb-3 font-medium">QR Code</p>
                                {qrLoading && (
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
                                )}
                                {!qrLoading && qrDataUrl && (
                                    <img
                                        src={qrDataUrl}
                                        alt="Student QR"
                                        className="h-64 w-64 bg-white p-4 rounded-xl border border-gray-200 shadow-xl"
                                    />
                                )}
                                {!qrLoading && !qrDataUrl && (
                                    <p className="text-xs text-gray-500">Failed to load QR</p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-4 items-stretch">
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleShare}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                                    >
                                        <Share2 className="h-5 w-5" />
                                        Share
                                    </button>
                                    <button
                                        onClick={handleCopyCode}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-indigo-200 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
                                    >
                                        <Copy className="h-5 w-5" />
                                        {copied ? 'Copied!' : 'Copy Code'}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddAnother}
                                    className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-4 font-semibold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Add Another Student
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function StudentSuccessPage() {
    return (
        <div className="space-y-6" dir="ltr">
            <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
                <SuccessContent />
            </Suspense>
        </div>
    );
}
