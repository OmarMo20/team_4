import { useState, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { getStudents, Student } from '@/features/students';
import { Spinner } from './ui';

interface StudentSearchListProps {
    onSelect: (student: Student) => void;
    selectedId?: string;
    showCodeOnly?: boolean;
}

export default function StudentSearchList({ onSelect, selectedId, showCodeOnly = false }: StudentSearchListProps) {
    const [search, setSearch] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!search.trim()) {
            setStudents([]);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            fetchStudents();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const fetchStudents = async () => {
        if (!search.trim()) {
            setStudents([]);
            return;
        }
        
        setLoading(true);
        try {
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            
            if (isOffline) {
                // Use cached data for offline search
                const { searchStudentsInCache } = await import('@/lib/students-cache');
                const filtered = searchStudentsInCache(search);
                setStudents(filtered);
            } else {
                const res = await getStudents(search);
                setStudents(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch students:', error);
            // Try to use cache as fallback
            try {
                const { searchStudentsInCache } = await import('@/lib/students-cache');
                const filtered = searchStudentsInCache(search);
                setStudents(filtered);
            } catch (cacheError) {
                console.error('Failed to load from cache:', cacheError);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-[24px] border border-[#E2E2E2] p-8 shadow-xl overflow-hidden text-left" dir="ltr">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-indigo-50 p-2.5 rounded-2xl">
                    <User className="h-6 w-6 text-[#4F46E5]" />
                </div>
                <h3 className="text-2xl font-bold text-[#202020]">Select Student</h3>
            </div>

            <div className="relative mb-6">
                <input
                    type="text"
                    placeholder="Enter student code"
                    className="w-full bg-white border border-[#E2E2E2] rounded-[14px] py-4 pl-12 pr-6 text-left text-base focus:outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-purple-50 transition-all placeholder:text-[#BBB]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-6 w-6 text-[#A1A1A1]" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {!search.trim() ? (
                    <div className="text-center py-12 text-[#A1A1A1] text-base">
                        Search for a student by entering student code
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-12">
                        <Spinner />
                    </div>
                ) : students.length > 0 ? (
                    students.map((student) => {
                        const isSelected = selectedId === student.id || selectedId === student._id;
                        return (
                            <button
                                key={student.id || student._id}
                                onClick={() => onSelect(student)}
                                className={`w-full text-left p-6 rounded-[18px] transition-all duration-300 group relative ${
                                    isSelected
                                        ? 'bg-[#4F46E5] shadow-xl shadow-purple-600/20 translate-y-[-2px]'
                                        : 'bg-[#F9F9FB] hover:bg-[#F0F0F7] border border-transparent hover:border-indigo-100'
                                }`}
                            >
                                <div className={`font-bold text-lg md:text-xl mb-1 transition-colors ${
                                    isSelected ? 'text-white' : 'text-[#2D2D2D]'
                                }`}>
                                    {student.fullName}
                                </div>
                                <div className={`text-sm md:text-base font-bold transition-colors ${
                                    isSelected ? 'text-indigo-100' : 'text-[#888]'
                                }`}>
                                    {student.grade}
                                </div>
                                {isSelected && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white animate-pulse" />
                                )}
                            </button>
                        );
                    })
                ) : (
                    <div className="text-center py-12 text-[#A1A1A1] text-base">
                        No students found for this search
                    </div>
                )}
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #EEE;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #DDD;
                }
            `}</style>
        </div>
    );
}
