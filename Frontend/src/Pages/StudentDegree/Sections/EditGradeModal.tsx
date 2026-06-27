import { X, Award, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { examService } from '@/services/examService';
import { useToast } from '@/components/ui';

interface EditGradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    result: any | null;
}

export default function EditGradeModal({ isOpen, onClose, onSuccess, result }: EditGradeModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        score: '',
        fullMark: '',
        notes: ''
    });

    useEffect(() => {
        if (result && isOpen) {
            setFormData({
                score: result.score?.toString() || '',
                fullMark: result.fullMark?.toString() || '',
                notes: result.notes || ''
            });
        }
    }, [result, isOpen]);

    if (!isOpen || !result) return null;

    const isScoreInvalid = Number(formData.score) > Number(formData.fullMark);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isScoreInvalid) {
            showToast('Score cannot be greater than full mark', 'error');
            return;
        }

        setLoading(true);
        try {
            await examService.updateResult(result.id, {
                score: Number(formData.score),
                notes: formData.notes
            });
            showToast('Grade updated successfully', 'success');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || 'An error occurred while updating the grade';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[95vh] flex flex-col text-left" dir="ltr">
                {/* Header */}
                <div className="p-6 md:p-8 bg-[#F8F7FF] border-b border-gray-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 text-left">
                        <div className="h-12 w-12 md:h-16 md:w-16 bg-[#EBE4FF] rounded-2xl md:rounded-[1.5rem] flex items-center justify-center">
                            <Award className="h-7 w-7 md:h-9 md:w-9 text-[#4F46E5]" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl md:text-3xl font-bold text-gray-900">Edit Grade</h2>
                            <p className="text-sm md:text-lg text-[#80848E] font-medium">{result.studentName} - {result.examName}</p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-gray-200 flex items-center justify-center text-[#80848E] transition-colors bg-white shadow-xl border border-gray-200"
                    >
                        <X className="h-6 w-6 md:h-7 md:w-7" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto flex-1 custom-scrollbar text-left">
                    {/* Student and Exam Info (Read-only) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                        <div className="space-y-3">
                            <label className="flex items-center justify-start gap-2 text-lg md:text-xl font-bold text-[#414141] mb-1">
                                <span>Student Name</span>
                            </label>
                            <input 
                                readOnly
                                type="text" 
                                className="w-full px-6 py-4 md:py-5 rounded-2xl border-2 border-transparent outline-none transition-all text-left text-lg md:text-xl font-medium bg-[#F0F0F0] text-[#717171] cursor-not-allowed"
                                value={result.studentName}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center justify-start gap-2 text-lg md:text-xl font-bold text-[#414141] mb-1">
                                <span>Exam Name</span>
                            </label>
                            <input 
                                readOnly
                                type="text"
                                className="w-full px-6 py-4 md:py-5 rounded-2xl border-2 border-transparent outline-none transition-all text-left text-lg md:text-xl font-medium bg-[#F0F0F0] text-[#717171] cursor-not-allowed"
                                value={result.examName}
                            />
                        </div>
                    </div>

                    {/* Score */}
                    <div className="space-y-3">
                        <label className="flex items-center justify-start gap-2 text-lg md:text-xl font-bold text-[#414141] mb-1">
                            <Award className="h-5 w-5 md:h-6 md:w-6 text-[#4F46E5]/70" />
                            <span>Student Grade</span>
                        </label>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <div className="flex-[3]">
                                    <input 
                                        required
                                        type="number" 
                                        min="0"
                                        className={`w-full px-6 py-4 md:py-5 rounded-2xl border-2 outline-none transition-all text-left text-lg md:text-xl font-medium ${isScoreInvalid ? 'border-red-400 bg-red-50' : 'border-transparent bg-[#F9F9F9] focus:border-indigo-400'}`}
                                        placeholder="Score"
                                        value={formData.score}
                                        onChange={e => setFormData({...formData, score: e.target.value})}
                                    />
                                </div>
                                <span className="text-2xl font-bold text-gray-300">/</span>
                                <div className="flex-[2]">
                                    <input 
                                        required
                                        readOnly
                                        type="number" 
                                        min="1"
                                        className="w-full px-4 py-4 md:py-5 rounded-2xl border-2 border-transparent outline-none transition-all text-center text-lg md:text-xl font-medium bg-[#F0F0F0] text-[#717171] cursor-not-allowed"
                                        value={formData.fullMark}
                                    />
                                </div>
                            </div>
                            {isScoreInvalid && (
                                <div className="flex items-center justify-start gap-2 text-red-500 text-sm font-bold animate-pulse">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>Score is greater than full mark!</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-3">
                        <label className="flex items-center justify-start gap-2 text-lg md:text-xl font-bold text-[#414141] mb-1">
                            <span>Notes</span>
                        </label>
                        <textarea 
                            className="w-full px-6 py-5 rounded-[1.5rem] border-2 border-transparent focus:border-indigo-400 outline-none transition-all h-36 resize-none text-left text-lg md:text-xl font-medium bg-[#F9F9F9] placeholder:text-gray-300"
                            placeholder="Any additional notes..."
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>

                    <div className="pt-4 md:pt-6 flex flex-col md:flex-row gap-4 shrink-0">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-[1.5] px-8 py-5 md:py-6 rounded-2xl font-bold text-white bg-[#4F46E5] hover:bg-indigo-800 transition-all shadow-xl shadow-purple-200 disabled:opacity-70 disabled:cursor-not-allowed text-xl md:text-2xl"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 px-8 py-5 md:py-6 rounded-2xl font-bold text-[#414141] bg-[#F4F4F4] hover:bg-gray-200 transition-all text-xl md:text-2xl"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #EBE4FF;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #D8CCFF;
                }
            `}</style>
        </div>
    );
}
