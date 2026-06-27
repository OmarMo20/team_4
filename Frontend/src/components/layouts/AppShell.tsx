'use client';

import type React from 'react';
import { AuthProvider } from '@/store/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';
import Sidebar from '@/components/layouts/Sidebar';
import MobileGlassHeader from '@/components/layouts/MobileGlassHeader';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ROUTES } from '@/lib/constants';
import { getUserFromStorage, getToken } from '@/lib/auth';
import OfflineGuard from '@/components/OfflineGuard';
import SyncProgressModal, { SyncAction } from '@/components/SyncProgressModal';

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshProfile, user } = useAuth();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncActions, setSyncActions] = useState<SyncAction[]>([]);
  const [totalSyncActions, setTotalSyncActions] = useState(0);

  // Refresh profile on mount to ensure role is up-to-date
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshProfile();
    }
  }, [isAuthenticated]);

  // Preload all students for offline access - GLOBAL level (not per session)
  useEffect(() => {
    const preloadStudents = async () => {
      if (!isAuthenticated || typeof window === 'undefined') return;
      
      try {
        const { getStudentsFromCache, isCacheValid, saveStudentsToCache } = await import('@/lib/students-cache');
        
        // Always check cache first (works offline too)
        const cached = getStudentsFromCache();
        if (cached.length > 0) {
          console.log(`📚 Using cached students from global cache (${cached.length} students)`);
          
          // If cache is valid and we have students, we're good
          if (isCacheValid() && cached.length > 0) {
            return;
          }
        }
        
        // If offline, use cache (even if expired)
        const isOffline = !navigator.onLine;
        if (isOffline) {
          if (cached.length > 0) {
            console.log(`📴 Offline: Using ${cached.length} cached students from global cache`);
          } else {
            console.log('📴 Offline: No cached students available');
          }
          return;
        }
        
        // Online: Fetch all students and save to GLOBAL cache
        console.log('📚 Fetching all students for global cache...');
        const { getStudents } = await import('@/features/students');
        const response = await getStudents();
        
        if (response.success && response.data) {
          saveStudentsToCache(response.data);
          console.log(`✅ Preloaded ${response.data.length} students to GLOBAL cache for offline access`);
        }
      } catch (error) {
        console.error('Failed to preload students:', error);
        // Silent fail - will use cache if available
        const { getStudentsFromCache } = await import('@/lib/students-cache');
        const cached = getStudentsFromCache();
        if (cached.length > 0) {
          console.log(`📚 Fallback: Using ${cached.length} cached students from global cache`);
        }
      }
    };

    // Preload immediately when authenticated (don't wait)
    preloadStudents();
    
    // Also refresh periodically when online (every 5 minutes)
    const refreshInterval = setInterval(() => {
      if (navigator.onLine && isAuthenticated) {
        preloadStudents();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);

  // Auto-sync pending actions on app load (if online)
  useEffect(() => {
    const syncOnLoad = async () => {
      if (!isAuthenticated || typeof window === 'undefined') return;
      
      const isOffline = !navigator.onLine;
      if (isOffline) return;
      
      // Wait a bit for app to fully initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // First, sync any temporary students that were created offline
        try {
          const { getStudentsFromCache } = await import('@/lib/students-cache');
          const cachedStudents = getStudentsFromCache();
          const tempStudents = cachedStudents.filter(s => {
            const id = (s.id || s._id || '').toString();
            return id.startsWith('temp_');
          });
          
          if (tempStudents.length > 0) {
            console.log(`🔄 App loaded: Found ${tempStudents.length} temporary students, syncing in batches...`);
            
            const { createStudentsBatch } = await import('@/features/students');
            const { removeStudentFromCache, addStudentToCache } = await import('@/lib/students-cache');
            
            // Show progress modal
            const studentSyncActions: SyncAction[] = tempStudents.map((tempStudent, index) => ({
              id: `student_${index}`,
              type: 'create_student',
              studentCode: tempStudent.nationalId || tempStudent.studentCode || tempStudent.fullName,
              status: 'pending' as const,
            }));
            setSyncActions(studentSyncActions);
            setTotalSyncActions(tempStudents.length);
            setShowSyncModal(true);
            
            // Prepare student data for batch creation
            const studentDataToSync = tempStudents.map(tempStudent => ({
              fullName: tempStudent.fullName,
              nationalId: tempStudent.nationalId || tempStudent.studentCode || undefined,
              grade: tempStudent.grade,
              center: tempStudent.classroom,
              studentPhone: tempStudent.studentPhone,
              parentPhone: tempStudent.parentPhone,
              address: tempStudent.address,
              monthlyFee: tempStudent.monthlyFee || 0,
              schedule: tempStudent.notes,
            }));
            
            // Track retry attempts for failed students
            const failedStudents: Array<{ data: typeof studentDataToSync[0]; tempStudent: typeof tempStudents[0]; attempts: number }> = [];
            
            // Process in batches of 50
            const BATCH_SIZE = 50;
            const MAX_RETRIES = 3;
            let totalSynced = 0;
            let totalFailed = 0;
            
            for (let i = 0; i < studentDataToSync.length; i += BATCH_SIZE) {
              const batch = studentDataToSync.slice(i, i + BATCH_SIZE);
              const batchTempStudents = tempStudents.slice(i, i + BATCH_SIZE);
              
              try {
                console.log(`📦 Syncing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(studentDataToSync.length / BATCH_SIZE)} (${batch.length} students)...`);
                
                const response = await createStudentsBatch(batch);
                
                if (response.success && response.data) {
                  // Remove temp students and add real ones for successful creations
                  // Match by fullName and nationalId/studentCode
                  response.data.success.forEach((syncedStudent) => {
                    const tempStudent = batchTempStudents.find(temp => 
                      temp.fullName === syncedStudent.fullName &&
                      (temp.nationalId === syncedStudent.nationalId || 
                       temp.studentCode === syncedStudent.nationalId ||
                       temp.nationalId === syncedStudent.studentCode)
                    );
                    if (tempStudent) {
                      removeStudentFromCache(tempStudent.id || tempStudent._id || '');
                      addStudentToCache(syncedStudent);
                      
                      // Update progress modal
                      const actionIndex = tempStudents.findIndex(t => 
                        (t.id || t._id) === (tempStudent.id || tempStudent._id)
                      );
                      if (actionIndex !== -1) {
                        setSyncActions(prev => prev.map((action, idx) => 
                          idx === actionIndex ? { ...action, status: 'success' as const } : action
                        ));
                      }
                    }
                  });
                  
                  // Handle failed students - remove temp if duplicate, keep for retry otherwise
                  response.data.failed.forEach((failedItem) => {
                    // Match by fullName and nationalId/studentCode from the failed student data
                    const tempStudent = batchTempStudents.find(temp => 
                      temp.fullName === failedItem.student.fullName &&
                      (temp.nationalId === failedItem.student.nationalId || 
                       temp.studentCode === failedItem.student.nationalId)
                    );
                    if (tempStudent) {
                      // If duplicate error, remove temp version
                      if (failedItem.error.includes('duplicate') || failedItem.error.includes('already exists') || failedItem.error.includes('registered')) {
                        console.log(`ℹ️ Temp student already exists: ${tempStudent.fullName}, removing temp version`);
                        removeStudentFromCache(tempStudent.id || tempStudent._id || '');
                        
                        // Update progress modal
                        const actionIndex = tempStudents.findIndex(t => 
                          (t.id || t._id) === (tempStudent.id || tempStudent._id)
                        );
                        if (actionIndex !== -1) {
                          setSyncActions(prev => prev.map((action, idx) => 
                            idx === actionIndex ? { ...action, status: 'success' as const } : action
                          ));
                        }
                      } else {
                        // Keep for retry - add to failed students list
                        const studentData = batch.find(s => 
                          s.fullName === failedItem.student.fullName &&
                          s.nationalId === failedItem.student.nationalId
                        );
                        if (studentData) {
                          failedStudents.push({ data: studentData, tempStudent, attempts: 0 });
                        }
                        
                        // Update progress modal
                        const actionIndex = tempStudents.findIndex(t => 
                          (t.id || t._id) === (tempStudent.id || tempStudent._id)
                        );
                        if (actionIndex !== -1) {
                          setSyncActions(prev => prev.map((action, idx) => 
                            idx === actionIndex ? { ...action, status: 'failed' as const, error: failedItem.error } : action
                          ));
                        }
                      }
                    }
                  });
                  
                  totalSynced += response.data.summary.succeeded;
                  totalFailed += response.data.summary.failed;
                  
                  console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} complete: ${response.data.summary.succeeded} succeeded, ${response.data.summary.failed} failed`);
                }
              } catch (error: any) {
                console.error(`❌ Failed to sync batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
                // Mark all students in this batch as failed
                batchTempStudents.forEach((tempStudent) => {
                  const studentData = batch.find(s => 
                    s.fullName === tempStudent.fullName
                  );
                  if (studentData) {
                    failedStudents.push({ data: studentData, tempStudent, attempts: 0 });
                  }
                  
                  const actionIndex = tempStudents.findIndex(t => 
                    (t.id || t._id) === (tempStudent.id || tempStudent._id)
                  );
                  if (actionIndex !== -1) {
                    setSyncActions(prev => prev.map((action, idx) => 
                      idx === actionIndex ? { ...action, status: 'failed' as const, error: 'Connection error' } : action
                    ));
                  }
                });
                totalFailed += batch.length;
              }
              
              // Small delay between batches to avoid overwhelming the server
              if (i + BATCH_SIZE < studentDataToSync.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            
            // Retry failed students individually (max 3 retries)
            if (failedStudents.length > 0) {
              console.log(`🔄 Retrying ${failedStudents.length} failed students...`);
              
              for (const failedStudent of failedStudents) {
                if (failedStudent.attempts >= MAX_RETRIES) {
                  console.log(`⚠️ Max retries reached for student: ${failedStudent.tempStudent.fullName}`);
                  continue;
                }
                
                try {
                  failedStudent.attempts++;
                  console.log(`🔄 Retry attempt ${failedStudent.attempts}/${MAX_RETRIES} for student: ${failedStudent.tempStudent.fullName}`);
                  
                  const response = await createStudentsBatch([failedStudent.data]);
                  
                  if (response.success && response.data && response.data.success.length > 0) {
                    // Success - remove temp and add real
                    removeStudentFromCache(failedStudent.tempStudent.id || failedStudent.tempStudent._id || '');
                    addStudentToCache(response.data.success[0]);
                    totalSynced++;
                    totalFailed--;
                    
                    // Update progress modal
                    const actionIndex = tempStudents.findIndex(t => 
                      (t.id || t._id) === (failedStudent.tempStudent.id || failedStudent.tempStudent._id)
                    );
                    if (actionIndex !== -1) {
                      setSyncActions(prev => prev.map((action, idx) => 
                        idx === actionIndex ? { ...action, status: 'success' as const } : action
                      ));
                    }
                  } else if (response.success && response.data && response.data.failed.length > 0) {
                    // Still failed - check if duplicate
                    const error = response.data.failed[0].error;
                    if (error.includes('duplicate') || error.includes('already exists') || error.includes('registered')) {
                      removeStudentFromCache(failedStudent.tempStudent.id || failedStudent.tempStudent._id || '');
                      totalSynced++;
                      totalFailed--;
                      
                      const actionIndex = tempStudents.findIndex(t => 
                        (t.id || t._id) === (failedStudent.tempStudent.id || failedStudent.tempStudent._id)
                      );
                      if (actionIndex !== -1) {
                        setSyncActions(prev => prev.map((action, idx) => 
                          idx === actionIndex ? { ...action, status: 'success' as const } : action
                        ));
                      }
                    }
                  }
                  
                  // Small delay between retries
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error: any) {
                  console.error(`❌ Retry failed for student ${failedStudent.tempStudent.fullName}:`, error);
                }
              }
            }
            
            console.log(`📊 Student sync complete: ${totalSynced} succeeded, ${totalFailed} failed out of ${tempStudents.length} total`);
            
            // Close modal after a short delay if all completed
            setTimeout(() => {
              if (totalSynced + totalFailed === tempStudents.length) {
                setShowSyncModal(false);
              }
            }, 2000);
          }
        } catch (error) {
          console.error('Failed to sync temp students on app load:', error);
        }
        
        const { getQueue, syncPendingActions, getPendingSessions } = await import('@/lib/offline-sync');
        const queue = getQueue();
        
        if (queue.length === 0) {
          // Refresh students cache even if no pending actions
          try {
            const { getStudents } = await import('@/features/students');
            const response = await getStudents();
            if (response.success && response.data) {
              const { saveStudentsToCache } = await import('@/lib/students-cache');
              saveStudentsToCache(response.data);
            }
          } catch (error) {
            console.error('Failed to refresh students cache:', error);
          }
          return;
        }
        
        console.log(`🔄 App loaded: Found ${queue.length} pending actions, syncing...`);
        
        // Initialize sync actions for modal
        const initialActions: SyncAction[] = queue.map(action => ({
          id: action.id,
          type: action.type,
          studentCode: action.data?.studentCode || action.data?.qrToken,
          status: 'pending' as const,
        }));
        
        setSyncActions(initialActions);
        setTotalSyncActions(queue.length);
        setShowSyncModal(true);
        
        // Import required functions
        const { createSession, addStudentToSession, removeStudentFromSession, updateAttendanceStatus } = await import('@/features/sessions');
        const { scanAttendance } = await import('@/features/attendance');
        
        // Progress callback
        const onProgress = (actionId: string, status: 'success' | 'failed', error?: string) => {
          setSyncActions(prev => prev.map(action => 
            action.id === actionId 
              ? { ...action, status, error }
              : action
          ));
        };
        
        // Sync session creations first (they need to be created before attendance can be synced)
        const pendingSessions = getPendingSessions();
        if (pendingSessions.length > 0) {
          const result = await syncPendingActions({
            createSession: async (data) => {
              const response = await createSession(data);
              
              // After creating session, migrate attendance data from temp session
              if (response.data && response.data.id) {
                const newSessionId = response.data.id || response.data._id;
                
                // Try to find temp session ID from localStorage by matching data
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
                      
                      // Update localStorage with new session ID
                      localStorage.setItem(`session_${newSessionId}`, JSON.stringify(response.data));
                      localStorage.setItem(`session_${newSessionId}_attendances`, tempAttendances);
                      
                      // Migrate attendance actions to new session ID
                      const { getQueue: getQueueAgain } = await import('@/lib/offline-sync');
                      const queueAgain = getQueueAgain();
                      const updatedQueue = queueAgain.map(action => {
                        if (action.sessionId === tempId && 
                            (action.type === 'add_attendance' || 
                             action.type === 'remove_attendance' || 
                             action.type === 'update_attendance_status' || 
                             action.type === 'scan_attendance')) {
                          return { ...action, sessionId: newSessionId };
                        }
                        return action;
                      });
                      
                      // Save updated queue
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('offline_actions_queue', JSON.stringify(updatedQueue));
                      }
                      
                      // Clean up temp session data
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
          }, onProgress);
          
          if (result.success > 0) {
            console.log(`✅ Synced ${result.success} sessions on app load`);
          }
        }
        
        // Now sync all attendance actions for all sessions
        // Get all unique session IDs from pending actions
        const attendanceActions = queue.filter(a => 
          a.type === 'add_attendance' || 
          a.type === 'remove_attendance' || 
          a.type === 'update_attendance_status' || 
          a.type === 'scan_attendance'
        );
        
        const uniqueSessionIds = [...new Set(attendanceActions.map(a => a.sessionId).filter(Boolean))];
        
        // Skip temp sessions (they will be synced after their real session is created)
        const realSessionIds = uniqueSessionIds.filter(id => !id?.startsWith('temp_'));
        
        if (realSessionIds.length > 0) {
          console.log(`🔄 Syncing attendance actions for ${realSessionIds.length} sessions...`);
          
          // Sync all attendance actions
          const attendanceResult = await syncPendingActions({
            addAttendance: async (sid, data) => {
              // Validate studentCode before sending
              if (!data.studentCode || !data.studentCode.trim()) {
                console.warn('⚠️ Skipping sync: Invalid studentCode', data);
                throw new Error('Invalid student code');
              }
              
              try {
                const response = await addStudentToSession(sid, data.studentCode.trim());
                return response;
              } catch (error: any) {
                // If student already exists (400) or not found (404), silently skip
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
          }, onProgress);
          
          if (attendanceResult.success > 0) {
            console.log(`✅ Synced ${attendanceResult.success} attendance actions on app load`);
          }
        }
        
        // Don't auto-close - user must click OK
      } catch (error) {
        console.error('Failed to sync pending actions on app load:', error);
        setShowSyncModal(false);
        setSyncActions([]);
        setTotalSyncActions(0);
      }
    };

    syncOnLoad();
  }, [isAuthenticated]);

  // Sync pending actions and refresh cache when connection is restored
  useEffect(() => {
    const handleOnline = async () => {
      if (!isAuthenticated || typeof window === 'undefined') {
        console.log('🔄 Online event: Not authenticated or window undefined');
        return;
      }
      
      console.log('🌐 Online event detected, checking for pending actions...');
      
      // Wait a bit for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Double check we're still online
      if (!navigator.onLine) {
        console.log('🔄 Online event: Connection lost during wait');
        return;
      }
      
      try {
        const { getQueue, syncPendingActions, getPendingSessions } = await import('@/lib/offline-sync');
        const queue = getQueue();
        
        console.log(`🔄 Online event: Found ${queue.length} pending actions in queue`);
        
        if (queue.length === 0) {
          console.log('🔄 Online event: No pending actions, checking for temp students to sync...');
          
          // Check for temporary students that need to be synced
          try {
            const { getStudentsFromCache } = await import('@/lib/students-cache');
            const cachedStudents = getStudentsFromCache();
            const tempStudents = cachedStudents.filter(s => {
              const id = (s.id || s._id || '').toString();
              return id.startsWith('temp_');
            });
            
            if (tempStudents.length > 0) {
              console.log(`🔄 Found ${tempStudents.length} temporary students, syncing in batches...`);
              
              const { createStudentsBatch } = await import('@/features/students');
              const { removeStudentFromCache, addStudentToCache } = await import('@/lib/students-cache');
              
              // Show progress modal if not already showing
              if (!showSyncModal) {
                const studentSyncActions: SyncAction[] = tempStudents.map((tempStudent, index) => ({
                  id: `student_${index}`,
                  type: 'create_student',
                  studentCode: tempStudent.nationalId || tempStudent.studentCode || tempStudent.fullName,
                  status: 'pending' as const,
                }));
                setSyncActions(studentSyncActions);
                setTotalSyncActions(tempStudents.length);
                setShowSyncModal(true);
              }
              
              // Prepare student data for batch creation
              const studentDataToSync = tempStudents.map(tempStudent => ({
                fullName: tempStudent.fullName,
                nationalId: tempStudent.nationalId || tempStudent.studentCode || undefined,
                grade: tempStudent.grade,
                center: tempStudent.classroom,
                studentPhone: tempStudent.studentPhone,
                parentPhone: tempStudent.parentPhone,
                address: tempStudent.address,
                monthlyFee: tempStudent.monthlyFee || 0,
                schedule: tempStudent.notes,
              }));
              
              // Track retry attempts for failed students
              const failedStudents: Array<{ data: typeof studentDataToSync[0]; tempStudent: typeof tempStudents[0]; attempts: number }> = [];
              
              // Process in batches of 50
              const BATCH_SIZE = 50;
              const MAX_RETRIES = 3;
              let totalSynced = 0;
              let totalFailed = 0;
              
              for (let i = 0; i < studentDataToSync.length; i += BATCH_SIZE) {
                const batch = studentDataToSync.slice(i, i + BATCH_SIZE);
                const batchTempStudents = tempStudents.slice(i, i + BATCH_SIZE);
                
                try {
                  console.log(`📦 Syncing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(studentDataToSync.length / BATCH_SIZE)} (${batch.length} students)...`);
                  
                  const response = await createStudentsBatch(batch);
                  
                  if (response.success && response.data) {
                    // Remove temp students and add real ones for successful creations
                    // Match by fullName and nationalId/studentCode
                    response.data.success.forEach((syncedStudent) => {
                      const tempStudent = batchTempStudents.find(temp => 
                        temp.fullName === syncedStudent.fullName &&
                        (temp.nationalId === syncedStudent.nationalId || 
                         temp.studentCode === syncedStudent.nationalId ||
                         temp.nationalId === syncedStudent.studentCode)
                      );
                      if (tempStudent) {
                        removeStudentFromCache(tempStudent.id || tempStudent._id || '');
                        addStudentToCache(syncedStudent);
                        
                        // Update progress modal
                        const actionIndex = tempStudents.findIndex(t => 
                          (t.id || t._id) === (tempStudent.id || tempStudent._id)
                        );
                        if (actionIndex !== -1) {
                          setSyncActions(prev => prev.map((action, idx) => 
                            idx === actionIndex ? { ...action, status: 'success' as const } : action
                          ));
                        }
                      }
                    });
                    
                    // Handle failed students - remove temp if duplicate, keep for retry otherwise
                    response.data.failed.forEach((failedItem) => {
                      // Match by fullName and nationalId/studentCode from the failed student data
                      const tempStudent = batchTempStudents.find(temp => 
                        temp.fullName === failedItem.student.fullName &&
                        (temp.nationalId === failedItem.student.nationalId || 
                         temp.studentCode === failedItem.student.nationalId)
                      );
                      if (tempStudent) {
                        // If duplicate error, remove temp version
                        if (failedItem.error.includes('duplicate') || failedItem.error.includes('already exists') || failedItem.error.includes('registered')) {
                          console.log(`ℹ️ Temp student already exists: ${tempStudent.fullName}, removing temp version`);
                          removeStudentFromCache(tempStudent.id || tempStudent._id || '');
                          
                          // Update progress modal
                          const actionIndex = tempStudents.findIndex(t => 
                            (t.id || t._id) === (tempStudent.id || tempStudent._id)
                          );
                          if (actionIndex !== -1) {
                            setSyncActions(prev => prev.map((action, idx) => 
                              idx === actionIndex ? { ...action, status: 'success' as const } : action
                            ));
                          }
                        } else {
                          // Keep for retry - add to failed students list
                          const studentData = batch.find(s => 
                            s.fullName === failedItem.student.fullName &&
                            s.nationalId === failedItem.student.nationalId
                          );
                          if (studentData) {
                            failedStudents.push({ data: studentData, tempStudent, attempts: 0 });
                          }
                          
                          // Update progress modal
                          const actionIndex = tempStudents.findIndex(t => 
                            (t.id || t._id) === (tempStudent.id || tempStudent._id)
                          );
                          if (actionIndex !== -1) {
                            setSyncActions(prev => prev.map((action, idx) => 
                              idx === actionIndex ? { ...action, status: 'failed' as const, error: failedItem.error } : action
                            ));
                          }
                        }
                      }
                    });
                    
                    totalSynced += response.data.summary.succeeded;
                    totalFailed += response.data.summary.failed;
                    
                    console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} complete: ${response.data.summary.succeeded} succeeded, ${response.data.summary.failed} failed`);
                  }
                } catch (error: any) {
                  console.error(`❌ Failed to sync batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
                  // Mark all students in this batch as failed
                  batchTempStudents.forEach((tempStudent) => {
                    const studentData = batch.find(s => 
                      s.fullName === tempStudent.fullName
                    );
                    if (studentData) {
                      failedStudents.push({ data: studentData, tempStudent, attempts: 0 });
                    }
                    
                    const actionIndex = tempStudents.findIndex(t => 
                      (t.id || t._id) === (tempStudent.id || tempStudent._id)
                    );
                    if (actionIndex !== -1) {
                      setSyncActions(prev => prev.map((action, idx) => 
                        idx === actionIndex ? { ...action, status: 'failed' as const, error: 'Connection error' } : action
                      ));
                    }
                  });
                  totalFailed += batch.length;
                }
                
                // Small delay between batches to avoid overwhelming the server
                if (i + BATCH_SIZE < studentDataToSync.length) {
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
              }
              
              // Retry failed students individually (max 3 retries)
              if (failedStudents.length > 0) {
                console.log(`🔄 Retrying ${failedStudents.length} failed students...`);
                
                for (const failedStudent of failedStudents) {
                  if (failedStudent.attempts >= MAX_RETRIES) {
                    console.log(`⚠️ Max retries reached for student: ${failedStudent.tempStudent.fullName}`);
                    continue;
                  }
                  
                  try {
                    failedStudent.attempts++;
                    console.log(`🔄 Retry attempt ${failedStudent.attempts}/${MAX_RETRIES} for student: ${failedStudent.tempStudent.fullName}`);
                    
                    const response = await createStudentsBatch([failedStudent.data]);
                    
                    if (response.success && response.data && response.data.success.length > 0) {
                      // Success - remove temp and add real
                      removeStudentFromCache(failedStudent.tempStudent.id || failedStudent.tempStudent._id || '');
                      addStudentToCache(response.data.success[0]);
                      totalSynced++;
                      totalFailed--;
                      
                      // Update progress modal
                      const actionIndex = tempStudents.findIndex(t => 
                        (t.id || t._id) === (failedStudent.tempStudent.id || failedStudent.tempStudent._id)
                      );
                      if (actionIndex !== -1) {
                        setSyncActions(prev => prev.map((action, idx) => 
                          idx === actionIndex ? { ...action, status: 'success' as const } : action
                        ));
                      }
                    } else if (response.success && response.data && response.data.failed.length > 0) {
                      // Still failed - check if duplicate
                      const error = response.data.failed[0].error;
                      if (error.includes('duplicate') || error.includes('already exists') || error.includes('registered')) {
                        removeStudentFromCache(failedStudent.tempStudent.id || failedStudent.tempStudent._id || '');
                        totalSynced++;
                        totalFailed--;
                        
                        const actionIndex = tempStudents.findIndex(t => 
                          (t.id || t._id) === (failedStudent.tempStudent.id || failedStudent.tempStudent._id)
                        );
                        if (actionIndex !== -1) {
                          setSyncActions(prev => prev.map((action, idx) => 
                            idx === actionIndex ? { ...action, status: 'success' as const } : action
                          ));
                        }
                      }
                    }
                    
                    // Small delay between retries
                    await new Promise(resolve => setTimeout(resolve, 100));
                  } catch (error: any) {
                    console.error(`❌ Retry failed for student ${failedStudent.tempStudent.fullName}:`, error);
                  }
                }
              }
              
              console.log(`📊 Student sync complete: ${totalSynced} succeeded, ${totalFailed} failed out of ${tempStudents.length} total`);
            }
            
            // Refresh students cache from server (will merge with any remaining temp students)
            const { getStudents } = await import('@/features/students');
            const response = await getStudents();
            
            if (response.success && response.data) {
              const { saveStudentsToCache } = await import('@/lib/students-cache');
              saveStudentsToCache(response.data);
              console.log(`🔄 Refreshed students cache (${response.data.length} students)`);
            }
          } catch (error) {
            console.error('Failed to sync temp students or refresh cache:', error);
          }
          return;
        }
        
        console.log(`🔄 Connection restored: Found ${queue.length} pending actions, showing modal and syncing...`);
        
        // Initialize sync actions for modal BEFORE starting sync
        const initialActions: SyncAction[] = queue.map(action => ({
          id: action.id,
          type: action.type,
          studentCode: action.data?.studentCode || action.data?.qrToken,
          status: 'pending' as const,
        }));
        
        // Set state synchronously to show modal immediately
        console.log('🔄 Setting modal state...');
        setSyncActions(initialActions);
        setTotalSyncActions(queue.length);
        setShowSyncModal(true);
        
        // Force a small delay to ensure state is updated and modal renders
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('🔄 Modal should be visible now, starting sync...');
        
        // Import required functions
        const { createSession, addStudentToSession, removeStudentFromSession, updateAttendanceStatus } = await import('@/features/sessions');
        const { scanAttendance } = await import('@/features/attendance');
        
        // Progress callback
        const onProgress = (actionId: string, status: 'success' | 'failed', error?: string) => {
          setSyncActions(prev => prev.map(action => 
            action.id === actionId 
              ? { ...action, status, error }
              : action
          ));
        };
        
        // Sync session creations first
        const pendingSessions = getPendingSessions();
        if (pendingSessions.length > 0) {
          await syncPendingActions({
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
                      localStorage.setItem(`session_${newSessionId}`, JSON.stringify(response.data));
                      localStorage.setItem(`session_${newSessionId}_attendances`, tempAttendances);
                      
                      const { getQueue: getQueueAgain } = await import('@/lib/offline-sync');
                      const queueAgain = getQueueAgain();
                      const updatedQueue = queueAgain.map(action => {
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
          }, onProgress);
        }
        
        // Sync attendance actions
        const attendanceActions = queue.filter(a => 
          a.type === 'add_attendance' || 
          a.type === 'remove_attendance' || 
          a.type === 'update_attendance_status' || 
          a.type === 'scan_attendance'
        );
        
        const uniqueSessionIds = [...new Set(attendanceActions.map(a => a.sessionId).filter(Boolean))];
        const realSessionIds = uniqueSessionIds.filter(id => !id?.startsWith('temp_'));
        
        if (realSessionIds.length > 0) {
          await syncPendingActions({
            addAttendance: async (sid, data) => {
              if (!data.studentCode || !data.studentCode.trim()) {
                throw new Error('Invalid student code');
              }
              
              try {
                const response = await addStudentToSession(sid, data.studentCode.trim());
                return response;
              } catch (error: any) {
                if (error?.response?.status === 400 || error?.response?.status === 404) {
                  return { success: true, message: error?.response?.data?.message, data: null };
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
          }, onProgress);
        }
        
        // Refresh students cache
        try {
          const { getStudents } = await import('@/features/students');
          const response = await getStudents();
          
          if (response.success && response.data) {
            const { saveStudentsToCache } = await import('@/lib/students-cache');
            saveStudentsToCache(response.data);
            console.log(`🔄 Refreshed students cache (${response.data.length} students)`);
          }
        } catch (error) {
          console.error('Failed to refresh students cache:', error);
        }
      } catch (error) {
        console.error('Failed to sync pending actions on online:', error);
        setShowSyncModal(false);
        setSyncActions([]);
        setTotalSyncActions(0);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Routes that should show sidebar + require auth
  // Note: /dashboard is excluded for assistants, but they can access /dashboard/assistants is handled by middleware
  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/finance') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/grades') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/students') ||
    pathname.startsWith('/admin');

  // Avoid client-side flash while middleware redirects, and handle edge cases.
  // In offline mode, allow access if user data exists in localStorage (even if token check fails)
  useEffect(() => {
    if (isAppRoute && !isLoading && !isAuthenticated) {
      // Check if we're offline and have cached user data
      const isOffline = typeof window !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        try {
          const cachedUser = getUserFromStorage();
          const cachedToken = getToken();
          
          // If we have cached user and token, allow access (offline mode)
          if (cachedUser && cachedToken) {
            console.log('📴 Offline mode: Using cached authentication');
            return; // Don't redirect, allow access
          }
        } catch (error) {
          console.error('Error checking cached auth:', error);
        }
      }
      
      // Only redirect if truly not authenticated
      router.push(ROUTES.LOGIN);
    }
  }, [isAppRoute, isLoading, isAuthenticated, router]);

  if (isAppRoute) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FCFCFC]" dir="ltr">
          <Spinner size="lg" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return (
      <OfflineGuard>
      <div className="min-h-screen bg-[#FCFCFC] flex" dir="ltr">
        <MobileGlassHeader />
        <Sidebar />
        <main className="flex-1 p-4 pt-24 lg:pt-8 lg:p-8 overflow-y-auto lg:ml-[120px]">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
        <SyncProgressModal
          isOpen={showSyncModal}
          totalActions={totalSyncActions}
          actions={syncActions}
          onClose={() => {
            setShowSyncModal(false);
            setTimeout(() => {
              setSyncActions([]);
              setTotalSyncActions(0);
            }, 300);
          }}
        />
      </OfflineGuard>
    );
  }

  // Auth/public routes: no sidebar
  return <>{children}</>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}


