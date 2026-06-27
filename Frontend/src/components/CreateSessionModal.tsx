import type { CreateSessionData } from '@/features/sessions';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CreateSessionModalProps {
    isOpen: boolean;
    isCreating: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function CreateSessionModal({
    isOpen,
    isCreating,
    onClose,
    onSubmit,
}: CreateSessionModalProps) {
    const [todayDate, setTodayDate] = useState('');

    // Set today's date when modal opens
    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            setTodayDate(`${year}-${month}-${day}`);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white w-full sm:max-w-lg shadow-2xl relative rounded-t-[28px] sm:rounded-[30px] max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in duration-300 fade-in slide-in-from-bottom-8 sm:zoom-in-95 sm:slide-in-from-bottom-0 text-left"
                onClick={(e) => e.stopPropagation()}
                dir="ltr"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 text-[#A1A1A1] hover:text-[#414141] transition-colors z-20"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-5 sm:p-8 pb-0 text-left">
                    <div className="sm:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                    <h2 className="text-xl sm:text-2xl font-bold text-[#414141] mb-4 sm:mb-8 text-left">
                        Create New Session
                    </h2>
                </div>

                <form onSubmit={onSubmit} className="flex flex-col max-h-[92vh] sm:max-h-[85vh]">
                    <div className="px-5 sm:px-8 space-y-5 sm:space-y-6 overflow-y-auto pb-28 scroll-pb-32 text-left">
                        <div>
                            <label className="block text-sm font-bold text-[#414141] mb-2 text-left">
                                Title (Optional)
                            </label>
                            <input
                                type="text"
                                name="title"
                                className="w-full px-5 py-3 bg-[#FCFCFC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E1F22] focus:border-transparent outline-none transition-all text-left"
                                placeholder="e.g., Final Revision Session"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-[#414141] mb-2 text-left">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={todayDate}
                                    onChange={(e) => setTodayDate(e.target.value)}
                                    required
                                    className="w-full px-5 py-3 bg-[#FCFCFC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E1F22] focus:border-transparent outline-none transition-all text-left"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#414141] mb-2 text-left">
                                    Grade *
                                </label>
                                <select
                                    name="grade"
                                    required
                                    defaultValue=""
                                    className="w-full px-5 py-3 bg-[#FCFCFC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E1F22] focus:border-transparent outline-none transition-all text-left"
                                >
                                    <option value="" disabled>Select Grade</option>
                                    <option value="1st Preparatory">1st Preparatory</option>
                                    <option value="2nd Preparatory">2nd Preparatory</option>
                                    <option value="3rd Preparatory">3rd Preparatory</option>
                                    <option value="1st Secondary">1st Secondary</option>
                                    <option value="2nd Secondary">2nd Secondary</option>
                                    <option value="3rd Secondary">3rd Secondary</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-[#414141] mb-2 text-left">
                                    Start Time *
                                </label>
                                <input
                                    type="time"
                                    name="startTime"
                                    required
                                    className="w-full px-5 py-3 bg-[#FCFCFC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E1F22] focus:border-transparent outline-none transition-all text-left"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#414141] mb-2 text-left">
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    name="endTime"
                                    className="w-full px-5 py-3 bg-[#FCFCFC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E1F22] focus:border-transparent outline-none transition-all text-left"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#414141] mb-2 text-left">
                                    Session Price
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    min="0"
                                    placeholder="0.00"
                                    className="w-full px-5 py-3 bg-[#FCFCFC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E1F22] focus:border-transparent outline-none transition-all text-left"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[#414141] mb-2 text-left">Notes</label>
                            <textarea
                                name="notes"
                                rows={3}
                                className="w-full px-5 py-3 bg-[#FCFCFC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E1F22] focus:border-transparent outline-none transition-all text-left resize-none"
                                placeholder="Any additional notes for the session..."
                            />
                        </div>
                    </div>

                    <div className="px-5 sm:px-8 py-4 bg-white border-t border-gray-200 sticky bottom-0 text-left">
                        <div className="flex gap-3 sm:gap-4">
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="flex-1 bg-white text-white px-6 py-4 rounded-xl font-bold hover:bg-[#4a238b] transition-all disabled:opacity-50 shadow-lg shadow-purple-200 active:scale-[0.98]"
                            >
                                {isCreating ? 'Creating...' : 'Create Session'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-4 border border-gray-200 text-[#A1A1A1] rounded-xl font-bold hover:bg-[#FCFCFC] transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
