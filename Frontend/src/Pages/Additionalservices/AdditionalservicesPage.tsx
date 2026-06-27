'use client';

import { useState, useEffect } from 'react';
import { Gift, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui';
import { Spinner } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { createServiceRequest, getServiceRequests, deleteServiceRequest, type ServiceRequest } from '@/features/additional-services/api/serviceApi';
import { getStudents, type Student } from '@/features/students';

export default function AdditionalservicesPage() {
    const { showToast } = useToast();
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [serviceName, setServiceName] = useState('');
    const [price, setPrice] = useState<string>('');
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    const [search, setSearch] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search && !selectedStudent) fetchStudents();
            else setStudents([]);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, selectedStudent]);

    const fetchRequests = async () => {
        try {
            const res = await getServiceRequests();
            setRequests(res.data);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        setStudentsLoading(true);
        try {
            const res = await getStudents(search);
            setStudents(res.data);
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setStudentsLoading(false);
        }
    };

    const handleAddService = async () => {
        if (!selectedStudent) {
            showToast('Please select a student first', 'error');
            return;
        }
        if (!serviceName || !price) {
            showToast('Please enter service name and price', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await createServiceRequest({
                studentId: selectedStudent.id || selectedStudent._id!,
                serviceName,
                price: parseFloat(price),
            });
            showToast('Service added successfully', 'success');
            setServiceName('');
            setPrice('');
            setSelectedStudent(null);
            setSearch('');
            setStudents([]);
            fetchRequests();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to add service', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) {
            return;
        }

        setDeletingId(id);
        try {
            await deleteServiceRequest(id);
            showToast('Service deleted successfully', 'success');
            fetchRequests();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to delete service', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 text-left" dir="ltr">
            {/* Page Header */}
            <div className="text-left space-y-1">
                <h3 className="text-2xl font-bold text-[#202020]">Dashboard</h3>
                <p className="text-sm text-[#A1A1A1]">Student and attendance management</p>
            </div>
            <div className="h-[1px] bg-[#E2E2E2] w-full" />

            {/* Title & Subtitle */}
            <div className="text-left">
                <h2 className="text-3xl font-bold text-[#202020] mb-2">Additional Services</h2>
                <p className="text-[#A1A1A1] text-sm">Add reviews, booklets, and additional services for students</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Add Form */}
                <div className="lg:col-span-4 lg:order-1">
                    <div className="bg-white rounded-[12px] border border-[#E2E2E2] p-8 shadow-none">
                        <div className="flex items-center gap-2 mb-6">
                            <Plus className="h-5 w-5 text-[#1E1F22]" />
                            <h3 className="text-xl font-bold text-[#202020]">Add New Service</h3>
                        </div>

                        <div className="space-y-6">
                            {/* Student Search */}
                            <div>
                                <label className="block text-left text-sm font-bold text-[#202020] mb-2">Search for Student</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Enter student code"
                                        className="w-full bg-white border border-[#E2E2E2] rounded-[8px] py-3 pl-10 pr-4 text-left text-sm focus:outline-none focus:border-gray-200 transition-all"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            if (selectedStudent) setSelectedStudent(null);
                                        }}
                                    />
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-[#B8B8B8]" />
                                    </div>
                                </div>
                                
                                {/* Student Search Results */}
                                {search && !selectedStudent && (
                                    <div className="mt-2 bg-white border border-[#E2E2E2] rounded-[8px] overflow-hidden shadow-lg max-h-[200px] overflow-y-auto z-10">
                                        {studentsLoading ? (
                                            <div className="p-4 flex justify-center"><Spinner /></div>
                                        ) : students.length > 0 ? (
                                            students.map((student) => (
                                                <button
                                                    key={student.id || student._id}
                                                    onClick={() => {
                                                        setSelectedStudent(student);
                                                        setSearch(student.fullName);
                                                        setStudents([]);
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-[#F2EEFF] transition-all border-b border-[#F5F5F5] last:border-none"
                                                >
                                                    <div className="font-bold text-[#414141] text-sm">{student.fullName}</div>
                                                    <div className="text-[11px] text-[#A1A1A1]">{student.grade}</div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-sm text-[#A1A1A1]">No results found</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Service Name */}
                            <div>
                                <label className="block text-left text-sm font-bold text-[#202020] mb-2">Service Type</label>
                                <input
                                    type="text"
                                    placeholder="Enter service name"
                                    className="w-full bg-white border border-[#E2E2E2] rounded-[8px] py-3 px-4 text-left text-sm focus:outline-none focus:border-gray-200 transition-all"
                                    value={serviceName}
                                    onChange={(e) => setServiceName(e.target.value)}
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-left text-sm font-bold text-[#202020] mb-2">Price</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-white border border-[#E2E2E2] rounded-[8px] py-3 pl-4 pr-16 text-left text-sm focus:outline-none focus:border-gray-200 transition-all"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#A1A1A1] text-sm">
                                        EGP
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleAddService}
                                disabled={submitting}
                                className="w-full bg-white text-white py-3 rounded-[8px] font-bold hover:bg-[#4a238b] transition-all shadow-none active:scale-95 disabled:opacity-50 disabled:scale-100 mt-4"
                            >
                                {submitting ? 'Adding...' : 'Add Service'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Left Side: Services List */}
                <div className="lg:col-span-8 lg:order-2 bg-white rounded-[12px] border border-[#E2E2E2] p-8 shadow-none min-h-[500px] flex flex-col text-left">
                    {requests.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <EmptyState
                                icon={Gift}
                                title="No services registered"
                                description="Add a new service to start tracking additional services for students"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col text-left">
                            <div className="flex items-center gap-3 mb-6">
                                <Gift className="h-5 w-5 text-[#1E1F22]" />
                                <h3 className="text-xl font-bold text-[#202020]">Recently Registered Services</h3>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1 custom-scrollbar">
                                {requests.map((request) => (
                                    <div key={request.id || request._id} className="flex items-center justify-between p-4 bg-[#F5F5F5] rounded-[8px] border border-transparent hover:border-[#F2EEFF] transition-all">
                                        <div className="text-left flex-1">
                                            <div className="font-bold text-[#414141] text-sm">{(request.student as any)?.fullName || 'Deleted student'}</div>
                                            <div className="text-xs text-[#A1A1A1]">{(request.service as any)?.name || 'Undefined service'}</div>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="font-bold text-[#1E1F22] text-sm">{(request.service as any)?.price || 0} EGP</div>
                                                <div className="text-[10px] text-[#A1A1A1]">{new Date(request.createdAt).toLocaleDateString('en-US')}</div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteService(request.id || request._id!)}
                                                disabled={deletingId === (request.id || request._id!)}
                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-[8px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete Service"
                                            >
                                                {deletingId === (request.id || request._id!) ? (
                                                    <Spinner size="sm" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
