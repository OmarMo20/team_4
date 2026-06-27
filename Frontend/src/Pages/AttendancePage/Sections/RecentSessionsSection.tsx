import { Calendar, Clock } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import SessionsTable from '@/components/SessionsTable';
import type { Session } from '@/features/sessions';

interface RecentSessionsSectionProps {
    sessions: Session[];
    loading: boolean;
    onCreateClick: () => void;
    onSessionDeleted?: () => void;
}

export default function RecentSessionsSection({
    sessions,
    loading,
    onCreateClick,
    onSessionDeleted,
}: RecentSessionsSectionProps) {
    const safeSessions = sessions || [];
    
    return (
        <div className="space-y-4 sm:space-y-6 text-left" dir="ltr">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-base sm:text-xl font-extrabold text-[#414141] flex items-center gap-2">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-[#1E1F22]" />
                    <span>Recent Sessions</span>
                </h3>
            </div>

            {loading ? (
                <div className="bg-white rounded-[20px] p-6 sm:p-12 text-center border border-gray-200 min-h-[260px] sm:min-h-[400px] flex items-center justify-center">
                    <p className="text-[#A1A1A1] text-base sm:text-lg">Loading...</p>
                </div>
            ) : safeSessions.length === 0 ? (
                <div className="bg-white rounded-[20px] p-6 sm:p-12 border border-gray-200 min-h-[260px] sm:min-h-[420px] flex items-center justify-center shadow-xl">
                    <EmptyState
                        icon={Calendar}
                        title="No Sessions Yet"
                        description="Create a new session to track student attendance"
                        actionLabel="Create First Session"
                        onAction={onCreateClick}
                    />
                </div>
            ) : (
                <div className="bg-white rounded-[20px] p-4 sm:p-6 border border-gray-200 shadow-xl overflow-hidden">
                    <SessionsTable sessions={safeSessions} onSessionDeleted={onSessionDeleted} />
                </div>
            )}
        </div>
    );
}
