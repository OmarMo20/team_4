'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, MessageSquare, CheckCircle2, BookOpen, Wallet, TrendingUp, Calendar, Phone, GraduationCap, FileText, Sparkles, X } from 'lucide-react';
import { getStudentReportByCode } from '@/features/reports/api/reportApi';
import type { StudentReport } from '@/features/reports/api/reportApi';
import { Spinner } from '@/components/ui';
import { sendMessage } from '@/features/messages/api/messageApi';
import { useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function ReportsPage() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [studentCode, setStudentCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<StudentReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const performSearch = async (code: string) => {
        if (!code.trim()) {
            setError('Please enter student code');
            return;
        }

        setLoading(true);
        setError(null);
        setReport(null);

        try {
            const response = await getStudentReportByCode(code.trim());
            if (response.success && response.data) {
                setReport(response.data);
            } else {
                setError('No student found with this code');
            }
        } catch (err: any) {
            const errorMessage = err?.response?.data?.message || 'An error occurred while fetching the report';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        performSearch(studentCode);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Auto-search as user types (with debounce)
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (studentCode.trim().length >= 1) {
                performSearch(studentCode);
            } else if (studentCode.trim().length === 0) {
                setReport(null);
                setError(null);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [studentCode]);

    const generateReportMessage = () => {
        if (!report) return '';

        let message = `📋 *Comprehensive Student Report*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Student Info
        message += `👤 *Personal Information:*\n`;
        message += `• Name: ${report.student.fullName}\n`;
        message += `• Grade: ${report.student.grade}\n`;
        if (report.student.classroom) {
            message += `• Center: ${report.student.classroom}\n`;
        }
        if (report.student.studentPhone) {
            message += `• Student Phone: ${report.student.studentPhone}\n`;
        }
        if (report.student.parentPhone) {
            message += `• Parent Phone: ${report.student.parentPhone}\n`;
        }
        if (report.student.monthlyFee && report.student.monthlyFee > 0) {
            message += `• Monthly Fee: ${formatCurrency(report.student.monthlyFee)}\n`;
        }
        message += `\n`;

        // Statistics
        message += `📊 *Statistics:*\n`;
        message += `• Present Days: ${report.statistics.presentCount}\n`;
        message += `• Exams: ${report.statistics.totalExams}\n`;
        message += `• Additional Services: ${report.statistics.totalAdditionalServices}\n`;
        if (report.statistics.averageGrade) {
            message += `• Average: ${report.statistics.averageGrade.toFixed(1)}\n`;
        }
        message += `\n`;

        // Financials
        if (report.statistics.totalPaid > 0 || report.statistics.totalPending > 0) {
            message += `💰 *Financial Status:*\n`;
            message += `• Paid: ${formatCurrency(report.statistics.totalPaid)}\n`;
            message += `• Pending: ${formatCurrency(report.statistics.totalPending)}\n`;
            message += `\n`;
        }

        // Last 5 attendance logs
        if (report.attendances.length > 0) {
            message += `📅 *Last Attendance Logs:*\n`;
            report.attendances.slice(0, 5).forEach((attendance) => {
                const status = attendance.status === 'present' ? '✅ Present' :
                    attendance.status === 'absent' ? '❌ Absent' : '⚠️ Late';
                const sessionTitle = attendance.session?.title ||
                    (attendance.session?.grade ? `Session ${attendance.session.grade}` : '');
                message += `• ${formatDate(attendance.date)} ${attendance.checkInTime ? `- ${attendance.checkInTime}` : ''} ${status}`;
                if (sessionTitle) {
                    message += `\n  └ ${sessionTitle}`;
                }
                message += `\n`;
            });
            message += `\n`;
        }

        // Last 3 grades
        if (report.grades.length > 0) {
            message += `📝 *Recent Grades:*\n`;
            report.grades.slice(0, 3).forEach((grade) => {
                const percentage = grade.maxScore ? ((grade.score / grade.maxScore) * 100).toFixed(0) : '';
                const examTitle = grade.exam?.title || 'Exam';
                message += `• ${examTitle}: ${grade.score}${grade.maxScore ? `/${grade.maxScore}` : ''}`;
                if (percentage) {
                    message += ` (${percentage}%)`;
                }
                message += `\n`;
            });
        }

        message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📱 *Mr. ${user?.name}*`;
        return message;
    };

    const handleSendToWhatsApp = async (phoneType: 'student' | 'parent') => {
        if (!report) return;

        const phone = phoneType === 'student'
            ? report.student.studentPhone
            : report.student.parentPhone;

        if (!phone) {
            showToast(
                phoneType === 'student'
                    ? 'No phone number for the student'
                    : 'No phone number for the parent',
                'error'
            );
            return;
        }

        setSendingMessage(true);
        try {
            const message = generateReportMessage();

            await sendMessage({
                studentId: report.student.id,
                content: message,
            });

            const formattedPhone = phone.replace(/\D/g, '');
            const egyptianPhone = formattedPhone.startsWith('0') && formattedPhone.length === 11
                ? `2${formattedPhone}`
                : formattedPhone;
            const whatsappUrl = `https://wa.me/${egyptianPhone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');

            setShowPhoneModal(false);
            showToast('WhatsApp opened for sending', 'success');
        } catch (err: any) {
            showToast('Failed to send message', 'error');
        } finally {
            setSendingMessage(false);
        }
    };

    const formatCurrency = (value: number) => {
        return `${value.toLocaleString('en-US')} EGP`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
        });
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        return time;
    };

    const formatDateTime = (date: string) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
        }) + ' - ' + d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <div className="space-y-4 sm:space-y-6" dir="ltr">
            {/* Header Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-500 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-purple-500/20 animate-fade-in-up">
                {/* Decorative Elements */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl hidden sm:block" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/8 rounded-full blur-3xl hidden sm:block" />

                <div className="relative space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold">Comprehensive Reports</h1>
                    </div>
                    <p className="text-indigo-50 text-sm sm:text-base">
                        Review comprehensive student reports - attendance, payments, and grades
                    </p>
                </div>
            </div>

            {/* Search Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                        <Search className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Search for Report</h2>
                        <p className="text-gray-500 text-sm mt-1">Enter student code to get their comprehensive report</p>
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={studentCode}
                        onChange={(e) => {
                            const value = e.target.value.replace(/^\s+/, '');
                            setStudentCode(value);
                            setError(null);
                            setTimeout(() => {
                                if (inputRef.current) {
                                    const length = inputRef.current.value.length;
                                    inputRef.current.setSelectionRange(length, length);
                                }
                            }, 0);
                        }}
                        onKeyPress={handleKeyPress}
                        onFocus={(e) => {
                            const length = e.target.value.length;
                            e.target.setSelectionRange(length, length);
                        }}
                        placeholder="Enter student code (auto-searches)"
                        dir="ltr"
                        autoComplete="off"
                        className="w-full rounded-2xl border-2 border-indigo-200 bg-[#FCFCFC] py-4 pl-5 text-base text-left focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-[#80848E] font-medium"
                        style={{ paddingRight: '7.5rem' }}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                    >
                        {loading ? (
                            <>
                                <Spinner size="sm" />
                                <span className="hidden sm:inline">Searching...</span>
                            </>
                        ) : (
                            <>
                                <Search className="h-4 w-4" />
                                <span>Search</span>
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm font-medium flex items-center gap-2 animate-fade-in">
                        <span className="text-red-500">⚠</span>
                        {error}
                    </div>
                )}
            </div>

            {/* Report Results */}
            {report && (
                <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                    {/* Student Header Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <User className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-1">{report.student.fullName}</h2>
                                    <div className="flex items-center gap-2 text-indigo-100">
                                        <GraduationCap className="h-4 w-4" />
                                        <span className="text-sm sm:text-base">
                                            {report.student.grade}
                                            {report.student.classroom && ` - ${report.student.classroom}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const hasStudentPhone = (report.student as any).studentPhone;
                                    const hasParentPhone = report.student.parentPhone;

                                    if (hasStudentPhone || hasParentPhone) {
                                        setShowPhoneModal(true);
                                    } else {
                                        showToast('No phone number available', 'error');
                                    }
                                }}
                                disabled={sendingMessage || (!report.student.parentPhone && !(report.student as any).studentPhone)}
                                className="hidden sm:flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/30"
                            >
                                {sendingMessage ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare className="h-5 w-5" />
                                        <span>Send via WhatsApp</span>
                                    </>
                                )}
                            </button>
                        </div>
                        {/* Mobile Send Button */}
                        <button
                            onClick={() => {
                                const hasStudentPhone = report.student.studentPhone;
                                const hasParentPhone = report.student.parentPhone;

                                if (hasStudentPhone || hasParentPhone) {
                                    setShowPhoneModal(true);
                                } else {
                                    showToast('No phone number available', 'error');
                                }
                            }}
                            disabled={sendingMessage || (!report.student.parentPhone && !report.student.studentPhone)}
                            className="sm:hidden mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/30"
                        >
                            {sendingMessage ? (
                                        <>
                                    <Spinner size="sm" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="h-5 w-5" />
                                    <span>Send via WhatsApp</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-indigo-200 shadow-xl hover:shadow-2xl transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                                    <CheckCircle2 className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <p className="text-xs text-indigo-700 font-medium mb-1">Present Days</p>
                            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-900">{report.statistics.presentCount}</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-indigo-200 shadow-xl hover:shadow-2xl transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                                    <BookOpen className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <p className="text-xs text-indigo-700 font-medium mb-1">Exams</p>
                            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-900">{report.statistics.totalExams}</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-indigo-200 shadow-xl hover:shadow-2xl transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                                    <Wallet className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <p className="text-xs text-indigo-700 font-medium mb-1">Additional Services</p>
                            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-900">{report.statistics.totalAdditionalServices}</p>
                        </div>

                        {report.statistics.averageGrade && report.statistics.averageGrade > 0 && (
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-indigo-200 shadow-xl hover:shadow-2xl transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                                        <TrendingUp className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                                <p className="text-xs text-indigo-700 font-medium mb-1">Average</p>
                                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-900">{report.statistics.averageGrade.toFixed(1)}</p>
                            </div>
                        )}
                    </div>

                    {/* Financial Summary */}
                    {(report.statistics.totalPaid > 0 || report.statistics.totalPending > 0) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 shadow-xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center">
                                        <Wallet className="h-5 w-5 text-white" />
                                    </div>
                                    <p className="text-sm font-bold text-green-700">Paid</p>
                                </div>
                                <p className="text-3xl font-extrabold text-green-900">{formatCurrency(report.statistics.totalPaid)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200 shadow-xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center">
                                        <Wallet className="h-5 w-5 text-white" />
                                    </div>
                                    <p className="text-sm font-bold text-orange-700">Pending</p>
                                </div>
                                <p className="text-3xl font-extrabold text-orange-900">{formatCurrency(report.statistics.totalPending)}</p>
                            </div>
                        </div>
                    )}

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                            {/* Attendance Log */}
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <h3 className="text-lg font-extrabold text-gray-900">Attendance Log</h3>
                                </div>
                                {report.attendances.length > 0 ? (
                                    <div className="space-y-3">
                                        {report.attendances.slice(0, 10).map((attendance) => (
                                            <div key={attendance.id} className="p-4 bg-[#FCFCFC] rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <Calendar className="h-4 w-4 text-[#80848E]" />
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{formatDate(attendance.date)}</p>
                                                            {attendance.checkInTime && (
                                                                <p className="text-xs text-gray-500">{formatTime(attendance.checkInTime)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${attendance.status === 'present'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : attendance.status === 'absent'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {attendance.status === 'present' ? 'Present' : attendance.status === 'absent' ? 'Absent' : 'Late'}
                                                    </span>
                                                </div>
                                                {attendance.session && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <p className="text-xs text-gray-500 mb-1">Session Title:</p>
                                                        <p className="text-sm font-bold text-indigo-700">
                                                            {attendance.session.title || `Session ${attendance.session.grade || ''}`}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No attendance records</p>
                                    </div>
                                )}
                            </div>

                            {/* Additional Services */}
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <Wallet className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <h3 className="text-lg font-extrabold text-gray-900">Additional Services</h3>
                                </div>
                                {report.additionalServices && report.additionalServices.length > 0 ? (
                                    <div className="space-y-3">
                                        {report.additionalServices.map((service) => (
                                            <div key={service.id} className="p-4 bg-[#FCFCFC] rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
                                                <p className="font-bold text-gray-900 mb-1">
                                                    {typeof service.service === 'object' ? service.service.name : 'Service'}
                                                </p>
                                                {service.notes && (
                                                    <p className="text-sm text-gray-500">{service.notes}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No additional services</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Personal Information */}
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                        <User className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <h3 className="text-lg font-extrabold text-gray-900">Personal Information</h3>
                                </div>
                                <div className="space-y-4">
                                    {report.student.parentPhone && (
                                        <div className="flex items-center gap-3 p-3 bg-[#FCFCFC] rounded-xl">
                                            <Phone className="h-5 w-5 text-[#80848E]" />
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Parent's Phone</p>
                                                <p className="text-sm font-bold text-gray-900">{report.student.parentPhone}</p>
                                            </div>
                                        </div>
                                    )}
                                    {report.student.studentPhone && (
                                        <div className="flex items-center gap-3 p-3 bg-[#FCFCFC] rounded-xl">
                                            <Phone className="h-5 w-5 text-[#80848E]" />
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Student's Phone</p>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {report.student.studentPhone}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 p-3 bg-[#FCFCFC] rounded-xl">
                                        <GraduationCap className="h-5 w-5 text-[#80848E]" />
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Grade / Year</p>
                                            <p className="text-sm font-bold text-gray-900">{report.student.grade}</p>
                                        </div>
                                    </div>
                                    {report.student.classroom && (
                                        <div className="flex items-center gap-3 p-3 bg-[#FCFCFC] rounded-xl">
                                            <Sparkles className="h-5 w-5 text-[#80848E]" />
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Center</p>
                                                <p className="text-sm font-bold text-gray-900">{report.student.classroom}</p>
                                            </div>
                                        </div>
                                    )}
                                    {report.student.monthlyFee && report.student.monthlyFee > 0 && (
                                        <div className="flex items-center gap-3 p-3 bg-[#FCFCFC] rounded-xl">
                                            <Wallet className="h-5 w-5 text-[#80848E]" />
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Monthly Fee</p>
                                                <p className="text-sm font-bold text-gray-900">{formatCurrency(report.student.monthlyFee)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Exam Grades */}
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <BookOpen className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-extrabold text-gray-900">Exam Grades</h3>
                                </div>
                                {report.grades.length > 0 ? (
                                    <div className="space-y-4">
                                        {report.grades.map((grade) => {
                                            const percentage = grade.maxScore ? (grade.score / grade.maxScore) * 100 : 0;
                                            return (
                                                <div key={grade.id} className="p-4 bg-[#FCFCFC] rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 mb-1">
                                                                {grade.exam?.title || 'Exam'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {formatDateTime(grade.createdAt)}
                                                            </p>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-lg font-extrabold text-gray-900">
                                                                {grade.score}{grade.maxScore ? `/${grade.maxScore}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {grade.maxScore && (
                                                        <>
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                                                <div
                                                                    className={`h-2.5 rounded-full transition-all ${percentage >= 90 ? 'bg-emerald-500' :
                                                                        percentage >= 70 ? 'bg-blue-500' :
                                                                            percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                                        }`}
                                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-gray-500 text-left">
                                                                {percentage.toFixed(0)}%
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No grades recorded</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Phone Selection Modal */}
            {showPhoneModal && report && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
                    onClick={() => setShowPhoneModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl relative max-w-md w-full p-6 animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                        dir="ltr"
                    >
                        <button
                            onClick={() => setShowPhoneModal(false)}
                            className="absolute top-4 right-4 text-[#80848E] hover:text-gray-500 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Select Sending Number</h3>
                            <p className="text-gray-500 text-sm">Select the number you want to send the report to</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleSendToWhatsApp('student')}
                                disabled={sendingMessage || !report.student.studentPhone}
                                className="w-full p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-indigo-200 rounded-xl hover:border-indigo-400 hover:from-purple-100 hover:to-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${report.student.studentPhone ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                            <Phone className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Student's Phone</p>
                                            <p className={`text-sm ${report.student.studentPhone ? 'text-gray-500' : 'text-[#80848E]'}`}>
                                                {report.student.studentPhone || 'Not Available'}
                                            </p>
                                        </div>
                                    </div>
                                    {sendingMessage && <Spinner size="sm" />}
                                </div>
                            </button>

                            <button
                                onClick={() => handleSendToWhatsApp('parent')}
                                disabled={sendingMessage || !report.student.parentPhone}
                                className="w-full p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-indigo-200 rounded-xl hover:border-indigo-400 hover:from-purple-100 hover:to-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${report.student.parentPhone ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                            <User className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Parent's Phone</p>
                                            <p className={`text-sm ${report.student.parentPhone ? 'text-gray-500' : 'text-[#80848E]'}`}>
                                                {report.student.parentPhone || 'Not Available'}
                                            </p>
                                        </div>
                                    </div>
                                    {sendingMessage && <Spinner size="sm" />}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}