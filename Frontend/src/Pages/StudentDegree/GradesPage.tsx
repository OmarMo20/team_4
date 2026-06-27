'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, LayoutGrid, BookOpen } from 'lucide-react';
import { Exam, ExamStats } from '@/types/exam';
import { examService } from '@/services/examService';
import GradesStats from './Sections/GradesStats';
import RecentGradesList from './Sections/RecentGradesList';
import GradesTable from './Sections/GradesTable';
import AddGradeModal from './Sections/AddExamModal';
import EditGradeModal from './Sections/EditGradeModal';
import { useToast } from '@/components/ui';

export default function GradesPage() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'overview' | 'table'>('overview');
    const [stats, setStats] = useState<ExamStats>({
        totalExams: 0,
        averagePercentage: 0,
        excellentCount: 0,
        totalResults: 0
    });
    const [recentGrades, setRecentGrades] = useState<any[]>([]);
    const [allResults, setAllResults] = useState<any[]>([]);
    const [searchCode, setSearchCode] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedResult, setSelectedResult] = useState<any | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
    });

    const fetchData = async (page: number = 1) => {
        try {
            setLoading(true);
            const limit = pagination.limit || 10;
            const [statsRes, recentRes, allResultsRes] = await Promise.all([
                examService.getStats(),
                examService.getRecentResults(),
                examService.getAllResults({ page, limit })
            ]);

            if (statsRes.success && statsRes.data) setStats(statsRes.data);
            if (recentRes.success && recentRes.data) setRecentGrades(recentRes.data);
            if (allResultsRes.success) {
                if (allResultsRes.data) setAllResults(allResultsRes.data);
                if (allResultsRes.total !== undefined) {
                    setPagination({
                        page: allResultsRes.page || page,
                        limit: allResultsRes.limit || limit,
                        total: allResultsRes.total || 0,
                        totalPages: allResultsRes.totalPages || 0,
                        hasNextPage: allResultsRes.hasNextPage || false,
                        hasPrevPage: allResultsRes.hasPrevPage || false
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching grades data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(1);
    }, []);

    const handleSearch = async (code: string, page: number = 1) => {
        setSearchCode(code);

        if (!code.trim()) {
            setViewMode('overview');
            fetchData(1);
            return;
        }

        try {
            setLoading(true);
            const limit = pagination.limit || 10;
            const res = await examService.getAllResults({ 
                studentCode: code, 
                page, 
                limit 
            });
            if (res.success) {
                if (res.data) setAllResults(res.data);
                if (res.total !== undefined) {
                    setPagination({
                        page: res.page || page,
                        limit: res.limit || limit,
                        total: res.total || 0,
                        totalPages: res.totalPages || 0,
                        hasNextPage: res.hasNextPage || false,
                        hasPrevPage: res.hasPrevPage || false
                    });
                }
                setViewMode('table');
            }
        } catch (error) {
            console.error('Error searching results:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (searchCode.trim()) {
            handleSearch(searchCode, newPage);
        } else {
            fetchData(newPage);
        }
    };

    const handleAddGrade = async (data: any) => {
        try {
            const res = await examService.addSingleResult(data);
            if (res.success) {
                fetchData(pagination.page);
                setIsAddModalOpen(false);
            }
        } catch (error) {
            console.error('Error saving grade:', error);
            throw error;
        }
    };

    const handleEditGrade = (result: any) => {
        setSelectedResult(result);
        setIsEditModalOpen(true);
    };

    const handleUpdateGrade = async () => {
        await fetchData(pagination.page);
        setIsEditModalOpen(false);
        setSelectedResult(null);
    };

    const handleDeleteGrade = async (id: string) => {
        try {
            const res = await examService.deleteResult(id);
            if (res.success) {
                showToast('Grade deleted successfully', 'success');
                fetchData(pagination.page);
            }
        } catch (error: any) {
            console.error('Error deleting grade:', error);
            const message = error.response?.data?.message || 'An error occurred while deleting the grade';
            showToast(message, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-[#fcfcfc] p-4 md:p-4 lg:p-6 space-y-4 md:space-y-6 text-left" dir="ltr">
            {/* Title & Subtitle */}
            <div className="text-left space-y-2 md:space-y-3">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">Comprehensive Reports</h1>
                <p className="text-gray-500 text-sm md:text-base font-medium">
                    Review comprehensive student reports - attendance, payments, and grades
                </p>
            </div>

            <div className="h-px bg-gray-200 w-full lg:opacity-10 lg:bg-[#414141] my-4 md:my-6" />

            {/* Stats Cards */}
            <GradesStats stats={stats} loading={loading} />

            {/* Toggle View & Add Button */}
            <div className="flex flex-col sm:flex-row justify-start gap-4 pt-4">
                <div className="bg-gray-100 p-1.5 rounded-2xl flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-white text-gray-900 px-6 md:px-8 py-3 md:py-3.5 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 text-base md:text-lg flex-1 sm:flex-none"
                    >
                        <Plus className="h-5 w-5 text-indigo-600" />
                        <span>Add Grade</span>
                    </button>
                    <button
                        onClick={() => setViewMode(viewMode === 'overview' ? 'table' : 'overview')}
                        className={`px-6 md:px-8 py-3 md:py-3.5 rounded-[1.8rem] font-bold transition-all flex items-center justify-center gap-2 text-base md:text-lg flex-1 sm:flex-none ${viewMode === 'table' ? 'bg-white shadow-xl text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <BookOpen className="h-5 w-5" />
                        <span>{viewMode === 'overview' ? 'Show Tables' : 'Show Statistics'}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-12 order-2 lg:order-1 text-left">
                    {viewMode === 'overview' ? (
                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-200 p-6 md:p-10 shadow-xl space-y-6 text-left">
                            <div className="flex items-center justify-start gap-2 mb-2">
                                <Search className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Search for Student</h2>
                            </div>

                            <div className="relative w-full border border-gray-200 rounded-[1.5rem] md:rounded-[2rem] p-2 md:p-3 flex flex-col md:flex-row items-stretch md:items-center gap-2">
                                <input
                                    type="text"
                                    value={searchCode}
                                    onChange={(e) => setSearchCode(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchCode)}
                                    placeholder="Enter student code"
                                    className="flex-1 bg-transparent px-4 md:px-6 py-3 md:py-4 text-left text-lg md:text-xl font-medium outline-none placeholder:text-gray-300 order-1 md:order-1"
                                />
                                <button
                                    onClick={() => handleSearch(searchCode)}
                                    className="bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold px-8 md:px-10 py-3.5 md:py-4 rounded-xl md:rounded-[1.5rem] transition-all text-lg md:text-xl order-2 md:order-2"
                                >
                                    Search
                                </button>
                            </div>
                        </div>
                    ) : (
                        <GradesTable
                            results={allResults}
                            loading={loading}
                            onSearch={handleSearch}
                            onEdit={handleEditGrade}
                            onDelete={handleDeleteGrade}
                            pagination={pagination}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddGradeModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddGrade}
            />
            <EditGradeModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedResult(null);
                }}
                onSuccess={handleUpdateGrade}
                result={selectedResult}
            />
        </div>
    );
}
