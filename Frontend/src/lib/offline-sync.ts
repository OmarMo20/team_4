/**
 * Offline Sync Manager
 * Handles queuing and syncing of offline actions when connection is restored
 */

export interface PendingAction {
  id: string;
  type: 'add_attendance' | 'remove_attendance' | 'update_attendance_status' | 'scan_attendance' | 'create_session';
  sessionId?: string; // Optional for create_session
  data: any;
  timestamp: number;
  retries: number;
}

const STORAGE_KEY = 'offline_actions_queue';
const MAX_RETRIES = 3;

/**
 * Add an action to the offline queue
 */
export function queueAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retries'>): string {
  const actionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const pendingAction: PendingAction = {
    id: actionId,
    ...action,
    timestamp: Date.now(),
    retries: 0,
  };

  const queue = getQueue();
  queue.push(pendingAction);
  saveQueue(queue);

  console.log('📦 Queued offline action:', pendingAction.type, actionId);
  return actionId;
}

/**
 * Get all pending actions
 */
export function getQueue(): PendingAction[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading offline queue:', error);
    return [];
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue: PendingAction[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving offline queue:', error);
  }
}

/**
 * Remove an action from the queue
 */
export function removeAction(actionId: string): void {
  const queue = getQueue();
  const filtered = queue.filter(a => a.id !== actionId);
  saveQueue(filtered);
  console.log('✅ Removed action from queue:', actionId);
}

/**
 * Get pending actions for a specific session
 */
export function getSessionPendingActions(sessionId: string): PendingAction[] {
  return getQueue().filter(a => a.sessionId === sessionId);
}

/**
 * Get all pending session creations
 */
export function getPendingSessions(): PendingAction[] {
  return getQueue().filter(a => a.type === 'create_session');
}

/**
 * Sync all pending actions when connection is restored
 */
