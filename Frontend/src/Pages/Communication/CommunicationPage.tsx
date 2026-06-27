'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Send, User, Loader2, ClipboardCheck, UserX, GraduationCap, Banknote, Clock } from 'lucide-react';
import { useToast, Spinner } from '@/components/ui';
import StudentSearchList from '@/components/StudentSearchList';
import type { Student, StudentSummary } from '@/features/students';
import { getStudentSummary } from '@/features/students/api/studentApi';
import { sendMessage } from '@/features/messages/api/messageApi';

import { useAuth } from '@/hooks/useAuth';
import { MessageHistoryModal } from '@/components/MessageHistoryModal';

export default function CommunicationPage() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [summary, setSummary] = useState<StudentSummary | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    useEffect(() => {
        if (selectedStudent) {
            fetchSummary(selectedStudent.id || selectedStudent._id!);
        } else {
            setSummary(null);
            setMessage('');
        }
    }, [selectedStudent]);

    const fetchSummary = async (id: string) => {
        setLoadingSummary(true);
        try {
            const response = await getStudentSummary(id);
            if (response.success) {
                setSummary(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch student summary:', error);
            showToast('Failed to load student summary', 'error');
        } finally {
            setLoadingSummary(false);
        }
    };

    const generateTemplate = (type: 'attendance' | 'absence' | 'payment' | 'grades') => {
        if (!selectedStudent) return;
        
        const name = selectedStudent.fullName;
        const teacherName = user?.name || "Teacher";
        const head = "Hello,\n\n";
        const tail = `\n\nPlease feel free to contact us.\nRegards, Mr. ${teacherName}`;
        
        let body = "";
        
        switch (type) {
            case 'attendance':
                body = `We would like to inform you that student ${name} attended today's session.`;
                break;
            case 'absence':
                body = `We would like to inform you that student ${name} was absent from today's session.`;
                break;
            case 'payment':
                body = `We would like to remind you of the monthly fee payment for student ${name}.`;
                break;
            case 'grades':
                if (summary?.latestExam) {
                    body = `We would like to inform you that student ${name} scored ${summary.latestExam.score} out of ${summary.latestExam.fullMark} in ${summary.latestExam.title}.`;
                } else {
                    body = `We would like to inform you that student ${name} completed the exam successfully, and the score will be sent soon.`;
                }
                break;
        }
        
        setMessage(head + body + tail);
    };

    const handleSendWhatsApp = async () => {
        if (!selectedStudent || !message) {
            showToast('Please select a student and a message template', 'error');
            return;
        }

        const phone = selectedStudent.parentPhone || selectedStudent.studentPhone;
        if (!phone) {
            showToast('No phone number registered', 'error');
            return;
        }

        setSending(true);
        try {
            await sendMessage({
                studentId: selectedStudent.id || selectedStudent._id!,
                content: message
            });

            const formattedPhone = phone.replace(/\D/g, '');
            const egyptianPhone = formattedPhone.startsWith('0') && formattedPhone.length === 11 
                ? `2${formattedPhone}` 
                : formattedPhone;
            
            const whatsappUrl = `https://wa.me/${egyptianPhone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
            
            showToast('WhatsApp opened for sending', 'success');
        } catch (error: any) {
            showToast('Failed to record message', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 text-left" dir="ltr">
            <MessageHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

            {/* Page Header */}
            <div className="text-left space-y-1 pt-2">
                <div className="flex items-center justify-start gap-2 mb-1">
                    <h3 className="text-xl font-bold text-[#202020]">Dashboard</h3>
                </div>
                <p className="text-sm md:text-base text-[#A1A1A1]">Student and attendance management</p>
            </div>

            <div className="h-px bg-gray-200 w-full opacity-30" />

            {/* Title & Subtitle & History Button */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                <div className="text-left space-y-2">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#202020] leading-tight">Parent Communication</h2>
                    <p className="text-[#A1A1A1] text-sm md:text-lg font-medium max-w-2xl mr-auto">
                        Send quick WhatsApp messages to parents - attendance, absence, grades, and payments
                    </p>
                </div>
                <button 
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-[14px] text-[#414141] font-bold hover:bg-[#FCFCFC] hover:border-[#4F46E5] transition-all shadow-xl group"
                >
                    <Clock className="h-5 w-5 text-[#4F46E5] group-hover:scale-110 transition-transform" />
                    <span>Message History</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch pt-2">
                {/* Student List */}
                <div className="lg:col-span-4 h-full order-1 lg:order-1">
                    <div className="lg:sticky lg:top-8">
                        <StudentSearchList 
                            onSelect={setSelectedStudent} 
                            selectedId={selectedStudent?.id || selectedStudent?._id}
                        />
                    </div>
                </div>

                {/* Message Area */}
                <div className="lg:col-span-8 bg-white rounded-[24px] md:rounded-[32px] border border-[#E2E2E2] p-4 sm:p-8 md:p-12 shadow-xl min-h-[450px] md:min-h-[600px] flex flex-col relative overflow-hidden order-2 lg:order-2 text-left">
                    {!selectedStudent ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6 md:space-y-8">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-dashed border-[#E2E2E2] flex items-center justify-center bg-[#FCFCFC]">
                                <MessageCircle className="h-12 w-12 md:h-16 text-[#D1D1D1]" strokeWidth={1} />
                            </div>
                            <div className="text-center space-y-2">
                                <h4 className="text-[#A1A1A1] text-lg md:text-xl font-bold">Awaiting Student Selection</h4>
                                <p className="text-[#CCC] text-xs md:text-sm font-medium">Select a student from the sidebar list to start</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 flex flex-col h-full text-left">
                            {/* Student Header Card */}
                            <div className="bg-[#F8F8FD] rounded-[20px] md:rounded-[28px] p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between border border-indigo-50 gap-4 sm:gap-8">
                                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-8 text-center sm:text-left">
                                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-[16px] md:rounded-[22px] bg-white flex items-center justify-center border-2 md:border-4 border-indigo-50 shadow-xl shrink-0">
                                        <User className="h-8 w-8 md:h-12 text-[#4F46E5]" />
                                    </div>
                                    <div className="space-y-1 md:space-y-2 text-left">
                                        <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#202020]">{selectedStudent.fullName}</h3>
                                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 md:gap-3">
                                            <span className="bg-indigo-100 text-[#4F46E5] px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-bold">
                                                {selectedStudent.grade}
                                            </span>
                                            <span className="text-[#717171] font-bold text-sm md:text-base">
                                                {selectedStudent.classroom || 'Al-Nour Center'}
                                            </span>
                                        </div>
                                        <p className="text-xs md:text-sm text-[#A1A1A1] font-bold">
                                            Sunday & Wednesday - 6:00 PM
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Templates Grid */}
                            <div className="space-y-4 md:space-y-6 text-left">
                                <div className="flex items-center justify-start gap-3 ml-2">
                                    <h5 className="text-base md:text-lg font-bold text-[#202020]">Select Message Template</h5>
                                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
                                    {[
                                        { id: 'attendance', label: 'Attendance Notice', icon: ClipboardCheck, color: 'text-emerald-500', bg: 'hover:bg-emerald-50' },
                                        { id: 'absence', label: 'Absence Notice', icon: UserX, color: 'text-red-500', bg: 'hover:bg-red-50' },
                                        { id: 'grades', label: 'Exam Grades Notice', icon: GraduationCap, color: 'text-indigo-500', bg: 'hover:bg-indigo-50' },
                                        { id: 'payment', label: 'Payment Reminder', icon: Banknote, color: 'text-amber-500', bg: 'hover:bg-amber-50' }
                                    ].map((tpl) => (
                                        <button 
                                            key={tpl.id}
                                            onClick={() => generateTemplate(tpl.id as any)}
                                            className={`flex items-center justify-between px-6 md:px-8 bg-white border-2 border-gray-50 py-4 md:py-6 rounded-[16px] md:rounded-[20px] font-bold text-[#414141] transition-all hover:scale-[1.01] sm:hover:scale-[1.02] hover:shadow-2xl hover:border-transparent ${tpl.bg}`}
                                        >
                                            <span className="text-sm md:text-base lg:text-lg">{tpl.label}</span>
                                            <tpl.icon className={`h-5 w-5 md:h-7 md:w-7 ${tpl.color}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message Preview Area */}
                            {message && (
                                <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-4 duration-400 text-left">
                                    <div className="flex items-center justify-start gap-3 mb-3 md:mb-4 ml-2">
                                        <h5 className="text-base md:text-lg font-bold text-[#202020]">Message Preview</h5>
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    </div>
                                    <div className="bg-[#D1F7E2]/30 border-2 border-[#62D996]/20 rounded-[20px] md:rounded-[28px] p-5 sm:p-6 md:p-8 text-left whitespace-pre-wrap text-[#065F46] text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed shadow-xl relative group">
                                        {message}
                                        <div className="absolute top-3 right-3 md:top-4 md:right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-white/80 backdrop-blur-sm p-1.5 md:p-2 rounded-full cursor-pointer hover:bg-white transition-colors border border-green-100 shadow-xl">
                                                <ClipboardCheck className="h-4 w-4 md:h-5 text-emerald-600" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 md:mt-10 flex justify-center">
                                        <button
                                            onClick={handleSendWhatsApp}
                                            disabled={sending}
                                            className="w-full bg-[#2CC97D] hover:bg-[#25b570] text-white py-4 md:py-6 rounded-[16px] md:rounded-[24px] font-bold text-lg md:text-xl lg:text-2xl flex items-center justify-center gap-3 md:gap-5 shadow-xl md:shadow-2xl shadow-green-200/50 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {sending ? <Loader2 className="h-6 w-6 md:h-8 animate-spin" /> : <MessageCircle className="h-6 w-6 md:h-8 text-white" fill="currentColor" />}
                                            <span>Send to parent via WhatsApp</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
