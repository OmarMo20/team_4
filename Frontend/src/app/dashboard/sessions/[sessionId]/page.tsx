'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    getSessionById,
    updateSessionStatus,
    endSession,
    addStudentToSession,
    getSessionAttendance,
    removeStudentFromSession,
    updateAttendanceStatus,
} from '@/features/sessions';
import type { Session } from '@/features/sessions';
import type { SessionAttendance } from '@/features/sessions';
import { Spinner, useToast } from '@/components/ui';
import { Users, DollarSign, ChevronRight, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanAttendance } from '@/features/attendance';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { queueAction, syncPendingActions, getSessionPendingActions } from '@/lib/offline-sync';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function SessionControlPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = (params?.sessionId as string) || '';
    const { showToast } = useToast();
    const { user } = useAuth();
    const isAssistant = user?.role === 'assistant';
    const isMobile = useIsMobile();

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [studentSearch, setStudentSearch] = useState('');
    const [attendanceCount, setAttendanceCount] = useState(0);
    const [attendances, setAttendances] = useState<SessionAttendance[]>([]);
    const [addingStudent, setAddingStudent] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [scanState, setScanState] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle');
    const [selectedAttendance, setSelectedAttendance] = useState<SessionAttendance | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<{ token: string; at: number } | null>(null);
    const cooldownRef = useRef<number>(0);
    const regionId = 'qr-reader-session';

    // Helper function to save attendances to localStorage (especially for temp sessions)
    const saveAttendancesToCache = (attendancesList: SessionAttendance[]) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(`session_${sessionId}_attendances`, JSON.stringify(attendancesList));
            localStorage.setItem(`session_${sessionId}_cache_time`, Date.now().toString());
        } catch (storageError) {
            console.warn('Failed to save attendances to cache:', storageError);
        }
    };

    // Helper function to save session data to localStorage (for mobile offline support)
    const saveSessionToCache = (sessionData: Session | null) => {
        if (typeof window === 'undefined' || !sessionData) return;
        try {
            localStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));
            localStorage.setItem(`session_${sessionId}_cache_time`, Date.now().toString());
        } catch (storageError) {
            console.warn('Failed to save session to cache:', storageError);
        }
    };

    // Optimized cache save (using requestIdleCallback for better performance)
    const saveCacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const saveToCacheOptimized = (attendancesList: SessionAttendance[], sessionData?: Session | null) => {
        if (typeof window === 'undefined') return;
        
        // Clear previous timeout
        if (saveCacheTimeoutRef.current) {
            clearTimeout(saveCacheTimeoutRef.current);
        }
        
        // Use requestIdleCallback if available, otherwise use setTimeout
        const saveToCache = () => {
            try {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => {
                        try {
                            if (attendancesList) {
                                localStorage.setItem(`session_${sessionId}_attendances`, JSON.stringify(attendancesList));
                            }
                            if (sessionData) {
                                localStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));
                            }
                            localStorage.setItem(`session_${sessionId}_cache_time`, Date.now().toString());
                        } catch (storageError) {
                            console.warn('Failed to save to cache:', storageError);
                        }
                    }, { timeout: 1000 });
                } else {
                    setTimeout(() => {
                        try {
                            if (attendancesList) {
                                localStorage.setItem(`session_${sessionId}_attendances`, JSON.stringify(attendancesList));
                            }
                            if (sessionData) {
                                localStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));
                            }
                            localStorage.setItem(`session_${sessionId}_cache_time`, Date.now().toString());
                        } catch (storageError) {
                            console.warn('Failed to save to cache:', storageError);
                        }
                    }, 0);
                }
            } catch (error) {
                // Silent fail - don't block UI
            }
        };
        
        saveCacheTimeoutRef.current = setTimeout(saveToCache, 300);
    };

    // Auto-save to cache when data changes
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!sessionId || !session) return;

        saveToCacheOptimized(attendances, session);

        return () => {
            if (saveCacheTimeoutRef.current) {
                clearTimeout(saveCacheTimeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attendances, session, sessionId]);

    useEffect(() => {
        if (sessionId) {
            fetchSession();
        }
    }, [sessionId]);

    // Auto-sync pending actions on page load (if online)
    useEffect(() => {
        const syncOnLoad = async () => {
            if (!sessionId) return;
            
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            if (isOffline) return;
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const pendingCount = getSessionPendingActions(sessionId).length;
            if (pendingCount === 0) return;
            
            console.log(`🔄 Page loaded: Found ${pendingCount} pending actions for session ${sessionId}, syncing...`);
            showToast(`Syncing ${pendingCount} saved actions...`, 'info');
            
            const result = await syncPendingActions({
                addAttendance: async (sid, data) => {
                    if (!data.studentCode || !data.studentCode.trim()) {
                        console.warn('⚠️ Skipping sync: Invalid studentCode', data);
                        throw new Error('Invalid student code');
                    }
                    
                    try {
                        const response = await addStudentToSession(sid, data.studentCode.trim());
                        return response;
                    } catch (error: any) {
                        if (error?.response?.status === 400) {
                            const message = error?.response?.data?.message || 'Student already added';
                            console.log(`ℹ️ Skipping sync (already exists): ${message}`, { sessionId: sid, studentCode: data.studentCode });
                            return { success: true, message, data: null };
                        }
                        if (error?.response?.status === 404) {
                            const message = error?.response?.data?.message || 'Student or session not found';
                            console.log(`ℹ️ Skipping sync (not found): ${message}`, { sessionId: sid, studentCode: data.studentCode });
                            return { success: true, message, data: null };
                        }
                        throw error;
                    }
                },
                removeAttendance: async (sid, attendanceId) => {
                    const response = await removeStudentFromSession(sid, attendanceId);
                    return response;
                },
                updateAttendanceStatus: async (sid, attendanceId, status) => {
                    const response = await updateAttendanceStatus(sid, attendanceId, status);
                    return response;
                },
                scanAttendance: async (sid, qrToken) => {
                    const response = await scanAttendance(sid, qrToken);
                    return response;
                },
            });
            
            if (result.success > 0) {
                showToast(`Successfully synced ${result.success} actions`, 'success');
                fetchSession();
            }
            
            if (result.failed > 0) {
                showToast(`Failed to sync ${result.failed} actions`, 'warning');
            }
        };

        syncOnLoad();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    // Auto-sync pending actions when connection is restored
    useEffect(() => {
        const handleOnline = async () => {
            if (!sessionId) return;
            
            console.log('🌐 Connection restored: Syncing pending actions...');
            const pendingCount = getSessionPendingActions(sessionId).length;
            
            if (pendingCount > 0) {
                showToast(`Syncing ${pendingCount} saved actions...`, 'info');
                
                const result = await syncPendingActions({
                    addAttendance: async (sid, data) => {
                        if (!data.studentCode || !data.studentCode.trim()) {
                            console.warn('⚠️ Skipping sync: Invalid studentCode', data);
                            throw new Error('Invalid student code');
                        }
                        
                        try {
                            const response = await addStudentToSession(sid, data.studentCode.trim());
                            return response;
                        } catch (error: any) {
                            if (error?.response?.status === 400) {
                                const message = error?.response?.data?.message || 'Student already added';
                                console.log(`ℹ️ Skipping sync (already exists): ${message}`, { sessionId: sid, studentCode: data.studentCode });
                                return { success: true, message, data: null };
                            }
                            if (error?.response?.status === 404) {
                                const message = error?.response?.data?.message || 'Student or session not found';
                                console.log(`ℹ️ Skipping sync (not found): ${message}`, { sessionId: sid, studentCode: data.studentCode });
                                return { success: true, message, data: null };
                            }
                            throw error;
                        }
                    },
                    removeAttendance: async (sid, attendanceId) => {
                        const response = await removeStudentFromSession(sid, attendanceId);
                        return response;
                    },
                    updateAttendanceStatus: async (sid, attendanceId, status) => {
                        const response = await updateAttendanceStatus(sid, attendanceId, status);
                        return response;
                    },
                    scanAttendance: async (sid, qrToken) => {
                        const response = await scanAttendance(sid, qrToken);
                        return response;
                    },
                });
                
                if (result.success > 0) {
                    showToast(`Successfully synced ${result.success} actions`, 'success');
                    fetchSession();
                }
                
                if (result.failed > 0) {
                    showToast(`Failed to sync ${result.failed} actions`, 'warning');
                }
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, showToast]);

    const fetchSession = async () => {
        try {
            setLoading(true);
            
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            const isTempSession = sessionId.startsWith('temp_');
            
            if (isOffline || isTempSession) {
                console.log(isTempSession ? '📦 Loading temporary session data' : '📴 Offline mode: Loading cached session data');
                try {
                    const cachedSession = localStorage.getItem(`session_${sessionId}`);
                    const cachedAttendances = localStorage.getItem(`session_${sessionId}_attendances`);
                    
                    if (cachedSession) {
                        const sessionData = JSON.parse(cachedSession);
                        setSession(sessionData);
                        setAttendanceCount((sessionData as any).attendanceCount || 0);
                        
                        if (isTempSession) {
                            showToast('Temporary session - data will sync when online', 'info');
                        }
                    } else if (isTempSession) {
                        showToast('Temporary session not found', 'error');
                        router.push('/dashboard/attendance');
                        return;
                    }
                    
                    if (cachedAttendances) {
                        const attendancesList = JSON.parse(cachedAttendances);
                        setAttendances(attendancesList);
                        setAttendanceCount(attendancesList.length);
                    } else {
                        setAttendances([]);
                        setAttendanceCount(0);
                    }
                } catch (cacheError) {
                    console.error('Error loading cached session:', cacheError);
                    if (isTempSession) {
                        showToast('Error loading temporary session data', 'error');
                        router.push('/dashboard/attendance');
                    } else {
                        showToast('No saved data found for this session', 'info');
                    }
                }
                
                if (isTempSession) {
                    setLoading(false);
                    return;
                }
                
                if (isOffline) {
                    return;
                }
            }
            
            const response = await getSessionById(sessionId);
            setSession(response.data);
            setAttendanceCount((response.data as any).attendanceCount || 0);

            const attendanceRes = await getSessionAttendance(sessionId);
            const attendancesList = attendanceRes.data?.attendances || [];
            console.log('📋 Loaded attendances:', attendancesList);
            setAttendances(attendancesList);

            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(`session_${sessionId}`, JSON.stringify(response.data));
                    localStorage.setItem(`session_${sessionId}_attendances`, JSON.stringify(attendancesList));
                    localStorage.setItem(`session_${sessionId}_cache_time`, Date.now().toString());
                } catch (storageError) {
                    console.warn('Failed to save session to localStorage:', storageError);
                }
            }

            if (response.data.status === 'scheduled') {
                await updateSessionStatus(sessionId, 'in-progress');
                setSession(prev => prev ? { ...prev, status: 'in-progress' } : null);
            }
        } catch (error: any) {
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            
            if (!isOffline) {
                console.error('Failed to fetch session:', error);
                
                if (error.response?.status === 500) {
                    showToast('Server error. Using cached data...', 'warning');
                } else {
                    showToast('Failed to load session data', 'error');
                }
                
                try {
                    const cachedSession = localStorage.getItem(`session_${sessionId}`);
                    const cachedAttendances = localStorage.getItem(`session_${sessionId}_attendances`);
                    
                    if (cachedSession) {
                        console.log('📦 Using cached session data as fallback');
                        const sessionData = JSON.parse(cachedSession);
                        setSession(sessionData);
                        setAttendanceCount((sessionData as any).attendanceCount || 0);
                    }
                    
                    if (cachedAttendances) {
                        const attendancesList = JSON.parse(cachedAttendances);
                        setAttendances(attendancesList);
                        setAttendanceCount(attendancesList.length);
                    }
                } catch (cacheError) {
                    console.error('Error loading cached fallback session:', cacheError);
                }
            } else {
                console.log('📴 Offline mode: Session fetch failed (expected)');
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshAttendanceOnly = async () => {
        try {
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            
            if (isOffline) {
                const cachedAttendances = localStorage.getItem(`session_${sessionId}_attendances`);
                if (cachedAttendances) {
                    const list = JSON.parse(cachedAttendances);
                    setAttendances(list);
                    setAttendanceCount(list.length);
                }
                return;
            }
            
            const attendanceRes = await getSessionAttendance(sessionId);
            const list = attendanceRes.data?.attendances || [];
            console.log('🔄 Refreshed attendances:', list);
            setAttendances(list);
            setAttendanceCount(list.length);
            
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(`session_${sessionId}_attendances`, JSON.stringify(list));
                } catch (storageError) {
                    console.warn('Failed to update cached attendances:', storageError);
                }
            }
        } catch (error: any) {
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            
            if (!isOffline) {
                console.error('Failed to refresh attendance list:', error);
                
                try {
                    const cachedAttendances = localStorage.getItem(`session_${sessionId}_attendances`);
                    if (cachedAttendances) {
                        const list = JSON.parse(cachedAttendances);
                        setAttendances(list);
                        setAttendanceCount(list.length);
                    }
                } catch (cacheError) {
                    console.error('Error loading cached attendances:', cacheError);
                }
            }
        }
    };

    const handleEndSession = async () => {
        if (!confirm('Are you sure you want to end the session?')) {
            return;
        }

        try {
            await endSession(sessionId);
            router.push('/dashboard/attendance');
        } catch (error) {
            console.error('Failed to end session:', error);
            showToast('Failed to end session', 'error');
        }
    };

    const handleRemoveAttendance = async (attendanceId: string) => {
        if (!confirm('Are you sure you want to cancel this student\'s attendance?')) {
            return;
        }

        const isOffline = typeof window !== 'undefined' && !navigator.onLine;

        try {
            if (attendanceId.startsWith('temp_')) {
                const updatedAttendances = attendances.filter(a => a.id !== attendanceId);
                setAttendances(updatedAttendances);
                setAttendanceCount(prev => Math.max(0, prev - 1));
                saveToCacheOptimized(updatedAttendances, session);
                
                const { getQueue, removeAction } = await import('@/lib/offline-sync');
                const queue = getQueue();
                const pendingAction = queue.find(a => 
                    a.type === 'add_attendance' && 
                    a.sessionId === sessionId &&
                    a.data?.studentCode && 
                    attendances.find(att => att.id === attendanceId && att.student.nationalId === a.data.studentCode)
                );
                if (pendingAction) {
                    removeAction(pendingAction.id);
                }
                
                showToast('Student attendance cancelled', 'success');
                return;
            }

            if (isOffline) {
                queueAction({
                    type: 'remove_attendance',
                    sessionId,
                    data: { attendanceId },
                });
                
                const updatedAttendances = attendances.filter(a => a.id !== attendanceId);
                setAttendances(updatedAttendances);
                setAttendanceCount(prev => Math.max(0, prev - 1));
                saveToCacheOptimized(updatedAttendances, session);
                
                showToast('Action saved. Will sync when online', 'info');
                return;
            }

            const response = await removeStudentFromSession(sessionId, attendanceId);

            if (response.data?.attendanceCount !== undefined) {
                setAttendanceCount(response.data.attendanceCount);
            }

            const updatedAttendances = attendances.filter(a => a.id !== attendanceId);
            setAttendances(updatedAttendances);

            if (navigator.onLine) {
                saveToCacheOptimized(updatedAttendances, session);
            }

            showToast(response.message || 'Student attendance cancelled successfully', 'success');
        } catch (error: any) {
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            
            if (attendanceId.startsWith('temp_')) {
                console.log('⚠️ Attempted to remove temp attendance, already handled locally');
                return;
            }
            
            if (isOffline) {
                queueAction({
                    type: 'remove_attendance',
                    sessionId,
                    data: { attendanceId },
                });
                
                setAttendances(prev => prev.filter(a => a.id !== attendanceId));
                setAttendanceCount(prev => Math.max(0, prev - 1));
                
                showToast('Action saved. Will sync when online', 'info');
            } else {
                console.error('Failed to remove student from session:', error);
                const message = error?.response?.data?.message || 'Failed to cancel attendance, try again';
                showToast(message, 'error');
            }
        }
    };

    const handleTogglePaid = async (attendanceId: string, currentStatus: SessionAttendance['status']) => {
        const isOffline = typeof window !== 'undefined' && !navigator.onLine;
        const nextStatus = currentStatus === 'present' ? 'unpaid' : 'paid';
        const nextLocalStatus: SessionAttendance['status'] = nextStatus === 'paid' ? 'present' : 'absent';

        try {
            setUpdatingStatus(true);
            
            if (isOffline) {
                queueAction({
                    type: 'update_attendance_status',
                    sessionId,
                    data: { attendanceId, status: nextStatus },
                });
                
                const updatedAttendances = attendances.map((a) =>
                    a.id === attendanceId
                        ? { ...a, status: nextLocalStatus }
                        : a
                );
                setAttendances(updatedAttendances);
                if (selectedAttendance?.id === attendanceId) {
                    setSelectedAttendance({ ...selectedAttendance, status: nextLocalStatus });
                }

                saveToCacheOptimized(updatedAttendances, session);
                
                showToast('Change saved. Will sync when online', 'info');
                return;
            }

            const response = await updateAttendanceStatus(sessionId, attendanceId, nextStatus as 'paid' | 'unpaid');
            const updated = response.data?.attendance;
            if (response.data?.attendanceCount !== undefined) {
                setAttendanceCount(response.data.attendanceCount);
            }
            if (updated) {
                const updatedAttendances = attendances.map((a) =>
                    a.id === attendanceId
                        ? { ...a, status: updated.status as SessionAttendance['status'] }
                        : a
                );
                setAttendances(updatedAttendances);
                
                if (selectedAttendance?.id === attendanceId) {
                    setSelectedAttendance({ ...selectedAttendance, status: updated.status as SessionAttendance['status'] });
                }

                if (navigator.onLine) {
                    saveToCacheOptimized(updatedAttendances, session);
                }
            }
            showToast('Student status updated', 'success');
        } catch (error: any) {
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            
            if (isOffline) {
                queueAction({
                    type: 'update_attendance_status',
                    sessionId,
                    data: { attendanceId, status: nextStatus },
                });
                
                const updatedAttendances = attendances.map((a) =>
                    a.id === attendanceId
                        ? { ...a, status: nextLocalStatus }
                        : a
                );
                setAttendances(updatedAttendances);
                if (selectedAttendance?.id === attendanceId) {
                    setSelectedAttendance({ ...selectedAttendance, status: nextLocalStatus });
                }

                saveToCacheOptimized(updatedAttendances, session);
                
                showToast('Change saved. Will sync when online', 'info');
            } else {
                console.error('Failed to update attendance status:', error);
                const message = error?.response?.data?.message || 'Failed to update student status, try again';
                showToast(message, 'error');
            }
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleAddStudent = async (
        e: React.FormEvent | React.KeyboardEvent<HTMLInputElement>
    ) => {
        e.preventDefault();

        const trimmedCode = studentSearch.trim();
        if (!trimmedCode) {
            return;
        }

        const isOffline = typeof window !== 'undefined' && !navigator.onLine;

        try {
            setAddingStudent(true);
            
            const { searchStudentsInCache } = await import('@/lib/students-cache');
            const cachedStudents = searchStudentsInCache(trimmedCode);
            const foundStudent = cachedStudents.find(s => 
                s.nationalId === trimmedCode || 
                s.studentCode === trimmedCode ||
                s.nationalId?.endsWith(trimmedCode) ||
                s.studentCode?.endsWith(trimmedCode)
            );
            
            if (!foundStudent) {
                showToast('No student found with this code', 'error');
                setStudentSearch('');
                return;
            }
            
            const exists = attendances.some(a => 
                a.student.nationalId === trimmedCode ||
                a.student.nationalId === foundStudent.nationalId
            );
            
            if (exists) {
                showToast('This student is already registered', 'warning');
                setStudentSearch('');
                return;
            }
            
            if (isOffline) {
                queueAction({
                    type: 'add_attendance',
                    sessionId,
                    data: { studentCode: trimmedCode },
                });
                
                const tempAttendance: SessionAttendance = {
                    id: `temp_${Date.now()}`,
                    status: 'present',
                    createdAt: new Date().toISOString(),
                    student: {
                        id: foundStudent.id || foundStudent._id || 'temp',
                        fullName: foundStudent.fullName,
                        nationalId: foundStudent.nationalId || trimmedCode,
                    },
                };
                
                const updatedAttendances = [tempAttendance, ...attendances];
                setAttendances(updatedAttendances);
                setAttendanceCount(updatedAttendances.length);
                saveToCacheOptimized(updatedAttendances, session);
                setStudentSearch('');
                
                showToast(`Attendance registered for: ${foundStudent.fullName}`, 'success');
                return;
            }

            const response = await addStudentToSession(sessionId, trimmedCode);

            if (response.data?.attendanceCount !== undefined) {
                setAttendanceCount(response.data.attendanceCount);
            }

            if (response.data?.attendance) {
                const updatedAttendances = [
                    response.data!.attendance,
                    ...attendances.filter(a => a.id !== response.data!.attendance.id),
                ];
                setAttendances(updatedAttendances);

                if (navigator.onLine) {
                    saveToCacheOptimized(updatedAttendances, session);
                }
            }

            setStudentSearch('');
            showToast(response.message || 'Student attendance registered successfully', 'success');
        } catch (error: any) {
            console.error('Failed to add student to session:', error);
            const message = error?.response?.data?.message || 'Failed to add student, check the student code and try again';
            showToast(message, 'error');
        } finally {
            setAddingStudent(false);
        }
    };

    // Camera scanning for this session
    useEffect(() => {
        const stopScanner = async () => {
            const scanner = scannerRef.current;
            if (!scanner) return;
            try {
                if (scanner.isScanning) {
                    await scanner.stop();
                }
            } catch {
                // ignore stop errors
            } finally {
                try {
                    await scanner.clear();
                } catch {
                    // ignore clear errors
                }
            }
            scannerRef.current = null;
            setScanState('idle');
        };

        if (!cameraEnabled) {
            void stopScanner();
            return;
        }

        const startScanner = async () => {
            setCameraError(null);
            setScanState('starting');
            const scanner = new Html5Qrcode(regionId);
            scannerRef.current = scanner;

            try {
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 320, height: 320 }, aspectRatio: 1 },
                    async (decodedText) => {
                        const trimmed = decodedText.trim();
                        if (!trimmed) return;
                        if (!/^[0-9]{3,20}$/.test(trimmed)) return;
                        const now = Date.now();
                        if (now < cooldownRef.current) return;
                        cooldownRef.current = now + 1500;
                        const last = lastScanRef.current;
                        if (last && last.token === trimmed && now - last.at < 2000) return;
                        lastScanRef.current = { token: trimmed, at: now };

                        try {
                            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
                            
                            const { searchStudentsInCache } = await import('@/lib/students-cache');
                            const cachedStudents = searchStudentsInCache(trimmed);
                            const foundStudent = cachedStudents.find(s => 
                                s.qrToken === trimmed ||
                                s.nationalId === trimmed ||
                                s.studentCode === trimmed ||
                                s.qrToken?.endsWith(trimmed) ||
                                s.nationalId?.endsWith(trimmed)
                            );
                            
                            if (!foundStudent) {
                                showToast('No student found with this code', 'error');
                                return;
                            }
                            
                            const exists = attendances.some(a => 
                                a.student.nationalId === trimmed ||
                                a.student.nationalId === foundStudent.nationalId
                            );
                            
                            if (exists) {
                                showToast('This student is already registered', 'warning');
                                return;
                            }
                            
                            if (isOffline) {
                                queueAction({
                                    type: 'scan_attendance',
                                    sessionId,
                                    data: { qrToken: trimmed },
                                });
                                
                                const tempAttendance: SessionAttendance = {
                                    id: `temp_${Date.now()}`,
                                    status: 'present',
                                    createdAt: new Date().toISOString(),
                                    student: {
                                        id: foundStudent.id || foundStudent._id || 'temp',
                                        fullName: foundStudent.fullName,
                                        nationalId: foundStudent.nationalId || trimmed,
                                    },
                                };
                                
                                const updatedAttendances = [tempAttendance, ...attendances];
                                setAttendances(updatedAttendances);
                                setAttendanceCount(updatedAttendances.length);
                                saveToCacheOptimized(updatedAttendances, session);
                                
                                showToast(`Attendance registered for: ${foundStudent.fullName}`, 'success');
                                return;
                            }
                            
                            const res = await scanAttendance(sessionId, trimmed);
                            const status = res?.data?.status;
                            const studentName = res?.data?.studentName || '';
                            if (status === 'new') {
                                showToast(`Attendance registered for: ${studentName}`, 'success');
                                setAttendanceCount((c) => c + 1);
                            } else if (status === 'already') {
                                showToast(`This student is already registered: ${studentName}`, 'warning');
                            } else {
                                showToast('Unexpected server response', 'error');
                            }
                            refreshAttendanceOnly().then(() => {
                                if (navigator.onLine && session) {
                                    setTimeout(() => {
                                        const cachedAttendances = localStorage.getItem(`session_${sessionId}_attendances`);
                                        if (cachedAttendances) {
                                            try {
                                                const parsed = JSON.parse(cachedAttendances);
                                                saveToCacheOptimized(parsed, session);
                                            } catch {
                                                // Ignore parse errors
                                            }
                                        }
                                    }, 200);
                                }
                            });
                        } catch (err: any) {
                            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
                            
                            try {
                                const { searchStudentsInCache } = await import('@/lib/students-cache');
                                const cachedStudents = searchStudentsInCache(trimmed);
                                const foundStudent = cachedStudents.find(s => 
                                    s.qrToken === trimmed ||
                                    s.nationalId === trimmed ||
                                    s.studentCode === trimmed ||
                                    s.qrToken?.endsWith(trimmed) ||
                                    s.nationalId?.endsWith(trimmed)
                                );
                                
                                if (!foundStudent) {
                                    const message = isOffline 
                                        ? 'Student not found in local data'
                                        : (err?.response?.data?.message || 'No student found with this code');
                                    showToast(message, 'error');
                                    return;
                                }
                                
                                const exists = attendances.some(a => 
                                    a.student.nationalId === trimmed ||
                                    a.student.nationalId === foundStudent.nationalId
                                );
                                
                                if (exists) {
                                    showToast('This student is already registered', 'warning');
                                    return;
                                }
                                
                                queueAction({
                                    type: 'scan_attendance',
                                    sessionId,
                                    data: { qrToken: trimmed },
                                });
                                
                                const tempAttendance: SessionAttendance = {
                                    id: `temp_${Date.now()}`,
                                    status: 'present',
                                    createdAt: new Date().toISOString(),
                                    student: {
                                        id: foundStudent.id || foundStudent._id || 'temp',
                                        fullName: foundStudent.fullName,
                                        nationalId: foundStudent.nationalId || trimmed,
                                    },
                                };
                                
                                const updatedAttendances = [tempAttendance, ...attendances];
                                setAttendances(updatedAttendances);
                                setAttendanceCount(updatedAttendances.length);
                                saveToCacheOptimized(updatedAttendances, session);
                                
                                showToast(`Attendance registered for: ${foundStudent.fullName}`, 'success');
                            } catch (cacheError) {
                                const message = err?.response?.data?.message || err?.response?.data?.error || 'Failed to register attendance';
                                showToast(message, 'error');
                            }
                        }
                    },
                    () => {
                        // ignore decode errors
                    }
                );
                setScanState('scanning');
            } catch (e: any) {
                console.error('Camera start failed:', e);
                setCameraError('Unable to start camera. Make sure permissions are granted.');
                setScanState('error');
            }
        };

        void startScanner();

        return () => {
            void stopScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraEnabled, sessionId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="text-gray-500">Session not found</p>
            </div>
        );
    }

    const sessionDate = new Date(session.date);
    const formattedDate = sessionDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FBFAFF] via-white to-white" dir="ltr">
            {/* Main Content */}
            <div className="w-full px-4 pb-24 pt-4 sm:px-6 sm:pb-10 sm:pt-6 space-y-4 sm:space-y-6">
                {/* Compact top header (full bleed horizontally) */}
                <div className="-mx-4 sm:-mx-6 rounded-3xl bg-white/90 backdrop-blur border border-black/5 shadow-xl">
                    <div className="p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-left">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => router.push(isAssistant ? ROUTES.ATTENDANCE : '/dashboard/attendance')}
                                        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#FCFCFC] transition-colors"
                                    >
                                        <ChevronRight className="h-4 w-4 rotate-180" />
                                        <span className="hidden sm:inline">Back</span>
                                    </button>
                                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                        Live Session
                                    </span>
                                </div>
                                <h1 className="mt-3 text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 truncate">
                                    {(session as any)?.title || 'Session'}
                                </h1>
                                <p className="mt-1 text-sm text-gray-500">
                                    {formattedDate}
                                </p>
                            </div>

                            <button
                                onClick={handleEndSession}
                                className="shrink-0 rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-xl hover:bg-red-600 active:scale-[0.99] transition"
                            >
                                End
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                            <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white to-purple-50/60 p-3 sm:p-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-500">Attendance</div>
                                    <Users className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div className="mt-1 text-lg sm:text-xl font-extrabold text-gray-900">
                                    {attendanceCount}
                                    <span className="ml-1 text-sm font-semibold text-gray-500">Students</span>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white to-purple-50/60 p-3 sm:p-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-500">Price</div>
                                    <DollarSign className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div className="mt-1 text-lg sm:text-xl font-extrabold text-gray-900">
                                    {session.price}
                                    <span className="ml-1 text-sm font-semibold text-gray-500">EGP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Student by Attendance (no outer container card) */}
                <div className="mt-3 sm:mt-5 px-0 sm:px-0 pt-2 sm:pt-3 pb-3 sm:pb-4 border-b border-gray-200 text-left">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                            <h2 className="text-base sm:text-lg font-extrabold text-gray-900">Add Student by Code</h2>
                            <p className="mt-1 text-xs sm:text-sm text-gray-500">
                                Type student code and press Add
                            </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                            Quick
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Enter student code"
                            className="flex-1 py-3 px-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-left text-gray-900 placeholder:text-[#80848E] transition-all duration-200"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    void handleAddStudent(e);
                                }
                            }}
                            disabled={addingStudent}
                        />
                        <button
                            onClick={(e) => void handleAddStudent(e as unknown as React.FormEvent)}
                            disabled={addingStudent}
                            className="shrink-0 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {addingStudent ? '...' : 'Add'}
                        </button>
                    </div>
                </div>

                {/* QR Scan inline for this session (no outer container card) */}
                <div className="px-0 sm:px-0 pt-3 sm:pt-4 pb-4 sm:pb-5 border-b border-gray-200 space-y-3 text-left">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base sm:text-lg font-extrabold text-gray-900">Camera Scan (QR)</h2>
                            <p className="mt-1 text-xs sm:text-sm text-gray-500">
                                Start the camera and point it at the code — it continues scanning.
                            </p>
                        </div>
                        <button
                            onClick={() => setCameraEnabled((v) => !v)}
                            className={`shrink-0 px-4 py-2.5 rounded-2xl font-bold shadow-xl transition-colors ${cameraEnabled
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                        >
                            {cameraEnabled ? 'Stop' : 'Start'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                            Status:{' '}
                            {scanState === 'scanning'
                                ? 'Scanning...'
                                : scanState === 'starting'
                                    ? 'Starting camera...'
                                    : scanState === 'error'
                                        ? 'Error'
                                        : 'Stopped'}
                        </span>
                        <span className="truncate max-w-[45%]">
                            {(session as any)?.title || ''}
                        </span>
                    </div>

                    {cameraError && (
                        <div className="rounded-2xl bg-red-50 border border-red-200 text-red-900 px-4 py-3 text-sm">
                            {cameraError}
                        </div>
                    )}

                    <div className="rounded-3xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 sm:p-4">
                        <div id={regionId} className="w-full max-w-md mx-auto" />
                    </div>
                </div>

                {/* Students in this session (no outer container card) */}
                <div className="px-0 sm:px-0 pt-4 sm:pt-6 pb-8 sm:pb-10 text-left">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="h-9 w-9 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 truncate">
                                Students ({attendances.length})
                            </h2>
                        </div>
                    </div>

                    {attendances.length === 0 ? (
                        <div className="-mx-4 sm:mx-0">
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-[#FCFCFC] py-8 text-center text-sm text-gray-500">
                                No student attendance registered yet
                            </div>
                        </div>
                    ) : (
                        <div className="-mx-4 sm:mx-0 space-y-2 sm:space-y-3">
                            {attendances.map((attendance) => (
                                <div
                                    key={attendance.id}
                                    onClick={() => setSelectedAttendance(attendance)}
                                    className="animate-slide-in-up rounded-2xl border border-gray-200 bg-gradient-to-r from-white to-purple-50/40 px-4 py-3 flex items-start justify-between gap-3 shadow-xl hover:shadow-2xl transition-shadow duration-200 cursor-pointer"
                                >
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="font-bold text-gray-900 truncate">
                                            {attendance.student?.fullName || attendance.studentCode || 'Unknown Student'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Code: {attendance.student?.nationalId || attendance.studentCode || 'Not Available'} •{' '}
                                            {new Date(attendance.createdAt).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${attendance.status === 'present'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700'
                                                }`}
                                        >
                                            {attendance.status === 'present' ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile sticky quick actions */}
            <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/90 backdrop-blur">
                <div className="w-full px-4 py-3 flex items-center justify-between gap-3">
                    <button
                        onClick={() => setCameraEnabled((v) => !v)}
                        className={`flex-1 rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors ${cameraEnabled
                            ? 'bg-red-100 text-red-700'
                            : 'bg-indigo-600 text-white'
                            }`}
                    >
                        {cameraEnabled ? 'Stop Camera' : 'Start Camera'}
                    </button>
                    <button
                        onClick={handleEndSession}
                        className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-extrabold text-white shadow-xl"
                    >
                        End
                    </button>
                </div>
            </div>

            {/* Student Details Modal */}
            {selectedAttendance && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSelectedAttendance(null)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-left"
                        onClick={(e) => e.stopPropagation()}
                        dir="ltr"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-3xl">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Student Details</h3>
                            <button
                                onClick={() => setSelectedAttendance(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content - scrollable */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
                            {/* Student Name */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
                                <p className="mt-1 text-lg font-bold text-gray-900">{selectedAttendance.student?.fullName || 'Deleted Student'}</p>
                            </div>

                            {/* Student Code */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Student Code</label>
                                <p className="mt-1 text-base text-gray-700">{selectedAttendance.student?.nationalId || 'Not Available'}</p>
                            </div>

                            {/* Parent Phone */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Parent's Phone</label>
                                <p className="mt-1 text-base text-gray-700">
                                    {selectedAttendance.student?.parentPhone || 'Not Available'}
                                </p>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                                <div className="mt-1">
                                    <span
                                        className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${selectedAttendance.status === 'present'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-amber-50 text-amber-700'
                                            }`}
                                    >
                                        {selectedAttendance.status === 'present' ? 'Paid' : 'Unpaid'}
                                    </span>
                                </div>
                            </div>

                            {/* Attendance Time */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Registration Time</label>
                                <p className="mt-1 text-base text-gray-700">
                                    {new Date(selectedAttendance.createdAt).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>

                            {/* Session Info */}
                            {session && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Session</label>
                                    <p className="mt-1 text-base text-gray-700">
                                        {(session as any)?.title || 'Session'} • {session.price} EGP
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Actions - fixed at bottom */}
                        <div className="flex-shrink-0 bg-[#FCFCFC] border-t border-gray-200 px-4 sm:px-6 py-4 rounded-b-3xl space-y-2">
                            <button
                                onClick={() => {
                                    void handleTogglePaid(selectedAttendance.id, selectedAttendance.status);
                                }}
                                disabled={updatingStatus}
                                className="w-full rounded-2xl bg-indigo-600 text-white px-4 py-3 font-bold hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {updatingStatus ? 'Updating...' : selectedAttendance.status === 'present' ? 'Set as Unpaid' : 'Set as Paid'}
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to cancel this student\'s attendance?')) {
                                        void handleRemoveAttendance(selectedAttendance.id);
                                        setSelectedAttendance(null);
                                    }
                                }}
                                className="w-full rounded-2xl border border-red-200 bg-red-50 text-red-600 px-4 py-3 font-bold hover:bg-red-100 hover:border-red-300 transition-colors"
                            >
                                Cancel Attendance
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