export async function syncPendingActions(
  handlers: {
    addAttendance?: (sessionId: string, data: any) => Promise<any>;
    removeAttendance?: (sessionId: string, attendanceId: string) => Promise<any>;
    updateAttendanceStatus?: (sessionId: string, attendanceId: string, status: string) => Promise<any>;
    scanAttendance?: (sessionId: string, qrToken: string) => Promise<any>;
    createSession?: (data: any) => Promise<any>;
  },
  onProgress?: (actionId: string, status: 'success' | 'failed', error?: string) => void
): Promise<{ success: number; failed: number }> {
  const queue = getQueue();
  if (queue.length === 0) {
    console.log('📭 No pending actions to sync');
    return { success: 0, failed: 0 };
  }

  console.log(`🔄 Syncing ${queue.length} pending actions...`);
  
  let success = 0;
  let failed = 0;
  const failedActions: PendingAction[] = [];

  for (const action of queue) {
    try {
      let result;
      
      switch (action.type) {
        case 'add_attendance':
          if (handlers.addAttendance && action.sessionId) {
            // Skip if session is temporary (starts with temp_)
            if (action.sessionId.startsWith('temp_')) {
              console.log(`⏭️ Skipping sync for temporary session: ${action.sessionId}`);
              removeAction(action.id);
              result = 'SKIPPED';
              break;
            }
            result = await handlers.addAttendance(action.sessionId, action.data);
          }
          break;
        case 'remove_attendance':
          if (handlers.removeAttendance && action.sessionId) {
            // Skip if session is temporary
            if (action.sessionId.startsWith('temp_')) {
              console.log(`⏭️ Skipping sync for temporary session: ${action.sessionId}`);
              removeAction(action.id);
              result = 'SKIPPED';
              break;
            }
            // Skip if attendance ID is temporary (it was never created on server)
            if (action.data?.attendanceId?.startsWith('temp_')) {
              console.log(`⏭️ Skipping sync for temporary attendance ID: ${action.data.attendanceId} (was never on server)`);
              removeAction(action.id);
              // Mark as success (not failed) since it was already handled locally
              if (onProgress) {
                onProgress(action.id, 'success');
              }
              result = 'SKIPPED';
              break;
            }
            result = await handlers.removeAttendance(action.sessionId, action.data.attendanceId);
          }
          break;
        case 'update_attendance_status':
          if (handlers.updateAttendanceStatus && action.sessionId) {
            // Skip if session is temporary
            if (action.sessionId.startsWith('temp_')) {
              console.log(`⏭️ Skipping sync for temporary session: ${action.sessionId}`);
              removeAction(action.id);
              result = 'SKIPPED';
              break;
            }
            result = await handlers.updateAttendanceStatus(
              action.sessionId,
              action.data.attendanceId,
              action.data.status
            );
          }
          break;
        case 'scan_attendance':
          if (handlers.scanAttendance && action.sessionId) {
            // Skip if session is temporary
            if (action.sessionId.startsWith('temp_')) {
              console.log(`⏭️ Skipping sync for temporary session: ${action.sessionId}`);
              removeAction(action.id);
              result = 'SKIPPED';
              break;
            }
            result = await handlers.scanAttendance(action.sessionId, action.data.qrToken);
          }
          break;
        case 'create_session':
          if (handlers.createSession) {
            result = await handlers.createSession(action.data);
          }
          break;
      }

      // Check if action was skipped (for temp sessions)
      if (result === 'SKIPPED') {
        // Already removed in the switch case
        continue;
      }
      
      // Check if result indicates success (even if data is null for validation errors)
      if (result && (result.success !== false || typeof result === 'object')) {
        removeAction(action.id);
        success++;
        console.log(`✅ Synced action: ${action.type} (${action.id})`);
        // Notify progress callback
        if (onProgress) {
          onProgress(action.id, 'success');
        }
      } else {
        throw new Error('No handler for action type');
      }
    } catch (error: any) {
      // Check if it's a validation error (400) or not found (404) - these shouldn't be retried
      const isValidationError = error?.response?.status === 400 || error?.response?.status === 404;
      const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
      const isNetworkError = error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !error?.response;
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      
      if (isValidationError) {
        // For validation errors, remove the action and notify
        console.log(`ℹ️ Removing action (validation error): ${errorMessage}`, { actionId: action.id, type: action.type });
        removeAction(action.id);
        // Notify progress callback with error
        if (onProgress) {
          // For remove_attendance, show a different message
          if (action.type === 'remove_attendance') {
            onProgress(action.id, 'failed', `Failed to delete student attendance - it might have been deleted already`);
          } else {
            const studentCode = action.data?.studentCode || action.data?.qrToken || 'unknown';
            onProgress(action.id, 'failed', `Student with code ${studentCode} was not registered`);
          }
        }
        // Don't count as failed - it's expected behavior
        continue;
      }
      
      // For timeout or network errors, log as info (will retry)
      if (isTimeout || isNetworkError) {
        console.log(`⏱️ Sync action ${action.id} failed (${isTimeout ? 'timeout' : 'network'}): Will retry`, {
          type: action.type,
          retries: action.retries + 1,
        });
      } else {
        // Log other errors
        console.error(`❌ Failed to sync action ${action.id}:`, error);
      }
      
      // Increment retries for network/server errors
      action.retries++;
      
      if (action.retries >= MAX_RETRIES) {
        // Remove after max retries
        removeAction(action.id);
        failed++;
        console.warn(`⚠️ Removed action after ${MAX_RETRIES} retries: ${action.id}`, { type: action.type });
        // Notify progress callback with error
        if (onProgress) {
          const studentCode = action.data?.studentCode || action.data?.qrToken || 'unknown';
          onProgress(action.id, 'failed', `Student with code ${studentCode} was not registered`);
        }
      } else {
        // Keep for retry
        failedActions.push(action);
        failed++;
        // Notify progress callback with error (will retry later)
        if (onProgress) {
          const studentCode = action.data?.studentCode || action.data?.qrToken || 'unknown';
          onProgress(action.id, 'failed', `Failed to register student with code ${studentCode} - will retry`);
        }
      }
    }
  }

  // Update queue with failed actions (with incremented retries)
  if (failedActions.length > 0) {
    const currentQueue = getQueue();
    const updatedQueue = currentQueue.map(qa => {
      const failed = failedActions.find(fa => fa.id === qa.id);
      return failed || qa;
    });
    saveQueue(updatedQueue);
  }

  console.log(`📊 Sync complete: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

/**
 * Clear all pending actions (use with caution)
 */
export function clearQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Cleared offline queue');
}

