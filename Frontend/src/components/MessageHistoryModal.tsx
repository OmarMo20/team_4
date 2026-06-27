import React, { useState, useEffect } from 'react';
import { X, Search, Clock, User, Calendar, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getMessages, Message } from '@/features/messages/api/messageApi';
import { getStudents } from '@/features/students/api/studentApi';
import { useDebounce } from '@/hooks';
import { useToast } from '@/components/ui/ToastProvider';

interface MessageHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MessageHistoryModal({ isOpen, onClose }: MessageHistoryModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchingStudent, setSearchingStudent] = useState(false);
    const { showToast } = useToast();
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Initial fetch of recent messages
    useEffect(() => {
        if (isOpen) {
            fetchMessages();
        }
    }, [isOpen]);

    // Search effect
    useEffect(() => {
        if (isOpen) {
            handleSearch();
        }
    }, [debouncedSearch]);

    const fetchMessages = async (studentId?: string) => {
        setLoading(true);
        try {
            const response = await getMessages(studentId);
            if (response.success) {
                setMessages(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            showToast('Failed to load message history', 'error');
        } finally {
            setLoading(false);
            setSearchingStudent(false);
        }
    };

    const handleSearch = async () => {
        if (!debouncedSearch.trim()) {
            fetchMessages();
            return;
        }

        setSearchingStudent(true);
        try {
            // First search for the student by name or code
            const studentsResponse = await getStudents(debouncedSearch);
            if (studentsResponse.success && studentsResponse.data.length > 0) {
                const student = studentsResponse.data[0];
                fetchMessages(student.id || student._id);
            } else {
                setMessages([]);
                setSearchingStudent(false);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setMessages([]);
            setSearchingStudent(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="ltr">
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-4xl bg-[#FCFCFC] rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 border border-gray-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-white text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-[#4F46E5]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#202020]">Message History</h3>
                            <p className="text-sm text-[#A1A1A1]">View history of messages sent to students</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-6 py-4 bg-white border-b border-gray-200 z-10 text-left">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by student name or code..."
                            className="w-full h-12 pl-12 pr-4 bg-[#FCFCFC] rounded-xl border border-gray-200 focus:border-[#4F46E5] focus:ring-4 focus:ring-purple-50/50 transition-all text-left placeholder:text-[#80848E]"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#80848E]" />
                        {searchingStudent && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-[#4F46E5]" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#FCFCFC] text-left">
                    {loading && !searchingStudent ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-10 w-10 text-[#4F46E5] animate-spin" />
                            <p className="text-[#80848E] font-bold">Loading messages...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                            <div className="w-20 h-20 bg-[#FCFCFC] rounded-full flex items-center justify-center border-2 border-dashed border-gray-200">
                                <MessageCircle className="h-10 w-10 text-gray-300" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-500">No Messages</h4>
                                <p className="text-sm text-[#80848E] mt-1">
                                    {searchTerm ? 'No messages found for this student' : 'No messages sent yet'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div 
                                    key={msg.id} 
                                    className="bg-white p-5 rounded-[20px] border border-gray-200 shadow-xl hover:shadow-2xl transition-shadow group animate-in slide-in-from-bottom-2 duration-500"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#F8F8FD] flex items-center justify-center border border-indigo-50">
                                                <User className="h-5 w-5 text-[#4F46E5]" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[#202020] text-base">
                                                    {msg.student?.fullName || 'Unknown student'}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-[#80848E] font-bold mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        By: {msg.sender?.name || 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FCFCFC] rounded-full border border-gray-200">
                                            <Calendar className="h-3.5 w-3.5 text-[#80848E]" />
                                            <span className="text-xs font-bold text-gray-500" dir="ltr">
                                                {formatDate(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-[#F8F8FD]/50 rounded-[16px] p-4 text-sm md:text-base text-[#414141] font-medium leading-relaxed whitespace-pre-wrap border border-indigo-50/50">
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
