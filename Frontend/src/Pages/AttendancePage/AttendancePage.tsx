'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSessionStats, getRecentSessions, createSession } from '@/features/sessions';
import type { Session, SessionStats, CreateSessionData } from '@/features/sessions';
import { useToast } from '@/components/ui';
import { queueAction, syncPendingActions, getPendingSessions } from '@/lib/offline-sync';

// Page Sections
import PageHeader from './Sections/PageHeader';
import StatsSection from './Sections/StatsSection';
import RecentSessionsSection from './Sections/RecentSessionsSection';

// Components
import CreateSessionModal from '@/components/CreateSessionModal';

export default function AttendancePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [stats, setStats] = useState<SessionStats>({
        todaySessions: 0,
        todayPresent: 0,
        todayAbsent: 0,
        todayRevenue: 0,
    });
    const [recentSessions, setRecentSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);

    // Fetch initial data
    useEffect(() => {
        const isOffline = typeof window !== 'undefined' && !navigator.onLine;
        if (isOffline) {
            try {
                const cachedStats = localStorage.getItem('attendance_stats');
                const cachedSessions = localStorage.getItem('attendance_sessions');
                
                if (cachedSessions) {
                    const sessions = JSON.parse(cachedSessions);
                    setRecentSessions(sessions);
                }
                
                if (cachedStats) {
                    setStats(JSON.parse(cachedStats));
                }
                
                setLoading(false);
                
                setTimeout(() => {
                    fetchData();
                }, 100);
            } catch (error) {
                console.error('Error loading initial cache:', error);
                setLoading(false);
                fetchData();
            }
        } else {
            fetchData();
        }
    }, []);

    // Auto-sync pending sessions on page load (if online)
    useEffect(() => {
        const syncOnLoad = async () => {
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            if (isOffline) return;
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const pendingSessions = getPendingSessions();
            if (pendingSessions.length === 0) return;
            
            console.log(`🔄 Page loaded: Found ${pendingSessions.length} pending sessions, syncing...`);
            showToast(`Syncing ${pendingSessions.length} saved sessions...`, 'info');
            
            const result = await syncPendingActions({
                createSession: async (data) => {
                    const response = await createSession(data);
                    
                    if (response.data && response.data.id) {
                        const newSessionId = response.data.id || response.data._id;
                        
                        const tempSessionId = Object.keys(localStorage)
                            .find(key => {
                                if (!key.startsWith('session_temp_')) return false;
                                try {
                                    const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
                                    return sessionData.date === data.date &&
                                           sessionData.startTime === data.startTime;
                                } catch {
                                    return false;
                                }
                            });
                        
                        if (tempSessionId) {
                            const tempId = tempSessionId.replace('session_', '');
                            const tempAttendances = localStorage.getItem(`session_${tempId}_attendances`);
                            
                            if (tempAttendances) {
                                try {
                                    const attendances = JSON.parse(tempAttendances);
                                    console.log(`📦 Migrating ${attendances.length} attendances from temp session ${tempId} to ${newSessionId}`);
                                    
                                    localStorage.setItem(`session_${newSessionId}`, JSON.stringify(response.data));
                                    localStorage.setItem(`session_${newSessionId}_attendances`, tempAttendances);
                                    
                                    const { getQueue } = await import('@/lib/offline-sync');
                                    const queue = getQueue();
                                    const updatedQueue = queue.map(action => {
                                        if (action.sessionId === tempId && 
                                            (action.type === 'add_attendance' || 
                                             action.type === 'remove_attendance' || 
                                             action.type === 'update_attendance_status' || 
                                             action.type === 'scan_attendance')) {
                                            return { ...action, sessionId: newSessionId };
                                        }
                                        return action;
                                    });
                                    
                                    if (typeof window !== 'undefined') {
                                        localStorage.setItem('offline_actions_queue', JSON.stringify(updatedQueue));
                                    }
                                    
                                    localStorage.removeItem(`session_${tempId}`);
                                    localStorage.removeItem(`session_${tempId}_attendances`);
                                    localStorage.removeItem(`session_${tempId}_cache_time`);
                                    localStorage.removeItem(`session_${tempId}_is_temp`);
                                } catch (migrateError) {
                                    console.error('Error migrating temp session data:', migrateError);
                                }
                            }
                        }
                    }
                    
                    return response;
                },
            });
            
            if (result.success > 0) {
                showToast(`Successfully synced ${result.success} sessions`, 'success');
                
                setRecentSessions(prev => prev.filter(s => {
                    const id = (s.id || s._id || '').toString();
                    return !id.startsWith('temp_');
                }));
                
                fetchData();
            }
            
            if (result.failed > 0) {
                showToast(`Failed to sync ${result.failed} sessions`, 'warning');
            }
        };

        syncOnLoad();
    }, []);

    // Auto-refresh data and sync pending sessions when connection is restored
    useEffect(() => {
        const handleOnline = async () => {
            console.log('🌐 Connection restored: Refreshing data and syncing...');
            
            const pendingSessions = getPendingSessions();
            if (pendingSessions.length > 0) {
                showToast(`Syncing ${pendingSessions.length} saved sessions...`, 'info');
                
                const result = await syncPendingActions({
                    createSession: async (data) => {
                        const response = await createSession(data);
                        
                        if (response.data && response.data.id) {
                            const newSessionId = response.data.id || response.data._id;
                            
                            const tempSessionId = Object.keys(localStorage)
                                .find(key => {
                                    if (!key.startsWith('session_temp_')) return false;
                                    try {
                                        const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
                                        return sessionData.date === data.date &&
                                               sessionData.startTime === data.startTime;
                                    } catch {
                                        return false;
                                    }
                                });
                            
                            if (tempSessionId) {
                                const tempId = tempSessionId.replace('session_', '');
                                const tempAttendances = localStorage.getItem(`session_${tempId}_attendances`);
                                
                                if (tempAttendances) {
                                    try {
                                        const attendances = JSON.parse(tempAttendances);
                                        console.log(`📦 Migrating ${attendances.length} attendances from temp session ${tempId} to ${newSessionId}`);
                                        
                                        localStorage.setItem(`session_${newSessionId}`, JSON.stringify(response.data));
                                        localStorage.setItem(`session_${newSessionId}_attendances`, tempAttendances);
                                        
                                        const { getQueue } = await import('@/lib/offline-sync');
                                        const queue = getQueue();
                                        const updatedQueue = queue.map(action => {
                                            if (action.sessionId === tempId && 
                                                (action.type === 'add_attendance' || 
                                                 action.type === 'remove_attendance' || 
                                                 action.type === 'update_attendance_status' || 
                                                 action.type === 'scan_attendance')) {
                                                return { ...action, sessionId: newSessionId };
                                            }
                                            return action;
                                        });
                                        
                                        if (typeof window !== 'undefined') {
                                            localStorage.setItem('offline_actions_queue', JSON.stringify(updatedQueue));
                                        }
                                        
                                        localStorage.removeItem(`session_${tempId}`);
                                        localStorage.removeItem(`session_${tempId}_attendances`);
                                        localStorage.removeItem(`session_${tempId}_cache_time`);
                                        localStorage.removeItem(`session_${tempId}_is_temp`);
                                    } catch (migrateError) {
                                        console.error('Error migrating temp session data:', migrateError);
                                    }
                                }
                            }
                        }
                        
                        return response;
                    },
                });
                
                if (result.success > 0) {
                    showToast(`Successfully synced ${result.success} sessions`, 'success');
                    
                    setRecentSessions(prev => prev.filter(s => {
                        const id = (s.id || s._id || '').toString();
                        return !id.startsWith('temp_');
                    }));
                }
                
                if (result.failed > 0) {
                    showToast(`Failed to sync ${result.failed} sessions`, 'warning');
                }
            }
            
            fetchData();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    const fetchData = async () => {
        try {
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            
            if (!isOffline) {
                setLoading(true);
            }
            
            if (isOffline) {
                console.log('📴 Offline mode: Loading cached data');
                
                try {
                    const cachedStats = localStorage.getItem('attendance_stats');
                    const cachedSessions = localStorage.getItem('attendance_sessions');
                    
                    let sessions: Session[] = [];
                    if (cachedSessions) {
                        sessions = JSON.parse(cachedSessions);
                    }
                    
                    const tempSessions: Session[] = [];
                    if (typeof window !== 'undefined') {
                        const seenSessionIds = new Set<string>();
                        
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith('session_temp_')) {
                                if (!key.includes('_attendances') && !key.includes('_cache_time') && !key.includes('_is_temp')) {
                                    const sessionId = key.replace('session_', '');
                                    const sessionData = localStorage.getItem(key);
                                    
                                    if (sessionData && !seenSessionIds.has(sessionId)) {
                                        try {
                                            const session = JSON.parse(sessionData);
                                            if (session && (session.date || session.grade || session.title)) {
                                                seenSessionIds.add(sessionId);
                                                if (!sessions.find(s => {
                                                    const sId = (s.id || s._id || '').toString();
                                                    return sId === sessionId;
                                                })) {
                                                    tempSessions.push(session);
                                                }
                                            }
                                        } catch (e) {
                                            console.warn('Error parsing temp session:', e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    const allSessions = [...tempSessions, ...sessions];
                    
                    allSessions.sort((a, b) => {
                        const dateA = new Date(a.date || a.createdAt || 0).getTime();
                        const dateB = new Date(b.date || b.createdAt || 0).getTime();
                        return dateB - dateA;
                    });
                    
                    const recentSessions = allSessions.slice(0, 10);
                    
                    if (cachedStats) {
                        setStats(JSON.parse(cachedStats));
                    } else {
                        const today = new Date().toISOString().split('T')[0];
                        const todaySessions = recentSessions.filter(s => {
                            const sessionDate = new Date(s.date || s.createdAt || '').toISOString().split('T')[0];
                            return sessionDate === today;
                        });
                        
                        setStats({
                            todaySessions: todaySessions.length,
                            todayPresent: 0,
                            todayAbsent: 0,
                            todayRevenue: todaySessions.reduce((sum, s) => sum + (s.price || 0), 0),
                        });
                    }
                    
                    setRecentSessions(recentSessions);
                    
                    if (recentSessions.length === 0 && !cachedStats) {
                        console.log('📴 No cached data available');
                    } else {
                        console.log(`📴 Loaded ${recentSessions.length} sessions from cache (${tempSessions.length} temporary)`);
                    }
                } catch (cacheError) {
                    console.error('Error loading cached data:', cacheError);
                } finally {
                    setLoading(false);
                }
                
                return;
            }
            
            const [statsRes, sessionsRes] = await Promise.all([
                getSessionStats(),
                getRecentSessions(10),
            ]);
            
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('attendance_stats', JSON.stringify(statsRes.data));
                    localStorage.setItem('attendance_sessions', JSON.stringify(sessionsRes.data));
                    localStorage.setItem('attendance_cache_time', Date.now().toString());
                } catch (storageError) {
                    console.warn('Failed to save data to localStorage:', storageError);
                }
            }
            
            setStats(statsRes.data);
            setRecentSessions(sessionsRes.data);
        } catch (error: any) {
            const isOffline = typeof window !== 'undefined' && !navigator.onLine;
            
            if (!isOffline) {
                console.error('Failed to fetch session data:', error);
                
                try {
                    const cachedStats = localStorage.getItem('attendance_stats');
                    const cachedSessions = localStorage.getItem('attendance_sessions');
                    
                    if (cachedStats) {
                        console.log('📦 Using cached data as fallback');
                        setStats(JSON.parse(cachedStats));
                    }
                    
                    if (cachedSessions) {
                        setRecentSessions(JSON.parse(cachedSessions));
                    }
                } catch (cacheError) {
                    console.error('Error loading cached fallback data:', cacheError);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        
        const isOffline = typeof window !== 'undefined' && !navigator.onLine;
        if (isOffline) {
            showToast('Please connect to the internet to create a new session', 'warning');
            return;
        }
        
        setCreating(true);

        const formData = new FormData(form);
        const sessionData: CreateSessionData = {
            title: (formData.get('title') as string) || undefined,
            date: formData.get('date') as string,
            startTime: formData.get('startTime') as string,
            endTime: (formData.get('endTime') as string) || undefined,
            grade: formData.get('grade') as string,
            classroom: (formData.get('classroom') as string) || undefined,
            price: parseFloat((formData.get('price') as string) || '0'),
            notes: (formData.get('notes') as string) || undefined,
        };

        try {
            const response = await createSession(sessionData);
            form.reset();
            setShowCreateModal(false);

            const sessionId = response.data.id || response.data._id;
            if (sessionId && response.data) {
                if (typeof window !== 'undefined') {
                    const saveToCache = () => {
                        try {
                            const session = response.data;
                            localStorage.setItem(`session_${sessionId}`, JSON.stringify(session));
                            localStorage.setItem(`session_${sessionId}_attendances`, JSON.stringify([]));
                            localStorage.setItem(`session_${sessionId}_cache_time`, Date.now().toString());
                            
                            const cachedSessions = localStorage.getItem('attendance_sessions');
                            if (cachedSessions) {
                                try {
                                    const sessions: Session[] = JSON.parse(cachedSessions);
                                    const exists = sessions.some(s => {
                                        const id = (s.id || s._id || '').toString();
                                        return id === sessionId;
                                    });
                                    if (!exists) {
                                        sessions.unshift(session);
                                        const limitedSessions = sessions.slice(0, 50);
                                        localStorage.setItem('attendance_sessions', JSON.stringify(limitedSessions));
                                    }
                                } catch (e) {
                                    localStorage.setItem('attendance_sessions', JSON.stringify([session]));
                                }
                            } else {
                                localStorage.setItem('attendance_sessions', JSON.stringify([session]));
                            }
                            
                            console.log(`💾 Saved session ${sessionId} to cache for offline access`);
                        } catch (cacheError) {
                            console.warn('Failed to save session to cache:', cacheError);
                        }
                    };
                    
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(saveToCache, { timeout: 1000 });
                    } else {
                        setTimeout(saveToCache, 0);
                    }
                }
                
                router.push(`/dashboard/sessions/${sessionId}`);
            } else {
                fetchData();
            }
        } catch (error: any) {
            console.error('Failed to create session:', error);
            showToast('Failed to create session', 'error');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left" dir="ltr">
            {/* Top Level Header */}
            <div className="border-b border-gray-200 pb-4 mb-4 sm:pb-6 sm:mb-8 text-left">
                <h2 className="text-xl sm:text-3xl font-extrabold text-[#414141]">
                    Attendance Dashboard
                </h2>
                <p className="text-xs sm:text-sm text-[#A1A1A1]">
                    Manage sessions and track student attendance
                </p>
            </div>

            <PageHeader 
                onCreateClick={() => {
                    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
                    if (isOffline) {
                        showToast('Please connect to the internet to create a new session', 'warning');
                        return;
                    }
                    setShowCreateModal(true);
                }} 
            />

            <StatsSection stats={stats} />

            <RecentSessionsSection
                sessions={recentSessions}
                loading={loading}
                onCreateClick={() => {
                    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
                    if (isOffline) {
                        showToast('Please connect to the internet to create a new session', 'warning');
                        return;
                    }
                    setShowCreateModal(true);
                }}
                onSessionDeleted={fetchData}
            />

            <CreateSessionModal
                isOpen={showCreateModal}
                isCreating={creating}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateSession}
            />
        </div>
    );
}
