import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    iconBgColor?: string;
    iconColor?: string;
    bubbleColor?: string;
}

export default function StatCard({
    title,
    value,
    icon: Icon,
    iconBgColor = 'bg-indigo-50',
    iconColor = 'text-indigo-600',
    bubbleColor = '#1E1F22',
}: StatCardProps) {
    return (
        <div className="bg-white rounded-[18px] sm:rounded-[20px] p-3 sm:p-6 shadow-xl border border-gray-50 relative overflow-hidden group hover:shadow-2xl transition-shadow min-h-[92px] sm:h-[134px] flex items-center">
            {/* Decorative Bubble */}
            <div 
                className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-500"
                style={{ backgroundColor: bubbleColor }}
            />
            
            <div className="flex items-center justify-between sm:flex-row flex-col gap-2 sm:gap-0 w-full relative z-10">
                <div className="self-end sm:self-auto">
                    <div className={`h-10 w-10 sm:h-[67px] sm:w-[71px] ${iconBgColor} rounded-[16px] sm:rounded-[20px] flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 sm:h-8 sm:w-8 ${iconColor}`} />
                    </div>
                </div>
                <div className="text-right w-full sm:w-auto">
                    <p className="text-[#A1A1A1] text-[10px] sm:text-sm font-medium font-cairo leading-tight">{title}</p>
                    <p className="text-xl sm:text-[40px] font-bold text-[#414141] font-cairo leading-none mt-1">{value}</p>
                </div>
            </div>
        </div>
    );
}
