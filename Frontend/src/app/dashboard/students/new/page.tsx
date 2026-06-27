'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, GraduationCap, MapPin, Wallet } from 'lucide-react';

export default function AddStudentPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        // Student Information
        studentName: '',
        studentPhone: '',
        email: '',

        // Parent Information
        parentPhone: '',

        // Academic Details
        grade: '',

        // Schedule and Location
        center: '',
        schedule: '',

        // Financial Information
        monthlyFee: '',
        paidUntil: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const { createStudent } = await import('@/features/students/api/studentApi');
            
            const response = await createStudent({
                fullName: formData.studentName,
                studentPhone: formData.studentPhone,
                parentPhone: formData.parentPhone,
                grade: formData.grade,
                center: formData.center,
                schedule: formData.schedule,
                monthlyFee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : undefined,
                email: formData.email,
            });

            if (response.success) {
                alert(`Student created successfully!\nStudent Code: ${response.data.studentCode || response.data.nationalId}\nPassword: ${(response.data as any).password || 'Created'}`);
                router.push('/dashboard/students');
            }
        } catch (error: any) {
            console.error('Error creating student:', error);
            alert(error.response?.data?.message || 'An error occurred while creating the student');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputChangeElement>) => {
        const { name, value, type, checked } = e.target as any;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div className="space-y-6 text-left" dir="ltr">
            {/* Page Title */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Student</h2>
                <p className="text-gray-500 text-sm">Add student details to generate a unique code</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Student Information */}
                <div className="bg-white rounded-2xl p-6 border-2 border-black/5 shadow-2xl shadow-black/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100">
                            <User className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Student Details</h3>
                            <p className="text-sm text-gray-500">Basic student information</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Student Full Name
                            </label>
                            <input
                                type="text"
                                name="studentName"
                                value={formData.studentName}
                                onChange={handleInputChange}
                                placeholder="Enter student's full name"
                                className="w-full px-4 py-3 border border-[#35373C] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Student Phone
                            </label>
                            <input
                                type="tel"
                                name="studentPhone"
                                value={formData.studentPhone}
                                onChange={handleInputChange}
                                placeholder="xxxxxxxxxxx"
                                className="w-full px-4 py-3 border border-[#35373C] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="example@email.com"
                                className="w-full px-4 py-3 border border-[#35373C] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Parent Information */}
                <div className="bg-white rounded-2xl p-6 border-2 border-black/5 shadow-2xl shadow-black/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100">
                            <Phone className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Parent Information</h3>
                            <p className="text-sm text-gray-500">Parent contact details</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Parent Phone
                        </label>
                        <input
                            type="tel"
                            name="parentPhone"
                            value={formData.parentPhone}
                            onChange={handleInputChange}
                            placeholder="xxxxxxxxxxx"
                            className="w-full px-4 py-3 border border-[#35373C] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Academic Details */}
                <div className="bg-white rounded-2xl p-6 border-2 border-black/5 shadow-2xl shadow-black/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100">
                            <GraduationCap className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Academic Details</h3>
                            <p className="text-sm text-gray-500">Academic grade and details</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Grade
                        </label>
                        <input
                            type="text"
                            name="grade"
                            value={formData.grade}
                            onChange={handleInputChange}
                            placeholder="Enter student's grade"
                            className="w-full px-4 py-3 border border-[#35373C] rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            required
                        />
                    </div>
                </div>

                {/* Schedule and Location */}
                <div className="bg-white rounded-2xl p-6 border-2 border-black/5 shadow-2xl shadow-black/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-100">
                            <MapPin className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Center & Schedule</h3>
                            <p className="text-sm text-gray-500">Learning center location and timings</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Center
                            </label>
                            <input
                                type="text"
                                name="center"
                                value={formData.center}
                                onChange={handleInputChange}
                                placeholder="Enter center"
                                className="w-full px-4 py-3 border border-[#35373C] rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Schedule
                            </label>
                            <input
                                type="text"
                                name="schedule"
                                value={formData.schedule}
                                onChange={handleInputChange}
                                placeholder="Enter schedule"
                                className="w-full px-4 py-3 border border-[#35373C] rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Financial Information */}
                <div className="bg-white rounded-2xl p-6 border-2 border-black/5 shadow-2xl shadow-black/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100">
                            <Wallet className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Financial Information</h3>
                            <p className="text-sm text-gray-500">Monthly subscription and payment status</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monthly Fee (EGP)
                            </label>
                            <input
                                type="number"
                                name="monthlyFee"
                                value={formData.monthlyFee}
                                onChange={handleInputChange}
                                placeholder="Enter monthly fee (optional)"
                                className="w-full px-4 py-3 border border-[#35373C] rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                min="0"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="paidUntil"
                                id="paidUntil"
                                checked={formData.paidUntil}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-indigo-600 border-[#35373C] rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="paidUntil" className="text-sm text-gray-700">
                                Month Paid
                            </label>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div>
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-2xl flex items-center gap-2"
                    >
                        <User className="h-5 w-5" />
                        Add Student
                    </button>
                </div>
            </form>
        </div>
    );
}
