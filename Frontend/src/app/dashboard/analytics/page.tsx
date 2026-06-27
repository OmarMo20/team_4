'use client';

import { useAuth } from '@/hooks/useAuth';
import { Users, ClipboardCheck, Banknote, UserPlus, GraduationCap, UserCog, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/features/dashboard/api/dashboardApi';
import { getRecentAttendance } from '@/features/sessions/api/sessionApi';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
    counts: {
        totalStudents: number;
        newStudents: number;
        expectedIncome: number;
        collectedIncome: number;
    };
    charts: {
        attendance: { date: string; present: number; absent: number }[];
        financial: { name: string; value: number; color: string }[];
        exams: { name: string; average: number; fullMark: number; percentage: number }[];
    };
}

interface AttendanceRecord {
    id: string;
    code: string;
    name: string;
    checkIn: string;
    checkOut: string;
    status: string;
}

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // 1. Fetch Dashboard Stats
                const statsData = await getDashboardStats();

                if (statsData.success) {
                    setStats(statsData.data);
                }

                // 2. Fetch Recent Attendance
                const attendanceRes = await getRecentAttendance(5);
                setAttendanceRecords(attendanceRes.data || []);

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-indigo-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 animate-pulse">Loading data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 text-left" dir="ltr">
            {/* Header section with Greeting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                     <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Analytics & Statistics</h1>
                     <p className="text-gray-500 mt-1">A comprehensive view of your students' and groups' performance</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl shadow-xl border border-gray-200 text-sm font-medium text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    {today}
                </div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                {/* Students Card */}
                <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow relative overflow-hidden group">
                     <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                     <div className="relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                                <Users size={24} />
                            </div>
                            {stats?.counts.newStudents ? (
                                <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                    <TrendingUp size={14} className="mr-1" />
                                    +{stats.counts.newStudents} new
                                </span>
                            ) : null}
                        </div>
                        <div className="text-3xl font-black text-gray-900 mb-1">{stats?.counts.totalStudents}</div>
                        <div className="text-sm font-medium text-gray-500">Total Students</div>
                     </div>
                </div>

                {/* Expected Income */}
                <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow relative overflow-hidden group">
                     <div className="absolute right-0 top-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                     <div className="relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-green-100 rounded-2xl text-green-600">
                                <Banknote size={24} />
                            </div>
                        </div>
                         <div className="text-3xl font-black text-gray-900 mb-1">{stats?.counts.expectedIncome} <span className="text-sm text-[#80848E] font-normal">EGP</span></div>
                        <div className="text-sm font-medium text-gray-500">Expected Income (Monthly)</div>
                     </div>
                </div>

                 {/* Collected Income */}
                 <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow relative overflow-hidden group">
                     <div className="absolute right-0 top-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                     <div className="relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                                <TrendingUp size={24} />
                            </div>
                            <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                {stats && stats.counts.expectedIncome > 0 ? Math.round((stats.counts.collectedIncome / stats.counts.expectedIncome) * 100) : 0}%
                            </span>
                        </div>
                         <div className="text-3xl font-black text-gray-900 mb-1">{stats?.counts.collectedIncome} <span className="text-sm text-[#80848E] font-normal">EGP</span></div>
                        <div className="text-sm font-medium text-gray-500">Collected Income</div>
                     </div>
                </div>

                {/* Exams Avg */}
                <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow relative overflow-hidden group">
                     <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                     <div className="relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                                <GraduationCap size={24} />
                            </div>
                        </div>
                         <div className="text-3xl font-black text-gray-900 mb-1">
                            {stats && stats.charts.exams.length > 0 ? stats.charts.exams[0].percentage : 0}%
                         </div>
                        <div className="text-sm font-medium text-gray-500">Last Exam Average</div>
                     </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                {/* Attendance Chart (Bar) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-900">Attendance Stats (Last 7 Days)</h3>
                    </div>
                    <div className="h-[300px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.charts.attendance}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                                <Tooltip 
                                    cursor={{fill: '#F3F4F6'}}
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                />
                                <Legend />
                                <Bar dataKey="present" name="Present" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                                <Bar dataKey="absent" name="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Financial Chart (Pie) */}
                <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-900">Financial Overview</h3>
                    </div>
                    <div className="h-[300px] w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.charts.financial.map(item => ({
                                        ...item,
                                        name: (item.name === 'Paid' || item.name === 'المدفوع') ? 'Paid' : (item.name === 'Remaining' || item.name === 'المتبقي') ? 'Remaining' : item.name
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats?.charts.financial.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center pt-4">
                                <div className="text-sm text-[#80848E] font-medium">Total</div>
                                <div className="text-lg font-bold text-gray-900">{stats?.counts.expectedIncome}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exams Performance (Line) */}
                <div className="lg:col-span-3 bg-white p-6 rounded-3xl shadow-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-900">Exam Performance (Last 5 Exams)</h3>
                    </div>
                    <div className="h-[300px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.charts.exams}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="percentage" 
                                    name="Average Percentage %" 
                                    stroke="#8B5CF6" 
                                    strokeWidth={4} 
                                    dot={{r: 4, strokeWidth: 2, fill: '#fff'}} 
                                    activeDot={{r: 6}} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
