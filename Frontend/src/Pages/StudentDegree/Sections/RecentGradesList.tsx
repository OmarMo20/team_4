import { Calendar } from 'lucide-react';

interface RecentGradesProps {
    grades: any[];
    loading?: boolean;
}

export default function RecentGradesList({ grades, loading }: RecentGradesProps) {
    if (loading || !grades) {
        return <div className="animate-pulse h-64 bg-white rounded-3xl" />;
    }

    return (
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200 shadow-xl h-full text-left" dir="ltr">
            <div className="flex items-center justify-between mb-6 md:mb-8">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-bold text-lg md:text-xl text-gray-900 uppercase tracking-wide">Recent Grades</h3>
                </div>
            </div>

            <div className="space-y-3 md:space-y-4 max-h-[500px] lg:max-h-none overflow-y-auto custom-scrollbar pr-1">
                {grades.length === 0 ? (
                    <p className="text-center text-gray-500 py-4 font-medium">No grades recorded</p>
                ) : (
                    grades.map((grade) => (
                        <div key={grade.id} className="p-4 md:p-5 bg-[#F9F9F9] rounded-2xl flex flex-col gap-1 md:gap-2 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-gray-900 text-base md:text-lg truncate max-w-[150px] md:max-w-none">{grade.studentName}</p>
                                <span className="text-xs md:text-sm font-bold text-gray-700 whitespace-nowrap">{grade.score}/{grade.fullMark}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs md:text-sm text-[#80848E] font-medium truncate max-w-[120px] md:max-w-none">{grade.examName}</p>
                                <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 md:py-1 rounded-full whitespace-nowrap ${
                                    grade.percentage >= 80 ? 'bg-green-100 text-green-600' :
                                    grade.percentage >= 50 ? 'bg-blue-100 text-blue-600' :
                                    'bg-red-100 text-red-600'
                                }`}>
                                    {grade.percentage}%
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #EBE4FF;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
