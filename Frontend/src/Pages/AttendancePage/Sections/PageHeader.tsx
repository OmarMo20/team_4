import { Plus } from 'lucide-react';

interface PageHeaderProps {
    onCreateClick: () => void;
}

export default function PageHeader({ onCreateClick }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 mb-6 sm:mb-8 text-left">
            <div className="text-left">
                <h1 className="font-bold text-2xl sm:text-[40px] text-[#414141] leading-tight">Manage Sessions</h1>
                <p className="text-[#A1A1A1] text-sm sm:text-lg">Create a new session to track student attendance</p>
            </div>
            <button
                onClick={onCreateClick}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-white px-4 sm:px-6 py-3 rounded-[12px] font-medium text-base sm:text-[20.07px] hover:bg-[#4a238b] transition-all shadow-2xl active:scale-95"
            >
                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Add Session</span>
            </button>
        </div>
    );
}
