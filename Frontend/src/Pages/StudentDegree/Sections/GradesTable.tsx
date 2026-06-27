import { useState } from 'react';
import { Search, Calendar, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

interface GradesTableProps {
    results: any[];
    loading?: boolean;
    onSearch?: (code: string) => void;
    onEdit?: (result: any) => void;
    onDelete?: (id: string) => void;
    pagination?: PaginationInfo;
    onPageChange?: (page: number) => void;
}

export default function GradesTable({ results, loading, onSearch, onEdit, onDelete, pagination, onPageChange }: GradesTableProps) {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');

    const safeResults = results || [];
    const filteredResults = safeResults.filter(result => 
        result.studentCode?.toString().includes(searchQuery) ||
        result.studentName?.includes(searchQuery)
    );

    const handleSearchCheck = () => {
        if (searchQuery && filteredResults.length === 0) {
            showToast('No student found with this code or name', 'error');
        }
    };

    if (loading) {
        return <div className="animate-pulse h-64 bg-white rounded-3xl border border-gray-200" />;
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden text-left" dir="ltr">
            {/* Table Header with Search */}
            <div className="px-6 py-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-2xl">
                        <Calendar className="h-6 w-6 text-indigo-500" />
                    </div>
                    <h3 className="font-bold text-xl text-gray-900">All Grades Record</h3>
                </div>
                
                <div className="relative group">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchCheck()}
                        placeholder="Enter student code" 
                        className="w-full md:w-80 pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-indigo-400 focus:ring-4 focus:ring-purple-50/50 outline-none transition-all text-left font-medium"
                    />
                    <button 
                        onClick={handleSearchCheck}
                        className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[#80848E] hover:text-indigo-600"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f8f7ff]">
                        <tr>
                            <th className="px-3 py-3 text-xs font-bold text-indigo-700 whitespace-nowrap text-left">Student Name</th>
                            <th className="px-3 py-3 text-xs font-bold text-indigo-700 text-center whitespace-nowrap">Student Code</th>
                            <th className="px-3 py-3 text-xs font-bold text-indigo-700 whitespace-nowrap min-w-[120px] text-left">Exam Name</th>
                            <th className="px-3 py-3 text-xs font-bold text-indigo-700 text-center whitespace-nowrap">Score</th>
                            <th className="px-3 py-3 text-xs font-bold text-indigo-700 text-center whitespace-nowrap">Percentage</th>
                            <th className="px-3 py-3 text-xs font-bold text-indigo-700 text-center whitespace-nowrap">Date</th>
                            <th className="px-3 py-3 text-xs font-bold text-indigo-700 whitespace-nowrap min-w-[100px] text-left">Notes</th>
                            <th className="px-3 py-3 text-xs font-bold text-indigo-700 text-center whitespace-nowrap w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredResults.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-[#80848E] font-medium">
                                    {searchQuery ? 'No matching results found' : 'No grades recorded yet'}
                                </td>
                            </tr>
                        ) : (
                            filteredResults.map((result) => (
                                <tr key={result.id} className="hover:bg-[#FCFCFC]/50 transition-colors">
                                    <td className="px-3 py-3 text-sm font-bold text-gray-900 whitespace-nowrap text-left">
                                        {result.studentName}
                                    </td>
                                    <td className="px-3 py-3 text-center text-xs font-mono font-medium text-indigo-600 bg-indigo-50/30 rounded-lg whitespace-nowrap">
                                        #{result.studentCode}
                                    </td>
                                    <td className="px-3 py-3 text-sm font-medium text-gray-500 whitespace-nowrap text-left">
                                        {result.examName}
                                    </td>
                                    <td className="px-3 py-3 text-center text-sm font-bold text-gray-700 whitespace-nowrap">
                                        {result.score}/{result.fullMark}
                                    </td>
                                    <td className="px-3 py-3 text-center whitespace-nowrap">
                                        <span className={`text-sm font-bold ${
                                            result.percentage >= 80 ? 'text-green-500' :
                                            result.percentage >= 50 ? 'text-blue-500' :
                                            'text-red-500'
                                        }`}>
                                            {result.percentage}%
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center text-xs font-medium text-gray-500 whitespace-nowrap">
                                        {new Date(result.date).toLocaleDateString('en-US')}
                                    </td>
                                    <td className="px-3 py-3 text-left text-xs font-medium text-[#80848E] max-w-[150px] truncate" title={result.notes || ''}>
                                        {result.notes || '-'}
                                    </td>
                                    <td className="px-3 py-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(result)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to delete this grade?')) {
                                                            onDelete(result.id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                    <div className="text-sm text-gray-500 font-medium">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange && onPageChange(pagination.page - 1)}
                            disabled={!pagination.hasPrevPage}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1 ${
                                pagination.hasPrevPage
                                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                    : 'bg-gray-100 text-[#80848E] cursor-not-allowed'
                            }`}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </button>
                        
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let pageNum;
                                if (pagination.totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 3) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + i;
                                } else {
                                    pageNum = pagination.page - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => onPageChange && onPageChange(pageNum)}
                                        className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                                            pagination.page === pageNum
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => onPageChange && onPageChange(pagination.page + 1)}
                            disabled={!pagination.hasNextPage}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1 ${
                                pagination.hasNextPage
                                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                    : 'bg-gray-100 text-[#80848E] cursor-not-allowed'
                            }`}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #c4b5fd;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #a78bfa;
                }
            `}</style>
        </div>
    );
}
