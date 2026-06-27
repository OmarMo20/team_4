'use client';

import {
    Users,
    FileText,
    MessageCircle,
    LogOut,
    Menu,
    X,
    Settings,
    Briefcase,
    BarChart3,
    Terminal
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useMemo, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';

const Sidebar = memo(function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user, isLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            router.push(ROUTES.LOGIN);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const menuItems = useMemo(() => {
        const allItems = [
            { icon: Terminal, label: 'Dashboard', href: ROUTES.DASHBOARD, roles: ['admin', 'teacher'] },
            { icon: FileText, label: 'Mark Attendance', href: ROUTES.ATTENDANCE, roles: ['admin', 'teacher', 'assistant'] },
            { icon: Users, label: 'Add Students', href: ROUTES.STUDENTS_ADD, roles: ['admin', 'teacher', 'assistant'] },
            { icon: Briefcase, label: 'Finance', href: ROUTES.FINANCE, roles: ['admin', 'teacher'] },
            { icon: FileText, label: 'Comprehensive Reports', href: ROUTES.REPORTS, roles: ['admin', 'teacher'] },
            { icon: BarChart3, label: 'Exam Grades', href: ROUTES.GRADES, roles: ['admin', 'teacher', 'assistant'] },
            { icon: Briefcase, label: 'Additional Services', href: ROUTES.SERVICES, roles: ['admin', 'teacher'] },
            { icon: MessageCircle, label: 'Communication', href: ROUTES.CONTACT, roles: ['admin', 'teacher', 'assistant'] },
        ];

        if (!user || !user.role) {
            return allItems;
        }

        const userRole = user.role;

        if (userRole === 'parent' || !['admin', 'teacher', 'assistant'].includes(userRole)) {
            return allItems.filter(item => item.roles.includes('teacher') || item.roles.includes('admin'));
        }

        return allItems.filter(item => item.roles.includes(userRole));
    }, [user?.role]);

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-6 right-6 z-[60] p-2 bg-[#202225] text-white rounded-lg shadow-lg hover:bg-[#2f3136] transition-colors"
                aria-label="Toggle Menu"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[50]"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    fixed inset-y-0 left-0 z-[55]
                    bg-[#1E1F22] text-[#80848E] flex flex-col items-start py-6 px-3
                    lg:my-4 lg:ml-4 lg:h-[calc(100vh-2rem)] lg:rounded-[28px] shadow-xl 
                    transition-all duration-300 ease-in-out overflow-hidden
                    ${isHovered ? 'w-[260px]' : 'w-[88px]'}
                    ${isOpen ? 'translate-x-0' : '-translate-x-[260px] lg:translate-x-0'}
                `}
                style={{ willChange: 'width, transform' }}
            >
                {/* Logo Section */}
                <div className="mb-8 flex items-center gap-3 w-full flex-shrink-0 px-1">
                    <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                        <FileText className="w-7 h-7" />
                    </div>
                    
                    <div className={`flex flex-col transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none w-0 h-0 overflow-hidden'}`}>
                        <h1 className="font-bold text-lg text-white leading-tight">ClassTrack</h1>
                        <p className="text-[10px] text-[#949BA4] font-medium">Attendance System</p>
                    </div>

                    {/* Tooltip (only when collapsed) */}
                    {!isHovered && (
                        <div className="absolute left-20 top-10 scale-0 group-hover:scale-100 transition-all duration-150 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white whitespace-nowrap z-50 shadow-2xl pointer-events-none font-medium">
                            ClassTrack
                        </div>
                    )}
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 w-full flex flex-col items-start gap-3 overflow-y-auto overflow-x-hidden no-scrollbar px-1">
                    {menuItems.map((item) => {
                        const isActive = pathname?.startsWith(item.href) ?? false;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    relative w-full h-14 rounded-2xl flex items-center transition-all duration-200 group
                                    ${isActive 
                                        ? 'bg-[#1E1F22]/10 text-white font-bold' 
                                        : 'hover:bg-[#1E1F22]/5 hover:text-white'
                                    }
                                `}
                            >
                                {/* Active Indicator Bar */}
                                {isActive && (
                                    <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r" />
                                )}

                                {/* Icon wrapper centered in the collapsed width */}
                                <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                                    <item.icon className="w-6 h-6" />
                                </div>

                                {/* Text Label */}
                                <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none w-0 overflow-hidden'}`}>
                                    {item.label}
                                </span>

                                {/* Tooltip (only when collapsed) */}
                                {!isHovered && (
                                    <div className="absolute left-20 scale-0 group-hover:scale-100 transition-all duration-150 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white whitespace-nowrap z-50 shadow-2xl pointer-events-none font-medium">
                                        {item.label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}

                    {/* Settings Icon */}
                    <div className="relative w-full h-14 rounded-2xl flex items-center transition-all duration-200 group text-[#80848E] hover:bg-[#1E1F22]/5 hover:text-white cursor-pointer">
                        <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                            <Settings className="w-6 h-6" />
                        </div>
                        
                        <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none w-0 overflow-hidden'}`}>
                            Settings
                        </span>

                        {!isHovered && (
                            <div className="absolute left-20 scale-0 group-hover:scale-100 transition-all duration-150 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white whitespace-nowrap z-50 shadow-2xl pointer-events-none font-medium">
                                Settings
                            </div>
                        )}
                    </div>
                </nav>

                {/* Bottom Profile and Actions */}
                <div className="mt-auto pt-4 flex flex-col items-start gap-3 w-full border-t border-white/5 flex-shrink-0 px-1">
                    {/* User Profile */}
                    <div className="relative group w-full flex items-center gap-3 rounded-2xl p-1 hover:bg-[#1E1F22]/5 transition-all duration-200">
                        <div className="w-14 h-14 border border-white/10 bg-[#1E1F22]/5 rounded-2xl flex items-center justify-center text-white flex-shrink-0">
                            {isLoading ? (
                                <div className="w-6 h-6 bg-[#1E1F22]/20 rounded-full animate-pulse" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-sm">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>

                        <div className={`flex-1 min-w-0 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none w-0 h-0 overflow-hidden'}`}>
                            <p className="font-bold text-sm text-white truncate">{user?.name || 'User'}</p>
                            <p className="opacity-75 text-[10px] text-[#80848E] truncate">{user?.subject || 'Teacher'}</p>
                            {user?.teacherCode && (
                                <p className="mt-1 font-mono text-[9px] bg-[#1E1F22]/10 px-1.5 py-0.5 rounded text-blue-300 w-fit">
                                    Code: {user.teacherCode}
                                </p>
                            )}
                        </div>

                        {/* Tooltip (only when collapsed) */}
                        {!isHovered && (
                            <div className="absolute left-20 bottom-4 scale-0 group-hover:scale-100 transition-all duration-150 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white z-50 shadow-2xl pointer-events-none">
                                <p className="font-bold">{user?.name || 'User'}</p>
                                <p className="opacity-75 text-[10px]">{user?.subject || 'Teacher'}</p>
                                {user?.teacherCode && (
                                    <p className="mt-1 font-mono text-[9px] bg-[#1E1F22]/10 px-1 py-0.5 rounded text-blue-300">
                                        Code: {user.teacherCode}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-full h-14 rounded-2xl flex items-center text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 group relative"
                    >
                        <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                            <LogOut className="w-6 h-6" />
                        </div>
                        
                        <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none w-0 overflow-hidden'}`}>
                            Logout
                        </span>

                        {!isHovered && (
                            <div className="absolute left-20 scale-0 group-hover:scale-100 transition-all duration-150 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white whitespace-nowrap z-50 shadow-2xl pointer-events-none font-medium">
                                Logout
                            </div>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;
