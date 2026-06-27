'use client';

import { useAuth } from '@/hooks/useAuth';
import { Users, ClipboardCheck, UserPlus, GraduationCap, UserCog, BarChart3, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRecentAttendance } from '@/features/sessions/api/sessionApi';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

interface AttendanceRecord {
    id: string;
    code: string;
    name: string;
    checkIn: string;
    checkOut: string;
    status: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [loadingAttendance, setLoadingAttendance] = useState(true);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                setLoadingAttendance(true);
                const attendanceRes = await getRecentAttendance(10);
                setAttendanceRecords(attendanceRes.data || []);
            } catch (error) {
                // Only log errors if online (to avoid spam in offline mode)
                const isOfflineNow = typeof window !== 'undefined' && !navigator.onLine;
                if (!isOfflineNow) {
                    console.error('Failed to fetch attendance data:', error);
                }
                setAttendanceRecords([]);
            } finally {
                setLoadingAttendance(false);
            }
        };

        fetchAttendance();
    }, []);

    const getStatusText = (status: string) => {
        if (status === 'حاضر' || status === 'present' || status === 'Present') {
            return 'Present';
        }
        if (status === 'غائب' || status === 'absent' || status === 'Absent') {
            return 'Absent';
        }
        return status;
    };

    const isPresent = (status: string) => {
        return status === 'حاضر' || status === 'present' || status === 'Present';
    };

    // Skeleton loader for attendance records
    const AttendanceSkeleton = () => (
        <div className="bg-white rounded-3xl border border-black/5 shadow-xl p-4 animate-pulse">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="flex items-center gap-2">
                        <div className="h-6 bg-gray-200 rounded-xl w-16"></div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4 sm:space-y-6 text-left" dir="ltr">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Dashboard</h1>
                    <p className="text-sm sm:text-base text-gray-500">Manage students and attendance</p>
                </div>
            </div>

            {/* Welcome Banner */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-indigo-500/20 animate-fade-in-up">
                {/* Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-600 sm:animate-gradient" />
                
                {/* Floating Decorative Elements */}
                <div className="hidden sm:block absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-float" />
                <div className="hidden sm:block absolute -bottom-10 -left-10 w-36 h-36 bg-white/8 rounded-full blur-3xl animate-float-reverse" />
                <div className="hidden sm:block absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-pulse-glow" />
                
                {/* Static decorative elements for mobile */}
                <div className="sm:hidden absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="sm:hidden absolute -bottom-10 -left-10 w-36 h-36 bg-white/8 rounded-full blur-3xl" />
                
                {/* Shimmer Effect */}
                <div className="hidden sm:block absolute inset-0 animate-shimmer pointer-events-none" />
                
                {/* Content Container */}
                <div className="relative p-4 sm:p-5 text-white">
                    {/* Subject Badge */}
                    <div className="flex justify-end mb-2 sm:mb-3 animate-fade-in">
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-2 border border-white/30 shadow-lg">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-xl"></span>
                            <span className="font-bold">{user?.subject || 'Subject'}</span>
                        </div>
                    </div>
                    
                    {/* Main Content */}
                    <div className="space-y-1.5 sm:space-y-2 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                        <h2 className="text-xl sm:text-2xl font-extrabold leading-tight drop-shadow-lg text-left">
                            Hello, Mr. {user?.name || '—'}! 👋
                        </h2>
                        <p className="text-indigo-50 text-xs sm:text-sm leading-relaxed opacity-95 text-left">
                            Here's a quick look at today's performance — {today}
                        </p>
                        
                        <div className="mt-6 text-left">
                            <Link href="/dashboard/analytics" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl transition-colors font-bold text-sm border border-white/20">
                                <BarChart3 size={18} />
                                View Analytics & Statistics
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                    
                    {/* Decorative Bottom Pattern */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-base sm:text-lg font-extrabold text-gray-900 mb-3 sm:mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Register Attendance */}
                    <Link href={ROUTES.ATTENDANCE} className="bg-white rounded-3xl p-4 sm:p-6 border border-black/5 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer text-center">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <ClipboardCheck className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                        </div>
                        <h4 className="font-extrabold text-gray-900 mb-1 text-sm sm:text-base">Attendance</h4>
                        <p className="text-xs sm:text-sm text-gray-500">Record student attendance</p>
                    </Link>

                    {/* Add Student */}
                    <Link href={ROUTES.STUDENTS_ADD} className="bg-white rounded-3xl p-4 sm:p-6 border border-black/5 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer text-center">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <UserPlus className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                        </div>
                        <h4 className="font-extrabold text-gray-900 mb-1 text-sm sm:text-base">Add Student</h4>
                        <p className="text-xs sm:text-sm text-gray-500">Add a new student</p>
                    </Link>

                    {/* Add Exam Grade */}
                    <Link href={ROUTES.GRADES} className="bg-white rounded-3xl p-4 sm:p-6 border border-black/5 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer text-center">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
                        </div>
                        <h4 className="font-extrabold text-gray-900 mb-1 text-sm sm:text-base">Grades</h4>
                        <p className="text-xs sm:text-sm text-gray-500">Record exam grades</p>
                    </Link>

                    {/* Add Assistant */}
                    <Link href="/dashboard/assistants" className="bg-white rounded-3xl p-4 sm:p-6 border border-black/5 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer text-center">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <UserCog className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                        </div>
                        <h4 className="font-extrabold text-gray-900 mb-1 text-sm sm:text-base">Assistant</h4>
                        <p className="text-xs sm:text-sm text-gray-500">Create new account</p>
                    </Link>
                </div>
            </div>

            {/* Recent Attendance Records */}
            <div>
                <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-extrabold text-gray-900">Recent Attendance Logs</h3>
                    <Link
                        href={ROUTES.ATTENDANCE}
                        className="text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-2xl transition-colors"
                    >
                        New Registration
                    </Link>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                    {loadingAttendance ? (
                        <>
                            <AttendanceSkeleton />
                            <AttendanceSkeleton />
                            <AttendanceSkeleton />
                        </>
                    ) : attendanceRecords.length > 0 ? (
                        attendanceRecords.map((record) => (
                            <div
                                key={record.id}
                                className="bg-white rounded-3xl border border-black/5 shadow-xl p-4 text-left"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-extrabold text-gray-900 truncate">
                                            {record.name}
                                        </div>
                                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl font-bold">
                                                {record.code}
                                            </span>
                                            <span>{record.checkIn || '—'}</span>
                                            <span className="text-gray-300">•</span>
                                            <span>{record.checkOut || '—'}</span>
                                        </div>
                                    </div>
                                    <span
                                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-extrabold ${
                                            isPresent(record.status)
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}
                                    >
                                        {getStatusText(record.status)}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-3xl border border-dashed border-gray-200 bg-[#FCFCFC] py-10 text-center text-sm text-gray-500">
                            No attendance records for today
                        </div>
                    )}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block bg-white rounded-3xl border border-black/5 shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-[#FCFCFC] border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-500">Student Code</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-500">Student Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-500">Check-in Time</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-500">Check-out Time</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2B2D31]">
                            {loadingAttendance ? (
                                <>
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <tr key={index} className="animate-pulse">
                                            <td className="px-6 py-4">
                                                <div className="h-6 bg-gray-200 rounded-lg w-16"></div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-4 bg-gray-200 rounded w-32"></div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-6 bg-gray-200 rounded-full w-12"></div>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            ) : attendanceRecords.length > 0 ? (
                                attendanceRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-[#FCFCFC] transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-sm font-medium">
                                                {record.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">{record.name}</td>
                                        <td className="px-6 py-4 text-gray-500">{record.checkIn}</td>
                                        <td className="px-6 py-4 text-gray-500">{record.checkOut}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                    isPresent(record.status)
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-red-100 text-red-600'
                                                }`}
                                            >
                                                {getStatusText(record.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No attendance records for today
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
