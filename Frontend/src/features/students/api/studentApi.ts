import api from '@/lib/api';

export interface CreateStudentData {
    fullName: string;
    studentPhone?: string;
    parentPhone?: string;
    grade: string;
    center?: string;
    schedule?: string;
    monthlyFee?: number;
    paidUntil?: boolean;
    email?: string;
}

export interface Student {
    id: string;
    _id?: string;
    fullName: string;
    grade: string;
    studentPhone?: string;
    parentPhone?: string;
    classroom?: string;
    monthlyFee: number;
    status: 'active' | 'inactive' | 'graduated' | 'transferred';
    nationalId?: string;
    studentCode?: string;
    qrToken?: string;
    createdAt: string;
    updatedAt: string;
}

/** POST /students may return a one-time portal password alongside the student record */
export type StudentCreated = Student & { password?: string };

export interface StudentSummary {
    student: {
        id: string;
        fullName: string;
        nationalId?: string;
        parentPhone?: string;
    };
    attendance: {
        status: string;
        time: string;
        session: string;
    } | null;
    latestExam: {
        title: string;
        score: number;
        fullMark: number;
        status: string;
        date: string;
    } | null;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface StudentsResponse {
    success: boolean;
    count: number;
    data: Student[];
}

const STUDENT_ENDPOINTS = {
    STUDENTS: '/students'
};

/**
 * Create multiple students in batch
 */
export async function createStudentsBatch(students: CreateStudentData[]): Promise<ApiResponse<{
    success: Student[];
    failed: Array<{ student: CreateStudentData; error: string }>;
    summary: { total: number; succeeded: number; failed: number };
}>> {
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
    
    if (isOffline) {
        // In offline mode, create temporary students
        const tempStudents: Student[] = [];
        const failed: Array<{ student: CreateStudentData; error: string }> = [];
        
        for (const data of students) {
            if (!data.fullName || !data.grade) {
                failed.push({
                    student: data,
                    error: 'Student name and grade are required'
                });
                continue;
            }
            
            const tempStudent: Student = {
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...data,
                fullName: data.fullName,
                grade: data.grade,
                monthlyFee: data.monthlyFee || 0,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            tempStudents.push(tempStudent);
        }
        
        // Add all to cache
        const { addStudentToCache } = await import('@/lib/students-cache');
        tempStudents.forEach(student => addStudentToCache(student));
        
        return {
            success: true,
            message: `Successfully created ${tempStudents.length} students offline${failed.length > 0 ? `, failed ${failed.length} students` : ''}`,
            data: {
                success: tempStudents,
                failed,
                summary: {
                    total: students.length,
                    succeeded: tempStudents.length,
                    failed: failed.length
                }
            }
        };
    }
    
    const response = await api.post<ApiResponse<{
        success: Student[];
        failed: Array<{ student: CreateStudentData; error: string }>;
        summary: { total: number; succeeded: number; failed: number };
    }>>(`${STUDENT_ENDPOINTS.STUDENTS}/batch`, { students });
    
    // Add successful students to cache
    if (response.data.data && response.data.data.success) {
        const { addStudentToCache } = await import('@/lib/students-cache');
        response.data.data.success.forEach(student => addStudentToCache(student));
    }
    
    return response.data;
}

/**
 * Create new student
 */
export async function createStudent(data: CreateStudentData): Promise<ApiResponse<StudentCreated>> {
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
    
    if (isOffline) {
        // Create temporary student for offline
        const tempStudent: Student = {
            id: `temp_${Date.now()}`,
            _id: `temp_${Date.now()}`,
            ...data,
            fullName: data.fullName,
            grade: data.grade,
            monthlyFee: data.monthlyFee || 0,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        
        // Add to cache
        const { addStudentToCache } = await import('@/lib/students-cache');
        addStudentToCache(tempStudent);
        
        return {
            success: true,
            message: 'Student created offline. Will be synced when online.',
            data: tempStudent,
        };
    }
    
    const response = await api.post<ApiResponse<StudentCreated>>(STUDENT_ENDPOINTS.STUDENTS, data);
    
    // Add to cache
    if (response.data.data) {
        const { addStudentToCache } = await import('@/lib/students-cache');
        addStudentToCache(response.data.data);
    }
    
    return response.data;
}

/**
 * Get all students
 */
export async function getStudents(search?: string): Promise<StudentsResponse> {
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
    
    // In offline mode, use cached data
    if (isOffline) {
        const { searchStudentsInCache, getStudentsFromCache } = await import('@/lib/students-cache');
        
        if (search) {
            const filtered = searchStudentsInCache(search);
            return {
                success: true,
                count: filtered.length,
                data: filtered,
            };
        } else {
            const all = getStudentsFromCache();
            return {
                success: true,
                count: all.length,
                data: all,
            };
        }
    }
    
    // Online mode: fetch from server
    const params = search ? { search } : {};
    const response = await api.get<StudentsResponse>(STUDENT_ENDPOINTS.STUDENTS, { params });
    
    // If no search query, save all students to cache
    if (!search && response.data.data) {
        const { saveStudentsToCache } = await import('@/lib/students-cache');
        saveStudentsToCache(response.data.data);
    }
    
    return response.data;
}

/**
 * Get single student by ID
 */
export async function getStudentById(id: string): Promise<ApiResponse<Student>> {
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
    
    // In offline mode, use cached data
    if (isOffline) {
        const { getStudentByIdFromCache } = await import('@/lib/students-cache');
        const student = getStudentByIdFromCache(id);
        
        if (student) {
            return {
                success: true,
                message: 'Student loaded from cache',
                data: student,
            };
        } else {
            throw new Error('Student not found in cache');
        }
    }
    
    // Online mode: fetch from server
    const response = await api.get<ApiResponse<Student>>(`${STUDENT_ENDPOINTS.STUDENTS}/${id}`);
    
    // Update cache with this student
    if (response.data.data) {
        const { updateStudentInCache } = await import('@/lib/students-cache');
        updateStudentInCache(response.data.data);
    }
    
    return response.data;
}

/**
 * Update student
 */
export async function updateStudent(id: string, data: Partial<CreateStudentData>): Promise<ApiResponse<Student>> {
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
    
    if (isOffline) {
        // Update in cache
        const { getStudentByIdFromCache, updateStudentInCache } = await import('@/lib/students-cache');
        const student = getStudentByIdFromCache(id);
        
        if (student) {
            const updated = { ...student, ...data, updatedAt: new Date().toISOString() };
            updateStudentInCache(updated);
            
            return {
                success: true,
                message: 'Student updated offline. Will be synced when online.',
                data: updated,
            };
        } else {
            throw new Error('Student not found in cache');
        }
    }
    
    const response = await api.put<ApiResponse<Student>>(`${STUDENT_ENDPOINTS.STUDENTS}/${id}`, data);
    
    // Update cache
    if (response.data.data) {
        const { updateStudentInCache } = await import('@/lib/students-cache');
        updateStudentInCache(response.data.data);
    }
    
    return response.data;
}

/**
 * Delete student
 */
export async function deleteStudent(id: string): Promise<ApiResponse<void>> {
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
    
    if (isOffline) {
        // Remove from cache
        const { removeStudentFromCache } = await import('@/lib/students-cache');
        removeStudentFromCache(id);
        
        return {
            success: true,
            message: 'Student deleted offline. Will be synced when online.',
            data: undefined as any,
        };
    }
    
    const response = await api.delete<ApiResponse<void>>(`${STUDENT_ENDPOINTS.STUDENTS}/${id}`);
    
    // Remove from cache
    const { removeStudentFromCache } = await import('@/lib/students-cache');
    removeStudentFromCache(id);
    
    return response.data;
}

/**
 * Get student summary (Today attendance & Latest Quiz)
 */
export async function getStudentSummary(id: string): Promise<ApiResponse<StudentSummary>> {
    const response = await api.get<ApiResponse<StudentSummary>>(`${STUDENT_ENDPOINTS.STUDENTS}/${id}/summary`);
    return response.data;
}
