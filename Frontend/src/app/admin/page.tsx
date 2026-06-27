'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getTeachers, activateTeacher, deactivateTeacher, deleteTeacher, type Teacher } from '@/features/admin';
import { useToast } from '@/components/ui/ToastProvider';
import { Spinner } from '@/components/ui';
import { CheckCircle2, XCircle, Users, BookOpen, ClipboardCheck, Trash2, Power, PowerOff } from 'lucide-react';

export default function AdminPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const { showToast } = useToast();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/dashboard');
            return;
        }

        if (user?.role === 'admin') {
            fetchTeachers();
        }
    }, [user, authLoading, router]);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const response = await getTeachers();
            if (response.success) {
                setTeachers(response.data);
            }
        } catch (error: any) {
            console.error('Failed to fetch teachers:', error);
            showToast(error.response?.data?.message || 'Failed to load teachers data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (teacherId: string) => {
        try {
            setActionLoading(teacherId);
            const response = await activateTeacher(teacherId);
            if (response.success) {
                showToast('Teacher account activated successfully', 'success');
                fetchTeachers();
            }
        } catch (error: any) {
            console.error('Failed to activate teacher:', error);
            showToast(error.response?.data?.message || 'Failed to activate teacher account', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeactivate = async (teacherId: string) => {
        try {
            setActionLoading(teacherId);
            const response = await deactivateTeacher(teacherId);
            if (response.success) {
                showToast('Teacher account deactivated successfully', 'success');
                fetchTeachers();
            }
        } catch (error: any) {
            console.error('Failed to deactivate teacher:', error);
            showToast(error.response?.data?.message || 'Failed to deactivate teacher account', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (teacherId: string) => {
        if (!confirm('Are you sure you want to delete this teacher?')) {
            return;
        }

        try {
            setActionLoading(teacherId);
            const response = await deleteTeacher(teacherId);
            if (response.success) {
                showToast('Teacher deleted successfully', 'success');
                fetchTeachers();
            }
        } catch (error: any) {
            console.error('Failed to delete teacher:', error);
            showToast(error.response?.data?.message || 'Failed to delete teacher', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!user || user.role !== 'admin') {
        return null;
    }

    return (
        <div className="space-y-6" dir="ltr">
            {/* Page Header */}
            <div className="mb-6 text-left">
                <h2 className="text-2xl font-extrabold text-gray-900">Teachers Management</h2>
                <p className="text-gray-500 mt-1">Manage and activate teacher accounts</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-left">
                <div className="bg-white rounded-xl p-6 border-2 border-black/5 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Total Teachers</p>
                            <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
                        </div>
                        <Users className="h-10 w-10 text-indigo-600" />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border-2 border-black/5 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Active Teachers</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {teachers.filter(t => t.isActive).length}
                            </p>
                        </div>
                        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border-2 border-black/5 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Inactive Teachers</p>
                            <p className="text-2xl font-bold text-red-600">
                                {teachers.filter(t => !t.isActive).length}
                            </p>
                        </div>
                        <XCircle className="h-10 w-10 text-red-600" />
                    </div>
                </div>
            </div>

            {/* Teachers Table */}
            <div className="bg-white rounded-xl border-2 border-black/5 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#FCFCFC] border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Students Count</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Sessions</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Attendance</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2B2D31]">
                            {teachers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        No registered teachers
                                    </td>
                                </tr>
                            ) : (
                                teachers.map((teacher) => (
                                    <tr key={teacher.id} className="hover:bg-[#FCFCFC] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{teacher.name}</div>
                                            {teacher.subject && (
                                                <div className="text-sm text-gray-500">{teacher.subject}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">{teacher.email}</td>
                                        <td className="px-6 py-4 text-gray-700">{teacher.phone || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-[#80848E]" />
                                                <span className="font-semibold text-gray-900">{teacher.stats.studentsCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-[#80848E]" />
                                                <span className="font-semibold text-gray-900">{teacher.stats.sessionsCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <ClipboardCheck className="h-4 w-4 text-[#80848E]" />
                                                <span className="font-semibold text-gray-900">{teacher.stats.attendanceCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                    teacher.isActive
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {teacher.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {teacher.isActive ? (
                                                    <button
                                                        onClick={() => handleDeactivate(teacher.id)}
                                                        disabled={actionLoading === teacher.id}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Deactivate"
                                                    >
                                                        <PowerOff className="h-5 w-5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleActivate(teacher.id)}
                                                        disabled={actionLoading === teacher.id}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Activate"
                                                    >
                                                        <Power className="h-5 w-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(teacher.id)}
                                                    disabled={actionLoading === teacher.id}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
