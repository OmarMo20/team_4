import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <div className="text-center flex flex-col items-center">
            <div className="bg-[#FCFCFC] rounded-full p-8 mb-6">
                <Icon className="h-20 w-20 text-[#D1D1D1]" />
            </div>
            <h4 className="text-[#A1A1A1] text-xl font-bold font-cairo mb-2">{title}</h4>
            <p className="text-[#D1D1D1] font-cairo max-w-sm mb-8">{description}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="bg-white text-white px-8 py-3 rounded-[12px] font-bold font-cairo hover:bg-[#4a238b] transition-all flex items-center gap-2 shadow-lg active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    <span>{actionLabel}</span>
                </button>
            )}
        </div>
    );
}
