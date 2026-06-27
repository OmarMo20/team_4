'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowUpRight,
    Calendar,
    DollarSign,
    ListFilter,
    Search,
    TrendingUp,
} from 'lucide-react';
import { getFinanceSummary, getPayments } from '@/features/finance/api/financeApi';
import type { FinanceSummary, PaymentItem } from '@/features/finance/types';

type StatusFilter = 'paid' | 'pending';

const tabs: Array<{ key: StatusFilter; label: string }> = [
    { key: 'paid', label: 'Paid Students' },
    { key: 'pending', label: 'Unpaid Students' },
];

const formatCurrency = (value: number | undefined) =>
    `${(value || 0).toLocaleString('en-US')} EGP`;

export default function FinancePage() {
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('paid');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingPayments, setLoadingPayments] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const loadSummary = async () => {
            try {
                setLoadingSummary(true);
                setError(null);
                
                // Check if device is offline
                const isOffline = typeof window !== 'undefined' && !navigator.onLine;
                
                if (isOffline) {
                    // Load cached data from localStorage
                    console.log('📴 Offline mode: Loading cached finance summary');
                    try {
                        const cachedSummary = localStorage.getItem('finance_summary');
                        if (cachedSummary) {
                            setSummary(JSON.parse(cachedSummary));
                        }
                    } catch (cacheError) {
                        console.error('Error loading cached summary:', cacheError);
                    }
                    return;
                }
                
                const response = await getFinanceSummary();
                if (response.success && response.data) {
                    setSummary(response.data);
                    
                    // Save to localStorage for offline use
                    if (typeof window !== 'undefined') {
                        try {
                            localStorage.setItem('finance_summary', JSON.stringify(response.data));
                            localStorage.setItem('finance_summary_cache_time', Date.now().toString());
                        } catch (storageError) {
                            console.warn('Failed to save finance summary to localStorage:', storageError);
                        }
                    }
                }
            } catch (err: any) {
                // If online request fails, try to use cached data
                const isOffline = typeof window !== 'undefined' && !navigator.onLine;
                
                if (!isOffline) {
                    setError('Could not load financial summary');
                    
                    // Try to use cached data as fallback
                    try {
                        const cachedSummary = localStorage.getItem('finance_summary');
                        if (cachedSummary) {
                            console.log('📦 Using cached finance summary as fallback');
                            setSummary(JSON.parse(cachedSummary));
                            setError(null);
                        }
                    } catch (cacheError) {
                        console.error('Error loading cached fallback summary:', cacheError);
                    }
                } else {
                    // Silent fail in offline mode
                    console.log('📴 Offline mode: Finance summary request failed (expected)');
                }
            } finally {
                setLoadingSummary(false);
            }
        };

        loadSummary();
    }, []);

    const loadPayments = useCallback(
        async (targetPage: number, reset: boolean) => {
            try {
                setLoadingPayments(true);
                setError(null);
                
                // Check if device is offline
                const isOffline = typeof window !== 'undefined' && !navigator.onLine;
                
                if (isOffline) {
                    // Load cached data from localStorage
                    console.log('📴 Offline mode: Loading cached payments');
                    try {
                        const cacheKey = `finance_payments_${statusFilter}_${debouncedSearch || 'all'}`;
                        const cachedPayments = localStorage.getItem(cacheKey);
                        if (cachedPayments) {
                            const data = JSON.parse(cachedPayments);
                            setPages(data.pages || 1);
                            setHasMore(false); // Don't load more in offline mode
                            setPayments((prev) =>
                                reset ? data.payments : [...prev, ...data.payments]
                            );
                        }
                    } catch (cacheError) {
                        console.error('Error loading cached payments:', cacheError);
                    }
                    return;
                }
                
                const response = await getPayments({
                    status: statusFilter,
                    search: debouncedSearch || undefined,
                    page: targetPage,
                    limit: 10,
                });

                if (response.success && response.data) {
                    const data = response.data;
                    setPages(data.pages);
                    setHasMore(data.page < data.pages);
                    setPayments((prev) =>
                        reset ? data.payments : [...prev, ...data.payments]
                    );
                    
                    // Save to localStorage for offline use (only first page)
                    if (reset && typeof window !== 'undefined') {
                        try {
                            const cacheKey = `finance_payments_${statusFilter}_${debouncedSearch || 'all'}`;
                            localStorage.setItem(cacheKey, JSON.stringify(data));
                        } catch (storageError) {
                            console.warn('Failed to save payments to localStorage:', storageError);
                        }
                    }
                }
            } catch (err: any) {
                // If online request fails, try to use cached data
                const isOffline = typeof window !== 'undefined' && !navigator.onLine;
                
                if (!isOffline) {
                    setError('Could not load payment history');
                    
                    // Try to use cached data as fallback
                    try {
                        const cacheKey = `finance_payments_${statusFilter}_${debouncedSearch || 'all'}`;
                        const cachedPayments = localStorage.getItem(cacheKey);
                        if (cachedPayments) {
                            console.log('📦 Using cached payments as fallback');
                            const data = JSON.parse(cachedPayments);
                            setPages(data.pages || 1);
                            setHasMore(false);
                            setPayments((prev) =>
                                reset ? data.payments : [...prev, ...data.payments]
                            );
                            setError(null);
                        }
                    } catch (cacheError) {
                        console.error('Error loading cached fallback payments:', cacheError);
                    }
                } else {
                    // Silent fail in offline mode
                    console.log('📴 Offline mode: Payments request failed (expected)');
                }
            } finally {
                setLoadingPayments(false);
            }
        },
        [debouncedSearch, statusFilter]
    );

    // Auto-refresh data when connection is restored
    useEffect(() => {
        const handleOnline = async () => {
            console.log('🌐 Connection restored: Refreshing finance data...');
            // Reload summary
            try {
                setLoadingSummary(true);
                const response = await getFinanceSummary();
                if (response.success && response.data) {
                    setSummary(response.data);
                    localStorage.setItem('finance_summary', JSON.stringify(response.data));
                    localStorage.setItem('finance_summary_cache_time', Date.now().toString());
                }
            } catch (err) {
                console.error('Failed to refresh finance summary:', err);
            } finally {
                setLoadingSummary(false);
            }
            
            // Reset and reload payments
            setPage(1);
            setPayments([]);
            setHasMore(true);
            loadPayments(1, true);
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [loadPayments]);

    // Reset & load when filters change
    useEffect(() => {
        setPage(1);
        setPayments([]);
        setHasMore(true);
        loadPayments(1, true);
    }, [statusFilter, debouncedSearch, loadPayments]);

    // Load next page on page increment (infinite scroll)
    useEffect(() => {
        if (page === 1) return; // already loaded on reset
        loadPayments(page, false);
    }, [page, loadPayments]);

    // Intersection observer for scroll pagination
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && hasMore && !loadingPayments) {
                    setPage((p) => p + 1);
                }
            },
            { root: null, rootMargin: '200px 0px', threshold: 0 }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loadingPayments]);

    const stats = useMemo(
        () => [
            {
                label: "Today's Revenue",
                value: formatCurrency(summary?.todayRevenue),
                icon: <ArrowUpRight className="h-6 w-6 text-green-600" />,
                bg: 'bg-emerald-50',
            },
            {
                label: 'Monthly Revenue',
                value: formatCurrency(summary?.monthRevenue),
                icon: <DollarSign className="h-6 w-6 text-indigo-600" />,
                bg: 'bg-indigo-50',
            },
            {
                label: 'Weekly Revenue',
                value: formatCurrency(summary?.weekRevenue),
                icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
                bg: 'bg-blue-50',
            },
        ],
        [summary]
    );

    const renderStatusChip = (status: PaymentItem['status']) => {
        if (status === 'paid') {
            return <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs">Paid</span>;
        }
        if (status === 'unpaid') {
            return <span className="text-amber-700 bg-amber-50 px-3 py-1 rounded-full text-xs">Unpaid</span>;
        }
        if (status === 'pending') {
            return <span className="text-amber-700 bg-amber-50 px-3 py-1 rounded-full text-xs">Pending</span>;
        }
        if (status === 'overdue') {
            return <span className="text-rose-700 bg-rose-50 px-3 py-1 rounded-full text-xs">Overdue</span>;
        }
        return <span className="text-gray-500 bg-slate-100 px-3 py-1 rounded-full text-xs">Other</span>;
    };

    return (
        <div className="space-y-4 sm:space-y-6" dir="ltr">
            {/* Top summary */}
            <div className="rounded-3xl bg-white shadow-xl border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <p className="text-slate-400 text-xs sm:text-sm">Dashboard • Financial Management</p>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">Financial Management</h1>
                        <p className="text-gray-500 text-xs sm:text-sm">Detailed tracking of revenues and payments</p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>Today</span>
                    </div>
                </div>

                {/* Stats: stacked on mobile (no horizontal scroll), grid on larger screens */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    {stats.map((item) => (
                        <div
                            key={item.label}
                            className="bg-gradient-to-br from-white to-slate-50 border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-xl"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-gray-500 text-xs sm:text-sm">{item.label}</p>
                                <div className={`h-9 w-9 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center ${item.bg}`}>
                                    {item.icon}
                                </div>
                            </div>
                            {loadingSummary ? (
                                <div className="h-5 w-20 bg-slate-100 animate-pulse rounded" />
                            ) : (
                                <p className="text-lg sm:text-2xl font-bold text-gray-900 whitespace-nowrap">
                                    {item.value}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Payments section */}
            <div className="space-y-3 sm:space-y-4">
                <div className="rounded-3xl bg-white shadow-xl border border-gray-200">
                    <div className="flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
                        <div className="flex gap-2 overflow-x-auto sm:overflow-visible">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => {
                                        setStatusFilter(tab.key);
                                        setPage(1);
                                    }}
                                    className={`px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition ${
                                        statusFilter === tab.key
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-gray-500 hover:bg-slate-100'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-gray-500 text-sm">
                            <ListFilter className="h-4 w-4" />
                            {statusFilter === 'paid'
                                ? 'Showing Paid'
                                : 'Showing Pending/Overdue'}
                        </div>
                    </div>

                    <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                        <div className="relative mt-3 mb-4">
                            <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by student name, code, or description"
                                className="w-full rounded-xl border border-gray-200 bg-[#FCFCFC] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white transition"
                            />
                        </div>

                        {/* Desktop table */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                        <th className="py-3 px-3 font-medium">Type</th>
                                        <th className="py-3 px-3 font-medium">Student Name</th>
                                        <th className="py-3 px-3 font-medium">Student Code</th>
                                        <th className="py-3 px-3 font-medium">Description</th>
                                        <th className="py-3 px-3 font-medium">Amount</th>
                                        <th className="py-3 px-3 font-medium">Date</th>
                                        <th className="py-3 px-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {loadingPayments ? (
                                        <tr>
                                            <td colSpan={7} className="py-6 text-center text-slate-400">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-6 text-center text-slate-400">
                                                No matching data found
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((payment) => (
                                            <tr
                                                key={payment.id}
                                                className="hover:bg-[#FCFCFC] transition cursor-pointer"
                                                onClick={() => setSelectedPayment(payment)}
                                            >
                                                <td className="py-3 px-3 text-gray-700">
                                                    {payment.type === 'tuition' ? 'Session' : 'Fee'}
                                                </td>
                                                <td className="py-3 px-3 text-gray-900 font-medium">
                                                    {payment.student?.fullName || '—'}
                                                </td>
                                                <td className="py-3 px-3 text-gray-500">
                                                    {payment.student?.nationalId || '—'}
                                                </td>
                                                <td className="py-3 px-3 text-gray-500">
                                                    {payment.description || '—'}
                                                </td>
                                                <td className="py-3 px-3 text-emerald-700 font-semibold">
                                                    {formatCurrency(payment.amount)}
                                                </td>
                                                <td className="py-3 px-3 text-gray-500">
                                                    {payment.date
                                                        ? new Date(payment.date).toLocaleDateString('en-US')
                                                        : '—'}
                                                </td>
                                                <td className="py-3 px-3">{renderStatusChip(payment.status)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="space-y-3 md:hidden">
                            {loadingPayments && payments.length === 0 ? (
                                <div className="py-6 text-center text-slate-400 text-sm">Loading...</div>
                            ) : payments.length === 0 ? (
                                <div className="py-6 text-center text-slate-400 text-sm">No matching data found</div>
                            ) : (
                                payments.map((payment) => (
                                    <button
                                        key={payment.id}
                                        type="button"
                                        onClick={() => setSelectedPayment(payment)}
                                        className="w-full text-left rounded-2xl border border-gray-200 bg-gradient-to-l from-white to-slate-50 px-4 py-3 shadow-xl active:scale-[0.99] transition"
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <span className="text-[11px] font-semibold text-gray-500">
                                                {payment.type === 'tuition' ? 'Session' : 'Fee'}
                                            </span>
                                            <span className="text-xs font-medium">
                                                {renderStatusChip(payment.status)}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {payment.student?.fullName || '—'}
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                                            Code: {payment.student?.nationalId || 'Not Available'}
                                        </p>
                                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                            <span>{payment.date ? new Date(payment.date).toLocaleDateString('en-US') : '—'}</span>
                                            <span className="font-bold text-emerald-700">
                                                {formatCurrency(payment.amount)}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div ref={sentinelRef} className="h-4" />
                        {loadingPayments && page > 1 && (
                            <div className="text-center text-slate-400 py-3 text-sm">Loading...</div>
                        )}
                        {!hasMore && payments.length > 0 && (
                            <div className="text-center text-slate-400 py-3 text-sm">All results displayed</div>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-4 py-3">
                    {error}
                </div>
            )}

            {/* Student details modal */}
            {selectedPayment && selectedPayment.student && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSelectedPayment(null)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                        dir="ltr"
                    >
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                            <h3 className="text-xl font-bold text-gray-900">Student Profile</h3>
                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <span className="sr-only">Close</span>
                                ✕
                            </button>
                        </div>

                        <div className="px-6 py-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
                                <p className="mt-1 text-lg font-bold text-gray-900">
                                    {selectedPayment.student.fullName}
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Student Code</label>
                                <p className="mt-1 text-base text-gray-700">
                                    {selectedPayment.student.nationalId || 'Not Available'}
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Parent's Phone Number</label>
                                <p className="mt-1 text-base text-gray-700">
                                    {selectedPayment.student.parentPhone || 'Not Available'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Amount</label>
                                    <p className="mt-1 text-base font-bold text-emerald-700">
                                        {formatCurrency(selectedPayment.amount)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                                    <p className="mt-1 text-sm">
                                        {renderStatusChip(selectedPayment.status)}
                                    </p>
                                </div>
                            </div>

                            {selectedPayment.description && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                                    <p className="mt-1 text-base text-gray-700">{selectedPayment.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
